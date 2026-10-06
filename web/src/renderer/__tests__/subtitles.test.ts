import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import { drawScene } from "@/renderer/draw.ts"
import type { RenderState } from "@/timeline/timeline.ts"

describe("subtitle rendering", () => {
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
