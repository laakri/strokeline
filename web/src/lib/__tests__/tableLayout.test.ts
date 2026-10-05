import { describe, expect, it } from "vitest"
import { layoutTable, TABLE_MIN_FONT_SIZE } from "@/lib/tableLayout.ts"

describe("table layout", () => {
  it("widens content-heavy tables rather than clipping single-line cells", () => {
    const longValue = "AccountReference".repeat(5)
    const layout = layoutTable(
      ["Attribute", "Operation"],
      [[longValue, "disableAccount()"]],
      320,
      240,
      undefined,
      40,
    )

    expect(layout.width).toBeGreaterThan(320)
    expect(layout.cells[1]![0]!.fontSize).toBeGreaterThanOrEqual(TABLE_MIN_FONT_SIZE)
    expect(layout.cells[1]![0]!.fits).toBe(true)
    expect(layout.cells[1]![0]!.text.lines).toEqual([longValue])
  })

  it("measures header text with the same emphasis used by the renderer", () => {
    const layout = layoutTable(
      ["Wider emphasized header"],
      [],
      600,
      120,
      undefined,
      40,
    )
    const header = layout.cells[0]![0]!

    expect(header.fontSize).toBe(40)
    expect(header.fits).toBe(true)
    expect(layout.columnWidths[0]).toBeGreaterThanOrEqual(header.text.width + 36)
  })
})
