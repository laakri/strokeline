import type { Drawable, Op } from "roughjs/bin/core"
import type { Point, SceneNode } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"

export interface SampledPath {
  points: Point[]
}

const cache = new Map<string, SampledPath[]>()

function sampleCubic(start: Point, data: number[], samples: number): Point[] {
  const [x1, y1, x2, y2, x3, y3] = data
  return Array.from({ length: samples }, (_, index) => {
    const t = (index + 1) / samples
    const inverse = 1 - t
    return {
      x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * x1 + 3 * inverse * t ** 2 * x2 + t ** 3 * x3,
      y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * y1 + 3 * inverse * t ** 2 * y2 + t ** 3 * y3,
    }
  })
}

function sampleOps(ops: Op[], samplesPerCurve: number): SampledPath[] {
  const paths: SampledPath[] = []
  let path: Point[] = []
  let current: Point | undefined
  for (const operation of ops) {
    if (operation.op === "move") {
      if (path.length > 1) paths.push({ points: path })
      current = { x: operation.data[0]!, y: operation.data[1]! }
      path = [current]
    } else if (operation.op === "lineTo") {
      current = { x: operation.data[0]!, y: operation.data[1]! }
      path.push(current)
    } else if (operation.op === "bcurveTo" && current) {
      const points = sampleCubic(current, operation.data, samplesPerCurve)
      path.push(...points)
      current = points[points.length - 1]
    }
  }
  if (path.length > 1) paths.push({ points: path })
  return paths
}

/** Converts deterministic roughjs operations into stable polylines for reveal and replay. */
export function sampleRoughDrawable(drawable: Drawable, samplesPerCurve = 14): SampledPath[] {
  return drawable.sets
    .filter((set) => set.type === "path")
    .flatMap((set) => sampleOps(set.ops, samplesPerCurve))
}

export function cachedSampledRoughPath(
  key: string,
  factory: () => SampledPath[]
): SampledPath[] {
  const existing = cache.get(key)
  if (existing) return existing
  const paths = factory()
  if (cache.size > 256) cache.delete(cache.keys().next().value!)
  cache.set(key, paths)
  return paths
}

export function roughSampledGeometryEnabled(node: SceneNode): boolean {
  return node.data?.roughSampledGeometry === true || node.data?._roughSampledGeometry === true
}

export function shouldUseRoughSampledGeometry(node: SceneNode): boolean {
  return features.roughSampledGeometry || roughSampledGeometryEnabled(node)
}

export function polylineLength(points: Point[]): number {
  let length = 0
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y)
  }
  return length
}

function trimPolyline(points: Point[], distance: number): Point[] {
  if (points.length < 2 || distance <= 0) return distance <= 0 ? points.slice(0, 1) : points.slice()
  const result = [points[0]!]
  let remaining = distance
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!, current = points[index]!
    const segment = Math.hypot(current.x - previous.x, current.y - previous.y)
    if (remaining >= segment) {
      result.push(current)
      remaining -= segment
      continue
    }
    const ratio = segment ? remaining / segment : 0
    result.push({ x: previous.x + (current.x - previous.x) * ratio, y: previous.y + (current.y - previous.y) * ratio })
    break
  }
  return result
}

/** Draws all sampled strokes in one global length domain, making draw-on deterministic. */
export function drawSampledPaths(
  context: CanvasRenderingContext2D,
  paths: SampledPath[],
  progress = 1
): void {
  const lengths = paths.map((path) => polylineLength(path.points))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * Math.max(0, Math.min(1, progress))
  context.beginPath()
  for (let index = 0; index < paths.length; index++) {
    const points = trimPolyline(paths[index]!.points, remaining)
    remaining -= Math.min(remaining, lengths[index]!)
    if (points.length < 2) continue
    context.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) context.lineTo(point.x, point.y)
  }
  context.stroke()
}
