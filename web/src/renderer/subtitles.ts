import type { SayLine } from "@/ir/types.ts"
import { fontFamilyFor } from "@/lib/textMetrics.ts"
import { plainSubtitleText, wrapSubtitleText } from "@/subtitles/subtitles.ts"
import { captionActiveWord, type CaptionStyle } from "@/reels/reels.ts"
import { watermarkLayout } from "@/renderer/watermark.ts"

const subtitleWidth = 1680
const subtitleCenterX = 960
const subtitleCenterY = 1010
const subtitleFontSize = 36
export const reelsCaptionFontSize = (canvasWidth: number) =>
  Math.min(54, Math.max(26, canvasWidth * 0.05))

export function visibleSubtitleLines(
  text: string,
  readingProgress: number
): Array<{ text: string; start: number }> {
  const normalizedText = plainSubtitleText(text)
  const lines = wrapSubtitleText(normalizedText)
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
  const firstLine = Math.min(
    Math.max(0, activeLine - 1),
    lines.length - 2
  )
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
  readAlong = false,
  captionStyle: CaptionStyle = "bold"
): void {
  const opacity = Math.max(0, Math.min(1, subtitle.opacity))
  if (!opacity) return
  if (canvasSize.height > canvasSize.width) {
    drawReelsCaption(context, subtitle, canvasSize, devicePixelRatio, captionStyle, opacity)
    return
  }
  const lines = visibleSubtitleLines(subtitle.text, subtitle.readingProgress)
  if (!lines.length) return
  const direction = /^(ar|fa|ur|he|ps|dv)(-|$)/i.test(subtitle.lang ?? "") ||
    /[\u0590-\u08ff]/u.test(subtitle.text)
    ? "rtl"
    : "ltr"
  const family = direction === "rtl" ? "Amiri" : fontFamilyFor("neat")
  const font = `${subtitleFontSize}px "${family}"`
  context.save()
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.globalAlpha = opacity
  context.fillStyle = "rgba(0, 0, 0, 0.65)"
  context.fillRect(
    (canvasSize.width - subtitleWidth) / 2,
    subtitleCenterY - 44,
    subtitleWidth,
    88
  )
  context.font = font
  context.textBaseline = "middle"
  context.direction = direction
  const emphasized = new Set(
    [...subtitle.text.matchAll(/\*([^*]+)\*/g)].flatMap((match) =>
      match[1]!.split(/\s+/u).map((word) => word.toLowerCase())
    )
  )
  const lineGap = 44
  const firstY = subtitleCenterY - ((lines.length - 1) * lineGap) / 2
  const lineWidths = lines.map(({ text }) => context.measureText(text).width)
  const lineMetrics = lines.map(({ text, start }, index) => ({
    line: text,
    start,
    y: firstY + index * lineGap,
    width: lineWidths[index] ?? 0,
  }))
  const textProgress = subtitle.readingProgress * plainSubtitleText(subtitle.text).length
  lineMetrics.forEach(({ line, start, y }) => {
    const lineProgress = Math.max(0, Math.min(1, (textProgress - start) / line.length))
    drawSubtitleLine(context, line, y, direction, emphasized, readAlong ? lineProgress : 0)
  })
  context.restore()
}

