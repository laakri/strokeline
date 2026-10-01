import type { SceneNode } from "@/ir/types.ts"
import { applyCamera } from "@/renderer/camera.ts"
import { arrowEndpoints } from "@/renderer/geometry.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import { ShapeRegistry, type BoundingBox } from "@/renderer/shapes/registry.ts"
import type { CanvasSize, RenderState } from "@/timeline/timeline.ts"

function nodeBounds(node: SceneNode, nodes: Map<string, SceneNode>): BoundingBox {
  if (node.type === "ink") return inkBoundingBox(node)
  if (node.type === "arrow") {
    const from = nodes.get(String(node.data?.fromId ?? ""))
    const to = nodes.get(String(node.data?.toId ?? ""))
    if (from && to && from.type !== "arrow" && to.type !== "arrow") {
      const start = from.type === "ink"
        ? inkBoundingBox(from)
        : ShapeRegistry[from.type].boundingBox(from)
      const end = to.type === "ink"
        ? inkBoundingBox(to)
        : ShapeRegistry[to.type].boundingBox(to)
      const points = arrowEndpoints(from, to, start, end)
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
  issueIds: Set<string>
): void {
  const { canvas } = context
  const ratio = Math.min(2, canvas.width / canvasSize.width)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  applyCamera(context, state.camera, canvasSize, ratio)

  const scale = Math.max(0.01, state.camera.scale)
  context.save()
  context.lineWidth = 2 / scale
  context.setLineDash([10 / scale, 8 / scale])
  context.strokeStyle = "#f2c96d"
  context.strokeRect(120, 100, 1680, 880)
  context.restore()

  const nodes = new Map(state.nodes.map((node) => [node.id, node]))
  for (const node of state.nodes) {
    if (node.data?.layoutContainer === true) continue
    const box = nodeBounds(node, nodes)
    if (box.width <= 0 || box.height <= 0) continue
    const hasIssue = issueIds.has(node.id)
    context.save()
    context.globalAlpha = 0.9
    context.lineWidth = 1.5 / scale
    context.setLineDash([5 / scale, 4 / scale])
    context.strokeStyle = hasIssue ? "#ff7777" : "#72d9a0"
    context.strokeRect(box.x, box.y, box.width, box.height)

    const fontSize = 12 / scale
    const label = node.id
    context.font = `600 ${fontSize}px sans-serif`
    const labelWidth = context.measureText(label).width + 10 / scale
    const labelHeight = 18 / scale
    const labelY = box.y - labelHeight
    context.fillStyle = hasIssue ? "#7d2828" : "#193b2b"
    context.fillRect(box.x, labelY, labelWidth, labelHeight)
    context.fillStyle = "#ffffff"
    context.fillText(label, box.x + 5 / scale, labelY + 13 / scale)
    context.restore()
  }
  context.restore()
}
