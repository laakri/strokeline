import { describe, expect, it } from "vitest"
import type { Drawable } from "roughjs/bin/core"
import { drawRoughFill, drawSampledPathGroups, drawSampledPaths, drawSampledPathsParallel, groupSampledPaths, pointAtSampledGroupProgress, pointAtSampledPenProgress, pointAtSampledProgress, sampleRoughDrawable, sampledRoughPathsForNode, shouldUseRoughSampledGeometry } from "@/renderer/roughPath.ts"
import rough from "roughjs/bundled/rough.esm.js"
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

  it("reveals rectangle edge groups sequentially", () => {
    const paths = [
      { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
      { points: [{ x: 0, y: 1 }, { x: 10, y: 1 }] },
      { points: [{ x: 10, y: 0 }, { x: 10, y: 10 }] },
      { points: [{ x: 11, y: 0 }, { x: 11, y: 10 }] },
      { points: [{ x: 10, y: 10 }, { x: 0, y: 10 }] },
      { points: [{ x: 11, y: 10 }, { x: 1, y: 10 }] },
      { points: [{ x: 0, y: 10 }, { x: 0, y: 0 }] },
      { points: [{ x: 1, y: 10 }, { x: 1, y: 0 }] },
    ]
    const groups = groupSampledPaths(paths)
    expect(groups).toHaveLength(4)
    for (const [progress, expectedLines] of [[0.25, 2], [0.5, 4], [0.75, 6]] as const) {
      const moves: Array<[string, number[]]> = []
      const context = {
        beginPath: () => moves.push(["begin", []]),
        moveTo: (x: number, y: number) => moves.push(["move", [x, y]]),
        lineTo: (x: number, y: number) => moves.push(["line", [x, y]]),
        stroke: () => moves.push(["stroke", []]),
      } as unknown as CanvasRenderingContext2D
      drawSampledPathGroups(context, groups, progress)
      expect(moves.filter(([kind]) => kind === "line").length).toBe(expectedLines)
    }
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
    const expected = pointAtSampledGroupProgress(groupSampledPaths(paths), 0.5).point
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

  it("generates visible Rough dots fill operations", () => {
    const node = {
      id: "dots-box",
      type: "rectangle",
      position: { x: 100, y: 100 },
      size: { width: 180, height: 90 },
      style: { color: "#111", fill: "#f5c542", strokeWidth: 3, pen: "handdrawn" },
      data: { roughFill: "dots" },
    } as SceneNode
    let drawable: { sets: Array<{ type: string }>; options: { fillStyle?: string; fillWeight?: number; hachureGap?: number } } | undefined
    drawRoughFill(
      { draw: (value: typeof drawable) => { drawable = value } } as never,
      rough.generator(),
      node
    )
    expect(drawable?.options.fillStyle).toBe("dots")
    expect(drawable?.options.fillWeight).toBeGreaterThan(0)
    expect(drawable?.options.hachureGap).toBeGreaterThan(0)
    expect(drawable?.sets.some((set) => set.type === "fillSketch")).toBe(true)
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
