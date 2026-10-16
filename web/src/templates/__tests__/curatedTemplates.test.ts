import { describe, expect, it } from "vitest"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { runScript } from "@/dsl/index.ts"
import {
  CURATED_TEMPLATES,
  DIAGRAM_TEMPLATES,
  TEMPLATE_LIBRARY,
} from "@/templates/diagramTemplates.ts"

describe("curated template library", () => {
  it("keeps every supplied WBS project once alongside the original starters", () => {
    expect(CURATED_TEMPLATES).toHaveLength(14)
    expect(TEMPLATE_LIBRARY).toHaveLength(27)
    expect(new Set(TEMPLATE_LIBRARY.map((template) => template.id)).size).toBe(
      TEMPLATE_LIBRARY.length
    )
    expect(
      new Set(CURATED_TEMPLATES.map((template) => template.script)).size
    ).toBe(CURATED_TEMPLATES.length)
    expect(TEMPLATE_LIBRARY.slice(0, DIAGRAM_TEMPLATES.length)).toEqual(
      DIAGRAM_TEMPLATES
    )
  })

  it("compiles every curated project without blocking diagnostics", () => {
    for (const template of CURATED_TEMPLATES) {
      const result = runScript(template.script)
      expect(
        result.document,
        `${template.id}: ${JSON.stringify(result.diagnostics)}`
      ).not.toBeNull()
      expect(result.diagnostics.filter(blocksScriptRun), template.id).toEqual(
        []
      )
      expect(result.document?.scenes.length, template.id).toBeGreaterThan(0)
    }
  })
})
