import type { SceneNode } from "@/ir/types.ts"
import { applyCamera } from "@/renderer/camera.ts"
import { resolveArrowEndpoints } from "@/renderer/geometry.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import { ShapeRegistry, type BoundingBox } from "@/renderer/shapes/registry.ts"
import type { CanvasSize, RenderState } from "@/timeline/timeline.ts"

function nodeBounds(node: SceneNode, nodes: Map<string, SceneNode>): BoundingBox {
  if (node.type === "ink") return inkBoundingBox(node)
  if (node.type === "arrow") {
    const from = nodes.get(String(node.data?.fromId ?? ""))
    const to = nodes.get(String(node.data?.toId ?? ""))
    if (from && to && from.type !== "arrow" && to.type !== "arrow") {
      const points = resolveArrowEndpoints(node, nodes, (target) => target.type === "ink"
        ? inkBoundingBox(target)
        : ShapeRegistry[target.type].boundingBox(target))
      return {
        x: Math.min(points.start.x, points.end.x),
        y: Math.min(points.start.y, points.end.y),
        width: Math.abs(points.end.x - points.start.x),
        height: Math.abs(points.end.y - points.start.y),
      }
    }
  }
  return ShapeRegistry[node.type].boundingBox(node)
}

export function drawPreflightOverlay(
  context: CanvasRenderingContext2D,
  state: RenderState,
  canvasSize: CanvasSize,
  issueSeverities: ReadonlyMap<string, "error" | "warning">,
  selectedId?: string,
  showGuides = true,
  selectedOnly = false
): void {
  const { canvas } = context
  const ratio = Math.min(2, canvas.width / canvasSize.width)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  applyCamera(context, state.camera, canvasSize, ratio)

  const scale = Math.max(0.01, state.camera.scale)
  if (showGuides) {
    context.save()
    context.lineWidth = 2 / scale
    context.setLineDash([10 / scale, 8 / scale])
    context.strokeStyle = "#f2c96d"
    context.strokeRect(120, 100, 1680, 880)
    context.restore()

    context.save()
    context.globalAlpha = 0.42
    context.lineWidth = 1 / scale
    context.setLineDash([8 / scale, 10 / scale])
    context.strokeStyle = "#57c7d4"
    context.beginPath()
    context.moveTo(canvasSize.width / 2, 0)
    context.lineTo(canvasSize.width / 2, canvasSize.height)
    context.moveTo(0, canvasSize.height / 2)
    context.lineTo(canvasSize.width, canvasSize.height / 2)
    context.stroke()
    context.restore()
  }

  const nodes = new Map(state.nodes.map((node) => [node.id, node]))
  for (const node of state.nodes) {
    if (selectedOnly && node.id !== selectedId) continue
    if (node.data?.layoutContainer === true) continue
    const box = nodeBounds(node, nodes)
    if (box.width <= 0 || box.height <= 0) continue
    const severity = issueSeverities.get(node.id)
    const selected = selectedId === node.id
    context.save()
    context.globalAlpha = 0.9
    context.lineWidth = (selected ? 3 : 1.5) / scale
    context.setLineDash([5 / scale, 4 / scale])
    context.strokeStyle = selected
      ? "#ffffff"
      : severity === "error"
        ? "#ff7777"
        : severity === "warning"
          ? "#ffad55"
          : "#72d9a0"
    context.strokeRect(box.x, box.y, box.width, box.height)

    const fontSize = 12 / scale
    const label = node.id
    context.font = `600 ${fontSize}px sans-serif`
    const labelWidth = context.measureText(label).width + 10 / scale
    const labelHeight = 18 / scale
    const labelY = box.y - labelHeight
    context.fillStyle = selected
      ? "#175d66"
      : severity === "error"
        ? "#7d2828"
        : severity === "warning"
          ? "#82420b"
          : "#193b2b"
    context.fillRect(box.x, labelY, labelWidth, labelHeight)
    context.fillStyle = "#ffffff"
    context.fillText(label, box.x + 5 / scale, labelY + 13 / scale)
    context.restore()
  }
  context.restore()
}

export function preflightNodeAt(
  state: RenderState,
  x: number,
  y: number,
  currentId?: string | null
): string | undefined {
  const hits = preflightNodesAt(state, x, y)
  if (!hits.length) return undefined
  const currentIndex = hits.indexOf(currentId ?? "")
  return currentIndex >= 0 ? hits[(currentIndex + 1) % hits.length] : hits[0]
}

export function preflightNodesAt(state: RenderState, x: number, y: number): string[] {
  const nodes = new Map(state.nodes.map((node) => [node.id, node]))
  const orderedNodes = [...state.nodes].reverse()
  return orderedNodes.filter((node) => {
    if (node.data?.layoutContainer === true) return false
    const box = nodeBounds(node, nodes)
    const padding = 10
    return x >= box.x - padding && x <= box.x + box.width + padding &&
      y >= box.y - padding && y <= box.y + box.height + padding
  }).map((node) => node.id)
}
