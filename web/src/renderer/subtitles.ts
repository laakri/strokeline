import type { SayLine, WordTiming } from "@/ir/types.ts"
import { fontFamilyFor } from "@/lib/textMetrics.ts"
import {
  type CaptionConfig,
  type CaptionPosition,
  type CaptionStyle,
  DEFAULT_CAPTION_CONFIG,
} from "@/subtitles/config.ts"
import { plainSubtitleText, wordTimingsForDuration, wrapSubtitleText } from "@/subtitles/subtitles.ts"
import { REELS_SAFE_ZONES, isVerticalCanvas } from "@/reels/reels.ts"
import { watermarkLayout } from "@/renderer/watermark.ts"

type CaptionWord = WordTiming & { trailing: string }
type CaptionGroup = { words: CaptionWord[]; start: number; end: number }

interface CaptionBand {
  centerY: number
  maxBottom: number
  minTop: number
  maxWidth: number
}

export const reelsCaptionFontSize = (canvasWidth: number) =>
  Math.min(54, Math.max(26, canvasWidth * 0.05))

/** Advance long captions two lines at a time as reading progress moves. */
export function visibleSubtitleLines(
  text: string,
  readingProgress: number
): Array<{ text: string; start: number }> {
  const normalizedText = plainSubtitleText(text)
  const lines = wrapSubtitleText(normalizedText)
  if (!lines.length) return []
  if (lines.length <= 2) {
    let start = 0
    return lines.map((line) => {
      const entry = { text: line, start }
      start += line.length + 1
      return entry
    })
  }

  const textProgress = Math.max(0, Math.min(1, readingProgress)) * normalizedText.length
  let activeLine = 0
  let start = 0
  const lineStarts = lines.map((line) => {
    const lineStart = start
    start += line.length + 1
    if (textProgress > lineStart + line.length) activeLine += 1
    return lineStart
  })
  activeLine = Math.min(activeLine, lines.length - 1)
  const firstLine = Math.min(Math.max(0, activeLine - 1), lines.length - 2)
  return lines.slice(firstLine, firstLine + 2).map((line, index) => ({
    text: line,
    start: lineStarts[firstLine + index] ?? 0,
  }))
}

export function drawSubtitleLayer(
  context: CanvasRenderingContext2D,
  subtitle: SayLine & { opacity: number; readingProgress: number },
  canvasSize: { width: number; height: number },
  devicePixelRatio = 1,
  _readAlong = false,
  captionStyleOrConfig: CaptionStyle | CaptionConfig = DEFAULT_CAPTION_CONFIG.style
): void {
  if (subtitle.opacity <= 0) return
  const config = normalizeCaptionConfig(captionStyleOrConfig)
  const text = plainSubtitleText(subtitle.text)
  const duration = Math.max(subtitle.duration, subtitle.audioTiming?.duration ?? 0)
  const timings = subtitle.audioTiming?.wordTimings.length
    ? subtitle.audioTiming.wordTimings
    : subtitle.wordTimings?.length
      ? subtitle.wordTimings
      : wordTimingsForDuration(text, duration)
  const groups = captionGroups(text, timings)
  if (!groups.length) return
  const elapsed = subtitle.readingProgress * duration
  const groupIndex = Math.max(0, groups.findIndex((group, index) => {
    const next = groups[index + 1]
    if (!next) return true
    const transitionEnd = (group.end + next.start) / 2 + 0.06
    return elapsed < transitionEnd
  }))
  const current = groups[groupIndex]!
  const next = groups[groupIndex + 1]
  const transition = next ? transitionAt(current, next, elapsed) : undefined

  context.save()
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.globalAlpha = Math.max(0, Math.min(1, subtitle.opacity))
  if (transition) {
    drawCaptionGroup(
      context,
      current,
      elapsed,
      canvasSize,
      config,
      1 - transition.progress
    )
    drawCaptionGroup(
      context,
      next!,
      elapsed,
      canvasSize,
      config,
      transition.progress
    )
  } else {
    drawCaptionGroup(context, current, elapsed, canvasSize, config, 1)
  }
  context.restore()
}

function normalizeCaptionConfig(
  styleOrConfig: CaptionStyle | CaptionConfig
): CaptionConfig {
  if (typeof styleOrConfig === "string") {
    return { ...DEFAULT_CAPTION_CONFIG, style: styleOrConfig }
  }
  return {
    style: styleOrConfig.style ?? DEFAULT_CAPTION_CONFIG.style,
    position: styleOrConfig.position ?? DEFAULT_CAPTION_CONFIG.position,
  }
}

