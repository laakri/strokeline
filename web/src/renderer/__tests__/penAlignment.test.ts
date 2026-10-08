import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { pointAtSampledProgress, sampledRoughPathsForNode } from "@/renderer/roughPath.ts"
import { inkPathPoints, pathLength, subpathForLength } from "@/renderer/ink/draw.ts"
import { createCanvas } from "@napi-rs/canvas"
import { drawScene } from "@/renderer/draw.ts"
import { arrowPathForNode } from "@/renderer/shapes/arrow.ts"

const source = `VERSION 1.0
CANVAS 1000 700
SCENE 1
  CREATE plain AS RECTANGLE
    POSITION 140 130
    WIDTH 160
    HEIGHT 100
    PENFOLLOW on
    DRAW 1s
  END
  CREATE roughRect AS RECTANGLE
    POSITION 400 130
    WIDTH 160
    HEIGHT 100
    ROUGH on
    PENFOLLOW on
    DRAW 1s
  END
  CREATE circle AS CIRCLE
    POSITION 660 130
    RADIUS 60
    ROUGH on
    PENFOLLOW on
    DRAW 1s
  END
  CREATE diamond AS DIAMOND
    POSITION 140 400
    WIDTH 150
    HEIGHT 110
    ROUGH on
    PENFOLLOW on
    DRAW 1s
  END
  INK ink
    POINTS 400 400, 500 330, 620 430, 760 360
    WIDTH 14
    FREEHAND on
    PENFOLLOW on
    DRAW 1s
  END
END SCENE`

function resolveFor(id: string, progress: number) {
  const result = runScript(source)
  expect(result.diagnostics).toEqual([])
  const document = result.document!
  const timeline = new Timeline(document.scenes[0]!, document.canvas)
  const start = ({ plain: 0, roughRect: 1, circle: 2, diamond: 3, ink: 4 } as Record<string, number>)[id]!
  const time = start + progress
  const node = timeline.resolveAt(time).nodes.find((candidate) => candidate.id === id)!
  const pen = timeline.resolveAt(time).pen
  const rendererProgress = node.revealProgress
  let tip: { x: number; y: number } | undefined
  if (id === "plain") {
    const width = node.size!.width, height = node.size!.height
    const perimeter = 2 * (width + height)
    let remaining = perimeter * rendererProgress
    const points = [
      { x: node.position.x - width / 2, y: node.position.y - height / 2 },
      { x: node.position.x + width / 2, y: node.position.y - height / 2 },
      { x: node.position.x + width / 2, y: node.position.y + height / 2 },
      { x: node.position.x - width / 2, y: node.position.y + height / 2 },
      { x: node.position.x - width / 2, y: node.position.y - height / 2 },
    ]
    for (let i = 1; i < points.length; i++) {
      const length = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y)
      if (remaining <= length) {
        const amount = remaining / length
        tip = { x: points[i - 1]!.x + (points[i]!.x - points[i - 1]!.x) * amount, y: points[i - 1]!.y + (points[i]!.y - points[i - 1]!.y) * amount }
        break
      }
      remaining -= length
    }
  } else if (id === "ink") {
    const path = inkPathPoints(node.points!, node.id, "handdrawn")
    const visible = subpathForLength(path, rendererProgress * pathLength(path))
    tip = visible.at(-1)
  } else if (node.data?.roughSampledGeometry || id === "circle") {
    tip = pointAtSampledProgress(sampledRoughPathsForNode(node), rendererProgress).point
  }
  console.log(JSON.stringify({ id, progress, rendererProgress, pen, tip, difference: pen && tip ? { dx: pen.position.x - tip.x, dy: pen.position.y - tip.y } : undefined }))
}

