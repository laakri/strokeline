import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

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
  const path = rectangleRevealPath(box, progress)
  if (path.length > 1)
    renderContext.roughCanvas.linearPath(
      path,
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

export const rectangle: ShapeRenderer = {
  draw: drawRectangle,
  boundingBox: rectangleBoundingBox,
}
