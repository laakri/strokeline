import { describe, expect, it } from "vitest"
import { fitCanvasToBounds } from "@/renderer/canvasLayout.ts"

describe("preview canvas fit", () => {
  it("fits vertical Reels canvases inside both preview width and height", () => {
    expect(
      fitCanvasToBounds(
        { width: 1080, height: 1920 },
        { width: 420, height: 560 }
      )
    ).toEqual({ width: 315, height: 560 })
  })

  it("fits landscape canvases using the limiting dimension", () => {
    expect(
      fitCanvasToBounds(
        { width: 1920, height: 1080 },
        { width: 500, height: 600 }
      )
    ).toEqual({ width: 500, height: 281 })
  })

  it("returns an empty size for unavailable bounds", () => {
    expect(
      fitCanvasToBounds(
        { width: 1080, height: 1920 },
        { width: 0, height: 400 }
      )
    ).toEqual({ width: 0, height: 0 })
  })
})
