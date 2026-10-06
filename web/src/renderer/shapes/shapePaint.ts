import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"

export function fillShape(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  bounds: BoundingBox,
  cameraScale: number,
  tracePath: () => void,
  includeShadow = true
): void {
  if (!node.style.fill && !node.style.gradient) return
  context.beginPath()
  tracePath()
  if (node.style.gradient) {
    const gradient = context.createLinearGradient(
      bounds.x,
      bounds.y,
      bounds.x,
      bounds.y + bounds.height
    )
    gradient.addColorStop(0, node.style.gradient[0])
    gradient.addColorStop(1, node.style.gradient[1])
    context.fillStyle = gradient
  } else {
    context.fillStyle = node.style.fill!
  }
  if (includeShadow) applyShapeShadow(context, node, cameraScale)
  context.fill()
  if (includeShadow) clearShapeShadow(context)
}

export function drawShapeShadow(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  bounds: BoundingBox,
  cameraScale: number,
  tracePath: () => void,
  revealProgress: number
): void {
  if (
    revealProgress < 1 ||
    !node.style.shadow ||
    (!node.style.fill && !node.style.gradient)
  )
    return
  context.save()
  fillShape(context, node, bounds, cameraScale, tracePath)
  context.restore()
}

export function applyShapeShadow(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  cameraScale: number
): void {
  const blur = node.style.shadow
  if (blur === undefined || blur <= 0) return
  context.shadowColor = "rgba(15, 23, 42, 0.2)"
  context.shadowBlur = blur / cameraScale
  context.shadowOffsetX = 0
  context.shadowOffsetY = blur / (4 * cameraScale)
}

export function clearShapeShadow(context: CanvasRenderingContext2D): void {
  context.shadowColor = "transparent"
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
}
