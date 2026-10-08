import { describe, expect, it } from "vitest"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { runScript } from "@/dsl/index.ts"
import { DIAGRAM_TEMPLATES } from "@/templates/diagramTemplates.ts"

describe("diagram starters", () => {
  it("keeps every UML starter valid and editable", () => {
    const umlTemplates = DIAGRAM_TEMPLATES.filter(
      (template) => template.category === "UML"
    )
    expect(umlTemplates.map((template) => template.id)).toEqual([
      "use-case",
      "class-diagram",
      "sequence-diagram",
    ])

    for (const template of umlTemplates) {
      const result = runScript(template.script)
      expect(
        result.document,
        `${template.id}: ${JSON.stringify(result.diagnostics)}`
      ).not.toBeNull()
      expect(result.diagnostics.filter(blocksScriptRun), template.id).toEqual(
        []
      )
    }
  })

  it("uses the animated Sprint 12 board as the default Agile starter", () => {
    const template = DIAGRAM_TEMPLATES.find((item) => item.id === "scrum-board")
    expect(template).toBeDefined()
    expect(template!.category).toBe("Agile")

    const result = runScript(template!.script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "Scrum Board - Sprint 12"')
    expect(template!.script).toContain('TEXT "Sprint 12 Board (example data)"')
    expect(template!.script).toContain("ANIMATE cDoing2 MOVE TO 1170 560 ARC 60")
    expect(template!.script).toContain("ANIMATE cReview1 MOVE TO 1590 800 ARC -60")
    expect(template!.script).toContain('TEXT "Done: 18 pts"')

    const scene = result.document!.scenes[0]!
    const moves = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "move"
    )
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(moves).toHaveLength(2)
    expect(highlights.map((op) => op.targetId)).toEqual([
      "cDoing2",
      "cReview1",
      "laneDone",
    ])
  })

  it("uses the sign-in sequence as the default starter", () => {
    const template = DIAGRAM_TEMPLATES.find(
      (item) => item.id === "sequence-diagram"
    )
    expect(template).toBeDefined()
    expect(template!.script).toContain('SCENE 1 "Sequence Diagram - Sign In"')
    expect(template!.script).toContain('TEXT "Auth Service"')
    expect(template!.script).toContain('TEXT "User DB"')
    expect(template!.script).toContain('LABEL "6: 200 OK + home page"')
    expect(template!.script).toContain("LINESTYLE dashed")

    const result = runScript(template!.script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })

    const scene = result.document!.scenes[0]!
    const arrows = scene.ops.filter(
      (op) => op.kind === "create" && op.node.type === "arrow"
    )
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(arrows).toHaveLength(6)
    expect(highlights.map((op) => op.targetId)).toEqual(["pAuth"])
  })

  it("uses the online-store class model as the default starter", () => {
    const template = DIAGRAM_TEMPLATES.find(
      (item) => item.id === "class-diagram"
    )
    expect(template).toBeDefined()

    const result = runScript(template!.script)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "Class Diagram Template"')
    expect(template!.script).toContain('COLUMNS "«aggregate root» Order"')
    expect(template!.script).toContain('COLUMNS "«abstract» Payment"')
    expect(template!.script).toContain('COLUMNS "«concrete» CardPayment"')

    const scene = result.document!.scenes[0]!
    const tables = scene.ops.filter(
      (op) => op.kind === "create" && op.node.type === "table"
    )
    const arrows = scene.ops.filter(
      (op) => op.kind === "create" && op.node.type === "arrow"
    )
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(tables).toHaveLength(7)
    expect(arrows).toHaveLength(6)
    expect(highlights.map((op) => op.targetId)).toEqual(["payTbl", "itemTbl"])
  })

  it("uses the online-store use-case model as the default starter", () => {
    const template = DIAGRAM_TEMPLATES.find((item) => item.id === "use-case")
    expect(template).toBeDefined()

    const result = runScript(template!.script)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "Use Case Diagram Template"')
    expect(template!.script).toContain('TEXT "Online Store - Use Case Diagram"')
    expect(template!.script).toContain("CREATE boundary AS RECTANGLE")
    expect(template!.script).toContain('TEXT "Browse Products"')
    expect(template!.script).toContain('TEXT "Payment API"')
    expect(template!.script).toContain('LABEL "«include»"')
    expect(template!.script).toContain('LABEL "«extend»"')

    const scene = result.document!.scenes[0]!
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(highlights.map((op) => op.targetId)).toEqual([
      "ucOrder",
      "ucPay",
      "ucCoupon",
    ])
  })

  it("keeps use-case associations and semantic relationships valid", () => {
    const template = DIAGRAM_TEMPLATES.find((item) => item.id === "use-case")
    const result = runScript(template!.script)
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "W_ARROW_CROSSES_TEXT"
      )
    ).toEqual([])
    const arrows = result.document!.scenes[0]!.ops
      .filter((op) => op.kind === "create" && op.node.type === "arrow")
      .map((op) => (op.kind === "create" ? op.node : undefined))
    const include = arrows.find((arrow) => arrow?.label === "«include»")
    const extend = arrows.find((arrow) => arrow?.label === "«extend»")

    expect(arrows).toHaveLength(7)
    expect(include?.data?.route).toBe("straight")
    expect(extend?.data?.route).toBe("straight")
  })

  it("adds the Sailboat retrospective as an Agile starter", () => {
    const template = DIAGRAM_TEMPLATES.find(
      (item) => item.id === "sailboat-retrospective"
    )
    expect(template).toBeDefined()
    expect(template!.category).toBe("Agile")

    const result = runScript(template!.script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "Sprint Retro - The Sailboat"')
    expect(template!.script).toContain('TEXT "Goal: ship checkout v2"')
    expect(template!.script).toContain("POINTS 800 560, 1120 560")
    expect(template!.script).toContain('TEXT "Wind: what helps us"')
    expect(template!.script).toContain('TEXT "Anchors: what slows us"')
    expect(template!.script).toContain('TEXT "Rocks: risks ahead"')

    const scene = result.document!.scenes[0]!
    const ink = scene.ops.filter((op) => op.kind === "create" && op.node.type === "ink")
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(ink).toHaveLength(7)
    expect(highlights.map((op) => op.targetId)).toEqual(["sWind1", "sAnc1"])
  })

  it("uses the animated support-ticket flowchart as the default starter", () => {
    const template = DIAGRAM_TEMPLATES.find((item) => item.id === "flowchart")
    expect(template).toBeDefined()

    const result = runScript(template!.script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "Flowchart - Support Ticket"')
    expect(template!.script).toContain("ROUGHFILL cross-hatch")
    expect(template!.script).toContain("PENFOLLOW on")
    expect(template!.script).toContain("ANIMATE token OPACITY TO 0")

    const scene = result.document!.scenes[0]!
    const createdNodes = scene.ops.filter((op) => op.kind === "create")
    const arrows = createdNodes.filter((op) => op.node.type === "arrow")
    const diamonds = createdNodes.filter((op) => op.node.type === "diamond")
    const moves = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "move"
    )
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(arrows).toHaveLength(10)
    expect(diamonds).toHaveLength(2)
    expect(moves).toHaveLength(6)
    expect(highlights.map((op) => op.targetId)).toEqual(["dValid", "dSolved"])
  })

  it("uses the Online Store schema as the default ER starter", () => {
    const template = DIAGRAM_TEMPLATES.find(
      (item) => item.id === "entity-relationship"
    )
    expect(template).toBeDefined()

    const result = runScript(template!.script)
    expect(result.document, JSON.stringify(result.diagnostics)).not.toBeNull()
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(template!.script).toContain('SCENE 1 "ER Diagram - Online Store"')
    expect(template!.script).toContain('COLUMNS "Customer" "Type" "Key"')
    expect(template!.script).toContain('ROW "order_id" "INT" "PK, FK"')

    const scene = result.document!.scenes[0]!
    const tables = scene.ops.filter(
      (op) => op.kind === "create" && op.node.type === "table"
    )
    const arrows = scene.ops.filter(
      (op) => op.kind === "create" && op.node.type === "arrow"
    )
    const highlights = scene.ops.filter(
      (op) => op.kind === "animate" && op.anim.verb === "highlight"
    )
    expect(tables).toHaveLength(6)
    expect(arrows).toHaveLength(5)
    expect(highlights.map((op) => op.targetId)).toEqual(["tOrder", "tItem"])
  })

  it("provides five valid vertical Reels starters", () => {
    const reelsTemplates = DIAGRAM_TEMPLATES.filter(
      (template) => template.category === "Reels"
    )
    expect(reelsTemplates.map((template) => template.id)).toEqual([
      "reels-hook-tips",
      "reels-before-after",
      "reels-product-reveal",
      "reels-quote-card",
      "reels-countdown",
    ])
    for (const template of reelsTemplates) {
      const result = runScript(template.script)
      expect(
        result.document,
        `${template.id}: ${JSON.stringify(result.diagnostics)}`
      ).not.toBeNull()
      expect(result.document?.canvas, template.id).toEqual({
        width: 1080,
        height: 1920,
      })
      expect(result.diagnostics.filter(blocksScriptRun), template.id).toEqual(
        []
      )
    }
  })
})
