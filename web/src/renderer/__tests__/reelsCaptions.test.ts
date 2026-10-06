import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { drawSubtitleLayer } from "@/renderer/subtitles.ts"

describe("Reels captions", () => {
  it("centers captions in the lower third at 75 percent height", () => {
    const canvas = createCanvas(540, 960)
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    drawSubtitleLayer(
      context,
      {
        text: "A lower caption",
        start: 0,
        duration: 3,
        opacity: 1,
        readingProgress: 0.4,
      },
      { width: 540, height: 960 }
    )

    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    let minY = canvas.height
    let maxY = -1
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (image.data[(y * canvas.width + x) * 4 + 3] === 0) continue
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    expect((minY + maxY) / 2).toBeCloseTo(canvas.height * 0.75, -1)
  })

  it("renders distinct word-highlight caption styles in the lower third", () => {
    const render = (style: "bold" | "minimal" | "coral") => {
      const canvas = createCanvas(540, 960)
      const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
      drawSubtitleLayer(
        context,
        {
          text: "Three quick tips for better diagrams",
          start: 0,
          duration: 3,
          opacity: 1,
          readingProgress: 0.4,
        },
        { width: 540, height: 960 },
        1,
        false,
        style
      )
      return Buffer.from(context.getImageData(0, 0, 540, 960).data)
    }

    const bold = render("bold")
    expect(bold.some((channel) => channel !== 0)).toBe(true)
    expect(bold.equals(render("minimal"))).toBe(false)
    expect(bold.equals(render("coral"))).toBe(false)
  })
})
