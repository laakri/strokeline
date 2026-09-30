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
  if (readAlong && lineMetrics.length)
    drawPhraseHighlight(context, lineMetrics, opacity)
  lineMetrics.forEach(({ line, y }) =>
    drawSubtitleLine(context, line, y, direction, emphasized)
  )
  context.restore()
}

function drawPhraseHighlight(
  context: CanvasRenderingContext2D,
  lines: Array<{ line: string; y: number; width: number }>,
  opacity: number
): void {
  const width = Math.min(subtitleWidth - 32, Math.max(...lines.map((line) => line.width)) + 36)
  const top = lines[0]!.y - 21
  const height = lines.at(-1)!.y - top + 21
  context.save()
  context.globalAlpha = opacity
  context.fillStyle = "rgba(255, 217, 102, 0.13)"
  context.strokeStyle = "rgba(255, 217, 102, 0.32)"
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(subtitleCenterX - width / 2, top, width, height, 16)
  context.fill()
  context.stroke()
  context.restore()
}

function drawSubtitleLine(
  context: CanvasRenderingContext2D,
  line: string,
  y: number,
  direction: "ltr" | "rtl",
  emphasized: Set<string>
): void {
  const segments = line.match(/\s+|[^\s]+/gu) ?? []
  const widths = segments.map((segment) => context.measureText(segment).width)
  const total = widths.reduce((sum, width) => sum + width, 0)
  let cursor = direction === "rtl" ? subtitleCenterX + total / 2 : subtitleCenterX - total / 2
  segments.forEach((segment, index) => {
    const width = widths[index] ?? 0
    if (!/^\s+$/u.test(segment)) {
      const normalized = segment.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
      context.fillStyle = emphasized.has(normalized) ? "#FFD966" : "#FFFFFF"
      context.textAlign = direction === "rtl" ? "right" : "left"
      context.fillText(segment, cursor, y)
    }
    cursor += direction === "rtl" ? -width : width
  })
}
