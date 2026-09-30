import type { SceneNode } from "@/ir/types.ts"
import { arrowEndpoints } from "@/renderer/geometry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { ShapeRegistry } from "@/renderer/shapes/registry.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

export function arrowBoundingBox(node: SceneNode): BoundingBox {
  return { x: node.position.x, y: node.position.y, width: 0, height: 0 }
}

export function drawArrow(renderContext: RenderContext, node: SceneNode): void {
  const from = renderContext.nodes.get(String(node.data?.fromId ?? ""))
  const to = renderContext.nodes.get(String(node.data?.toId ?? ""))
  if (!from || !to) return
  const fromBox = nodeBounds(from)
  const toBox = nodeBounds(to)
  const { start, end } = arrowEndpoints(from, to, fromBox, toBox)
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const options = strokeOptions(node, renderContext.cameraScale)
  const revealedEnd = { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress }
  renderContext.roughCanvas.line(start.x, start.y, revealedEnd.x, revealedEnd.y, options)
  if (progress < 0.98) return
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const headLength = 14 / renderContext.cameraScale
  const headWidth = 6 / renderContext.cameraScale
  const left = { x: end.x - headLength * Math.cos(angle) + headWidth * Math.sin(angle), y: end.y - headLength * Math.sin(angle) - headWidth * Math.cos(angle) }
  const right = { x: end.x - headLength * Math.cos(angle) - headWidth * Math.sin(angle), y: end.y - headLength * Math.sin(angle) + headWidth * Math.cos(angle) }
  renderContext.roughCanvas.polygon([[end.x, end.y], [left.x, left.y], [right.x, right.y]], { ...options, fill: node.style.color, fillStyle: "solid" })
  const anglePerpendicular = { x: -Math.sin(angle) * 18 / renderContext.cameraScale, y: Math.cos(angle) * 18 / renderContext.cameraScale }
  drawLabel(renderContext, node.label ?? node.text, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, { color: node.style.color, fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE, offset: anglePerpendicular }, progress)
}

export const arrow: ShapeRenderer = { draw: drawArrow, boundingBox: arrowBoundingBox }

function nodeBounds(node: SceneNode): BoundingBox {
  return node.type === "ink" ? inkBoundingBox(node) : ShapeRegistry[node.type].boundingBox(node)
}
