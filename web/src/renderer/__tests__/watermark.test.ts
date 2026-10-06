import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import {
  FREE_BRANDING_ENTITLEMENTS,
  type BrandingEntitlements,
} from "@/branding/entitlements.ts"
import { identityCamera } from "@/renderer/camera.ts"
import { drawScene } from "@/renderer/draw.ts"
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
})
