import { describe, expect, it } from "vitest"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { runScript } from "@/dsl/index.ts"
import {
  CURATED_TEMPLATES,
  DIAGRAM_TEMPLATES,
  FEATURED_TEMPLATE_IDS,
  TEMPLATE_LIBRARY,
} from "@/templates/diagramTemplates.ts"

describe("curated template library", () => {
  it("keeps every supplied WBS project once alongside the original starters", () => {
    expect(CURATED_TEMPLATES).toHaveLength(19)
    expect(TEMPLATE_LIBRARY).toHaveLength(32)
    expect(new Set(TEMPLATE_LIBRARY.map((template) => template.id)).size).toBe(
      TEMPLATE_LIBRARY.length
    )
    expect(
      new Set(CURATED_TEMPLATES.map((template) => template.script)).size
    ).toBe(CURATED_TEMPLATES.length)
    expect(
      TEMPLATE_LIBRARY.slice(0, FEATURED_TEMPLATE_IDS.length).map(
        (item) => item.id
      )
    ).toEqual(FEATURED_TEMPLATE_IDS)
    expect(
      TEMPLATE_LIBRARY.slice(0, CURATED_TEMPLATES.length)
        .map((item) => item.id)
        .sort()
    ).toEqual(CURATED_TEMPLATES.map((item) => item.id).sort())
    expect(TEMPLATE_LIBRARY.slice(CURATED_TEMPLATES.length)).toEqual(
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

  it("adds Memory Lab as an eight-scene landscape education template", () => {
    const memoryLab = TEMPLATE_LIBRARY.find(
      (template) => template.id === "memory-lab"
    )
    if (!memoryLab) throw new Error("Memory Lab template is not registered.")

    expect(memoryLab).toMatchObject({
      title: "Memory Lab: Beat the Forgetting Curve",
      category: "Education",
      preview: "rendered",
    })
    const result = runScript(memoryLab.script)
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(result.document?.scenes).toHaveLength(8)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
  })

  it("adds Web Dev Basics as a five-scene landscape technology template", () => {
    const webDevBasics = TEMPLATE_LIBRARY.find(
      (template) => template.id === "web-dev-basics"
    )
    if (!webDevBasics)
      throw new Error("Web Dev Basics template is not registered.")

    expect(webDevBasics).toMatchObject({
      title: "Web Dev Basics: A Browser Request",
      category: "Technology",
      preview: "rendered",
    })
    const result = runScript(webDevBasics.script)
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(result.document?.scenes).toHaveLength(5)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
  })

  it("adds Git Essentials as a five-scene landscape technology template", () => {
    const gitEssentials = TEMPLATE_LIBRARY.find(
      (template) => template.id === "git-essentials"
    )
    if (!gitEssentials)
      throw new Error("Git Essentials template is not registered.")

    expect(gitEssentials).toMatchObject({
      title: "Git Essentials: Version Control",
      category: "Technology",
      preview: "rendered",
    })
    const result = runScript(gitEssentials.script)
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(result.document?.scenes).toHaveLength(5)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
  })

  it("adds Photosynthesis: Inside the Leaf as a five-scene landscape science template", () => {
    const photosynthesis = TEMPLATE_LIBRARY.find(
      (template) => template.id === "photosynthesis-deep-dive"
    )
    if (!photosynthesis)
      throw new Error("Photosynthesis: Inside the Leaf is not registered.")

    expect(photosynthesis).toMatchObject({
      title: "Photosynthesis: Inside the Leaf",
      category: "Science",
      preview: "rendered",
    })
    const result = runScript(photosynthesis.script)
    expect(result.document?.canvas).toEqual({ width: 1920, height: 1080 })
    expect(result.document?.scenes).toHaveLength(5)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])
  })

  it("gives each Reel a distinct palette and subtitle-safe vertical layout", () => {
    const reels = TEMPLATE_LIBRARY.filter(
      (template) => template.category === "Reels"
    )

    expect(reels).toHaveLength(7)
    expect(
      new Set(
        reels.map(
          (template) => template.script.match(/^BACKGROUND (.+)$/m)?.[1]
        )
      ).size
    ).toBe(reels.length)

    const designMarkers: Record<string, string> = {
      "photosynthesis-micro-lesson": "CREATE lightSource",
      "lightning-60-second-micro-lesson": "CREATE barSun",
      "reels-hook-tips": "CREATE editorialRule",
      "reels-before-after": "CREATE beforePanel",
      "reels-product-reveal": "CREATE cupBody",
      "reels-quote-card": "CREATE quoteGlyph",
      "reels-countdown": "CREATE step1Number",
    }
    expect(
      reels.map((template) =>
        template.script.includes(designMarkers[template.id])
      )
    ).toEqual(reels.map(() => true))

    for (const template of reels) {
      const result = runScript(template.script)
      expect(result.document, template.id).not.toBeNull()
      expect(result.document?.subtitles, template.id).toBe(true)
      expect(
        result.document?.scenes.length,
        template.id
      ).toBeGreaterThanOrEqual(4)
      expect(result.diagnostics.filter(blocksScriptRun), template.id).toEqual(
        []
      )
      const textYPositions =
        result.document?.scenes.flatMap((scene) =>
          scene.ops.flatMap((op) =>
            op.kind === "create" && op.node.type === "text"
              ? [op.node.position.y]
              : []
          )
        ) ?? []
      expect(
        textYPositions.every((y) => y < 1300 || y > 1580),
        `${template.id} text avoids the subtitle-safe band`
      ).toBe(true)
    }
  })
})
