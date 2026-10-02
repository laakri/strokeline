import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { repair, repairSyntax, repairWithAiRetries } from "@/dsl/repair.ts"

const header = "VERSION 1.0\nCANVAS 1920 1080\n"

describe("deterministic script repair", () => {
  it("repairs syntax without changing scene content or coordinates", () => {
    const source = `${header}SCENE 1 "Exact"
  CREATE dot AS CIRCLE
    POSITION 127 392
    RADIUS 27
  ANIMATE dot MOVE 222 333
END SCENE`
    const result = repairSyntax(source)
    const expected = `${header}SCENE 1 "Exact"
  CREATE dot AS CIRCLE
    POSITION 127 392
    RADIUS 27
  END
  ANIMATE dot MOVE TO 222 333
END SCENE`

    expect(result.script).toBe(expected)
    expect(result.script.match(/^\s*CREATE\b/gm)).toHaveLength(1)
    expect(repairSyntax(result.script).script).toBe(result.script)
  })

  it("closes missing sibling blocks and restores required TO keywords", () => {
    const broken = `${header}SCENE 1 "First"
CREATE title AS TEXT
POSITION 400 200
TEXT "Heading"
CREATE circle1 AS CIRCLE
POSITION 400 400
RADIUS 20
ANIMATE circle1 MOVE 420 420
INK ARROW FROM 100 100 300 300
SCENE 2 "Second"
CREATE box1 AS RECTANGLE
POSITION 600 400
SIZE 200 100
CREATE label AS TEXT
POSITION 600 400
TEXT "Box"
END SCENE`

    const result = repair(broken)
    expect(result.truncated).toBe(false)
    expect(result.script).toContain("ANIMATE circle1 MOVE TO 420 420")
    expect(result.script).toContain("INK ARROW FROM 100 100 TO 300 300")
    expect(runScript(result.script).diagnostics.filter((item) => item.severity === "error")).toEqual([])
    expect(repair(result.script).script).toBe(result.script)
  })

  it("repairs common structure and mechanical mistakes, preserves valid code, and bounds AI retries", async () => {
    const cases = [
      {
        name: "missing final scene close and duration unit",
        before: `${header}SCENE 7 "Last"\n  WAIT 1`,
        after: `${header}SCENE 1 "Last"\n  WAIT 1s\nEND SCENE`,
      },
      {
        name: "tabs and trailing spaces",
        before: `${header}SCENE 1 "Whitespace"\n\tWAIT 1   \nEND SCENE`,
        after: `${header}SCENE 1 "Whitespace"\n  WAIT 1s\nEND SCENE`,
      },
      {
        name: "missing END inside PARALLEL",
        before: `${header}SCENE 1 "Parallel"\n  PARALLEL\n    WAIT 1s\nEND SCENE`,
        after: `${header}SCENE 1 "Parallel"\n  PARALLEL\n    WAIT 1s\n  END\nEND SCENE`,
      },
      {
        name: "extra END after ANIMATE",
        before: `${header}SCENE 1 "Animation"\n  CREATE dot AS CIRCLE\n    POSITION 960 540\n    RADIUS 30\n  END\n  ANIMATE dot MOVE TO 1000 540\n  END\nEND SCENE`,
        after: `${header}SCENE 1 "Animation"\n  CREATE dot AS CIRCLE\n    POSITION 960 540\n    RADIUS 30\n  END\n  ANIMATE dot MOVE TO 1000 540\nEND SCENE`,
      },
      {
        name: "INK ARROW missing END",
        before: `${header}SCENE 1 "Ink"\n  INK ARROW FROM 100 100 TO 200 200\nEND SCENE`,
        after: `${header}SCENE 1 "Ink"\n  INK ARROW FROM 100 100 TO 200 200\n  END\nEND SCENE`,
      },
      {
        name: "markdown fences and prose",
        before: `Generated scene:\n\`\`\`wbs\n${header}SCENE 1 "Fenced"\nEND SCENE\n\`\`\`\nMore notes`,
        after: `${header}SCENE 1 "Fenced"\nEND SCENE`,
      },
      {
        name: "bare and duplicated scene headings",
        before: `${header}SCENE\n\nSCENE\nEND SCENE`,
        after: `${header}SCENE 1\n\nEND SCENE`,
      },
      {
        name: "ids, opacity, color, and camera reset",
        before: `${header}SCENE 4 "Properties"\n  CREATE mark-one AS CIRCLE\n    POSITION 960 540\n    RADIUS 40\n    OPACITY 2\n    COLOR #ABC\n    FILL FFF\n    DRAW 1\n  END\n  ANIMATE mark-one MOVE TO 970 550\n  CAMERA ZOOM 1.2\nEND SCENE`,
        after: `${header}SCENE 1 "Properties"\n  CREATE mark_one AS CIRCLE\n    POSITION 960 540\n    RADIUS 40\n    OPACITY 1\n    COLOR #AABBCC\n    FILL #FFFFFF\n    DRAW 1s\n  END\n  ANIMATE mark_one MOVE TO 970 550\n  CAMERA ZOOM 1.2\n  CAMERA RESET\nEND SCENE`,
      },
      {
        name: "duplicate ids and their later references",
        before: `${header}SCENE 1 "Duplicates"\n  CREATE dot AS CIRCLE\n    POSITION 400 540\n    RADIUS 24\n  END\n  CREATE dot AS CIRCLE\n    POSITION 800 540\n    RADIUS 24\n  END\n  ANIMATE dot MOVE TO 820 540\nEND SCENE`,
        after: `${header}SCENE 1 "Duplicates"\n  CREATE dot AS CIRCLE\n    POSITION 400 540\n    RADIUS 24\n  END\n  CREATE dot_2 AS CIRCLE\n    POSITION 800 540\n    RADIUS 24\n  END\n  ANIMATE dot_2 MOVE TO 820 540\nEND SCENE`,
      },
      {
        name: "inline LINE coordinates and invalid tone",
        before: `${header}SCENE 1 "Line"\n  CREATE edge AS LINE\n    FROM 100 100 TO 200 200\n  END\n  SAY "A short narration"\n    DURATION 2\n    TONE warm\nEND SCENE`,
        after: `${header}SCENE 1 "Line"\n  CREATE edge AS LINE\n    FROM 100 100\n    TO 200 200\n  END\n  SAY "A short narration"\n    DURATION 2s\nEND SCENE`,
      },
      {
        name: "removes emoji and comment markers inside text",
        before: `${header}SCENE 1 "Text"\n  SAY "An emoji 😀 and hash # and // markers"\n    DURATION 3s\nEND SCENE`,
        after: `${header}SCENE 1 "Text"\n  SAY "An emoji  and hash  and  markers"\n    DURATION 3s\nEND SCENE`,
      },
      {
        name: "unsafe missing required position is reported",
        before: `${header}SCENE 1 "Needs help"\n  CREATE title AS TEXT\n    TEXT "Title"\n  END\nEND SCENE`,
        after: `${header}SCENE 1 "Needs help"\n  CREATE title AS TEXT\n    TEXT "Title"\n  END\nEND SCENE`,
      },
      {
        name: "drop transition and gap on final scene",
        before: `${header}SCENE 1 "Last"\n  WAIT 1s\n  TRANSITION fade DURATION 0.5s\n  GAP DURATION 1s\nEND SCENE`,
        after: `${header}SCENE 1 "Last"\n  WAIT 1s\nEND SCENE`,
      },
    ]

    for (const testCase of cases) {
      const result = repair(testCase.before)
      expect(result.script, testCase.name).toBe(testCase.after)
      expect(repair(result.script).script, `${testCase.name} idempotence`).toBe(result.script)
      if (result.script !== testCase.before)
        expect(result.fixes.every((fix) => fix.line > 0 && fix.description.length > 0), testCase.name).toBe(true)
      if (testCase.name === "unsafe missing required position is reported") {
        expect(result.unfixable.some((item) => item.includes("E_MISSING_REQUIRED_PROP"))).toBe(true)
      }
    }

    const missingScaffold = repair("WAIT 1s")
    expect(missingScaffold.script).toBe(`${header}SCENE 1 "Scene 1"\nWAIT 1s\nEND SCENE`)
    expect(runScript(missingScaffold.script).diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([])

    const valid = `${header}SCENE 1 "Stable"\n  CREATE circle AS CIRCLE\n    POSITION 960 540\n    RADIUS 64\n  END\nEND SCENE`
    expect(repair(valid)).toMatchObject({ script: valid, fixes: [], truncated: false })

    const partial = repair(`${header}SCENE 1 "Partial"\n  SAY "unfinished`)
    expect(partial.truncated).toBe(true)
    expect(partial.script).not.toContain("END SCENE")

    const unknownReference = `${header}SCENE 1 "Retry"\n  ANIMATE missing MOVE TO 1 2\nEND SCENE`
    const requests: Array<{ script: string; error: { code: string } }> = []
    const retried = await repairWithAiRetries(unknownReference, async (request) => {
      requests.push(request)
      return `${header}SCENE 1 "Retry"\nEND SCENE`
    })
    expect(requests).toHaveLength(1)
    expect(Object.keys(requests[0]!).sort()).toEqual(["error", "script"])
    expect(requests[0]!.error.code).toBe("E_UNKNOWN_REF")
    expect(retried.retries).toBe(1)
    expect(retried.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([])

    const retryLimit = await repairWithAiRetries(unknownReference, async (request) => request.script)
    expect(retryLimit.retries).toBe(2)
  })
})
