import type { Point, SceneNode } from "@/ir/types.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"

export function pointOnBoundary(node: SceneNode, toward: Point, box: BoundingBox): Point {
  const center = node.position
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  if (dx === 0 && dy === 0) return center
  if (node.type === "circle") {
    const radius = node.radius ?? Math.min(box.width, box.height) / 2
    const length = Math.hypot(dx, dy)
    return { x: center.x + (dx / length) * radius, y: center.y + (dy / length) * radius }
  }
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2
  const scale = Math.min(Math.abs(halfWidth / dx) || Number.POSITIVE_INFINITY, Math.abs(halfHeight / dy) || Number.POSITIVE_INFINITY)
  return { x: center.x + dx * scale, y: center.y + dy * scale }
}

export function arrowEndpoints(source: SceneNode, target: SceneNode, sourceBox: BoundingBox, targetBox: BoundingBox): { start: Point; end: Point } {
  return {
    start: pointOnBoundary(source, target.position, sourceBox),
    end: pointOnBoundary(target, source.position, targetBox),
  }
}