import type { SayLine } from "@/ir/types.ts"
import { fontFamilyFor } from "@/lib/textMetrics.ts"
import { wrapSubtitleText } from "@/subtitles/subtitles.ts"

const subtitleWidth = 1680
const subtitleCenterX = 960
const subtitleCenterY = 1010
const subtitleFontSize = 36

export function drawSubtitleLayer(
  context: CanvasRenderingContext2D,
  subtitle: SayLine & { opacity: number; readingProgress: number },
  canvasSize: { width: number; height: number },
  devicePixelRatio = 1,
  readAlong = false
): void {
  const opacity = Math.max(0, Math.min(1, subtitle.opacity))
  if (!opacity) return
  const lines = wrapSubtitleText(subtitle.text).slice(0, 2)
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
  const lineWidths = lines.map((line) => context.measureText(line).width)
  const lineMetrics = lines.map((line, index) => ({
    line,
    y: firstY + index * lineGap,
    width: lineWidths[index] ?? 0,
  }))
  const totalChars = lineMetrics.reduce((total, item) => total + item.line.length, 0)
  let charsBeforeLine = 0
  lineMetrics.forEach(({ line, y }) => {
    const lineProgress = totalChars > 0
      ? Math.max(0, Math.min(1, (subtitle.readingProgress * totalChars - charsBeforeLine) / line.length))
      : 0
    drawSubtitleLine(context, line, y, direction, emphasized, readAlong ? lineProgress : 0)
    charsBeforeLine += line.length
  })
  context.restore()
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
