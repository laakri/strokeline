import type { SceneNode, TableHighlightTarget } from "@/ir/types.ts"
import { fontFamilyFor } from "@/lib/textMetrics.ts"
import { layoutTable, TABLE_CELL_PADDING } from "@/lib/tableLayout.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"

type TableData = {
  columns?: string[]
  rows?: string[][]
  headerColor?: string
  align?: CanvasTextAlign
  divider?: number
  highlights?: TableHighlightTarget[]
  _animatedTableHighlights?: Array<{ target: TableHighlightTarget; color: string; progress: number }>
}

export function tableLayoutForNode(node: SceneNode) {
  const data = (node.data ?? {}) as TableData
  const columns = data.columns ?? []
  const rows = data.rows ?? []
  const size = node.size ?? { width: 1200, height: 400 }
  return layoutTable(columns, rows, size.width, size.height, node.style.fontFamily, node.style.fontSize)
}

export function tableBounds(node: SceneNode): BoundingBox {
  const layout = tableLayoutForNode(node)
  const height = node.size?.height ?? 400
  return { x: node.position.x - layout.width / 2, y: node.position.y - height / 2, width: layout.width, height }
}

export function drawTable(render: RenderContext, node: SceneNode): void {
  const ctx = render.context
  const data = (node.data ?? {}) as TableData
  const columns = data.columns ?? []
  const rows = data.rows ?? []
  if (!columns.length) return
  const layout = tableLayoutForNode(node)
  const box = tableBounds(node)
  const progress = clamp((node as SceneNode & { revealProgress?: number }).revealProgress ?? 1)
  const totalRows = rows.length + 1
  const rowHeight = layout.rowHeight
  const header = data.headerColor ?? defaultHeader(node.style.color)
  const staticHighlights = data.highlights ?? []
  const animatedHighlights = data._animatedTableHighlights ?? []
  ctx.save()
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  const radius = Math.min(14 / render.cameraScale, box.width / 2, rowHeight / 2)
  roundedRect(ctx, box.x, box.y, box.width, box.height, radius)
  ctx.save()
  ctx.clip()
  ctx.shadowColor = "rgba(20, 35, 55, 0.16)"
  ctx.shadowBlur = 16 / render.cameraScale
  ctx.shadowOffsetY = 5 / render.cameraScale
  ctx.fillStyle = node.style.fill ?? "#FFFFFF"
  ctx.fill()
  ctx.restore()
  roundedRect(ctx, box.x, box.y, box.width, box.height, radius)
  ctx.clip()
  ctx.textBaseline = "middle"
  for (let visualRow = 0; visualRow < totalRows; visualRow++) {
    const rowProgress = clamp(progress * totalRows - visualRow)
    if (rowProgress <= 0) continue
    const y = box.y + visualRow * rowHeight
    const rowCells = visualRow === 0 ? columns : rows[visualRow - 1] ?? []
    if (visualRow > 0) {
      ctx.fillStyle = node.style.fill ?? "#FFFFFF"
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
    let cellX = box.x
    layout.columnWidths.forEach((columnWidth, column) => {
      const isHighlighted = targets.some(({ target, progress: targetProgress }) =>
        targetProgress > 0 && targetMatchesCell(target, visualRow, column + 1)
      )
      if (isHighlighted) {
        ctx.fillStyle = "#FFD966"
        ctx.globalAlpha = 0.3 * Math.max(...targets.filter(({ target }) => targetMatchesCell(target, visualRow, column + 1)).map((target) => target.progress), 0)
        ctx.fillRect(cellX, y, columnWidth * rowProgress, rowHeight)
        ctx.globalAlpha = 1
      }
      ctx.strokeStyle = "rgba(43, 61, 79, 0.16)"
      ctx.beginPath(); ctx.moveTo(cellX, y); ctx.lineTo(cellX, y + rowHeight * rowProgress); ctx.stroke()
      if (rowProgress > 0.15) {
        const cellLayout = layout.cells[visualRow]?.[column]
        const cellText = cellLayout?.text.lines[0] ?? rowCells[column] ?? ""
        ctx.save()
        // Keep glyphs inside their fixed-height row, even for unusually short tables.
        ctx.beginPath()
        ctx.rect(cellX, y, columnWidth, rowHeight)
        ctx.clip()
        const family = node.style.fontFamily ?? fontFamilyFor()
        ctx.font = `${visualRow === 0 ? "600 " : "400 "}${cellLayout?.fontSize ?? 18}px "${family}", "Cambria Math", "STIX Two Math", "Times New Roman", serif`
        ctx.textAlign = data.align ?? "center"
        ctx.fillStyle = visualRow === 0 ? readableOn(header) : node.style.color
        const padding = TABLE_CELL_PADDING
        const textX = data.align === "left"
          ? cellX + padding
          : data.align === "right"
            ? cellX + columnWidth - padding
            : cellX + columnWidth / 2
        ctx.fillText(cellText, textX, y + rowHeight / 2)
        ctx.restore()
      }
      cellX += columnWidth
    })
    ctx.strokeStyle = "rgba(43, 61, 79, 0.18)"
    ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.width * rowProgress, y); ctx.stroke()
    if (visualRow === data.divider && rowProgress > 0) {
      ctx.strokeStyle = node.style.color
      ctx.lineWidth = Math.max(2, node.style.strokeWidth * 1.7 / render.cameraScale)
      ctx.beginPath(); ctx.moveTo(box.x, y + rowHeight); ctx.lineTo(box.x + box.width * rowProgress, y + rowHeight); ctx.stroke()
    }
  }
  ctx.strokeStyle = node.style.color
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  roundedRect(ctx, box.x, box.y, box.width, box.height, radius)
  ctx.stroke()
  ctx.restore()
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  ctx.beginPath(); ctx.roundRect(x, y, width, height, r)
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
