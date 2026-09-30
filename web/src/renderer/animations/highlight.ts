import type { SceneNode } from "@/ir/types.ts"
import { seedFromId, strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"
import { ShapeRegistry } from "@/renderer/shapes/registry.ts"

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

export function highlightEllipsePoints(box: BoundingBox, seed: number, count = 44): Array<[number, number]> {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const rx = Math.max(24, box.width / 2 + 20)
  const ry = Math.max(24, box.height / 2 + 20)
  const rng = mulberry32(seed)
  const points: Array<[number, number]> = []
  for (let index = 0; index <= count; index++) {
    const angle = (index / count) * Math.PI * 2
    const wobbleX = 0.92 + rng() * 0.16
    const wobbleY = 0.92 + rng() * 0.16
    points.push([cx + Math.cos(angle) * rx * wobbleX, cy + Math.sin(angle) * ry * wobbleY])
  }
  return points
}

export function drawHighlight(renderContext: RenderContext, target: SceneNode, color: string, drawProgress: number): void {
  if (target.type === "ink") return
  const baseBounds = ShapeRegistry[target.type].boundingBox(target)
  const seed = seedFromId(target.id)
  const rng = mulberry32(seed)
  const passes = 2
  for (let pass = 0; pass < passes; pass++) {
    const passProgress = Math.max(0, Math.min(1, drawProgress * passes - pass))
    if (passProgress <= 0) continue
    const offsetX = (rng() - 0.5) * 10
    const offsetY = (rng() - 0.5) * 10
    const points = highlightEllipsePoints({ ...baseBounds, x: baseBounds.x + offsetX, y: baseBounds.y + offsetY }, seed + pass * 1337)
    const end = Math.max(2, Math.ceil(passProgress * points.length))
    renderContext.roughCanvas.linearPath(points.slice(0, end), {
      ...strokeOptions(target, renderContext.cameraScale),
      stroke: color,
      strokeWidth: 11 / renderContext.cameraScale,
      roughness: 1.3,
      bowing: 1.4,
    })
  }
}

export const highlight: (renderContext: RenderContext, target: SceneNode, color: string, drawProgress: number) => void = drawHighlight