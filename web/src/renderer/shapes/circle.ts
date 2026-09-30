import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

export function circleBoundingBox(node: SceneNode): BoundingBox {
  const diameter = (node.radius ?? 0) * 2
  return {
    x: node.position.x - diameter / 2,
    y: node.position.y - diameter / 2,
    width: diameter,
    height: diameter,
  }
}

export function drawCircle(
  renderContext: RenderContext,
  node: SceneNode
): void {
  const radius = node.radius ?? 0
  const progress = Math.max(
    0,
    Math.min(
      1,
      (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1
    )
  )
  if (progress > 0)
    renderContext.roughCanvas.arc(
      node.position.x,
      node.position.y,
      radius * 2,
      radius * 2,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2,
      false,
      strokeOptions(node, renderContext.cameraScale)
    )
  drawLabel(
    renderContext,
    node.text ?? node.label,
    node.position,
    {
      color: node.style.color,
      fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE,
      maxWidth: node.maxWidth,
      align: node.align,
      lineHeight: node.lineHeight,
    },
    progress
  )
}

export const circle: ShapeRenderer = {
  draw: drawCircle,
  boundingBox: circleBoundingBox,
}
