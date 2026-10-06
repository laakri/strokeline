import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  createCanvas,
  DOMMatrix,
  GlobalFonts,
  loadImage,
  Path2D,
} from "@napi-rs/canvas"
import { runScript } from "@/dsl/index.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { drawScene } from "@/renderer/draw.ts"
import { Timeline } from "@/timeline/timeline.ts"

const testDirectory = dirname(fileURLToPath(import.meta.url))
const fixtureDirectory = join(testDirectory, "../../dsl/__tests__/valid")
const snapshotDirectory = join(testDirectory, "golden-frames")
const frameSize = { width: 480, height: 270 }
const samplePoints = [0, 25, 50, 75, 100] as const
const updateSnapshots = process.env.UPDATE_GOLDEN_SNAPSHOTS === "1"

const originalDocument = globalThis.document
const originalPath2D = globalThis.Path2D
const originalDOMMatrix = globalThis.DOMMatrix

beforeAll(() => {
  const fontPath = fileURLToPath(
    new URL(
      "../../../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2",
      import.meta.url
    )
  )
  if (!GlobalFonts.has("Caveat Variable")) {
    expect(
      GlobalFonts.registerFromPath(fontPath, "Caveat Variable")
    ).not.toBeNull()
  }
  Object.defineProperty(globalThis, "Path2D", {
    configurable: true,
    value: Path2D,
  })
  Object.defineProperty(globalThis, "DOMMatrix", {
    configurable: true,
    value: DOMMatrix,
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        if (tagName !== "canvas")
          throw new Error(`Unsupported test element: ${tagName}`)
        return createCanvas(1, 1)
      },
    },
  })
})

afterAll(() => {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  })
  Object.defineProperty(globalThis, "Path2D", {
    configurable: true,
    value: originalPath2D,
  })
  Object.defineProperty(globalThis, "DOMMatrix", {
    configurable: true,
    value: originalDOMMatrix,
  })
})

function validFixtureNames(): string[] {
  return readdirSync(fixtureDirectory)
    .filter((name) => name.endsWith(".wbs"))
    .sort()
}

function renderFrame(
  context: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  scene: Parameters<typeof Timeline>[0],
  document: NonNullable<ReturnType<typeof runScript>["document"]>,
  time: number
): void {
  const timeline = new Timeline(scene, document.canvas)
  drawScene(
    context as unknown as CanvasRenderingContext2D,
    timeline.resolveAt(time),
    undefined,
    document.canvas,
    document.background
  )
}

describe("renderer golden frames", () => {
  it("matches five frames for every scene in every valid fixture", async () => {
    if (updateSnapshots) mkdirSync(snapshotDirectory, { recursive: true })
    const canvas = createCanvas(frameSize.width, frameSize.height)
    const context = canvas.getContext("2d")
    let frameCount = 0
    let expectedFrameCount = 0

    for (const fixtureName of validFixtureNames()) {
      const source = readFileSync(join(fixtureDirectory, fixtureName), "utf8")
      const result = runScript(source)
      expect(result.diagnostics.filter(blocksScriptRun), fixtureName).toEqual(
        []
      )
      expect(result.document, fixtureName).not.toBeNull()
      if (!result.document) continue

      for (const scene of result.document.scenes) {
        const timeline = new Timeline(scene, result.document.canvas)
        expectedFrameCount += samplePoints.length
        for (const percent of samplePoints) {
          const time = (timeline.duration * percent) / 100
          const name = `${fixtureName.slice(0, -4)}__scene-${scene.index}__${percent}.png`
          const snapshotPath = join(snapshotDirectory, name)
          renderFrame(context, scene, result.document, time)

          if (updateSnapshots) {
            writeFileSync(snapshotPath, canvas.toBuffer("image/png"))
            frameCount++
            continue
          }

          expect(
            readFileSync(snapshotPath),
            `Missing golden frame ${name}`
          ).toBeDefined()
          const expectedImage = await loadImage(readFileSync(snapshotPath))
          const expectedCanvas = createCanvas(frameSize.width, frameSize.height)
          const expectedContext = expectedCanvas.getContext("2d")
          expectedContext.drawImage(expectedImage, 0, 0)
          const actualPixels = context.getImageData(
            0,
            0,
            frameSize.width,
            frameSize.height
          ).data
          const expectedPixels = expectedContext.getImageData(
            0,
            0,
            frameSize.width,
            frameSize.height
          ).data
          const difference = countDifferentPixels(actualPixels, expectedPixels)
          const allowedPixels = Math.max(
            8,
            Math.ceil(frameSize.width * frameSize.height * 0.0005)
          )
          expect(
            difference,
            `${name}: pixels outside tolerance`
          ).toBeLessThanOrEqual(allowedPixels)
          frameCount++
        }
      }
    }

    expect(frameCount).toBe(expectedFrameCount)
  }, 30_000)
})

function countDifferentPixels(
  actual: Uint8ClampedArray,
  expected: Uint8ClampedArray
): number {
  let different = 0
  for (let index = 0; index < actual.length; index += 4) {
    const exceedsTolerance =
      Math.abs((actual[index] ?? 0) - (expected[index] ?? 0)) > 8 ||
      Math.abs((actual[index + 1] ?? 0) - (expected[index + 1] ?? 0)) > 8 ||
      Math.abs((actual[index + 2] ?? 0) - (expected[index + 2] ?? 0)) > 8 ||
      Math.abs((actual[index + 3] ?? 0) - (expected[index + 3] ?? 0)) > 8
    if (exceedsTolerance) different++
  }
  return different
}
