import { describe, expect, it } from "vitest"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { runScript } from "@/dsl/index.ts"
import { DIAGRAM_TEMPLATES } from "@/templates/diagramTemplates.ts"
import { Timeline } from "@/timeline/timeline.ts"

describe("diagram starters", () => {
  it("plays the long use-case model as a smooth camera-guided tour", () => {
    const template = DIAGRAM_TEMPLATES.find((item) => item.id === "use-case")
    expect(template).toBeDefined()

    const result = runScript(template!.script)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
    expect(result.document?.canvas).toEqual({ width: 1920, height: 2200 })

    const scene = result.document!.scenes[0]!
    const cameraOps = scene.ops.filter((op) => op.kind === "camera")
    expect(cameraOps).toHaveLength(6)
    expect(cameraOps.every((op) => op.kind === "camera" && op.camera.ease === "easeInOut")).toBe(true)

    const timeline = new Timeline(scene, result.document!.canvas)
    const viewDuringTour = timeline.resolveAt(4.05).camera
    expect(viewDuringTour.position.y).toBeLessThan(1160)
    expect(viewDuringTour.position.y).toBeGreaterThan(520)
    expect(timeline.resolveAt(timeline.duration).camera).toEqual({
      position: { x: 960, y: 1100 },
      scale: 1,
    })
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
      expect(result.document, `${template.id}: ${JSON.stringify(result.diagnostics)}`).not.toBeNull()
      expect(result.document?.canvas, template.id).toEqual({
        width: 1080,
        height: 1920,
      })
      expect(result.diagnostics.filter(blocksScriptRun), template.id).toEqual([])
    }
  })
})
