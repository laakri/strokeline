import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"

describe("label backgrounds", () => {
  it("draws text in its own color and opacity over the background", () => {
    const canvas = createCanvas(300, 120)
    const context = canvas.getContext("2d")
    const render = createRenderContext(
      context as unknown as CanvasRenderingContext2D,
      new Map(),
      1,
      "clean"
    )

    drawLabel(
      render,
      "Branch: a safe copy to try new ideas",
      { x: 150, y: 60 },
      {
        color: "#1F2A33",
        fontSize: 32,
        maxWidth: 260,
        background: "#DDF0E2",
        backgroundOpacity: 0.2,
        backgroundPadding: 12,
        backgroundCorners: 12,
      }
    )

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let opaqueDarkPixels = 0
    let translucentBackgroundPixels = 0
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blue, alpha] = pixels.slice(index, index + 4)
      if (alpha! === 255 && red! < 100 && green! < 120 && blue! < 140)
        opaqueDarkPixels++
      if (alpha! > 0 && alpha! < 100 && green! > red!)
        translucentBackgroundPixels++
    }

    expect(opaqueDarkPixels).toBeGreaterThan(100)
    expect(translucentBackgroundPixels).toBeGreaterThan(1000)
  })
})
