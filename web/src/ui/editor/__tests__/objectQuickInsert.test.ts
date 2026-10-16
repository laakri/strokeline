import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { objectInsertOptionsForQuery } from "@/ui/editor/objectInsertOptions.ts"

describe("canvas object insertion", () => {
  it("shows useful drawing and diagram tools before the icon library", () => {
    const options = objectInsertOptionsForQuery("")
    expect(options.slice(0, 7).map((option) => option.label)).toEqual([
      "Text",
      "Rectangle",
      "Rounded card",
      "Circle",
      "Ellipse",
      "Diamond",
      "Line",
    ])
    expect(options.some((option) => option.category === "Icon")).toBe(false)
    expect(
      options.some((option) => option.category.startsWith("Brand · "))
    ).toBe(false)
  })

  it("keeps Lucide icons searchable without leading with them", () => {
    expect(
      objectInsertOptionsForQuery("lucide symbol star").some(
        (option) => option.label === "star" && option.category === "Icon"
      )
    ).toBe(true)
  })

  it("provides insertable examples that compile at the chosen playhead time", () => {
    const options = objectInsertOptionsForQuery("")
    const failures: string[] = []
    for (const option of options) {
      const result = runScript(`VERSION 1.0
CANVAS 1080 1920
SCENE 1
  AT 2.5s
${option
  .snippet("VERSION 1.0\nCANVAS 1080 1920\nSCENE 1", { x: 320, y: 240 })
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
END SCENE`)
      const errors = result.diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error"
      )
      const operations = result.document?.scenes[0]?.ops ?? []
      const simultaneousComposite = [
        "Timeline",
        "Elbow arrow",
        "Callout",
      ].includes(option.label)
      const startsAtPlayhead =
        operations.length > 0 &&
        Math.min(...operations.map((operation) => operation.t)) === 2.5
      if (
        !result.document ||
        errors.length > 0 ||
        !startsAtPlayhead ||
        (simultaneousComposite &&
          !operations.every((operation) => operation.t === 2.5))
      ) {
        failures.push(
          option.label +
            ": " +
            (errors.length > 0
              ? JSON.stringify(errors)
              : "operation times " +
                JSON.stringify(operations.map((operation) => operation.t)))
        )
      }
    }
    expect(failures).toEqual([])
  })
})