describe("temporary pen coordinate diagnostics", () => {
  it("logs pen and renderer tips", () => {
    for (const id of ["plain", "roughRect", "circle", "diamond", "ink"]) {
      for (const progress of [0.25, 0.5, 0.75]) resolveFor(id, progress)
    }
  })

  it("keeps line and routed arrow tips in the same world space", () => {
    const result = runScript(`VERSION 1.0
CANVAS 1000 700
SCENE 1
  CREATE a AS RECTANGLE
    POSITION 160 250
    WIDTH 140
    HEIGHT 100
    DRAW 1s
  END
  CREATE b AS RECTANGLE
    POSITION 820 450
    WIDTH 140
    HEIGHT 100
    DRAW 1s
  END
  CREATE line AS LINE
    POSITION 490 350
    WIDTH 520
    HEIGHT 200
    PENFOLLOW on
    DRAW 1s
  END
  ARROW a -> b
    ROUTE elbow
    PENFOLLOW on
    DRAW 1s
END SCENE`)
    expect(result.diagnostics).toEqual([])
    const document = result.document!
    const timeline = new Timeline(document.scenes[0]!, document.canvas)
    for (const [start, progress] of [[2, 0.25], [2, 0.5], [2, 0.75], [3, 0.25], [3, 0.5], [3, 0.75]] as const) {
      const state = timeline.resolveAt(start + progress)
      const pen = state.pen!
      const node = state.nodes.find((candidate) => candidate.id === pen.targetId)!
      const path = node.type === "arrow"
        ? arrowPathForNode(node, new Map(state.nodes.map((candidate) => [candidate.id, candidate])))
        : [
            { x: node.position.x - (node.size?.width ?? 0) / 2, y: node.position.y - (node.size?.height ?? 0) / 2 },
            { x: node.position.x + (node.size?.width ?? 0) / 2, y: node.position.y + (node.size?.height ?? 0) / 2 },
          ]
      const lengths = path.slice(1).map((point, index) => Math.hypot(point.x - path[index]!.x, point.y - path[index]!.y))
      const total = lengths.reduce((sum, length) => sum + length, 0)
      let remaining = total * node.revealProgress
      let tip = path.at(-1)!
      for (let index = 0; index < lengths.length; index++) {
        if (remaining <= lengths[index]!) {
          const amount = lengths[index] ? remaining / lengths[index]! : 0
          tip = { x: path[index]!.x + (path[index + 1]!.x - path[index]!.x) * amount, y: path[index]!.y + (path[index + 1]!.y - path[index]!.y) * amount }
          break
        }
        remaining -= lengths[index]!
      }
      console.log(JSON.stringify({ targetId: pen.targetId, progress, pen: pen.position, tip, dx: pen.position.x - tip.x, dy: pen.position.y - tip.y }))
      expect(Math.hypot(pen.position.x - tip.x, pen.position.y - tip.y)).toBeLessThanOrEqual(2)
    }
  })

  it("keeps the rendered pen nib within two canvas pixels of the stroke tip", () => {
    const result = runScript(source)
    expect(result.diagnostics).toEqual([])
    const document = result.document!
    const timeline = new Timeline(document.scenes[0]!, document.canvas)
    const state = timeline.resolveAt(0.25)
    const renderedTip = (() => {
      const node = state.nodes[0]!
      const width = node.size!.width
      const height = node.size!.height
      const points = [
        { x: node.position.x - width / 2, y: node.position.y - height / 2 },
        { x: node.position.x + width / 2, y: node.position.y - height / 2 },
        { x: node.position.x + width / 2, y: node.position.y + height / 2 },
        { x: node.position.x - width / 2, y: node.position.y + height / 2 },
        { x: node.position.x - width / 2, y: node.position.y - height / 2 },
      ]
      const perimeter = 2 * (width + height)
      let remaining = perimeter * node.revealProgress
      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1]!, current = points[index]!
        const length = Math.hypot(current.x - previous.x, current.y - previous.y)
        if (remaining <= length) {
          const amount = remaining / length
          return { x: previous.x + (current.x - previous.x) * amount, y: previous.y + (current.y - previous.y) * amount }
        }
        remaining -= length
      }
      return points.at(-1)!
    })()
    const canvas = createCanvas(1000, 700)
    const context = canvas.getContext("2d")
    drawScene(context as unknown as CanvasRenderingContext2D, { ...state, pen: undefined }, undefined, document.canvas)
    const column = Math.round(renderedTip.x)
    const pixels = context.getImageData(column, 0, 1, 700).data
    let lastDarkPixel = -1
    for (let y = 0; y < 700; y++) {
      const offset = y * 4
      if (pixels[offset]! < 100 || pixels[offset + 1]! < 100 || pixels[offset + 2]! < 100) lastDarkPixel = y
    }
    expect(lastDarkPixel).toBeGreaterThanOrEqual(Math.floor(renderedTip.y) - 2)
    expect(lastDarkPixel).toBeLessThanOrEqual(Math.ceil(renderedTip.y) + 2)
    expect(Math.hypot(state.pen!.position.x - renderedTip.x, state.pen!.position.y - lastDarkPixel)).toBeLessThanOrEqual(2)
  })
})