function drawReelsCaption(
  context: CanvasRenderingContext2D,
  subtitle: SayLine & { opacity: number; readingProgress: number },
  canvasSize: { width: number; height: number },
  devicePixelRatio: number,
  style: CaptionStyle,
  opacity: number
): void {
  const allWords = subtitle.text
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\*/g, "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
  if (!allWords.length) return
  const activeWord = captionActiveWord(subtitle.readingProgress, allWords.length)
  const visibleStart = Math.max(
    0,
    Math.min(allWords.length - 10, activeWord - 4)
  )
  const words = allWords.slice(visibleStart, visibleStart + 10)
  const direction = /^(ar|fa|ur|he|ps|dv)(-|$)/i.test(subtitle.lang ?? "") ||
    /[\u0590-\u08ff]/u.test(subtitle.text)
    ? "rtl"
    : "ltr"
  const maxWidth = Math.min(
    canvasSize.width * 0.88,
    canvasSize.width - 2 * 120
  )
  const family = direction === "rtl" ? "Amiri" : fontFamilyFor("neat")
  let fontSize = reelsCaptionFontSize(canvasSize.width)
  let lines: string[][] = []
  while (fontSize >= 26) {
    context.font = `800 ${fontSize}px "${family}"`
    lines = wrapWords(words, maxWidth, (word) => context.measureText(word).width)
    if (lines.length <= 3) break
    fontSize -= 2
  }
  context.font = `800 ${fontSize}px "${family}"`
  const lineHeight = fontSize * 1.18
  const widths = lines.map((line) =>
    line.reduce((sum, word, index) =>
      sum + context.measureText(word).width + (index ? context.measureText(" ").width : 0), 0)
  )
  const longest = Math.max(...widths)
  const contentHeight = lines.length * lineHeight
  const paddingX = style === "minimal" ? 0 : fontSize * 0.3
  const paddingY = style === "minimal" ? 0 : fontSize * 0.18
  const watermark = watermarkLayout(context, canvasSize)
  const watermarkGap = Math.max(12, fontSize * 0.25)
  const centerY = Math.min(
    canvasSize.height * 0.87,
    watermark.y - watermarkGap - paddingY - contentHeight / 2
  )
  const visibleActiveWord = activeWord - visibleStart

  context.save()
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.globalAlpha = opacity
  context.direction = direction
  if (style !== "minimal") {
    const plateX = (canvasSize.width - longest) / 2 - paddingX
    const plateY = centerY - contentHeight / 2 - paddingY
    const plateWidth = longest + paddingX * 2
    const plateHeight = contentHeight + paddingY * 2
    context.fillStyle = style === "coral" ? "rgba(19, 24, 36, 0.9)" : "rgba(0, 0, 0, 0.78)"
    context.beginPath()
    context.roundRect(plateX, plateY, plateWidth, plateHeight, fontSize * 0.24)
    context.fill()
  }

  context.font = `800 ${fontSize}px "${family}"`
  context.textBaseline = "middle"
  context.textAlign = direction === "rtl" ? "right" : "left"
  let wordIndex = 0
  lines.forEach((line, lineIndex) => {
    const lineWidth = widths[lineIndex] ?? 0
    let x = direction === "rtl"
      ? (canvasSize.width + lineWidth) / 2
      : (canvasSize.width - lineWidth) / 2
    const y = centerY + (lineIndex - (lines.length - 1) / 2) * lineHeight
    line.forEach((word) => {
      const width = context.measureText(word).width
      context.fillStyle =
        wordIndex === visibleActiveWord
          ? style === "coral" ? "#FF8066" : "#FFD84D"
          : style === "coral" ? "#FFFFFF" : "#F8FAFC"
      if (style === "minimal") {
        context.strokeStyle = "rgba(0, 0, 0, 0.9)"
        context.lineWidth = fontSize * 0.12
        context.lineJoin = "round"
        context.strokeText(word, x, y)
      }
      context.fillText(word, x, y)
      x += (direction === "rtl" ? -1 : 1) *
        (width + context.measureText(" ").width)
      wordIndex++
    })
  })
  context.restore()
}

function wrapWords(
  words: string[],
  maxWidth: number,
  measure: (word: string) => number
): string[][] {
  const lines: string[][] = []
  let line: string[] = []
  let width = 0
  for (const word of words) {
    const nextWidth = width + (line.length ? measure(" ") : 0) + measure(word)
    if (line.length && nextWidth > maxWidth) {
      lines.push(line)
      line = []
      width = 0
    }
    width += (line.length ? measure(" ") : 0) + measure(word)
    line.push(word)
  }
  if (line.length) lines.push(line)
  return lines
}

function drawSubtitleLine(
  context: CanvasRenderingContext2D,
  line: string,
  y: number,
  direction: "ltr" | "rtl",
  emphasized: Set<string>,
  readProgress: number
): void {
  const segments = line.match(/\s+|[^\s]+/gu) ?? []
  const widths = segments.map((segment) => context.measureText(segment).width)
  const total = widths.reduce((sum, width) => sum + width, 0)
  let cursor = direction === "rtl" ? subtitleCenterX + total / 2 : subtitleCenterX - total / 2
  let charsBeforeSegment = 0
  segments.forEach((segment, index) => {
    const width = widths[index] ?? 0
    if (!/^\s+$/u.test(segment)) {
      const normalized = segment.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
      const isEmphasized = emphasized.has(normalized)
      context.fillStyle = isEmphasized ? "#FFD966" : "#FFFFFF"
      context.textAlign = direction === "rtl" ? "right" : "left"
      context.fillText(segment, cursor, y)
      const readChars = Math.max(0, Math.min(segment.length, readProgress * line.length - charsBeforeSegment))
      if (!isEmphasized && readChars > 0) {
        const readWidth = context.measureText(segment.slice(0, Math.ceil(readChars))).width
        context.save()
        context.beginPath()
        context.rect(
          direction === "rtl" ? cursor - readWidth : cursor,
          y - subtitleFontSize / 2,
          readWidth,
          subtitleFontSize
        )
        context.clip()
        context.fillStyle = "#DCE8E5"
        context.fillText(segment, cursor, y)
        context.restore()
      }
    }
    cursor += direction === "rtl" ? -width : width
    charsBeforeSegment += segment.length
  })
}
