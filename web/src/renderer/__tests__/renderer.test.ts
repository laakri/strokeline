import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import type { SceneNode } from "@/ir/types.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { features } from "@/defaults/features.ts"
import { computeFitTransform } from "@/renderer/camera.ts"
import { pointOnBoundary } from "@/renderer/geometry.ts"
import { arrowLabelGlass, endpointLabelPoint, placeArrowLabel } from "@/renderer/shapes/arrow.ts"
import { cameraScaledStrokeWidth, strokeOptions } from "@/renderer/handdrawn.ts"
import { circleBoundingBox } from "@/renderer/shapes/circle.ts"
import { lineBoundingBox, lineEndpoints } from "@/renderer/shapes/line.ts"
import {
  rectangleBoundingBox,
  rectangleRevealPath,
} from "@/renderer/shapes/rectangle.ts"
import { textBoundingBox } from "@/renderer/shapes/text.ts"
import { cameraScaledFontSize, drawLabel } from "@/renderer/shapes/label.ts"
import { highlightEllipsePoints } from "@/renderer/animations/highlight.ts"

const base = (type: SceneNode["type"]): SceneNode => ({
  id: type,
  type,
  position: { x: 100, y: 100 },
  rotation: 0,
  opacity: 1,
  style: { color: "#222", strokeWidth: 4, fontSize: 40 },
  layer: 0,
})

