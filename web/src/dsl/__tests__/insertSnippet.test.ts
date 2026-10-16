import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { makeSceneInsertEdit } from "@/dsl/insertSnippet.ts"
import { DIAGRAM_TEMPLATES } from "@/templates/diagramTemplates.ts"

function insertAt(source: string, snippet: string, sceneIndex = 0): string {
  const edit = makeSceneInsertEdit(source, snippet, sceneIndex)
  if (!edit) throw new Error("Expected the source to contain a scene.")
  return source.slice(0, edit.from) + edit.insert + source.slice(edit.to)
}

describe("scene snippet insertion", () => {
  it.each(DIAGRAM_TEMPLATES)(
    "keeps the $title template valid after inserting text",
    (template) => {
      const source = template.script
      const added = insertAt(
        source,
        `AT 1.25s
CREATE inserted_text AS TEXT
  TEXT "Example"
  POSITION 320 240
  SIZE 48
  COLOR #1F2A44
  DRAW 0.6s
END`
      )
      const result = runScript(added)

      expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
      expect(
        result.diagnostics.filter(
          (diagnostic) => diagnostic.severity === "error"
        )
      ).toEqual([])
    }
  )

  it("keeps insertion offsets correct for CRLF source", () => {
    const source = `VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE original AS CIRCLE
    POSITION 100 100
    RADIUS 20
  END
END SCENE`.replace(/\n/g, "\r\n")
    const added = insertAt(
      source,
      `AT 1.25s
CREATE inserted_text AS TEXT
  TEXT "Example"
  POSITION 320 240
  SIZE 48
  COLOR #1F2A44
  DRAW 0.6s
END`
    )
    const result = runScript(added)

    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([])
  })

  it("uses the actual end-of-file offset when a scene is unclosed", () => {
    const source = `VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE original AS CIRCLE
    POSITION 100 100
    RADIUS 20
  END`
    const edit = makeSceneInsertEdit(
      source,
      'CREATE inserted AS TEXT\n  TEXT "Example"\nEND'
    )

    expect(edit?.from).toBe(source.length)
    expect(edit?.to).toBe(source.length)
    expect(edit?.insert).toMatch(/^\n/)
  })

  it.each([
    ["transition", "  TRANSITION fade DURATION 0.5s"],
    ["gap", "  GAP DURATION 1s"],
    [
      "transition and gap",
      "  TRANSITION fade DURATION 0.5s\n  GAP DURATION 1s",
    ],
  ])("inserts before trailing scene %s directives", (_label, directives) => {
    const source = `VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE original AS CIRCLE
    POSITION 100 100
    RADIUS 20
  END
${directives}
END SCENE`
    const added = insertAt(
      source,
      `AT 1.25s
CREATE inserted_text AS TEXT
  TEXT "Example"
  POSITION 320 240
  SIZE 48
  COLOR #1F2A44
  DRAW 0.6s
END`
    )
    const result = runScript(added)

    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([])
    expect(added.indexOf("AT 1.25s")).toBeLessThan(added.indexOf(directives))
    expect(
      result.document?.scenes[0]?.ops.find(
        (operation) =>
          operation.kind === "create" && operation.node.id === "inserted_text"
      )
    ).toMatchObject({ kind: "create", t: 1.25 })
  })
})
