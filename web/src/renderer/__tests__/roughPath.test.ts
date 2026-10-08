import { describe, expect, it } from "vitest"
import type { Drawable } from "roughjs/bin/core"
import { drawSampledPaths, drawSampledPathsParallel, pointAtSampledPenProgress, pointAtSampledProgress, sampleRoughDrawable, sampledRoughPathsForNode, shouldUseRoughSampledGeometry } from "@/renderer/roughPath.ts"
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

  it("reveals Rough overdraw strokes in parallel", () => {
    const moves: Array<[string, number[]]> = []
    const context = {
      beginPath: () => moves.push(["begin", []]),
      moveTo: (x: number, y: number) => moves.push(["move", [x, y]]),
      lineTo: (x: number, y: number) => moves.push(["line", [x, y]]),
      stroke: () => moves.push(["stroke", []]),
    } as unknown as CanvasRenderingContext2D
    drawSampledPathsParallel(context, [
      { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
      { points: [{ x: 0, y: 1 }, { x: 10, y: 1 }] },
    ], 0.5)
    expect(moves).toEqual([
      ["begin", []],
      ["move", [0, 0]],
      ["line", [5, 0]],
      ["move", [0, 1]],
      ["line", [5, 1]],
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

  it("uses the same sampled rough tip for pen progress", () => {
    const node = {
      id: "rough-line",
      type: "line",
      position: { x: 0, y: 0 },
      data: {
        roughSampledGeometry: true,
        from: { x: 0, y: 0 },
        to: { x: 100, y: 0 },
      },
      style: { color: "#111", strokeWidth: 3, pen: "handdrawn" },
    } as SceneNode
    const paths = sampledRoughPathsForNode(node)
    const tip = pointAtSampledProgress(paths, 0.5)
    const lengths = paths.map((path) => path.points.reduce((sum, point, index) => {
      const previous = path.points[index - 1]
      return previous ? sum + Math.hypot(point.x - previous.x, point.y - previous.y) : sum
    }, 0))
    const total = lengths.reduce((sum, length) => sum + length, 0)
    let remaining = total * 0.5
    let expected = paths[0]!.points.at(-1)!
    for (let index = 0; index < paths.length; index++) {
      if (remaining <= lengths[index]!) {
        expected = pointAtSampledProgress([paths[index]!], lengths[index] ? remaining / lengths[index]! : 0).point
        break
      }
      remaining -= lengths[index]!
    }
    expect(tip.point).toEqual(expected)
  })

  it("honors explicit rough seed and roughness options", () => {
    const base = {
      id: "rough-options",
      type: "rectangle",
      position: { x: 100, y: 100 },
      size: { width: 180, height: 90 },
      style: { color: "#111", strokeWidth: 3, pen: "handdrawn" },
      data: { roughSampledGeometry: true, roughSeed: 7, roughness: 0 },
    } as SceneNode
    const same = sampledRoughPathsForNode({ ...base, data: { ...base.data } })
    const different = sampledRoughPathsForNode({ ...base, data: { ...base.data, roughSeed: 8, roughness: 3 } })
    expect(same).toEqual(sampledRoughPathsForNode({ ...base, data: { ...base.data } }))
    expect(different).not.toEqual(same)
  })

  it("lifts and travels between disconnected sampled strokes", () => {
    const paths = [
      { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
      { points: [{ x: 300, y: 100 }, { x: 400, y: 100 }] },
    ]
    const result = pointAtSampledPenProgress(paths, 0.5)
    expect(result.lift).toBeGreaterThan(0)
    expect(result.point.x).toBeGreaterThan(100)
    expect(result.point.x).toBeLessThan(300)
  })
})
