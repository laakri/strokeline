import { describe, expect, it } from "vitest"
import { measureTextWidth } from "@/lib/textMetrics.ts"

describe("loaded-font text metrics", () => {
  it("measures glyph widths with the registered handwritten font", () => {
    const wide = measureTextWidth("WWWW", 48)
    const narrow = measureTextWidth("iiii", 48)
    expect(wide).toBeGreaterThan(narrow * 2)
  })
})
