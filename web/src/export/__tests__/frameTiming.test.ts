import { describe, expect, it } from "vitest"
import { frameCountForDuration, frameTimestamp } from "@/export/frameTiming.ts"

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
})
