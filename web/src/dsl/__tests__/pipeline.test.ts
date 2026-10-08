import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { MAX_SCRIPT_LENGTH } from "@/dsl/source.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { hashString, underlinePoints } from "@/dsl/ink.ts"
import { lex } from "@/dsl/lexer.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { textBoundingBox } from "@/renderer/shapes/text.ts"
import { Timeline, morphInterpolatorCacheSize } from "@/timeline/timeline.ts"

const fixtureRoot = dirname(fileURLToPath(import.meta.url))
const readFixtures = (folder: string) =>
  readdirSync(join(fixtureRoot, folder))
    .filter((file) => file.endsWith(".wbs"))
    .sort()
const source = (folder: string, file: string) =>
  readFileSync(join(fixtureRoot, folder, file), "utf8")

describe("DSL pipeline", () => {
  it("supports explicit MORPH only between compatible geometric shapes", () => {
    const result = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE source AS CIRCLE
    POSITION 100 100
    RADIUS 20
  END
  CREATE target AS RECTANGLE
    POSITION 300 100
    WIDTH 80
    HEIGHT 40
  END
  ANIMATE source MORPH TO target DURATION 1s
END SCENE`)
    expect(result.diagnostics).toEqual([])
    const timeline = new Timeline(result.document!.scenes[0]!, result.document!.canvas)
    const first = timeline.resolveAt(2)
    const second = timeline.resolveAt(2)
    expect(first).toEqual(second)
    expect(result.document?.scenes[0]?.ops).toContainEqual(
      expect.objectContaining({
        kind: "animate",
        anim: expect.objectContaining({ verb: "morph", morphTargetId: "target" }),
      })
    )

    const rejected = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE line AS LINE
    FROM 0 0
    TO 100 100
  END
  CREATE target AS RECTANGLE
    POSITION 300 100
    WIDTH 80
    HEIGHT 40
  END
  ANIMATE line MORPH TO target
END SCENE`)
    expect(rejected.diagnostics.some((item) => item.code === "E_BAD_MORPH")).toBe(true)
  })

  it("caches one morph interpolator for repeated resolution", () => {
    const result = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE source AS CIRCLE
    POSITION 120 120
    RADIUS 20
  END
  CREATE target AS DIAMOND
    POSITION 320 120
    WIDTH 90
    HEIGHT 70
  END
  ANIMATE source MORPH TO target DURATION 1s
END SCENE`)
    expect(result.diagnostics).toEqual([])
    const timeline = new Timeline(result.document!.scenes[0]!, result.document!.canvas)
    const before = morphInterpolatorCacheSize()
    timeline.resolveAt(2)
    timeline.resolveAt(2)
    expect(morphInterpolatorCacheSize()).toBe(before + 1)
  })

  it("parses and compiles SAY narration with optional metadata", () => {
    const result = runScript(`VERSION 1.0
CANVAS 1920 1080
SUBTITLES on
SCENE 1 "Narration"
  PARALLEL
    SAY "A *memory* keeps yesterday close."
      DURATION 3s
      WHO "Narrator"
      TONE explain
      LANG en
      DETAIL "Memory links a new moment to an old one."
  END
END SCENE`)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.subtitles).toBe(true)
    expect(result.document?.scenes[0]?.says?.[0]).toMatchObject({
      text: "A *memory* keeps yesterday close.",
      start: 0,
      duration: 3,
      who: "Narrator",
      tone: "explain",
      lang: "en",
      detail: "Memory links a new moment to an old one.",
    })
  })

  it("auto-schedules overlapping SAY lines and reports the repair", () => {
    const result = runScript(`VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Narration"
  PARALLEL
    SAY "First thought."
      DURATION 2s
    SAY "Second thought."
      DURATION 2s
  END
END SCENE`)
    const says = result.document?.scenes[0]?.says ?? []
    expect(result.diagnostics.some((item) => item.code === "W_SAY_OVERLAP")).toBe(true)
    expect(says).toHaveLength(2)
    expect(says[1]!.start).toBeGreaterThanOrEqual(says[0]!.start + says[0]!.duration)
  })

  it("tracks line and column on every token", () => {
    const tokens = lex("VERSION 1.0\nCANVAS 10 20\n")
    expect(tokens[0]).toMatchObject({
      value: "VERSION",
      line: 1,
      col: 1,
      lineStart: true,
    })
    expect(tokens[3]).toMatchObject({
      value: "CANVAS",
      line: 2,
      col: 1,
      lineStart: true,
    })
    expect(tokens.at(-1)?.kind).toBe("eof")
  })

  it("compiles every valid fixture and snapshots the resulting IR", () => {
    for (const file of readFixtures("valid")) {
      const result = runScript(source("valid", file))
      expect(result.diagnostics.filter(blocksScriptRun), file).toEqual([])
      expect(result.document, file).toMatchSnapshot(file)
    }
  })

  it("returns the exact diagnostic codes and lines for broken fixtures", () => {
    const expected: Record<string, Array<[string, number]>> = {
      "01-missing-end.wbs": [["E_UNCLOSED_BLOCK", 3]],
      "02-unknown-ref.wbs": [
        ["E_UNKNOWN_REF", 4],
        ["E_UNKNOWN_REF", 4],
      ],
      "03-duplicate-id.wbs": [["E_DUPLICATE_ID", 9]],
      "04-bad-duration.wbs": [["E_BAD_DURATION", 4]],
      "05-unclosed-parallel.wbs": [["E_UNCLOSED_BLOCK", 3]],
      "06-unknown-type.wbs": [["E_UNKNOWN_TYPE", 4]],
      "07-bad-opacity.wbs": [["E_BAD_RANGE", 8]],
      "08-missing-position.wbs": [["E_MISSING_REQUIRED_PROP", 4]],
      "09-bad-canvas.wbs": [["E_BAD_RANGE", 1]],
      "10-unknown-property.wbs": [["E_UNKNOWN_PROP", 7]],
      "11-unknown-animation-ref.wbs": [["E_UNKNOWN_REF", 4]],
      "12-camera-ref.wbs": [["E_UNKNOWN_REF", 4]],
      "13-header-statement-stall.wbs": [
        ["E_UNEXPECTED_TOKEN", 3],
        ["E_PARSER_STALLED", 3],
        ["E_UNEXPECTED_TOKEN", 3],
      ],
      "14-markdown-fenced.wbs": [],
      "15-duplicate-unknown-source.wbs": [["E_UNKNOWN_REF", 9]],
      "16-duplicate-existing-id.wbs": [["E_DUPLICATE_ID", 9]],
      "17-delete-unknown.wbs": [["E_UNKNOWN_REF", 4]],
      "18-ink-too-few-points.wbs": [["E_INVALID_POINTS", 4]],
      "19-ink-arrow-same.wbs": [["E_INVALID_POINTS", 4]],
      "20-ink-underline-unknown.wbs": [["E_UNKNOWN_REF", 4]],
      "21-ink-circle-unknown.wbs": [["E_UNKNOWN_REF", 4]],
    }
    for (const file of readFixtures("broken").filter(
      (file) => file !== "14-markdown-fenced.wbs"
    )) {
      const result = runScript(source("broken", file))
      expect(result.document, file).toBeNull()
      expect(
        result.diagnostics
          .filter(blocksScriptRun)
          .map((diagnostic) => [diagnostic.code, diagnostic.line]),
        file
      ).toEqual(expected[file])
    }
  })

  it("accepts an AI-style leading markdown fence through the full pipeline", () => {
    const result = runScript(source("broken", "14-markdown-fenced.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document).not.toBeNull()
  })

  it("force-advances a stalled header recovery instead of looping forever", () => {
    const result = runScript(source("broken", "13-header-statement-stall.wbs"))
    expect(result.document).toBeNull()
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "E_PARSER_STALLED"
      )
    ).toBe(true)
  })

  it("rejects input above the script size limit before lexing", () => {
    const result = runScript("x".repeat(MAX_SCRIPT_LENGTH + 1))
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "E_SCRIPT_TOO_LARGE",
    ])
  })

  it("resolves parallel children at one start time and advances by the maximum duration", () => {
    const result = runScript(source("valid", "10-parallel.wbs"))
    const ops = result.document?.scenes[0]?.ops ?? []
    expect(ops[0]?.t).toBe(0)
    expect(ops[1]?.t).toBe(0)
    expect(ops[2]?.t).toBe(2.5)
  })

  it("compiles single-line and multiline ANIMATE properties to identical IR", () => {
    const prefix = `VERSION 1.0
CANVAS 800 600
SCENE 1
CREATE server AS RECTANGLE
POSITION 100 100
WIDTH 100
HEIGHT 50
END
`
    const suffix = "\nEND SCENE"
    const singleLine = runScript(
      `${prefix}ANIMATE server SCALE TO 1.1 DURATION 0.4s EASE easeInOut${suffix}`
    )
    const multiLine = runScript(`${prefix}ANIMATE server SCALE TO 1.1
DURATION 0.4s
EASE easeInOut${suffix}`)
    expect(multiLine.diagnostics).toEqual([])
    expect(multiLine.document).toEqual(singleLine.document)
  })

  it("animates GROUP members together with move, scale, rotate, and fade", () => {
    const result = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1 "Move group"
  GROUP moved
    CREATE left AS CIRCLE
      POSITION 100 100
      RADIUS 10
      DRAW 0.01s
    END
    CREATE right AS CIRCLE
      POSITION 200 100
      RADIUS 10
      DRAW 0.01s
    END
  END
  ANIMATE moved MOVE TO 250 150 DURATION 1s EASE linear
END SCENE
SCENE 2 "Scale group"
  GROUP scaled
    CREATE left AS CIRCLE
      POSITION 100 100
      RADIUS 10
      DRAW 0.01s
    END
    CREATE right AS CIRCLE
      POSITION 200 100
      RADIUS 10
      DRAW 0.01s
    END
  END
  ANIMATE scaled SCALE TO 2 DURATION 1s EASE linear
END SCENE
SCENE 3 "Rotate group"
  GROUP rotated
    CREATE left AS CIRCLE
      POSITION 100 100
      RADIUS 10
      DRAW 0.01s
    END
    CREATE right AS CIRCLE
      POSITION 200 100
      RADIUS 10
      DRAW 0.01s
    END
  END
  ANIMATE rotated ROTATE TO 90 DURATION 1s EASE linear
END SCENE
SCENE 4 "Fade group"
  GROUP faded
    CREATE left AS CIRCLE
      POSITION 100 100
      RADIUS 10
      DRAW 0.01s
    END
    CREATE right AS CIRCLE
      POSITION 200 100
      RADIUS 10
      DRAW 0.01s
    END
  END
  ANIMATE faded FADE 0 DURATION 1s EASE linear
END SCENE`)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])

    const [moveScene, scaleScene, rotateScene, fadeScene] = result.document!.scenes
    const resolveFinalNodes = (scene: (typeof result.document.scenes)[number]) =>
      new Timeline(scene, result.document!.canvas).resolveAt(2).nodes

    expect(resolveFinalNodes(moveScene!)).toMatchObject([
      { position: { x: 200, y: 150 } },
      { position: { x: 300, y: 150 } },
    ])
    expect(resolveFinalNodes(scaleScene!)).toMatchObject([
      { position: { x: 50, y: 100 }, scale: 2 },
      { position: { x: 250, y: 100 }, scale: 2 },
    ])
    expect(resolveFinalNodes(rotateScene!)).toMatchObject([
      { position: { x: 150, y: 50 }, rotation: 90 },
      { position: { x: 150, y: 150 }, rotation: 90 },
    ])
    expect(resolveFinalNodes(fadeScene!)).toMatchObject([
      { opacity: 0 },
      { opacity: 0 },
    ])
  })

  it("treats # and // comments as whitespace while keeping hex colors", () => {
    const script = `VERSION 1.0
CANVAS 1920 1080
# headline comment
SCENE 1 "demo" // trailing comment
  # indented comment
  CREATE box AS RECTANGLE
    POSITION 300 300
    WIDTH 100
    HEIGHT 80
    COLOR #2E86AB
    DRAW 1s # draw fast
  END
END SCENE
`
    const result = runScript(script)
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([])
    expect(result.document?.scenes).toHaveLength(1)
    const op = result.document?.scenes[0]?.ops[0]
    const box = op?.kind === "create" ? op.node : undefined
    expect(box).toMatchObject({ id: "box", type: "rectangle" })
    expect(box?.style?.color).toBe("#2E86AB")

    const tokens = lex("# hello\nCOLOR #2E86AB\nFILL #f00\n# done")
    const colors = tokens.filter((token) => token.kind === "color")
    expect(colors.map((token) => token.value)).toEqual(["#2E86AB", "#f00"])
    expect(
      tokens.some(
        (token) => token.value === "#hello" || token.value === "# done"
      )
    ).toBe(false)
  })

  it("compiles ICON node and validates icon name with Did you mean suggestions", () => {
    const validScript = `VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Icon"
  CREATE brain AS ICON
    NAME "brain"
    POSITION 960 500
    SIZE 120
    COLOR #FFD93D
    DRAW 1s
  END
END SCENE
`
    const validResult = runScript(validScript)
    expect(validResult.diagnostics).toEqual([])
    const scene = validResult.document?.scenes[0]
    const iconOp = scene?.ops.find(
      (op) => op.kind === "create" && op.node.id === "brain"
    )
    expect(iconOp).toBeDefined()
    if (iconOp && iconOp.kind === "create") {
      expect(iconOp.node.type).toBe("icon")
      expect(iconOp.node.data?.iconName).toBe("brain")
      expect(iconOp.node.size).toEqual({ width: 120, height: 120 })
      expect(iconOp.node.style.color).toBe("#FFD93D")
    }

    const typoScript = `VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Icon typo"
  CREATE brain AS ICON
    NAME "brian"
    POSITION 960 500
    SIZE 120
  END
END SCENE
`
    const typoResult = runScript(typoScript)
    expect(
      typoResult.diagnostics.some(
        (d) =>
          d.code === "E_UNKNOWN_ICON" &&
          d.suggestion === 'Did you mean "brain"?'
      )
    ).toBe(true)

    const missingScript = `VERSION 1.0
CANVAS 1920 1080
SCENE 1 "Missing icon name"
  CREATE myIcon AS ICON
    POSITION 960 500
    SIZE 120
  END
END SCENE
`
    const missingResult = runScript(missingScript)
    expect(
      missingResult.diagnostics.some(
        (d) => d.code === "E_MISSING_REQUIRED_PROP"
      )
    ).toBe(true)
  })

  it("decodes escaped newlines and compiles MAXWIDTH for centered multiline text", () => {
    const result = runScript(source("valid", "27-multiline-text.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    const textOp = result.document?.scenes[0]?.ops.find(
      (op) => op.kind === "create"
    )
    expect(textOp?.kind === "create" ? textOp.node : undefined).toMatchObject({
      text: "A line one\nA line two",
      maxWidth: 260,
    })
  })

  it("parses scene-end transition declarations into scene metadata", () => {
    const result = runScript(source("valid", "28-transition.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.scenes.map((scene) => scene.transition)).toEqual([
      { type: "fade", duration: 0.6, source: { line: 10, col: 3 } },
      { type: "wipe", duration: 0.4, source: { line: 19, col: 3 } },
    ])
    const invalid = runScript(
      source("valid", "28-transition.wbs").replace("0.6s", "0s")
    )
    expect(invalid.diagnostics).toContainEqual(
      expect.objectContaining({ code: "E_BAD_RANGE", line: 10, col: 3 })
    )
  })

  it("compiles the all-features showcase example end to end", () => {
    const example = readFileSync(
      join(fixtureRoot, "../../../examples/everything.wbs"),
      "utf8"
    )
    const result = runScript(example)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.scenes).toHaveLength(3)
    expect(
      result.document?.scenes.map((scene) => scene.transition?.type)
    ).toEqual(["fade", "wipe", "none"])

    const firstScene = result.document?.scenes[0]
    const created = firstScene?.ops.filter((op) => op.kind === "create") ?? []
    expect(
      created.find((op) => op.kind === "create" && op.node.id === "headline")
    ).toMatchObject({
      node: { text: "Sketch an idea\nThen make it move", maxWidth: 760 },
    })
    expect(
      created.find((op) => op.kind === "create" && op.node.id === "brain")
    ).toMatchObject({ node: { type: "icon", data: { iconName: "brain" } } })
    expect(
      result.document?.scenes[1]?.ops.some(
        (op) => op.kind === "create" && op.node.data?.iconName === "user"
      )
    ).toBe(true)
    expect(
      firstScene?.ops.some(
        (op) => op.kind === "animate" && op.anim.verb === "highlight"
      )
    ).toBe(true)
    expect(
      firstScene?.ops.some(
        (op) => op.kind === "camera" && op.camera.targetId === "headline"
      )
    ).toBe(true)
    expect(
      firstScene?.ops.some(
        (op) => op.kind === "create" && op.node.type === "ink"
      )
    ).toBe(true)
  })

  it("uses loaded-font Canvas bounds for compiler ink placement", () => {
    const result = runScript(source("valid", "29-measured-text.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    const ops = result.document?.scenes[0]?.ops ?? []
    const textOp = ops.find(
      (op) => op.kind === "create" && op.node.id === "heading"
    )
    const inkOp = ops.find(
      (op) => op.kind === "create" && op.node.type === "ink"
    )
    expect(textOp?.kind).toBe("create")
    expect(inkOp?.kind).toBe("create")
    if (textOp?.kind !== "create" || inkOp?.kind !== "create") return

    const measuredWidth = measureTextWidth("WWWWiiii", 64)
    const bounds = textBoundingBox(textOp.node)
    expect(bounds.width).toBeCloseTo(measuredWidth)
    expect(inkOp.node.points).toEqual(
      underlinePoints(bounds, hashString("underline:heading"))
    )
  })

  it("compiles ALIGN, LINEHEIGHT, and measured FIT without moving POSITION", () => {
    const result = runScript(source("valid", "30-text-layout.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    const create = result.document?.scenes[0]?.ops.find(
      (op) => op.kind === "create" && op.node.id === "heading"
    )
    expect(create?.kind).toBe("create")
    if (create?.kind !== "create") return

    const node = create.node
    const size = node.style.fontSize ?? 72
    const layout = layoutText(
      node.text ?? "",
      size,
      node.maxWidth,
      (line) => measureTextWidth(line, size),
      node.lineHeight
    )
    expect(node).toMatchObject({
      position: { x: 960, y: 450 },
      align: "right",
      lineHeight: 1.5,
      fit: { width: 260, height: 120 },
    })
    expect(size).toBeGreaterThanOrEqual(24)
    expect(size).toBeLessThanOrEqual(72)
    expect(layout.width).toBeLessThanOrEqual(260)
    expect(layout.height).toBeLessThanOrEqual(120)
  })

  it("resolves edge and corner ANCHOR positions from measured bounds", () => {
    const result = runScript(source("valid", "31-anchors.wbs"))
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    const creates =
      result.document?.scenes[0]?.ops.filter((op) => op.kind === "create") ?? []
    const leftCard = creates.find(
      (op) => op.kind === "create" && op.node.id === "leftCard"
    )
    const cornerLabel = creates.find(
      (op) => op.kind === "create" && op.node.id === "cornerLabel"
    )
    expect(
      leftCard?.kind === "create" ? leftCard.node.position : undefined
    ).toEqual({
      x: 180,
      y: 120,
    })
    if (cornerLabel?.kind !== "create") return
    const measuredWidth = measureTextWidth("WWWWiiii", 48)
    const measuredHeight = 48 * 1.3
    expect(cornerLabel.node.anchor).toBe("bottomright")
    expect(cornerLabel.node.position.x).toBeCloseTo(760 - measuredWidth / 2)
    expect(cornerLabel.node.position.y).toBeCloseTo(700 - measuredHeight / 2)
  })

  it("resolves relative placement from earlier measured nodes at compile time", () => {
    const script = source("valid", "32-relative-placement.wbs")
    const result = runScript(script)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    const ops = result.document?.scenes[0]?.ops ?? []
    const node = (id: string) => {
      const op = ops.find(
        (candidate) => candidate.kind === "create" && candidate.node.id === id
      )
      return op?.kind === "create" ? op.node : undefined
    }
    const title = node("title")
    const caption = node("caption")
    const card = node("card")
    const aligned = node("aligned")
    const centered = node("centered")
    expect(title && caption && card && aligned && centered).toBeTruthy()
    if (!title || !caption || !card || !aligned || !centered) return

    const titleBounds = textBoundingBox(title)
    const captionBounds = textBoundingBox(caption)
    expect(captionBounds.x + captionBounds.width / 2).toBeCloseTo(
      titleBounds.x + titleBounds.width / 2
    )
    expect(captionBounds.y).toBeCloseTo(titleBounds.y + titleBounds.height + 30)
    expect(card.position.x - (card.size?.width ?? 0) / 2).toBeCloseTo(
      titleBounds.x + titleBounds.width + 40
    )
    expect(aligned.position.x).toBeCloseTo(
      titleBounds.x + titleBounds.width / 2
    )
    expect(centered.position).toEqual({
      x: titleBounds.x + titleBounds.width / 2,
      y: titleBounds.y + titleBounds.height / 2,
    })

    const invalid = runScript(
      script.replace("BELOW title GAP", "BELOW later GAP")
    )
    expect(invalid.diagnostics).toContainEqual(
      expect.objectContaining({ code: "E_UNKNOWN_REF" })
    )
  })

  it("lays out STACK and GRID children while preserving DRAW times and camera bounds", () => {
    const result = runScript(source("valid", "33-layout-containers.wbs"))
    expect(result.diagnostics).toEqual([])
    const ops = result.document?.scenes[0]?.ops ?? []
    const findCreate = (id: string) =>
      ops.find((op) => op.kind === "create" && op.node.id === id)
    const flow = findCreate("flow")
    const board = findCreate("board")
    const first = findCreate("first")
    const second = findCreate("second")
    const tileA = findCreate("tileA")
    const tileB = findCreate("tileB")
    const tileC = findCreate("tileC")
    expect(
      flow?.kind === "create" ? flow.node.data?.layoutContainer : false
    ).toBe(true)
    expect(
      board?.kind === "create" ? board.node.data?.layoutContainer : false
    ).toBe(true)
    expect(first?.kind === "create" ? first.node.position.x : undefined).toBeCloseTo(
      224.625
    )
    expect(first?.kind === "create" ? first.node.position.y : undefined).toBe(130)
    expect(first?.kind === "create" ? first.t : undefined).toBe(0)
    expect(second?.kind === "create" ? second.t : undefined).toBe(1)
    expect(
      second?.kind === "create" ? second.node.position.x : undefined
    ).toBeCloseTo(224.625)
    expect(tileA?.kind === "create" ? tileA.node.position : undefined).toEqual({
      x: 850,
      y: 130,
    })
    expect(tileB?.kind === "create" ? tileB.node.position : undefined).toEqual({
      x: 966,
      y: 130,
    })
    expect(tileC?.kind === "create" ? tileC.node.position.x : undefined).toBe(
      850
    )
    expect(
      ops.some((op) => op.kind === "camera" && op.camera.targetId === "board")
    ).toBe(true)
    expect(
      result.document?.scenes[0]?.ops
        .filter((op) => op.kind === "create")
        .map((op) => op.t)
    ).toEqual(expect.arrayContaining([0, 1, 3, 3.5, 4]))
  })
})
