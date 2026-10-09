import type { Point, TextAlign } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { layoutText } from "@/renderer/shapes/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { formatMathText } from "@/lib/mathText.ts"

const MIN_READABLE_TEXT_SIZE = 18

export interface LabelOptions {
  color: string
  fontSize: number
  offset?: Point
  maxWidth?: number
  align?: TextAlign
  lineHeight?: number
  fontFamily?: string
  background?: string
  backgroundOpacity?: number
  backgroundPadding?: number
  backgroundCorners?: number
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
  text = formatMathText(text)
  const context = renderContext.context
  const fontSize = cameraScaledFontSize(
    options.fontSize,
    renderContext.cameraScale
  )
  const clampedProgress = Math.max(0, Math.min(1, revealProgress))
  const visibleText = softWipe
    ? text
    : text.slice(0, Math.ceil(text.length * clampedProgress))
  if (!visibleText) return

  context.font = `${fontSize}px "${options.fontFamily ?? "Caveat Variable"}", "Cambria Math", "STIX Two Math", "Times New Roman", serif`
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
  const padding = Math.max(0, options.backgroundPadding ?? 0)
  const boxWidth = layout.width + padding * 2
  const boxHeight = layout.height + padding * 2
  const boxX =
    alignment === "left"
      ? startX - padding
      : alignment === "right"
        ? startX + blockWidth - layout.width - padding
        : center.x + (options.offset?.x ?? 0) - boxWidth / 2
  const boxY = center.y + (options.offset?.y ?? 0) - boxHeight / 2
  if (softWipe || options.background) {
    context.save()
    if (softWipe) {
      let hash = 2166136261
      for (const char of seed)
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
      const jitter = ((hash >>> 0) % 7) - 3
      context.beginPath()
      context.rect(
        startX - padding,
        boxY,
        (blockWidth + padding * 2) * clampedProgress + jitter,
        boxHeight
      )
      context.clip()
    }
    if (options.background) {
      context.save()
      context.globalAlpha *= Math.max(
        0,
        Math.min(1, options.backgroundOpacity ?? 0.92)
      )
      context.fillStyle = options.background
      roundedRectPath(
        context,
        boxX,
        boxY,
        boxWidth,
        boxHeight,
        options.backgroundCorners ?? 12
      )
      context.fill()
      context.restore()
    }
  }
  if (softWipe) {
    let hash = 2166136261
    for (const char of seed)
      hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    const jitter = ((hash >>> 0) % 7) - 3
    context.beginPath()
    context.rect(
      startX - 2,
      center.y - layout.height / 2,
      blockWidth * clampedProgress + jitter,
      layout.height + fontSize * 0.2
    )
    context.clip()
  }
  context.fillStyle = options.color
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
  if (softWipe || options.background) context.restore()
}

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.arcTo(x + width, y, x + width, y + r, r)
  context.lineTo(x + width, y + height - r)
  context.arcTo(x + width, y + height, x + width - r, y + height, r)
  context.lineTo(x + r, y + height)
  context.arcTo(x, y + height, x, y + height - r, r)
  context.lineTo(x, y + r)
  context.arcTo(x, y, x + r, y, r)
  context.closePath()
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
