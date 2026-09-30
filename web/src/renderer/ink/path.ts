import type { Point } from "@/ir/types.ts"

/** Renders the control polyline through a uniform Catmull-Rom spline so handwriting curves, not polylines. */
export function smoothPath(points: Point[], samplesPerSegment = 12): Point[] {
  if (points.length < 2) return points.map((point) => ({ ...point }))
  const result: Point[] = [{ ...points[0] }]
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? points[index + 1]
    for (let step = 1; step <= samplesPerSegment; step++) {
      const t = step / samplesPerSegment
      result.push(catmullRom(p0, p1, p2, p3, t))
    }
  }
  return result
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}