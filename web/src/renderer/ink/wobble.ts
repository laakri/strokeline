import type { Point } from "@/ir/types.ts"
import { seedFromId } from "@/renderer/handdrawn.ts"

/** Rough.js-style small random perpendicular jitter, seeded by object id so it is stable across re-renders. */
export function wobblePath(points: Point[], id: string, amplitude = 1.8): Point[] {
  if (points.length < 3) return points.map((point) => ({ ...point }))
  const rng = mulberry32(seedFromId(id))
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) return point
    const previous = points[index - 1]
    const next = points[index + 1]
    const dx = next.x - previous.x
    const dy = next.y - previous.y
    const length = Math.hypot(dx, dy) || 1
    const perpendicularX = -dy / length
    const perpendicularY = dx / length
    const offset = (rng() - 0.5) * 2 * amplitude
    return { x: point.x + perpendicularX * offset, y: point.y + perpendicularY * offset }
  })
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}