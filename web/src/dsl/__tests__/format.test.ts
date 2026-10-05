import { describe, expect, it } from "vitest"
import { formatScript } from "@/dsl/format.ts"

describe("formatScript", () => {
  it("formats nested blocks and their END markers consistently", () => {
    const source = `VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Nested"
CREATE title AS TEXT
TEXT "Hello"
POSITION 960 300
END
PARALLEL
CREATE dot AS CIRCLE
POSITION 500 500
RADIUS 30
END
END
END SCENE`

    expect(formatScript(source)).toBe(`VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Nested"
  CREATE title AS TEXT
    TEXT "Hello"
    POSITION 960 300
  END
  PARALLEL
    CREATE dot AS CIRCLE
      POSITION 500 500
      RADIUS 30
    END
  END
END SCENE`)
  })

  it("preserves meaningful line content and is idempotent", () => {
    const source = `SCENE 1 "Keep  spacing"
  CREATE note AS TEXT
    TEXT "END is just text"
    // keep this comment
  END
END SCENE   `
    const formatted = formatScript(source)

    expect(formatted).toBe(`SCENE 1 "Keep  spacing"
  CREATE note AS TEXT
    TEXT "END is just text"
    // keep this comment
  END
END SCENE`)
    expect(formatScript(formatted)).toBe(formatted)
  })

  it("indents continued properties without turning them into blocks", () => {
    const source = `SCENE 1 "Properties"
SAY "Hello"
DURATION 2s
ARROW first -> second
LABEL "Next"
INK UNDERLINE title
COLOR #336699
WAIT 1s
END SCENE`

    expect(formatScript(source)).toBe(`SCENE 1 "Properties"
  SAY "Hello"
    DURATION 2s
  ARROW first -> second
    LABEL "Next"
  INK UNDERLINE title
    COLOR #336699
  WAIT 1s
END SCENE`)
  })
})
