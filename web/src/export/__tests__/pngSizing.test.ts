import { describe, expect, it } from "vitest"
import {
  MAX_PNG_EXPORT_DIMENSION,
  MAX_PNG_EXPORT_PIXELS,
  pngExportSize,
} from "@/export/pngSizing.ts"

describe("PNG export sizing", () => {
  it("preserves 2x output for a standard HD canvas", () => {
    expect(pngExportSize({ width: 1920, height: 1080 })).toEqual({
      width: 3840,
      height: 2160,
    })
  })

  it("caps pixel count for large canvases while preserving aspect ratio", () => {
    const size = pngExportSize({ width: 8000, height: 5000 })
    expect(size.width * size.height).toBeLessThanOrEqual(MAX_PNG_EXPORT_PIXELS)
    expect(size.width).toBeLessThan(8000 * 2)
    expect(size.width / size.height).toBeCloseTo(8000 / 5000, 2)
  })

  it("caps either output dimension even for extreme aspect ratios", () => {
    const size = pngExportSize({ width: 20_000, height: 1000 })
    expect(size.width).toBeLessThanOrEqual(MAX_PNG_EXPORT_DIMENSION)
    expect(size.height).toBeLessThanOrEqual(MAX_PNG_EXPORT_DIMENSION)
    expect(size.width / size.height).toBeCloseTo(20, 0)
  })

  it("rejects invalid canvas dimensions", () => {
    expect(() => pngExportSize({ width: 0, height: 100 })).toThrow(RangeError)
    expect(() => pngExportSize({ width: Infinity, height: 100 })).toThrow(
      RangeError
    )
  })
})
