import { describe, expect, it } from "vitest"
import {
  CANVAS_PRESETS,
  canvasPresetValue,
  replaceCanvasSize,
} from "@/ui/editor/canvasPresets.ts"

describe("editor canvas presets", () => {
  it("switches the canvas dimensions while preserving the rest of the script", () => {
    const source = `VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Starter"
  CREATE title AS TEXT
    POSITION 960 300
    TEXT "Keep this"
  END
END SCENE`

    const updated = replaceCanvasSize(source, 1080, 1920)

    expect(updated).toContain("CANVAS 1080 1920")
    expect(updated).toContain('SCENE 1 "Starter"')
    expect(updated).toContain('TEXT "Keep this"')
    expect(canvasPresetValue(updated)).toBe("1080x1920")
  })

  it("offers all requested aspect ratios and leaves custom sizes selectable", () => {
    expect(CANVAS_PRESETS.map(({ width, height }) => [width, height])).toEqual([
      [1920, 1080],
      [1080, 1920],
      [1080, 1350],
      [1080, 1080],
    ])
    expect(canvasPresetValue("VERSION 1.0\nCANVAS 1000 1600")).toBe("")
  })
})