function captionBand(
  context: CanvasRenderingContext2D,
  canvas: { width: number; height: number },
  position: CaptionPosition
): CaptionBand {
  const vertical = isVerticalCanvas(canvas)
  const sideMargin = Math.max(24, canvas.width * 0.06)
  const maxWidth = Math.max(1, Math.min(canvas.width * 0.88, canvas.width - sideMargin * 2))
  const edgeGap = Math.max(16, canvas.height * 0.028)
  const watermark = watermarkLayout(context, canvas)
  const bottomUi = vertical ? canvas.height - REELS_SAFE_ZONES.bottom : canvas.height
  const maxBottom = Math.min(bottomUi, watermark.y) - edgeGap
  const minTop = vertical ? REELS_SAFE_ZONES.top + edgeGap : edgeGap

  if (position === "top") {
    return {
      centerY: minTop + canvas.height * (vertical ? 0.07 : 0.055),
      maxBottom,
      minTop,
      maxWidth,
    }
  }
  if (position === "center") {
    return {
      centerY: canvas.height * 0.5,
      maxBottom,
      minTop,
      maxWidth,
    }
  }

  // Default bottom: low on the frame so the main board stays readable.
  const preferred = vertical ? canvas.height * 0.76 : canvas.height * 0.905
  return {
    centerY: Math.min(preferred, maxBottom - edgeGap),
    maxBottom,
    minTop,
    maxWidth,
  }
}

function clampPlate(
  plateHeight: number,
  band: CaptionBand
): { plateY: number; centerY: number } {
  const half = plateHeight / 2
  let centerY = band.centerY
  if (centerY + half > band.maxBottom) centerY = band.maxBottom - half
  if (centerY - half < band.minTop) centerY = band.minTop + half
  return { centerY, plateY: centerY - half }
}

function captionGroups(text: string, timings: WordTiming[]): CaptionGroup[] {
  if (!timings.length) return []
  const matches = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)]
  const words = timings.map((timing, index) => ({
    ...timing,
    trailing: text.slice(
      (matches[index]?.index ?? 0) + (matches[index]?.[0].length ?? 0),
      matches[index + 1]?.index ?? text.length
    ),
  }))
  const groups: CaptionGroup[] = []
  let cursor = 0
  while (cursor < words.length) {
    const remaining = words.length - cursor
    if (remaining <= 6) {
      groups.push(makeGroup(words.slice(cursor)))
      break
    }
    const maximum = Math.min(6, remaining - 3)
    let count = maximum
    for (let candidate = maximum; candidate >= 3; candidate--) {
      if (/[.!?,;:。！？、，；：—–]$/u.test(words[cursor + candidate - 1]?.trailing ?? "")) {
        count = candidate
        break
      }
    }
    groups.push(makeGroup(words.slice(cursor, cursor + count)))
    cursor += count
  }
  return groups
}

function makeGroup(words: CaptionWord[]): CaptionGroup {
  return {
    words,
    start: words[0]?.start ?? 0,
    end: words.at(-1)?.end ?? 0,
  }
}

function transitionAt(
  current: CaptionGroup,
  next: CaptionGroup,
  elapsed: number
): { progress: number } | undefined {
  const boundary = (current.end + next.start) / 2
  const start = boundary - 0.06
  const end = boundary + 0.06
  if (elapsed < start || elapsed >= end) return undefined
  return { progress: Math.max(0, Math.min(1, (elapsed - start) / (end - start))) }
}

