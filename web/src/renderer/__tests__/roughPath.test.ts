import { describe, expect, it } from "vitest"
import type { Drawable } from "roughjs/bin/core"
import { drawSampledPaths, sampleRoughDrawable, shouldUseRoughSampledGeometry } from "@/renderer/roughPath.ts"
import { features } from "@/defaults/features.ts"
import type { SceneNode } from "@/ir/types.ts"

describe("rough sampled geometry", () => {
  it("samples cubic rough operations deterministically", () => {
    const drawable = {
      shape: "line",
      options: {} as Drawable["options"],
      sets: [{
        type: "path",
        ops: [
          { op: "move", data: [0, 0] },
          { op: "bcurveTo", data: [0, 10, 10, 10, 10, 0] },
        ],
      }],
    } as Drawable
    const first = sampleRoughDrawable(drawable, 4)
    expect(sampleRoughDrawable(drawable, 4)).toEqual(first)
    expect(first[0]?.points).toHaveLength(5)
    expect(first[0]?.points.at(-1)).toEqual({ x: 10, y: 0 })
  })

  it("reveals sampled strokes by their combined length", () => {
    const moves: Array<[string, number[]]> = []
    const context = {
      beginPath: () => moves.push(["begin", []]),
      moveTo: (x: number, y: number) => moves.push(["move", [x, y]]),
      lineTo: (x: number, y: number) => moves.push(["line", [x, y]]),
      stroke: () => moves.push(["stroke", []]),
    } as unknown as CanvasRenderingContext2D
    drawSampledPaths(context, [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }], 0.5)
    expect(moves).toEqual([
      ["begin", []],
      ["move", [0, 0]],
      ["line", [5, 0]],
      ["stroke", []],
    ])
  })

  it("keeps sampled geometry opt-in", () => {
    const node = { data: {} } as SceneNode
    const previous = features.roughSampledGeometry
    try {
      features.roughSampledGeometry = false
      expect(shouldUseRoughSampledGeometry(node)).toBe(false)
      expect(shouldUseRoughSampledGeometry({ data: { roughSampledGeometry: true } } as SceneNode)).toBe(true)
      features.roughSampledGeometry = true
      expect(shouldUseRoughSampledGeometry(node)).toBe(true)
    } finally {
      features.roughSampledGeometry = previous
    }
  })
})
