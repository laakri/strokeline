import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { applyShapeShadow, clearShapeShadow, drawShapeShadow, fillShape } from "@/renderer/shapes/shapePaint.ts"
import { cachedSampledRoughPath, drawSampledPaths, shouldUseRoughSampledGeometry, sampleRoughDrawable } from "@/renderer/roughPath.ts"
import { strokeOptions } from "@/renderer/handdrawn.ts"

export function rectangleBoundingBox(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return {
    x: node.position.x - width / 2,
    y: node.position.y - height / 2,
    width,
    height,
  }
}

export function rectangleRevealPath(
  box: BoundingBox,
  revealProgress: number
): Array<[number, number]> {
  const progress = Math.max(0, Math.min(1, revealProgress))
  const perimeter = 2 * (box.width + box.height)
  let remaining = perimeter * progress
  const points: Array<[number, number]> = [[box.x, box.y]]
  const add = (dx: number, dy: number, length: number) => {
    const travelled = Math.min(remaining, length)
    const last = points[points.length - 1]
    points.push([last[0] + dx * travelled, last[1] + dy * travelled])
    remaining -= travelled
  }
  add(1, 0, box.width)
  if (remaining > 0) add(0, 1, box.height)
  if (remaining > 0) add(-1, 0, box.width)
  if (remaining > 0) add(0, -1, box.height)
  return points
}

export function drawRectangle(
  renderContext: RenderContext,
  node: SceneNode
): void {
  const box = rectangleBoundingBox(node)
  const progress = Math.max(
    0,
    Math.min(
      1,
      (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1
    )
  )
  const context = renderContext.context
  const corner = Math.min(node.cornerRadius ?? 16, box.width / 2, box.height / 2)
  const label = node.text ?? node.label
  const baseFont = node.style.fontSize ?? DEFAULT_LABEL_SIZE
  const fittedFont = label ? fitTextFontSize(label, baseFont, Math.max(0, box.width - 32), Math.max(0, box.height - 24), Math.max(0, box.width - 32), node.lineHeight ?? 1.3, (line, size) => measureTextWidth(line, size, node.style.fontFamily), 18) : baseFont
  drawShapeShadow(context, node, box, renderContext.cameraScale, () =>
    context.roundRect(box.x, box.y, box.width, box.height, corner)
  , progress)
  const roughReveal = shouldUseRoughSampledGeometry(node)
  context.save()
  if (!roughReveal) {
    context.beginPath(); context.roundRect(box.x, box.y, box.width, box.height, corner); context.clip()
    context.beginPath(); context.rect(box.x, box.y, box.width * progress, box.height); context.clip()
  }
  fillShape(context, node, box, renderContext.cameraScale, () =>
    context.roundRect(box.x, box.y, box.width, box.height, corner),
    roughReveal ? progress >= 1 : false
  )
  context.strokeStyle = node.style.color
  context.lineWidth = Math.max(1, node.style.strokeWidth / renderContext.cameraScale)
  context.lineJoin = "round"
  applyShapeShadow(context, node, renderContext.cameraScale)
  if (roughReveal) {
    const paths = cachedSampledRoughPath(`rectangle:${node.id}:${box.x}:${box.y}:${box.width}:${box.height}:${node.style.pen}:${node.style.strokeWidth}:${renderContext.cameraScale}`, () =>
      sampleRoughDrawable(renderContext.roughGenerator.rectangle(box.x, box.y, box.width, box.height, strokeOptions(node, renderContext.cameraScale))))
    drawSampledPaths(context, paths, progress)
  } else {
    context.beginPath(); context.roundRect(box.x, box.y, box.width, box.height, corner); context.stroke()
  }
  clearShapeShadow(context)
  context.restore()
  drawLabel(
    renderContext,
    node.text ?? node.label,
    node.position,
    {
      color: node.style.color,
      fontSize: fittedFont,
      fontFamily: node.style.fontFamily,
      maxWidth: Math.max(0, Math.min(node.maxWidth ?? box.width - 32, box.width - 32)),
      align: node.align ?? "center",
      lineHeight: node.lineHeight,
    },
    roughReveal ? (progress >= 1 ? 1 : 0) : progress
  )
}

export const rectangle: ShapeRenderer = {
  draw: drawRectangle,
  boundingBox: rectangleBoundingBox,
}
