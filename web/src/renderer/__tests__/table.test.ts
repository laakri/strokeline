import { createCanvas } from "@napi-rs/canvas"
import { describe, expect, it } from "vitest"
import type { SceneNode } from "@/ir/types.ts"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import {
  drawTable,
  tableBounds,
  tableLayoutForNode,
} from "@/renderer/shapes/table.ts"

describe("table backgrounds", () => {
  it("layers row and cell fills over transparent areas without losing object opacity", () => {
    const canvas = createCanvas(800, 600)
    const context = canvas.getContext("2d")
    context.fillStyle = "#123456"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = 1

    const node: SceneNode = {
      id: "styled-table",
      type: "table",
      position: { x: 400, y: 300 },
      size: { width: 320, height: 500 },
      rotation: 0,
      opacity: 1,
      style: {
        color: "#FFFFFF",
        fill: "transparent",
        strokeWidth: 1,
        pen: "clean",
      },
      layer: 0,
      data: {
        columns: ["Name", "Value"],
        rows: [
          ["Row", "Band"],
          ["Cell", "Tint"],
          ["Clear", "Canvas"],
          ["Band", "Repeat"],
        ],
        headerColor: "transparent",
        alternateColor: "#00FF00",
        rowColors: { 1: "#FFFFFF" },
        cellColors: { "2,2": "#FF0000" },
      },
    }
    const layout = tableLayoutForNode(node)
    const bounds = tableBounds(node)
    const render = createRenderContext(
      context as unknown as CanvasRenderingContext2D,
      new Map([[node.id, node]]),
      1,
      "clean"
    )

    drawTable(render, node)

    const sample = (x: number, y: number) => [
      ...context
        .getImageData(Math.floor(x), Math.floor(y), 1, 1)
        .data.slice(0, 3),
    ]
    const sampleX = bounds.x + 10
    const firstRowY = bounds.y + layout.rowHeight * 1.5
    const secondRowY = bounds.y + layout.rowHeight * 2.5
    const thirdRowY = bounds.y + layout.rowHeight * 3.5
    const fourthRowY = bounds.y + layout.rowHeight * 4.5
    const redCellX = bounds.x + layout.columnWidths[0]! + 10

    expect(sample(sampleX, firstRowY)).toEqual([255, 255, 255])
    expect(sample(sampleX, secondRowY)).toEqual([0, 255, 0])
    expect(sample(redCellX, secondRowY)).toEqual([255, 0, 0])
    expect(sample(sampleX, thirdRowY)).toEqual([18, 52, 86])
    expect(sample(sampleX, fourthRowY)).toEqual([0, 255, 0])
    expect(context.globalAlpha).toBe(1)
  })

  it("preserves inherited opacity when revealing styled rows", () => {
    const canvas = createCanvas(800, 600)
    const context = canvas.getContext("2d")
    context.fillStyle = "#123456"
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.globalAlpha = 0.5

    const node: SceneNode = {
      id: "opacity-table",
      type: "table",
      position: { x: 400, y: 300 },
      size: { width: 320, height: 200 },
      rotation: 0,
      opacity: 0.5,
      style: {
        color: "#FFFFFF",
        fill: "transparent",
        strokeWidth: 1,
        pen: "clean",
      },
      layer: 0,
      data: {
        columns: ["Name"],
        rows: [["Row"]],
        headerColor: "transparent",
        rowColors: { 1: "#FFFFFF" },
      },
    }
    const bounds = tableBounds(node)
    const layout = tableLayoutForNode(node)
    const render = createRenderContext(
      context as unknown as CanvasRenderingContext2D,
      new Map([[node.id, node]]),
      1,
      "clean"
    )

    drawTable(render, node)

    const sample = context.getImageData(
      Math.floor(bounds.x + 10),
      Math.floor(bounds.y + layout.rowHeight * 1.5),
      1,
      1
    ).data
    expect([...sample.slice(0, 3)]).toEqual([136, 153, 170])
    expect(context.globalAlpha).toBeCloseTo(0.5, 2)
  })
})
