import type { SceneNode } from "@/ir/types.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { seedFromId } from "@/renderer/handdrawn.ts"

interface Row { label: string; value: number }
const colors = ["#3D8B82", "#E3A23B", "#D7685B", "#6679B9", "#69A66D", "#A16FA3"]

export function chartBounds(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 800
  const height = node.size?.height ?? 500
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

export function drawChart(render: RenderContext, node: SceneNode): void {
  const ctx = render.context
  const box = chartBounds(node)
  const rows = (node.data?.rows as Row[] | undefined) ?? []
  if (!rows.length) return
  const kind = String(node.data?.chartType ?? "barchart")
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const max = Math.max(1, ...rows.map((row) => row.value))
  const left = box.x + 58, top = box.y + 24, right = box.x + box.width - 18, bottom = box.y + box.height - 54
  const width = right - left, height = bottom - top
  ctx.save()
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / render.cameraScale)
  ctx.strokeStyle = node.style.color
  ctx.fillStyle = node.style.color
  ctx.font = `${Math.max(12, Math.min(18, height * 0.055))}px "${node.style.fontFamily ?? "Caveat Variable"}"`
  ctx.textBaseline = "middle"
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(right, bottom); ctx.stroke()
  for (let tick = 1; tick <= 4; tick++) {
    const y = bottom - height * tick / 4
    ctx.globalAlpha = 0.28
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke()
    ctx.globalAlpha = 1
    ctx.textAlign = "right"
    ctx.fillText(String(Math.round(max * tick / 4)), left - 8, y)
  }
  const step = width / rows.length
  const count = Math.ceil(rows.length * progress)
  if (kind === "piechart") {
    const total = rows.reduce((sum, row) => sum + Math.max(0, row.value), 0) || 1
    const radius = Math.min(width, height) * 0.36
    let angle = -Math.PI / 2
    const visible = rows.slice(0, count)
    for (let i = 0; i < visible.length; i++) {
      const row = visible[i]!
      const end = angle + Math.PI * 2 * row.value / total
      ctx.beginPath(); ctx.moveTo((left + right) / 2, top + height / 2)
      ctx.arc((left + right) / 2, top + height / 2, radius, angle, end)
      ctx.closePath(); ctx.fillStyle = colors[(i + seedFromId(node.id)) % colors.length]!; ctx.fill()
      angle = end
    }
  } else {
    const visible = rows.slice(0, count)
    if (kind === "linechart") {
      ctx.beginPath()
      visible.forEach((row, i) => {
        const x = left + step * (i + 0.5)
        const y = bottom - height * row.value / max
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = node.style.color; ctx.lineWidth = Math.max(2, node.style.strokeWidth / render.cameraScale); ctx.stroke()
      visible.forEach((row, i) => {
        const x = left + step * (i + 0.5), y = bottom - height * row.value / max
        ctx.beginPath(); ctx.arc(x, y, 4 / render.cameraScale, 0, Math.PI * 2); ctx.fillStyle = node.style.color; ctx.fill()
      })
    } else {
      visible.forEach((row, i) => {
        const barWidth = Math.max(1, step * 0.62)
        const barHeight = height * row.value / max
        ctx.fillStyle = colors[(i + seedFromId(node.id)) % colors.length]!
        ctx.fillRect(left + step * i + (step - barWidth) / 2, bottom - barHeight, barWidth, barHeight)
      })
    }
    const labelStep = Math.max(1, Math.ceil(110 / Math.max(1, step)))
    ctx.fillStyle = node.style.color; ctx.textAlign = "center"
    visible.forEach((row, i) => {
      if (i % labelStep === 0) ctx.fillText(row.label, left + step * (i + 0.5), bottom + 24, Math.max(20, step - 6))
    })
  }
  if (kind === "piechart") {
    ctx.textAlign = "center"
    const legendStride = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor(height / 24))))
    rows.slice(0, count).forEach((row, i) => {
      if (i % legendStride === 0) ctx.fillText(row.label, left + 40, top + 18 + Math.floor(i / legendStride) * 22)
    })
  }
  ctx.restore()
}

export const chart: ShapeRenderer = { draw: drawChart, boundingBox: chartBounds }
