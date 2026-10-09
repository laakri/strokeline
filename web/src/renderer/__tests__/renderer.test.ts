import { describe, expect, it } from "vitest"
import { createCanvas } from "@napi-rs/canvas"
import type { SceneNode } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"
import { computeFitTransform } from "@/renderer/camera.ts"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import { pointOnBoundary } from "@/renderer/geometry.ts"
import { drawArrow, endpointLabelPoint } from "@/renderer/shapes/arrow.ts"
import { cameraScaledStrokeWidth, strokeOptions } from "@/renderer/handdrawn.ts"
import { circleBoundingBox } from "@/renderer/shapes/circle.ts"
import { lineBoundingBox, lineEndpoints } from "@/renderer/shapes/line.ts"
import {
  rectangleBoundingBox,
  rectangleRevealPath,
} from "@/renderer/shapes/rectangle.ts"
import { textBoundingBox } from "@/renderer/shapes/text.ts"
import { cameraScaledFontSize } from "@/renderer/shapes/label.ts"
import { highlightEllipsePoints } from "@/renderer/animations/highlight.ts"
import { arrowPathForNode } from "@/renderer/shapes/arrow.ts"

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
  it("draws both arrowheads without aborting frame rendering", () => {
    const source = {
      ...base("rectangle"),
      id: "source",
      position: { x: 100, y: 100 },
      size: { width: 80, height: 50 },
    }
    const target = {
      ...base("rectangle"),
      id: "target",
      position: { x: 400, y: 100 },
      size: { width: 100, height: 50 },
    }
    const arrow = {
      ...base("arrow"),
      id: "both-arrowheads",
      data: { fromId: source.id, toId: target.id, head: "both" },
    }
    const canvas = createCanvas(500, 200)
    const context = canvas.getContext("2d") as unknown as CanvasRenderingContext2D
    const renderContext = createRenderContext(
      context,
      new Map([[source.id, source], [target.id, target], [arrow.id, arrow]])
    )

    expect(() => drawArrow(renderContext, arrow)).not.toThrow()
  })

  it("uses smooth sampled geometry for elbow and curved arrows", () => {
    const source = { ...base("rectangle"), id: "source", position: { x: 100, y: 100 }, size: { width: 80, height: 50 } }
    const target = { ...base("rectangle"), id: "target", position: { x: 600, y: 400 }, size: { width: 100, height: 70 } }
    const nodes = new Map([[source.id, source], [target.id, target]])
    const elbow = {
      ...base("arrow"),
      id: "elbow",
      data: { fromId: source.id, toId: target.id, route: "elbow" },
    }
    const curve = {
      ...base("arrow"),
      id: "curve",
      data: {
        fromId: source.id,
        toId: target.id,
        route: "curve",
        waypoints: [{ x: 300, y: 150 }, { x: 450, y: 350 }],
      },
    }
    const loop = {
      ...base("arrow"),
      id: "loop",
      data: { fromId: source.id, toId: source.id, route: "elbow" },
    }
    const elbowPath = arrowPathForNode(elbow, nodes)
    const curvePath = arrowPathForNode(curve, nodes)
    const loopPath = arrowPathForNode(loop, nodes)
    expect(elbowPath.length).toBeGreaterThan(20)
    expect(curvePath.length).toBeGreaterThan(60)
    expect(loopPath.length).toBeGreaterThan(30)
    expect(curvePath).toContainEqual({ x: 300, y: 150 })
    expect(curvePath).toContainEqual({ x: 450, y: 350 })
    expect(elbowPath[0]).not.toEqual(elbowPath.at(-1))
    expect(curvePath[0]).not.toEqual(curvePath.at(-1))

    for (const path of [elbowPath, curvePath, loopPath]) {
      const segments = path.slice(1).flatMap((point, index) => {
        const previous = path[index]!
        return Math.hypot(point.x - previous.x, point.y - previous.y) > 0
          ? [Math.atan2(point.y - previous.y, point.x - previous.x)]
          : []
      })
      const angles = segments
      for (let index = 1; index < angles.length; index++) {
        const difference = Math.atan2(
          Math.sin(angles[index]! - angles[index - 1]!),
          Math.cos(angles[index]! - angles[index - 1]!)
        )
        expect(Math.abs(difference)).toBeLessThan(0.35)
      }
    }
  })

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