function drawCaptionGroup(
  context: CanvasRenderingContext2D,
  group: CaptionGroup,
  elapsed: number,
  canvas: { width: number; height: number },
  config: CaptionConfig,
  opacity: number
): void {
  if (opacity <= 0 || !group.words.length) return
  const words = group.words.map((word) => word.text + word.trailing.trimEnd())
  const direction = /[\u0590-\u08ff]/u.test(words.join(" ")) ? "rtl" : "ltr"
  const family = direction === "rtl" ? "Amiri" : fontFamilyFor("neat")
  const band = captionBand(context, canvas, config.position)
  const vertical = isVerticalCanvas(canvas)
  const minimumFontSize = Math.max(16, canvas.height * (vertical ? 0.028 : 0.022))
  let fontSize = vertical
    ? Math.max(minimumFontSize, reelsCaptionFontSize(canvas.width))
    : Math.max(minimumFontSize, canvas.height * 0.036)
  let lines: number[][] = []
  const gaps = group.words.map((word) => word.trailing)
  while (true) {
    context.font = `700 ${fontSize}px "${family}"`
    lines = wrapCaptionIndices(words, band.maxWidth, (word, index) =>
      context.measureText(word).width +
      (index < words.length - 1 ? context.measureText(gaps[index] || " ").width : 0)
    )
    if (lines.length <= 2 || fontSize <= minimumFontSize) break
    fontSize = Math.max(minimumFontSize, fontSize - 2)
  }

  context.font = `700 ${fontSize}px "${family}"`
  context.textBaseline = "middle"
  context.textAlign = "left"
  context.direction = direction
  const lineHeight = fontSize * 1.2
  const lineWidths = lines.map((line) =>
    line.reduce((sum, wordIndex) => {
      const word = words[wordIndex] ?? ""
      const gap = wordIndex < words.length - 1 ? gaps[wordIndex] || " " : ""
      return sum + context.measureText(word).width + context.measureText(gap).width
    }, 0)
  )
  const contentWidth = Math.min(band.maxWidth, Math.max(0, ...lineWidths))
  const contentHeight = lines.length * lineHeight
  const drawPlate = config.style !== "minimal"
  const paddingX = drawPlate ? fontSize * 0.34 : 0
  const paddingY = drawPlate ? fontSize * 0.22 : fontSize * 0.08
  const sideInset = Math.max(12, canvas.width * 0.02)
  const plateWidth = Math.min(canvas.width - sideInset * 2, contentWidth + paddingX * 2)
  const plateHeight = contentHeight + paddingY * 2
  const { plateY, centerY } = clampPlate(plateHeight, band)
  const plateX = (canvas.width - plateWidth) / 2
  const textMaxWidth = Math.max(1, plateWidth - paddingX * 2)

  context.save()
  context.globalAlpha *= opacity
  context.beginPath()
  context.rect(sideInset, Math.max(0, plateY - 2), canvas.width - sideInset * 2, plateHeight + 4)
  context.clip()

  if (drawPlate) {
    context.fillStyle =
      config.style === "coral" ? "rgba(19, 24, 36, 0.92)" : "rgba(0, 0, 0, 0.78)"
    context.beginPath()
    context.roundRect(plateX, plateY, plateWidth, plateHeight, fontSize * 0.24)
    context.fill()
  }

  const firstY = drawPlate
    ? plateY + paddingY + lineHeight / 2
    : centerY - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, lineIndex) => {
    const naturalWidth = lineWidths[lineIndex] ?? 0
    const scale = naturalWidth > textMaxWidth ? textMaxWidth / naturalWidth : 1
    const drawnWidth = naturalWidth * scale
    let x = canvas.width / 2 - drawnWidth / 2
    const y = firstY + lineIndex * lineHeight
    for (const index of line) {
      const word = words[index] ?? ""
      const timing = group.words[index]
      const wordWidth = context.measureText(word).width * scale
      const gapText = index < words.length - 1 ? gaps[index] || " " : ""
      const gapWidth = context.measureText(gapText).width * scale
      const active = timing !== undefined && elapsed >= timing.start && elapsed < timing.end
      const spoken = timing !== undefined && elapsed >= timing.end
      const accent = config.style === "coral" ? "#FF8066" : "#FFD966"
      const fill = active
        ? accent
        : config.style === "coral"
          ? "#FFB5A6"
          : "#FFFFFF"

      if (active && config.style !== "minimal") {
        const pillPaddingX = fontSize * 0.14
        const pillHeight = fontSize * 1.18
        context.save()
        context.globalAlpha *= 0.34
        context.fillStyle = accent
        context.beginPath()
        context.roundRect(
          x - pillPaddingX,
          y - pillHeight / 2,
          wordWidth + pillPaddingX * 2,
          pillHeight,
          pillHeight / 2
        )
        context.fill()
        context.restore()
      }

      context.save()
      context.globalAlpha *= spoken || active ? 1 : 0.55
      if (config.style === "minimal") {
        context.strokeStyle = "rgba(0, 0, 0, 0.92)"
        context.lineWidth = Math.max(2, fontSize * 0.14)
        context.lineJoin = "round"
        context.miterLimit = 2
        context.strokeText(word, x, y, Math.max(1, wordWidth))
      }
      context.fillStyle = fill
      if (active && config.style === "minimal") {
        context.translate(x + wordWidth / 2, y)
        context.scale(1.05, 1.05)
        context.fillText(word, -wordWidth / 2, 0, Math.max(1, wordWidth / 1.05))
      } else {
        context.fillText(word, x, y, Math.max(1, wordWidth))
      }
      context.restore()
      x += wordWidth + gapWidth
    }
  })
  context.restore()
}

function wrapCaptionIndices(
  words: string[],
  maxWidth: number,
  measure: (word: string, index: number) => number
): number[][] {
  const lines: number[][] = []
  let line: number[] = []
  let width = 0
  words.forEach((word, index) => {
    const nextWidth = width + measure(word, index)
    if (line.length && nextWidth > maxWidth) {
      lines.push(line)
      line = []
      width = 0
    }
    line.push(index)
    width += measure(word, index)
  })
  if (line.length) lines.push(line)
  return lines
}