describe("renderer geometry", () => {
  it("returns sane bounding boxes for every v1 shape", () => {
    const circle = { ...base("circle"), radius: 20 }
    const rectangle = { ...base("rectangle"), size: { width: 80, height: 40 } }
    const line = { ...base("line"), size: { width: 80, height: 40 } }
    const text = { ...base("text"), text: "Hello" }
    expect(circleBoundingBox(circle)).toEqual({
      x: 80,
      y: 80,
      width: 40,
      height: 40,
    })
    expect(rectangleBoundingBox(rectangle)).toEqual({
      x: 60,
      y: 80,
      width: 80,
      height: 40,
    })
    expect(lineBoundingBox(line)).toEqual({
      x: 60,
      y: 80,
      width: 80,
      height: 40,
    })
    expect(textBoundingBox(text).width).toBeGreaterThan(0)
  })

  it("bounds explicit and automatically wrapped text as centered multiline blocks", () => {
    const multiline = {
      ...base("text"),
      position: { x: 100, y: 100 },
      text: "first\nsecond",
    }
    const wrapped = {
      ...base("text"),
      text: "one two three four",
      maxWidth: 70,
    }
    expect(textBoundingBox(multiline).height).toBe(40 * 1.3 * 2)
    expect(textBoundingBox(multiline).y).toBe(100 - (40 * 1.3 * 2) / 2)
    expect(textBoundingBox(wrapped).height).toBeGreaterThan(40 * 1.3)
  })

  it("anchors a circle arrow on the edge instead of the center", () => {
    const circle = { ...base("circle"), radius: 20 }
    const anchor = pointOnBoundary(
      circle,
      { x: 200, y: 100 },
      circleBoundingBox(circle)
    )
    expect(anchor).toEqual({ x: 120, y: 100 })
  })

  it("anchors a rectangle arrow on the target edge", () => {
    const rectangle = { ...base("rectangle"), size: { width: 80, height: 40 } }
    const anchor = pointOnBoundary(
      rectangle,
      { x: 200, y: 100 },
      rectangleBoundingBox(rectangle)
    )
    expect(anchor).toEqual({ x: 140, y: 100 })
  })

  it("places arrow endpoint label plates beside the connector, not over its line", () => {
    const path = [{ x: 100, y: 200 }, { x: 700, y: 200 }]
    expect(endpointLabelPoint(path, true, 30, 8)).toEqual({ x: 108, y: 170 })
    expect(endpointLabelPoint(path, false, 30, 8)).toEqual({ x: 692, y: 230 })
  })

  it("moves arrow labels away from nearby shapes and keeps them clear of the line", () => {
    const path = [{ x: 100, y: 300 }, { x: 700, y: 300 }]
    const obstacle = { x: 330, y: 245, width: 180, height: 45 }
    const placement = placeArrowLabel(
      path,
      "request details",
      24,
      "Inter Variable",
      [obstacle],
      [],
      [],
      "request",
    )

    expect(placement.box.x + placement.box.width <= obstacle.x ||
      placement.box.x >= obstacle.x + obstacle.width ||
      placement.box.y + placement.box.height <= obstacle.y ||
      placement.box.y >= obstacle.y + obstacle.height).toBe(true)
    expect(placement.box.y + placement.box.height < 300 ||
      placement.box.y > 300).toBe(true)
  })

  it("places nearby arrow labels in separate deterministic spaces", () => {
    const path = [{ x: 100, y: 500 }, { x: 900, y: 500 }]
    const first = placeArrowLabel(path, "first relationship", 24, "Inter Variable", [], [], [], "arrow-a")
    const second = placeArrowLabel(path, "second relationship", 24, "Inter Variable", [], [], [first.box], "arrow-b")
    const repeated = placeArrowLabel(path, "first relationship", 24, "Inter Variable", [], [], [], "arrow-a")

    expect(first).toEqual(repeated)
    expect(first.box.x + first.box.width <= second.box.x ||
      second.box.x + second.box.width <= first.box.x ||
      first.box.y + first.box.height <= second.box.y ||
      second.box.y + second.box.height <= first.box.y).toBe(true)
  })

  it("uses translucent glass label colors with readable contrast on light and dark boards", () => {
    const dark = arrowLabelGlass("#101827")
    const light = arrowLabelGlass("#F7FAFC")

    expect(dark.color).toBe("#FFFFFF")
    expect(dark.background).toContain("0.16")
    expect(light.color).toBe("#FFFFFF")
    expect(light.background).toContain("0.84")
  })

  it("draws contrasting label text over its glass plate", () => {
    const canvas = createCanvas(240, 100)
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    context.fillStyle = "#F7FAFC"
    context.fillRect(0, 0, canvas.width, canvas.height)
    const glass = arrowLabelGlass("#F7FAFC")

    drawLabel(
      { context, cameraScale: 1 } as RenderContext,
      "Readable",
      { x: 120, y: 50 },
      {
        color: glass.color,
        fontSize: 28,
        fontFamily: "Inter Variable",
        background: glass.background,
        backgroundPadding: 6,
        backgroundCorners: 6,
        backgroundBorder: glass.border,
      },
    )

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let brightPixels = 0
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index]! > 245 && pixels[index + 1]! > 245 && pixels[index + 2]! > 245) {
        brightPixels++
      }
    }
    expect(brightPixels).toBeGreaterThan(20)
  })

  it.each([
    { x: 20, y: 30, width: 80, height: 40 },
    { x: 0, y: 0, width: 2000, height: 1200 },
  ])("fits padded target $width x $height inside the canvas", (box) => {
    const canvas = { width: 1920, height: 1080 }
    const padding = 0.15
    const transform = computeFitTransform(box, canvas, padding)
    const paddedWidth = box.width * (1 + padding * 2)
    const paddedHeight = box.height * (1 + padding * 2)
    const viewWidth = canvas.width / transform.scale
    const viewHeight = canvas.height / transform.scale
    expect(viewWidth).toBeGreaterThanOrEqual(paddedWidth)
    expect(viewHeight).toBeGreaterThanOrEqual(paddedHeight)
    expect(transform.x - viewWidth / 2).toBeLessThanOrEqual(
      box.x - box.width * padding
    )
    expect(transform.x + viewWidth / 2).toBeGreaterThanOrEqual(
      box.x + box.width * (1 + padding)
    )
  })

  it("scales stroke width with camera zoom and clamps only at the readable floor", () => {
    const node = {
      ...base("line"),
      style: { ...base("line").style, strokeWidth: 4 },
    }
    expect(strokeOptions(node, 1).strokeWidth).toBe(4)
    expect(strokeOptions(node, 1.8).strokeWidth).toBe(4)
    expect(cameraScaledStrokeWidth(4, 0.1) * 0.1).toBe(0.75)
  })

  it("scales text with camera zoom while enforcing a minimum readable screen size", () => {
    expect(cameraScaledFontSize(40, 2) * 2).toBe(80)
    expect(cameraScaledFontSize(40, 0.1) * 0.1).toBe(18)
  })

  it("can restore legacy camera text and stroke sizing through feature flags", () => {
    const previousTextFlag = features.cameraScaledText
    const previousStrokeFlag = features.cameraScaledStrokes
    try {
      features.cameraScaledText = false
      features.cameraScaledStrokes = false
      expect(cameraScaledFontSize(40, 2)).toBe(20)
      expect(cameraScaledStrokeWidth(4, 2)).toBe(2)
    } finally {
      features.cameraScaledText = previousTextFlag
      features.cameraScaledStrokes = previousStrokeFlag
    }
  })

  it("traces half a rectangle perimeter clockwise at reveal progress 0.5", () => {
    const path = rectangleRevealPath(
      { x: 10, y: 20, width: 80, height: 40 },
      0.5
    )
    expect(path).toEqual([
      [10, 20],
      [90, 20],
      [90, 60],
    ])
  })

  it("resolves FROM/TO line endpoints and bounds the line by them", () => {
    const line = {
      ...base("line"),
      data: { from: { x: 100, y: 200 }, to: { x: 700, y: 260 } },
    }
    expect(lineEndpoints(line)).toEqual({
      start: { x: 100, y: 200 },
      end: { x: 700, y: 260 },
    })
    expect(lineBoundingBox(line)).toEqual({
      x: 100,
      y: 200,
      width: 600,
      height: 60,
    })
  })

  it("keeps every highlight scribble point safely outside the target bounds", () => {
    const box = { x: 80, y: 80, width: 40, height: 40 }
    const points = highlightEllipsePoints(box, 123)
    expect(points).toHaveLength(45)
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(box.x - 60)
      expect(x).toBeLessThanOrEqual(box.x + box.width + 60)
      expect(y).toBeGreaterThanOrEqual(box.y - 60)
      expect(y).toBeLessThanOrEqual(box.y + box.height + 60)
    }
    expect(points[0][1]).toBe(100)
  })
})
