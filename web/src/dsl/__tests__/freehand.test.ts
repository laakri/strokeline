import { describe, expect, it, vi } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { drawInk } from "@/renderer/ink/draw.ts"

describe("opt-in perfect-freehand ink", () => {
  const script = (freehand: string) => runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  INK stroke
    POINTS 100 100, 180 140, 260 110
    COLOR #123456
    WIDTH 12
    FREEHAND ${freehand}
  END
END SCENE`)

  it("stores perfect-freehand opt-in without changing the legacy default", () => {
    const enabled = script("on")
    const disabled = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  INK stroke
    POINTS 100 100, 180 140, 260 110
  END
END SCENE`)

    expect(enabled.document?.scenes[0]?.ops[0]).toMatchObject({
      node: { type: "ink", data: { freehand: true, freehandSetting: "on" } },
    })
    expect(disabled.document?.scenes[0]?.ops[0]).toMatchObject({
      node: { type: "ink" },
    })
    expect(disabled.document?.scenes[0]?.ops[0]?.node.data?.freehand).toBeUndefined()
  })

  it("validates FREEHAND values and object scope", () => {
    const badValue = script("maybe")
    expect(badValue.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "E_BAD_RANGE",
          message: expect.stringContaining("FREEHAND"),
        }),
      ])
    )

    const shape = runScript(`VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE box AS RECTANGLE
    POSITION 100 100
    WIDTH 80
    HEIGHT 40
    FREEHAND on
  END
END SCENE`)
    expect(shape.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "E_UNSUPPORTED",
          message: expect.stringContaining("only supported on INK"),
        }),
      ])
    )
  })

  it("fills a Path2D outline only when enabled", () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D
    const renderContext = {
      context,
      roughCanvas: { linearPath: vi.fn() },
      nodes: new Map(),
      cameraScale: 1,
      mode: "clean" as const,
    }
    const node = script("on").document!.scenes[0]!.ops[0]!.node

    drawInk(renderContext, node)

    expect(context.fill).toHaveBeenCalledOnce()
    expect(renderContext.roughCanvas.linearPath).not.toHaveBeenCalled()
  })
})
