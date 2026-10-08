import { describe, expect, it } from "vitest"
import { createCanvas } from "@napi-rs/canvas"
import { runScript } from "@/dsl/index.ts"
import { drawScene } from "@/renderer/draw.ts"
import { Timeline } from "@/timeline/timeline.ts"

describe("Rough patterned fills", () => {
  it.each(["RECTANGLE", "CIRCLE", "ELLIPSE", "DIAMOND"])(
    "renders dots without painting an opaque solid fill for %s",
    (shape) => {
      const shapeProperties = shape === "CIRCLE"
        ? "RADIUS 60"
        : shape === "RECTANGLE" || shape === "DIAMOND" || shape === "ELLIPSE"
          ? "WIDTH 160\n    HEIGHT 120"
          : ""
      const result = runScript(`VERSION 1.0
CANVAS 240 180
SCENE 1
  CREATE patterned AS ${shape}
    POSITION 120 90
    ${shapeProperties}
    COLOR #202020
    FILL #ff0000
    ROUGH on
    ROUGHNESS 1.5
    ROUGHSEED 7
    ROUGHFILL dots
    DRAW 1s
  END
END SCENE`)
      expect(result.diagnostics).toEqual([])
      const document = result.document!
      const timeline = new Timeline(document.scenes[0]!, document.canvas)
      const state = timeline.resolveAt(1)
      const renderedNode = state.nodes[0]!
      expect(renderedNode.type).toBe(shape.toLowerCase())
      expect(renderedNode.data?.roughSampledGeometry).toBe(true)
      expect(renderedNode.data?.roughFill).toBe("dots")
      expect(renderedNode.style.fill).toBe("#ff0000")
      const canvas = createCanvas(240, 180)
      const context = canvas.getContext("2d")
      drawScene(
        context as unknown as CanvasRenderingContext2D,
        state,
        undefined,
        document.canvas,
        "#ffffff",
        "clean"
      )

      const pixels = context.getImageData(60, 50, 120, 80).data
      let redPixels = 0
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! > 180 && pixels[index + 1]! < 100 && pixels[index + 2]! < 100)
          redPixels++
      }
      expect(redPixels).toBeGreaterThan(20)
      expect(redPixels).toBeLessThan(120 * 80 * 0.85)
    }
  )
})
