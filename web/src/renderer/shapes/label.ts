import type { Point, TextAlign } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { layoutText } from "@/renderer/shapes/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"

const MIN_READABLE_TEXT_SIZE = 18

export interface LabelOptions {
  color: string
  fontSize: number
  offset?: Point
  maxWidth?: number
  align?: TextAlign
  lineHeight?: number
  fontFamily?: string
}

export function drawLabel(
  renderContext: RenderContext,
  text: string | undefined,
  center: Point,
  options: LabelOptions,
  revealProgress = 1,
  softWipe = false,
  seed = ""
): void {
  if (!text) return
  const context = renderContext.context
  const fontSize = cameraScaledFontSize(
    options.fontSize,
    renderContext.cameraScale
  )
  const clampedProgress = Math.max(0, Math.min(1, revealProgress))
  const visibleText = softWipe ? text : text.slice(0, Math.ceil(text.length * clampedProgress))
  if (!visibleText) return

  context.font = `${fontSize}px "${options.fontFamily ?? "Caveat Variable"}"`
  context.direction = /[\u0600-\u06ff]/i.test(text) ? "rtl" : "ltr"
  context.fillStyle = options.color
  context.textBaseline = "middle"

  const layout = layoutText(
    visibleText,
    fontSize,
    options.maxWidth,
    (line) => measureTextWidth(line, fontSize, options.fontFamily),
    options.lineHeight
  )
  const lineSpacing =
    fontSize * (features.customLineHeight ? (options.lineHeight ?? 1.3) : 1.3)
  const firstY =
    center.y +
    (options.offset?.y ?? 0) -
    ((layout.lines.length - 1) * lineSpacing) / 2
  const alignment = features.textAlignment
    ? (options.align ?? (features.centeredText ? "center" : "left"))
    : features.centeredText
      ? "center"
      : "left"
  context.textAlign = alignment
  const blockWidth = options.maxWidth ?? layout.width
  const startX = center.x + (options.offset?.x ?? 0) - blockWidth / 2
  if (softWipe) {
    let hash = 2166136261
    for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    const jitter = ((hash >>> 0) % 7) - 3
    context.save()
    context.beginPath()
    context.rect(startX - 2, center.y - layout.height / 2, blockWidth * clampedProgress + jitter, layout.height + fontSize * 0.2)
    context.clip()
  }
  layout.lines.forEach((line, index) => {
    context.fillText(
      line,
      alignment === "center"
        ? center.x + (options.offset?.x ?? 0)
        : alignment === "right"
          ? startX + blockWidth
          : startX,
      firstY + index * lineSpacing
    )
  })
  if (softWipe) context.restore()
}

export function cameraScaledFontSize(
  fontSize: number,
  cameraScale: number
): number {
  if (!features.cameraScaledText) {
    return Math.max(18, Math.round(fontSize / cameraScale))
  }
  return Math.max(fontSize, MIN_READABLE_TEXT_SIZE / cameraScale)
}
