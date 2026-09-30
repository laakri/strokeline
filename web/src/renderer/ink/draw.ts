import type { Point, SceneNode } from "@/ir/types.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { smoothPath } from "@/renderer/ink/path.ts"
import { wobblePath } from "@/renderer/ink/wobble.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"

export function inkBoundingBox(node: SceneNode): BoundingBox {
  const points = node.points ?? []
  if (points.length === 0) return { x: node.position.x, y: node.position.y, width: 0, height: 0 }
  const padding = (node.style.strokeWidth ?? 4) / 2
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { x: minX - padding, y: minY - padding, width: maxX - minX + padding * 2, height: maxY - minY + padding * 2 }
}

export function pathLength(points: Point[]): number {
  let length = 0
  for (let index = 1; index < points.length; index++) length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  return length
}

export function subpathForLength(points: Point[], length: number): Point[] {
  if (points.length === 0) return []
  if (length <= 0) return [{ ...points[0] }]
  const cumulative = [0]
  for (let index = 1; index < points.length; index++) cumulative.push(cumulative[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y))
  const total = cumulative[cumulative.length - 1]
  if (total === 0 || length >= total) return points.map((point) => ({ ...point }))
  for (let index = 0; index < points.length - 1; index++) {
    if (length <= cumulative[index + 1]) {
      const segmentLength = cumulative[index + 1] - cumulative[index]
      const t = segmentLength === 0 ? 0 : (length - cumulative[index]) / segmentLength
      const cut = { x: points[index].x + (points[index + 1].x - points[index].x) * t, y: points[index].y + (points[index + 1].y - points[index].y) * t }
      return points.slice(0, index + 1).map((point) => ({ ...point })).concat([cut])
    }
  }
  return points.map((point) => ({ ...point }))
}

/** Full smoothed + wobbled path for an ink stroke (deterministic per object id). */
export function inkPathPoints(controls: Point[], id: string, mode: "handdrawn" | "clean", samplesPerSegment = 12): Point[] {
  const smoothed = smoothPath(controls, samplesPerSegment)
  return mode === "clean" ? smoothed : wobblePath(smoothed, id)
}

/** Path prefix revealed along stroke length as revealProgress goes 0 -> 1. */
export function revealedInkPath(controls: Point[], revealProgress: number, id: string, mode: "handdrawn" | "clean", samplesPerSegment = 12): Point[] {
  const path = inkPathPoints(controls, id, mode, samplesPerSegment)
  return subpathForLength(path, revealProgress * pathLength(path))
}

export function drawInk(renderContext: RenderContext, node: SceneNode): void {
  const controls = node.points ?? []
  if (controls.length < 2) return
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const path = revealedInkPath(controls, progress, node.id, renderContext.mode)
  if (path.length < 2) return
  const sourceProperties = node.data?._sourceProperties as string[] | undefined
  if (!sourceProperties?.includes("REVEAL")) {
    renderContext.roughCanvas.linearPath(path.map((point) => [point.x, point.y] as [number, number]), strokeOptions(node, renderContext.cameraScale))
    return
  }
  const segments = path.length - 1
  for (let index = 0; index < segments; index++) {
    const edge = Math.min(1, (index + 1) / 4, (segments - index) / 4)
    const style = strokeOptions(node, renderContext.cameraScale)
    renderContext.roughCanvas.line(
      path[index]!.x,
      path[index]!.y,
      path[index + 1]!.x,
      path[index + 1]!.y,
      { ...style, strokeWidth: style.strokeWidth * (0.35 + edge * 0.65), seed: style.seed + index }
    )
  }
}
