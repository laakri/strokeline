import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"

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
  ctx.save()
  ctx.beginPath(); ctx.rect(box.x, box.y, box.width * progress, box.height); ctx.clip()
  ctx.beginPath(); ctx.moveTo(points[0]!.x, points[0]!.y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  if (node.style.fill) {
    ctx.fillStyle = node.style.fill; ctx.shadowColor = "rgba(20,35,55,.14)"
    ctx.shadowBlur = 12 / render.cameraScale; ctx.shadowOffsetY = 4 / render.cameraScale; ctx.fill()
  }
  ctx.shadowColor = "transparent"; ctx.strokeStyle = node.style.color
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  ctx.lineJoin = "round"; ctx.stroke(); ctx.restore()

  const text = node.text ?? node.label
  const maxWidth = box.width * 0.58, maxHeight = box.height * 0.42
  const fontSize = text ? fitTextFontSize(text, node.style.fontSize ?? 40, maxWidth, maxHeight, maxWidth, node.lineHeight ?? 1.3,
    (line, size) => measureTextWidth(line, size, node.style.fontFamily), 18) : node.style.fontSize ?? 40
  drawLabel(render, text, node.position, { color: node.style.color, fontSize, fontFamily: node.style.fontFamily,
    maxWidth, align: "center", lineHeight: node.lineHeight }, progress)
}

export const diamond: ShapeRenderer = { draw: drawDiamond, boundingBox: diamondBoundingBox }
