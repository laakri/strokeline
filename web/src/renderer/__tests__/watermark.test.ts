import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import {
  FREE_BRANDING_ENTITLEMENTS,
  type BrandingEntitlements,
} from "@/branding/entitlements.ts"
import { identityCamera } from "@/renderer/camera.ts"
import { drawScene } from "@/renderer/draw.ts"
import { drawWatermark } from "@/renderer/watermark.ts"
import type { RenderState } from "@/timeline/timeline.ts"

const canvasSize = { width: 640, height: 360 }
const state: RenderState = {
  nodes: [],
  highlights: [],
  camera: identityCamera(canvasSize),
}

function pixelAtWatermark(entitlements?: BrandingEntitlements): number[] {
  const canvas = createCanvas(canvasSize.width, canvasSize.height)
  const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
  drawScene(
    context,
    state,
    undefined,
    canvasSize,
    "#FAFAFA",
    "clean",
    "plain",
    false,
    false,
    false,
    entitlements
  )
  return Array.from(context.getImageData(620, 336, 1, 1).data)
}

describe("renderer watermark", () => {
  it("renders branding in the preview/export scene by default", () => {
    expect(pixelAtWatermark()).not.toEqual([250, 250, 250, 255])
  })

  it("allows paid entitlements to remove branding from rendered output", () => {
    expect(pixelAtWatermark({ canRemoveWatermark: true })).toEqual([
      250, 250, 250, 255,
    ])
    expect(FREE_BRANDING_ENTITLEMENTS.canRemoveWatermark).toBe(false)
  })

  it("renders the Reels watermark larger at high pixel ratios", () => {
    const logicalCanvas = { width: 1080, height: 1920 }
    const ratio = 2
    const canvas = createCanvas(
      logicalCanvas.width * ratio,
      logicalCanvas.height * ratio
    )
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    drawWatermark(context, FREE_BRANDING_ENTITLEMENTS, logicalCanvas, ratio)

    const crop = {
      x: 650 * ratio,
      y: 1650 * ratio,
      width: 430 * ratio,
      height: 270 * ratio,
    }
    const image = context.getImageData(
      crop.x,
      crop.y,
      crop.width,
      crop.height
    )
    let minY = crop.height
    let maxY = -1
    for (let y = 0; y < crop.height; y++) {
      for (let x = 0; x < crop.width; x++) {
        if (image.data[(y * crop.width + x) * 4 + 3] === 0) continue
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    expect(maxY - minY + 1).toBeGreaterThanOrEqual(100)
    expect(maxY + crop.y).toBeGreaterThan(canvas.height - 100)
  })
})
