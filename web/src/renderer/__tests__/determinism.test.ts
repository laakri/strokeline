import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { fileURLToPath } from "node:url"
import { createCanvas, DOMMatrix, GlobalFonts, Path2D } from "@napi-rs/canvas"
import { runScript } from "@/dsl/index.ts"
import { drawScene, drawSceneAsync } from "@/renderer/draw.ts"
import { Timeline } from "@/timeline/timeline.ts"

const originalDocument = globalThis.document
const originalPath2D = globalThis.Path2D
const originalDOMMatrix = globalThis.DOMMatrix

beforeAll(() => {
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: Path2D })
  Object.defineProperty(globalThis, "DOMMatrix", { configurable: true, value: DOMMatrix })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => createCanvas(1, 1) },
  })
  GlobalFonts.registerFromPath(
    fileURLToPath(new URL("../../../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2", import.meta.url)),
    "Caveat Variable"
  )
})

afterAll(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument })
  Object.defineProperty(globalThis, "Path2D", { configurable: true, value: originalPath2D })
  Object.defineProperty(globalThis, "DOMMatrix", { configurable: true, value: originalDOMMatrix })
})

const source = `VERSION 1.0
CANVAS 800 600
SCENE 1
  CREATE source AS CIRCLE
    POSITION 180 180
    RADIUS 55
    ROUGH on
    PENFOLLOW on
    DRAW 1s
  END
  CREATE target AS DIAMOND
    POSITION 520 180
    WIDTH 130
    HEIGHT 100
    ROUGH on
    DRAW 1s
  END
  INK stroke
    POINTS 100 400, 220 350, 360 430, 520 360, 680 420
    WIDTH 12
    FREEHAND on
    PENFOLLOW on
    DRAW 1s
  END
  ANIMATE source MORPH TO target DURATION 1s
END SCENE`

describe("opt-in renderer determinism", () => {
  it("renders the same frame when work is split across asynchronous batches", async () => {
    const result = runScript(source)
    expect(result.diagnostics).toEqual([])
    const document = result.document!
    const timeline = new Timeline(document.scenes[0]!, document.canvas)
    const state = timeline.resolveAt(5)
    const synchronousCanvas = createCanvas(800, 600)
    const synchronousContext = synchronousCanvas.getContext("2d")
    drawScene(
      synchronousContext as unknown as CanvasRenderingContext2D,
      state,
      undefined,
      document.canvas,
      document.background
    )
    const asynchronousCanvas = createCanvas(800, 600)
    const asynchronousContext = asynchronousCanvas.getContext("2d")
    const progress: number[] = []
    await drawSceneAsync(
      [
        asynchronousContext as unknown as CanvasRenderingContext2D,
        state,
        undefined,
        document.canvas,
        document.background,
      ],
      { batchSize: 1, onProgress: (value) => progress.push(value) }
    )

    expect(
      asynchronousCanvas.toBuffer("image/png").equals(
        synchronousCanvas.toBuffer("image/png")
      )
    ).toBe(true)
    expect(progress.length).toBeGreaterThan(1)
    expect(progress.at(-1)).toBe(1)
  })

  it("stops between rendering batches when the export is cancelled", async () => {
    const result = runScript(source)
    expect(result.diagnostics).toEqual([])
    const document = result.document!
    const timeline = new Timeline(document.scenes[0]!, document.canvas)
    const canvas = createCanvas(800, 600)
    const context = canvas.getContext("2d")
    const controller = new AbortController()

    await expect(
      drawSceneAsync(
        [
          context as unknown as CanvasRenderingContext2D,
          timeline.resolveAt(5),
          undefined,
          document.canvas,
          document.background,
        ],
        {
          batchSize: 1,
          signal: controller.signal,
          onProgress: () => controller.abort(),
        }
      )
    ).rejects.toMatchObject({ name: "AbortError" })
  })

  it("resolves and renders identically across repeated and scrubbed reads", () => {
    const result = runScript(source)
    expect(result.diagnostics).toEqual([])
    const document = result.document!
    const timeline = new Timeline(document.scenes[0]!, document.canvas)
    const first = timeline.resolveAt(2)
    const second = timeline.resolveAt(2)
    expect(second).toEqual(first)

    const canvas = createCanvas(800, 600)
    const context = canvas.getContext("2d")
    const render = (time: number) => {
      drawScene(context as unknown as CanvasRenderingContext2D, timeline.resolveAt(time), undefined, document.canvas, document.background)
      return canvas.toBuffer("image/png")
    }
    const direct = render(5)
    render(0)
    render(2)
    const scrubbed = render(5)
    expect(scrubbed.equals(direct)).toBe(true)
  })
})
