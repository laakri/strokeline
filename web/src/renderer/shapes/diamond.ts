import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { applyShapeShadow, clearShapeShadow, drawShapeShadow, fillShape } from "@/renderer/shapes/shapePaint.ts"
import { cachedSampledRoughPath, drawSampledPaths, shouldUseRoughSampledGeometry, sampleRoughDrawable } from "@/renderer/roughPath.ts"
import { strokeOptions } from "@/renderer/handdrawn.ts"

export function diamondBoundingBox(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 0, height = node.size?.height ?? 0
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

export function drawDiamond(render: RenderContext, node: SceneNode): void {
  const box = diamondBoundingBox(node), ctx = render.context
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const points = [
    { x: node.position.x, y: box.y }, { x: box.x + box.width, y: node.position.y },
    { x: node.position.x, y: box.y + box.height }, { x: box.x, y: node.position.y },
  ]
  drawShapeShadow(ctx, node, box, render.cameraScale, () => {
    ctx.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.closePath()
  }, progress)
  ctx.save()
  ctx.beginPath(); ctx.rect(box.x, box.y, box.width * progress, box.height); ctx.clip()
  ctx.beginPath(); ctx.moveTo(points[0]!.x, points[0]!.y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  fillShape(ctx, node, box, render.cameraScale, () => {
    ctx.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.closePath()
  }, false)
  applyShapeShadow(ctx, node, render.cameraScale)
  ctx.strokeStyle = node.style.color
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  ctx.lineJoin = "round"
  if (shouldUseRoughSampledGeometry(node)) {
    const paths = cachedSampledRoughPath(`diamond:${node.id}:${box.x}:${box.y}:${box.width}:${box.height}:${node.style.pen}:${node.style.strokeWidth}:${render.cameraScale}`, () =>
      sampleRoughDrawable(render.roughGenerator.polygon(points, strokeOptions(node, render.cameraScale))))
    drawSampledPaths(ctx, paths, progress)
  } else ctx.stroke()
  clearShapeShadow(ctx); ctx.restore()

  const text = node.text ?? node.label
  const maxWidth = box.width * 0.58, maxHeight = box.height * 0.42
  const fontSize = text ? fitTextFontSize(text, node.style.fontSize ?? 40, maxWidth, maxHeight, maxWidth, node.lineHeight ?? 1.3,
    (line, size) => measureTextWidth(line, size, node.style.fontFamily), 18) : node.style.fontSize ?? 40
  drawLabel(render, text, node.position, { color: node.style.color, fontSize, fontFamily: node.style.fontFamily,
    maxWidth, align: "center", lineHeight: node.lineHeight }, shouldUseRoughSampledGeometry(node) ? (progress >= 1 ? 1 : 0) : progress)
}

export const diamond: ShapeRenderer = { draw: drawDiamond, boundingBox: diamondBoundingBox }
