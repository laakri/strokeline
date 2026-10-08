import rough from "roughjs/bundled/rough.esm.js"
import type { RoughCanvas } from "roughjs/bin/canvas"
import type { RoughGenerator } from "roughjs/bin/generator"
import { features } from "@/defaults/features.ts"
import { loadTextFont } from "@/lib/textMetrics.ts"
import type { SceneNode } from "@/ir/types.ts"

const roughCanvasCache = new WeakMap<HTMLCanvasElement, RoughCanvas>()
const roughGenerator = rough.generator()

export interface RenderContext {
  context: CanvasRenderingContext2D
  roughCanvas: RoughCanvas
  roughGenerator: RoughGenerator
  nodes: Map<string, SceneNode>
  cameraScale: number
  mode: "handdrawn" | "chalk" | "marker" | "pencil" | "brush" | "clean"
}

export function createRenderContext(
  context: CanvasRenderingContext2D,
  nodes: Map<string, SceneNode>,
  cameraScale = 1,
  mode: RenderContext["mode"] = "handdrawn"
): RenderContext {
  if (!context.canvas)
    throw new Error("A canvas-backed 2D context is required.")
  let roughCanvas = roughCanvasCache.get(context.canvas)
  if (!roughCanvas) {
    roughCanvas = rough.canvas(context.canvas)
    roughCanvasCache.set(context.canvas, roughCanvas)
  }
  return { context, roughCanvas, roughGenerator, nodes, cameraScale, mode }
}

export function seedFromId(id: string): number {
  let hash = 2166136261
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function strokeOptions(node: SceneNode, cameraScale = 1) {
  const pen = node.style.pen
  return {
    seed: seedFromId(node.id),
    stroke: node.style.color,
    strokeWidth: cameraScaledStrokeWidth(node.style.strokeWidth, cameraScale),
    fill: node.style.fill,
    roughness: pen === "clean" ? 0 : pen === "chalk" ? 2 : pen === "pencil" ? 1.5 : pen === "marker" ? 0.25 : pen === "brush" ? 1.8 : 1.2,
    bowing: pen === "marker" || pen === "clean" ? 0 : 1,
  }
}

export function cameraScaledStrokeWidth(
  width: number,
  cameraScale = 1
): number {
  if (!features.cameraScaledStrokes) return width / cameraScale
  return Math.max(width, 0.75 / cameraScale)
}

export const loadHandwrittenFont = loadTextFont
