import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import type { SceneNode } from "@/ir/types.ts"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import { drawCircle } from "@/renderer/shapes/circle.ts"

describe("circle stroke reveal", () => {
  it("does not clip the outline at the circle's left or right edges", () => {
    const canvas = createCanvas(200, 200)
    const context = canvas.getContext("2d")
    const node: SceneNode = {
      id: "circle",
      type: "circle",
      position: { x: 100, y: 100 },
      radius: 40,
      rotation: 0,
      opacity: 1,
      style: { color: "#000000", strokeWidth: 8, pen: "clean" },
      layer: 0,
    }
    const render = createRenderContext(
      context as unknown as CanvasRenderingContext2D,
      new Map([[node.id, node]]),
      1,
      "clean"
    )

    drawCircle(render, node)

    const alphaAt = (x: number) => context.getImageData(x, 100, 1, 1).data[3]
    const rightStrokeVisible = [140, 141, 142, 143, 144].some(
      (x) => alphaAt(x) > 0
    )
    expect(alphaAt(56)).toBeGreaterThan(0)
    expect(rightStrokeVisible).toBe(true)
  })
})
