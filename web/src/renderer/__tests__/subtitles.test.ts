import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { drawScene } from "@/renderer/draw.ts"
import { visibleSubtitleLines } from "@/renderer/subtitles.ts"
import type { RenderState } from "@/timeline/timeline.ts"

describe("subtitle rendering", () => {
  it("advances long landscape captions instead of hiding text after two lines", () => {
    const text =
      "The reader should keep speaking while the captions advance through every line. Each spoken phrase stays visible on screen, including the final sentence at the end."
    const opening = visibleSubtitleLines(text, 0)
    const ending = visibleSubtitleLines(text, 1)

    expect(opening).toHaveLength(2)
    expect(ending).toHaveLength(2)
    expect(opening.map(({ text: line }) => line).join(" ")).toContain("The reader")
    expect(ending.map(({ text: line }) => line).join(" ")).toContain("at the end.")
    expect(ending.map(({ text: line }) => line).join(" ")).not.toContain("The reader")
  })

  it("keeps subtitles fixed when the camera zooms", () => {
    const render = (scale: number) => {
      const canvas = createCanvas(1920, 1080)
      const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
      const state: RenderState = {
        nodes: [],
        highlights: [],
        camera: { position: { x: 960, y: 540 }, scale },
        subtitle: {
          text: "The *boundary* stays still.",
          start: 0,
          duration: 2,
          opacity: 1,
        },
      }
      drawScene(context, state, undefined, { width: 1920, height: 1080 }, "#FAFAFA", "clean", "plain", false, true)
      return Buffer.from(context.getImageData(0, 0, 1920, 1080).data)
    }

    expect(render(3).equals(render(1))).toBe(true)
  })
})
