import type { SayLine, WordTiming } from "@/ir/types.ts"
import { fontFamilyFor } from "@/lib/textMetrics.ts"
import { plainSubtitleText, wordTimingsForDuration, wrapSubtitleText } from "@/subtitles/subtitles.ts"
import { type CaptionStyle } from "@/reels/reels.ts"

type CaptionWord = WordTiming & { trailing: string }
type CaptionGroup = { words: CaptionWord[]; start: number; end: number }

export const reelsCaptionFontSize = (canvasWidth: number) =>
  Math.min(54, Math.max(26, canvasWidth * 0.05))

export function visibleSubtitleLines(
  text: string,
  _readingProgress: number
): Array<{ text: string; start: number }> {
  let start = 0
  return wrapSubtitleText(plainSubtitleText(text)).slice(0, 2).map((line) => {
    const entry = { text: line, start }
    start += line.length + 1
    return entry
  })
}

export function drawSubtitleLayer(
  context: CanvasRenderingContext2D,
  subtitle: SayLine & { opacity: number; readingProgress: number },
  canvasSize: { width: number; height: number },
  devicePixelRatio = 1,
  _readAlong = false,
  captionStyle: CaptionStyle = "bold"
): void {
  if (subtitle.opacity <= 0) return
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
      captionStyle,
      1 - transition.progress
    )
    drawCaptionGroup(
      context,
      next!,
      elapsed,
      canvasSize,
      captionStyle,
      transition.progress
    )
  } else {
    drawCaptionGroup(context, current, elapsed, canvasSize, captionStyle, 1)
  }
  context.restore()
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
  style: CaptionStyle,
  opacity: number
): void {
  if (opacity <= 0 || !group.words.length) return
  const words = group.words.map((word) => word.text + word.trailing.trimEnd())
  const direction = /[\u0590-\u08ff]/u.test(words.join(" ")) ? "rtl" : "ltr"
  const family = direction === "rtl" ? "Amiri" : fontFamilyFor("neat")
  const maxWidth = canvas.width * 0.88
  const minimumFontSize = Math.max(16, canvas.height * 0.024)
  let fontSize = Math.max(minimumFontSize, canvas.height * 0.042)
  let lines: number[][] = []
  const gaps = group.words.map((word) => word.trailing)
  while (true) {
    context.font = `700 ${fontSize}px "${family}"`
    lines = wrapCaptionIndices(words, maxWidth, (word, index) =>
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
  const contentWidth = Math.max(0, ...lineWidths)
  const contentHeight = lines.length * lineHeight
  const paddingX = fontSize * 0.34
  const paddingY = fontSize * 0.22
  const plateWidth = Math.min(canvas.width - 24, contentWidth + paddingX * 2)
  const plateHeight = contentHeight + paddingY * 2
  const plateX = (canvas.width - plateWidth) / 2
  const plateY = canvas.height * 0.92 - plateHeight
  const background = style === "coral"
    ? "rgba(19, 24, 36, 0.92)"
    : "rgba(0, 0, 0, 0.78)"

  context.save()
  context.globalAlpha *= opacity
  context.fillStyle = background
  context.beginPath()
  context.roundRect(plateX, plateY, plateWidth, plateHeight, fontSize * 0.24)
  context.fill()

  const firstY = plateY + paddingY + lineHeight / 2
  lines.forEach((line, lineIndex) => {
    const totalWidth = lineWidths[lineIndex] ?? 0
    let x = canvas.width / 2 - totalWidth / 2
    const y = firstY + lineIndex * lineHeight
    for (const index of line) {
      const word = words[index] ?? ""
      const timing = group.words[index]
      const wordWidth = context.measureText(word).width
      const gapText = index < words.length - 1 ? gaps[index] || " " : ""
      const gapWidth = context.measureText(gapText).width
      const active = timing !== undefined && elapsed >= timing.start && elapsed < timing.end
      const spoken = timing !== undefined && elapsed >= timing.end
      const accent = style === "coral" ? "#FF8066" : "#FFD966"

      if (active) {
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
      context.fillStyle = active ? accent : "#FFFFFF"
      context.fillText(word, x, y, maxWidth)
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
