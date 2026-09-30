import { drawInk, inkBoundingBox } from "@/renderer/ink/draw.ts"
import type { ShapeRenderer } from "@/renderer/shapes/registry.ts"

export const InkRegistry: { ink: ShapeRenderer } = {
  ink: { draw: drawInk, boundingBox: inkBoundingBox },
}