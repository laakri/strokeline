import { describe, expect, it } from "vitest"
import {
  frameCountForDuration,
  frameTimestamp,
  pingPongFrameTimes,
} from "@/export/frameTiming.ts"
import { videoExportDimensions } from "@/export/exporters.ts"
import type { SceneDocument } from "@/ir/types.ts"

function documentForCanvas(width: number, height: number): SceneDocument {
  return {
    version: "1.0",
    canvas: { width, height },
    background: "#FFFFFF",
    style: { mode: "clean", strokeWidth: 3, font: "neat" },
    scenes: [],
  }
}

describe("deterministic video frame timing", () => {
  it.each([30, 60])(
    "samples exactly duration x %i frames for a 60-second video",
    (fps) => {
      expect(frameCountForDuration(60, fps)).toBe(60 * fps)
      expect(frameTimestamp(frameCountForDuration(60, fps) - 1, fps)).toBe(
        (60 * fps - 1) / fps
      )
    }
  )

  it("rounds a partial final frame up so the export covers the whole duration", () => {
    expect(frameCountForDuration(1.01, 30)).toBe(31)
  })

  it("rejects invalid duration and frame rate", () => {
    expect(() => frameCountForDuration(-1, 30)).toThrow(RangeError)
    expect(() => frameCountForDuration(1, 0)).toThrow(RangeError)
  })

  it("creates a forward and reverse frame sequence for seamless looping", () => {
    expect(pingPongFrameTimes(1, 2)).toEqual([0, 0.5, 1, 0.5])
    expect(pingPongFrameTimes(1, 2).at(-1)).toBe(0.5)
  })

  it("exports portrait canvases at phone-ready 1080x1920 dimensions", () => {
    expect(videoExportDimensions(documentForCanvas(1080, 1920), "1080p")).toEqual({
      width: 1080,
      height: 1920,
    })
    expect(videoExportDimensions(documentForCanvas(1080, 1920), "720p")).toEqual({
      width: 720,
      height: 1280,
    })
    expect(videoExportDimensions(documentForCanvas(1080, 1350), "1080p")).toEqual({
      width: 1080,
      height: 1350,
    })
  })
})
