import type { SceneNode, TableHighlightTarget } from "@/ir/types.ts"
import { layoutTableCell } from "@/lib/tableLayout.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { strokeOptions } from "@/renderer/handdrawn.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"

type TableData = {
  columns?: string[]
  rows?: string[][]
  headerColor?: string
  align?: CanvasTextAlign
  highlights?: TableHighlightTarget[]
  _animatedTableHighlights?: Array<{ target: TableHighlightTarget; color: string; progress: number }>
}

export function tableBounds(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 1200
  const height = node.size?.height ?? 400
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

export function drawTable(render: RenderContext, node: SceneNode): void {
  const ctx = render.context
  const box = tableBounds(node)
  const data = (node.data ?? {}) as TableData
  const columns = data.columns ?? []
  const rows = data.rows ?? []
  if (!columns.length) return
  const progress = clamp((node as SceneNode & { revealProgress?: number }).revealProgress ?? 1)
  const totalRows = rows.length + 1
  const rowHeight = box.height / totalRows
  const columnWidth = box.width / columns.length
  const header = data.headerColor ?? defaultHeader(node.style.color)
  const staticHighlights = data.highlights ?? []
  const animatedHighlights = data._animatedTableHighlights ?? []
  ctx.save()
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  ctx.textBaseline = "middle"
  for (let visualRow = 0; visualRow < totalRows; visualRow++) {
    const rowProgress = clamp(progress * totalRows - visualRow)
    if (rowProgress <= 0) continue
    const y = box.y + visualRow * rowHeight
    const rowCells = visualRow === 0 ? columns : rows[visualRow - 1] ?? []
    if (visualRow > 0 && node.style.fill) {
      ctx.fillStyle = node.style.fill
      ctx.globalAlpha = rowProgress
      ctx.fillRect(box.x, y, box.width * rowProgress, rowHeight)
      ctx.globalAlpha = 1
    }
    if (visualRow === 0) {
      ctx.fillStyle = header
      ctx.globalAlpha = rowProgress
      ctx.fillRect(box.x, y, box.width * rowProgress, rowHeight)
      ctx.globalAlpha = 1
    }
    const targets = [
      ...staticHighlights.map((target) => ({ target, color: "#FFD966", progress: 1 })),
      ...animatedHighlights,
    ]
    rowCells.forEach((_, column) => {
      const bodyRow = visualRow
      const isHighlighted = targets.some(({ target, progress: targetProgress }) =>
        targetProgress > 0 && targetMatchesCell(target, bodyRow, column + 1)
      )
      if (isHighlighted) {
        ctx.fillStyle = "#FFD966"
        ctx.globalAlpha = 0.3 * Math.max(...targets.filter(({ target }) => targetMatchesCell(target, bodyRow, column + 1)).map((target) => target.progress), 0)
        ctx.fillRect(box.x + column * columnWidth, y, columnWidth * rowProgress, rowHeight)
        ctx.globalAlpha = 1
      }
      const cellX = box.x + column * columnWidth
      drawRoughLine(render, node, `v${visualRow}_${column}`, cellX, y, cellX, y + rowHeight * rowProgress)
      if (rowProgress > 0.15) {
        const cellText = rowCells[column] ?? ""
        const layout = layoutTableCell(cellText, columnWidth, rowHeight, node.style.fontFamily)
        const padding = 12
        ctx.save()
        ctx.beginPath()
        ctx.rect(cellX + padding, y, Math.max(0, columnWidth - padding * 2) * rowProgress, rowHeight)
        ctx.clip()
        ctx.font = `${layout.fontSize}px "${node.style.fontFamily ?? "Caveat Variable"}"`
        ctx.textAlign = data.align ?? "center"
        ctx.fillStyle = visualRow === 0 ? readableOn(header) : node.style.color
        const textX = data.align === "left" ? cellX + padding : data.align === "right" ? cellX + columnWidth - padding : cellX + columnWidth / 2
        const lineHeight = layout.fontSize * 1.15
        const firstY = y + rowHeight / 2 - ((layout.text.lines.length - 1) * lineHeight) / 2
        layout.text.lines.forEach((line, index) => ctx.fillText(line, textX, firstY + index * lineHeight, Math.max(1, columnWidth - padding * 2)))
        ctx.restore()
      }
    })
    drawRoughLine(render, node, `right${visualRow}`, box.x + box.width, y, box.x + box.width, y + rowHeight * rowProgress)
    drawRoughLine(render, node, `h${visualRow}`, box.x, y, box.x + box.width * rowProgress, y)
  }
  drawRoughLine(render, node, "bottom", box.x, box.y + box.height, box.x + box.width * progress, box.y + box.height)
  ctx.restore()
}

function drawRoughLine(render: RenderContext, node: SceneNode, suffix: string, x1: number, y1: number, x2: number, y2: number): void {
  const seeded = { ...node, id: `${node.id}_${suffix}` }
  render.roughCanvas.line(x1, y1, x2, y2, strokeOptions(seeded, render.cameraScale))
}

function targetMatchesCell(target: TableHighlightTarget, row: number, column: number): boolean {
  if (target.type === "row") return row > 0 && target.row === row
  if (target.type === "column") return target.column === column
  return row > 0 && target.row === row && target.column === column
}

function defaultHeader(ink: string): string {
  return ink.toLowerCase() === "#ffffff" || ink.toLowerCase() === "#f5f5f5" ? "#334E68" : "#DCECF1"
}

function readableOn(color: string): string {
  const hex = color.replace("#", "")
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(hex)) return "#FFFFFF"
  const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex
  const channels = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255)
  const luminance = channels.reduce((sum, channel, index) => sum + [0.2126, 0.7152, 0.0722][index]! * (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4), 0)
  const ratio = (foreground: number) => {
    const high = Math.max(foreground, luminance)
    const low = Math.min(foreground, luminance)
    return (high + 0.05) / (low + 0.05)
  }
  const dark = [24, 33, 43].map((channel) => channel / 255).reduce((sum, channel, index) => sum + [0.2126, 0.7152, 0.0722][index]! * (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4), 0)
  return ratio(1) >= ratio(dark) ? "#FFFFFF" : "#18212B"
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)) }

export const table: ShapeRenderer = { draw: drawTable, boundingBox: tableBounds }
