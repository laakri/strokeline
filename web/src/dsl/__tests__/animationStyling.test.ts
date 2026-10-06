import { describe, expect, it } from "vitest"
import { createCanvas } from "@napi-rs/canvas"
import { runScript } from "@/dsl/index.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import { drawRectangle } from "@/renderer/shapes/rectangle.ts"
import type { SceneNode } from "@/ir/types.ts"

const header = `VERSION 1.0
CANVAS 800 600
SCENE 1 "Feature"
`

describe("extended animation and shape styling", () => {
  it("parses and interpolates opacity, color, and curved MOVE", () => {
    const result = runScript(`${header}  CREATE dot AS CIRCLE
    POSITION 100 100
    RADIUS 20
    COLOR #000000
    DRAW 0.1s
  END
  PARALLEL
    ANIMATE dot OPACITY TO 0.25 DURATION 1s EASE linear
    ANIMATE dot COLOR TO #FFFFFF DURATION 1s EASE linear
  END
  ANIMATE dot MOVE TO 300 100 ARC 80 DURATION 1s EASE linear
END SCENE`)
    expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([])
    const timeline = new Timeline(result.document!.scenes[0]!, result.document!.canvas)

    expect(timeline.resolveAt(0.6).nodes[0]?.opacity).toBeCloseTo(0.625)
    expect(timeline.resolveAt(0.6).nodes[0]?.style.color).toBe("#808080")
    expect(timeline.resolveAt(1.6).nodes[0]?.position).toEqual({ x: 200, y: 140 })
    expect(timeline.resolveAt(2.1).nodes[0]?.position).toEqual({ x: 300, y: 100 })
  })

  it("reports E_BAD_RANGE for invalid animation and shape visual values", () => {
    const result = runScript(`${header}  CREATE box AS RECTANGLE
    POSITION 100 100
    WIDTH 100
    HEIGHT 80
    GRADIENT #FFFFFF
    SHADOW 120
  END
  ANIMATE box OPACITY TO 1.5
  ANIMATE box COLOR TO "red"
  ANIMATE box MOVE TO 200 200 ARC 3000
END SCENE`)
    expect(result.diagnostics.filter((item) => item.code === "E_BAD_RANGE")).toHaveLength(5)
    expect(result.document).toBeNull()
  })

  it("renders gradient fills and soft shape shadows", () => {
    const canvas = createCanvas(100, 100)
    const context = canvas.getContext("2d")
    const node: SceneNode = {
      id: "gradient-box",
      type: "rectangle",
      position: { x: 50, y: 50 },
      size: { width: 60, height: 60 },
      cornerRadius: 0,
      rotation: 0,
      opacity: 1,
      style: {
        color: "#222222",
        strokeWidth: 1,
        gradient: ["#FF0000", "#0000FF"],
        shadow: 12,
        pen: "clean",
      },
      layer: 0,
    }
    drawRectangle(
      createRenderContext(
        context as unknown as CanvasRenderingContext2D,
        new Map(),
        1,
        "clean"
      ),
      node
    )

    const top = context.getImageData(50, 25, 1, 1).data
    const bottom = context.getImageData(50, 75, 1, 1).data
    const shadow = context.getImageData(50, 83, 1, 1).data
    expect(top[0]).toBeGreaterThan(top[2]!)
    expect(bottom[2]).toBeGreaterThan(bottom[0]!)
    expect(shadow[3]).toBeGreaterThan(0)
  })
})
