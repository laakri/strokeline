import type { Point } from "@/ir/types.ts"

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

/** Shaft with 1-2 synthetic slightly-offset midpoints plus a hand-drawn arrowhead as two short terminal segments. */
export function arrowPoints(from: Point, to: Point, seed: number): Point[] {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const length = Math.hypot(deltaX, deltaY) || 1
  const nx = deltaX / length
  const ny = deltaY / length
  const px = -ny
  const py = nx
  const rng = mulberry32(seed)
  const mid1 = { x: from.x + nx * length * 0.34 + px * (rng() - 0.5) * 7, y: from.y + ny * length * 0.34 + py * (rng() - 0.5) * 7 }
  const mid2 = { x: from.x + nx * length * 0.7 + px * (rng() - 0.5) * 7, y: from.y + ny * length * 0.7 + py * (rng() - 0.5) * 7 }
  const headLength = Math.min(28, length * 0.3)
  const headHalf = headLength * 0.5
  const base = { x: to.x - nx * headLength, y: to.y - ny * headLength }
  const top = { x: base.x + px * headHalf, y: base.y + py * headHalf }
  const bottom = { x: base.x - px * headHalf, y: base.y - py * headHalf }
  return [from, mid1, mid2, to, top, to, bottom]
}

/** Horizontal-ish gently wavy stroke spanning the box width, just below it. */
export function underlinePoints(box: Bounds, seed: number, count = 7): Point[] {
  const rng = mulberry32(seed)
  const overhang = 8 + rng() * 14
  const amplitude = 2.5 + rng() * 3
  const arc = 2 + rng() * 4
  const y = box.y + box.height + 10 + rng() * 6
  const points: Point[] = []
  for (let index = 0; index < count; index++) {
    const t = index / (count - 1)
    const x = box.x - overhang + t * (box.width + overhang * 2)
    const wave = Math.sin(t * Math.PI * 2) * amplitude
    const sag = arc * (1 - 4 * (t - 0.5) * (t - 0.5))
    points.push({ x: x + (rng() - 0.5) * 3, y: y + wave + sag })
  }
  return points
}

/** Loose imperfect ellipse loop of points around the box, slightly overlapping at the closure. */
export function circleAnnotationPoints(box: Bounds, seed: number, count = 36): Point[] {
  const rng = mulberry32(seed)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const rx = Math.max(32, box.width / 2 + 16 + rng() * 10)
  const ry = Math.max(32, box.height / 2 + 16 + rng() * 10)
  const rotation = (rng() - 0.5) * 0.12
  const total = Math.PI * 2 + 0.6
  const points: Point[] = []
  for (let index = 0; index <= count; index++) {
    const angle = (index / count) * total
    const wobbleX = 0.92 + rng() * 0.16
    const wobbleY = 0.92 + rng() * 0.16
    const lx = Math.cos(angle) * rx * wobbleX
    const ly = Math.sin(angle) * ry * wobbleY
    points.push({ x: cx + lx * Math.cos(rotation) - ly * Math.sin(rotation), y: cy + lx * Math.sin(rotation) + ly * Math.cos(rotation) })
  }
  return points
}

export function samePoint(left: Point | undefined, right: Point | undefined): boolean {
  return !!left && !!right && left.x === right.x && left.y === right.y
}