import { describe, expect, it } from "vitest"
import {
  captionActiveWord,
  estimateDocumentDuration,
  exceedsDurationPreset,
  overlapsReelsUi,
} from "@/reels/reels.ts"
import type { SceneDocument } from "@/ir/types.ts"
import { runScript } from "@/dsl/index.ts"
import { parseScript } from "@/dsl/parser.ts"

describe("Reels layout helpers", () => {
  it("detects text intersecting social video UI zones only on vertical canvases", () => {
    const canvas = { width: 1080, height: 1920 }
    expect(overlapsReelsUi({ x: 300, y: 100, width: 300, height: 60 }, canvas)).toBe(true)
    expect(overlapsReelsUi({ x: 300, y: 150, width: 300, height: 60 }, canvas)).toBe(false)
    expect(overlapsReelsUi({ x: 300, y: 1600, width: 300, height: 60 }, canvas)).toBe(false)
    expect(overlapsReelsUi({ x: 300, y: 800, width: 760, height: 60 }, canvas)).toBe(true)
    expect(
      overlapsReelsUi(
        { x: 300, y: 10, width: 300, height: 60 },
        { width: 1920, height: 1080 }
      )
    ).toBe(false)
  })

  it("warns on vertical-script text placed behind platform UI", () => {
    const result = runScript(`VERSION 1.0
CANVAS 1080 1920
SCENE 1 "Reels"
  CREATE hook AS TEXT
    POSITION 540 100
    SIZE 48
    TEXT "A top hook"
  END
END SCENE`)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "W_REELS_UI_OVERLAP" })
    )
  })

  it("respects an explicit SUBTITLES off setting for vertical narration", () => {
    const script = `VERSION 1.0
CANVAS 1080 1920
SUBTITLES off
SCENE 1 "Reels"
  SAY "Caption preference can be overridden."
    DURATION 2s
END SCENE`
    expect(parseScript(script).ast.subtitles).toBe(false)
    const result = runScript(script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.document!.subtitles).toBe(false)
  })

  it("estimates full script length including visual and transition durations", () => {
    const document: SceneDocument = {
      version: "1.0",
      canvas: { width: 1080, height: 1920 },
      background: "#FFFFFF",
      style: { mode: "clean", strokeWidth: 3, font: "neat" },
      scenes: [
        {
          id: "1",
          index: 1,
          duration: 8,
          transition: { type: "fade", duration: 1 },
          ops: [],
        },
        { id: "2", index: 2, duration: 6, ops: [] },
      ],
    }
    expect(estimateDocumentDuration(document)).toBe(15)
    expect(exceedsDurationPreset(estimateDocumentDuration(document), 7)).toBe(true)
    expect(exceedsDurationPreset(estimateDocumentDuration(document), 15)).toBe(false)
  })

  it("advances the highlighted word with the caption timeline", () => {
    expect(captionActiveWord(0, 4)).toBe(0)
    expect(captionActiveWord(0.5, 4)).toBe(2)
    expect(captionActiveWord(1, 4)).toBe(3)
  })
})
