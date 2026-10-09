import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import {
  drawSubtitleLayer,
  reelsCaptionFontSize,
} from "@/renderer/subtitles.ts"
import { watermarkLayout } from "@/renderer/watermark.ts"

describe("Reels captions", () => {
  it("uses smaller responsive captions for vertical canvases", () => {
    expect(reelsCaptionFontSize(1080)).toBe(54)
    expect(reelsCaptionFontSize(540)).toBe(27)
    expect(reelsCaptionFontSize(320)).toBe(26)
  })

  it("places reel captions above the bottom watermark area", () => {
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

    expect((minY + maxY) / 2).toBeCloseTo(canvas.height * 0.87, -1)
  })

  it("keeps long captions above the watermark without jumping upward", () => {
    const canvas = createCanvas(1080, 1350)
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    drawSubtitleLayer(
      context,
      {
        text: "Anthropic says Opus performs at Fable's level on most work, for less than half the price.",
        start: 0,
        duration: 9,
        opacity: 1,
        readingProgress: 0.5,
      },
      { width: 1080, height: 1350 }
    )

    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    let maxY = -1
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (image.data[(y * canvas.width + x) * 4 + 3] > 0)
          maxY = Math.max(maxY, y)
      }
    }

    const watermark = watermarkLayout(context, { width: 1080, height: 1350 })
    expect(maxY).toBeLessThan(watermark.y - 10)
    expect(maxY).toBeGreaterThan(1350 * 0.8)
  })

  it("shows static subtitle text without a moving word highlight", () => {
    const render = (readingProgress: number) => {
      const canvas = createCanvas(540, 960)
      const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
      drawSubtitleLayer(
        context,
        {
          text: "Three quick tips for better diagrams keep captions simple and clear",
          start: 0,
          duration: 3,
          opacity: 1,
          readingProgress,
        },
        { width: 540, height: 960 },
        1,
        false,
        "bold"
      )
      return Buffer.from(context.getImageData(0, 0, 540, 960).data)
    }

    const start = render(0)
    expect(start.some((channel) => channel !== 0)).toBe(true)
    expect(start.equals(render(0.8))).toBe(true)
  })

  it("keeps the three caption styles visually distinct", () => {
    const render = (style: "bold" | "minimal" | "coral") => {
      const canvas = createCanvas(540, 960)
      const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
      drawSubtitleLayer(
        context,
        {
          text: "Simple clear captions",
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

    expect(render("bold").equals(render("minimal"))).toBe(false)
    expect(render("bold").equals(render("coral"))).toBe(false)
  })
})
