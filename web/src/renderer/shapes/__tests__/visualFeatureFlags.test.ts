import { afterEach, describe, expect, it } from "vitest"
import { features } from "@/defaults/features.ts"
import type { SceneNode } from "@/ir/types.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { drawIcon } from "@/renderer/shapes/icon.ts"

const defaultFeatures = { ...features }

afterEach(() => Object.assign(features, defaultFeatures))

describe("visual feature flags", () => {
  it("can switch text alignment back to left-aligned legacy placement", () => {
    const positions: Array<{ align: string; x: number }> = []
    const context = {
      font: "",
      fillStyle: "",
      textBaseline: "",
      textAlign: "",
      measureText: (text: string) => ({ width: text.length * 10 }),
      fillText: (_text: string, x: number) => {
        positions.push({ align: context.textAlign, x })
      },
    }
    const renderContext = {
      context,
      cameraScale: 1,
    } as unknown as RenderContext
    const options = { color: "#222", fontSize: 20 }

    drawLabel(renderContext, "word", { x: 100, y: 100 }, options)
    features.centeredText = false
    drawLabel(renderContext, "word", { x: 100, y: 100 }, options)

    expect(positions).toEqual([
      { align: "center", x: 100 },
      { align: "left", x: 100 - measureTextWidth("word", 20) / 2 },
    ])
  })

  it("can disable icon drawing without affecting other node rendering", () => {
    const node: SceneNode = {
      id: "brain",
      type: "icon",
      position: { x: 100, y: 100 },
      size: { width: 80, height: 80 },
      rotation: 0,
      opacity: 1,
      style: { color: "#222", strokeWidth: 4 },
      layer: 0,
      data: { iconName: "brain" },
    }
    features.iconDrawing = false
    expect(() =>
      drawIcon(
        { context: {} as CanvasRenderingContext2D } as RenderContext,
        node
      )
    ).not.toThrow()
  })
})
