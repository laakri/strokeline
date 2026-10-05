import type { Point, SceneNode } from "@/ir/types.ts"
import { resolveArrowEndpoints } from "@/renderer/geometry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { ShapeRegistry } from "@/renderer/shapes/registry.ts"
import { cameraScaledFontSize, drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

type ArrowRoute = "straight" | "elbow" | "curve"
type ArrowHead = "none" | "end" | "both" | "triangle" | "diamond" | "diamond-filled" | "open"

export function arrowBoundingBox(node: SceneNode): BoundingBox {
  return { x: node.position.x, y: node.position.y, width: 0, height: 0 }
}

export function drawArrow(renderContext: RenderContext, node: SceneNode): void {
  const from = renderContext.nodes.get(String(node.data?.fromId ?? ""))
  const to = renderContext.nodes.get(String(node.data?.toId ?? ""))
  if (!from || !to) return

  const route = asRoute(node.data?.route)
  const waypoints = readWaypoints(node.data?.waypoints)
  const { start, end } = resolveArrowEndpoints(node, renderContext.nodes, nodeBounds)
  const selfMessage = from.id === to.id
  const path = selfMessage
    ? selfLoop(nodeBounds(from), renderContext.cameraScale)
    : routePoints(start, end, route, waypoints)
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const head = asHead(node.data?.head)
  let visiblePath = trimPath(path, progress)
  if (progress >= 1 && isStyledHead(head)) visiblePath = trimPolyline(visiblePath, headLength(head, renderContext.cameraScale))
  if (visiblePath.length > 1) {
    const ctx = renderContext.context
    ctx.save()
    ctx.strokeStyle = node.style.color
    ctx.lineWidth = Math.max(1, node.style.strokeWidth / renderContext.cameraScale)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (node.style.lineStyle === "dashed") ctx.setLineDash([10 / renderContext.cameraScale, 7 / renderContext.cameraScale])
    if (node.style.lineStyle === "dotted") ctx.setLineDash([2 / renderContext.cameraScale, 6 / renderContext.cameraScale])
    ctx.beginPath()
    if (route === "curve" && !selfMessage && visiblePath.length >= 4) {
      ctx.moveTo(visiblePath[0]!.x, visiblePath[0]!.y)
      for (let index = 1; index < visiblePath.length; index++) ctx.lineTo(visiblePath[index]!.x, visiblePath[index]!.y)
    } else traceRoundedPath(ctx, visiblePath, 9 / renderContext.cameraScale)
    ctx.stroke()
    ctx.restore()
  }

  if (progress < 1 || visiblePath.length < 2) return
  if (isStyledHead(head)) drawArrowHead(renderContext, node, head, path[path.length - 2]!, path[path.length - 1]!)
  if (head === "end" || head === "both") drawArrowHead(renderContext, node, "end", path[path.length - 2]!, path[path.length - 1]!)
  if (head === "both") drawArrowHead(renderContext, node, path[1]!, path[0]!)

  const sourceLabel = String(node.data?.sourceLabel ?? "")
  const targetLabel = String(node.data?.targetLabel ?? "")
  const labelFontSize = node.style.fontSize ?? DEFAULT_LABEL_SIZE
  const endpointLabelStyle = {
    color: node.style.color,
    fontSize: labelFontSize,
    fontFamily: node.style.fontFamily,
  }
  const labelScale = renderContext.cameraScale
  const endpointLabelGap =
    (cameraScaledFontSize(labelFontSize, labelScale) * 0.65 + 12) / labelScale
  if (sourceLabel) {
    const center = endpointLabelPoint(path, true, endpointLabelGap, 8 / labelScale)
    drawLabel(renderContext, sourceLabel, center, endpointLabelStyle, progress)
  }
  if (targetLabel) {
    const center = endpointLabelPoint(path, false, endpointLabelGap, 8 / labelScale)
    drawLabel(renderContext, targetLabel, center, endpointLabelStyle, progress)
  }

  const middle = trimPath(path, 0.5)
  const labelPosition = middle[middle.length - 1] ?? end
  const previous = middle[middle.length - 2] ?? start
  const angle = Math.atan2(labelPosition.y - previous.y, labelPosition.x - previous.x)
  const offset = { x: -Math.sin(angle) * 18 / renderContext.cameraScale, y: Math.cos(angle) * 18 / renderContext.cameraScale }
  drawLabel(renderContext, node.label ?? node.text, labelPosition, { color: node.style.color, fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE, fontFamily: node.style.fontFamily, offset }, progress)
}

export const arrow: ShapeRenderer = { draw: drawArrow, boundingBox: arrowBoundingBox }

function routePoints(start: Point, end: Point, route: ArrowRoute, waypoints: Point[]): Point[] {
  if (waypoints.length) {
    const anchors = [start, ...waypoints, end]
    if (route === "curve") return curveThroughPoints(anchors)
    if (route === "elbow") return elbowThroughPoints(anchors)
    return anchors
  }
  if (route === "straight") return [start, end]
  if (route === "elbow") {
    if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
      const middleX = (start.x + end.x) / 2
      return [start, { x: middleX, y: start.y }, { x: middleX, y: end.y }, end]
    }
    const middleY = (start.y + end.y) / 2
    return [start, { x: start.x, y: middleY }, { x: end.x, y: middleY }, end]
  }
  const dx = end.x - start.x
  const dy = end.y - start.y
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const bend = Math.max(Math.abs(dx), Math.abs(dy)) * 0.45
  const first = horizontal
    ? { x: start.x + Math.sign(dx || 1) * bend, y: start.y }
    : { x: start.x, y: start.y + Math.sign(dy || 1) * bend }
  const second = horizontal
    ? { x: end.x - Math.sign(dx || 1) * bend, y: end.y }
    : { x: end.x, y: end.y - Math.sign(dy || 1) * bend }
  return Array.from({ length: 25 }, (_, index) => {
    const t = index / 24
    return cubicPoint(start, first, second, end, t)
  })
}

function selfLoop(box: BoundingBox, scale: number): Point[] {
  const gap = 14 / scale
  const lift = Math.max(40 / scale, box.height * 0.45)
  const start = { x: box.x + box.width * 0.72, y: box.y }
  const end = { x: box.x + box.width * 0.28, y: box.y }
  const right = box.x + box.width + gap
  const top = box.y - lift
  return [start, { x: right, y: start.y }, { x: right, y: top }, { x: end.x, y: top }, end]
}

function traceRoundedPath(ctx: CanvasRenderingContext2D, points: Point[], radius: number): void {
  if (!points.length) return
  ctx.moveTo(points[0]!.x, points[0]!.y)
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1]!, corner = points[index]!, next = points[index + 1]!
    const before = distance(previous, corner), after = distance(corner, next)
    const inset = Math.min(radius, before / 2, after / 2)
    const a = { x: corner.x + (previous.x - corner.x) * inset / (before || 1), y: corner.y + (previous.y - corner.y) * inset / (before || 1) }
    const b = { x: corner.x + (next.x - corner.x) * inset / (after || 1), y: corner.y + (next.y - corner.y) * inset / (after || 1) }
    ctx.lineTo(a.x, a.y); ctx.quadraticCurveTo(corner.x, corner.y, b.x, b.y)
  }
  const last = points[points.length - 1]!
  if (points.length > 1) ctx.lineTo(last.x, last.y)
}

function curveThroughPoints(points: Point[]): Point[] {
  if (points.length < 3) return routePoints(points[0]!, points[points.length - 1]!, "curve", [])
  const curve: Point[] = []
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!
    const end = points[index + 1]!
    const previous = points[index - 1] ?? start
    const next = points[index + 2] ?? end
    const firstControl = { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 }
    const secondControl = { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 }
    for (let step = 0; step < 8; step++) curve.push(cubicPoint(start, firstControl, secondControl, end, step / 8))
  }
  curve.push(points[points.length - 1]!)
  return curve
}

function elbowThroughPoints(points: Point[]): Point[] {
  const path: Point[] = [points[0]!]
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]!
    const end = points[index]!
    if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
      const middleX = (start.x + end.x) / 2
      path.push({ x: middleX, y: start.y }, { x: middleX, y: end.y }, end)
    } else {
      const middleY = (start.y + end.y) / 2
      path.push({ x: start.x, y: middleY }, { x: end.x, y: middleY }, end)
    }
  }
  return path
}

function cubicPoint(start: Point, first: Point, second: Point, end: Point, t: number): Point {
  const inverse = 1 - t
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * first.x + 3 * inverse * t ** 2 * second.x + t ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * first.y + 3 * inverse * t ** 2 * second.y + t ** 3 * end.y,
  }
}

function trimPath(path: Point[], progress: number): Point[] {
  if (path.length < 2 || progress <= 0) return path.length ? [path[0]!] : []
  if (progress >= 1) return path
  const lengths = path.slice(1).map((point, index) => distance(path[index]!, point))
  const targetLength = lengths.reduce((sum, length) => sum + length, 0) * progress
  const result = [path[0]!]
  let travelled = 0
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!
    const next = path[index + 1]!
    if (travelled + length < targetLength) {
      result.push(next)
      travelled += length
      continue
    }
    const segmentProgress = length === 0 ? 0 : (targetLength - travelled) / length
    result.push({
      x: path[index]!.x + (next.x - path[index]!.x) * segmentProgress,
      y: path[index]!.y + (next.y - path[index]!.y) * segmentProgress,
    })
    break
  }
  return result
}

function drawArrowHead(renderContext: RenderContext, node: SceneNode, style: ArrowHead, from: Point, tip: Point): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const length = headLength(style, renderContext.cameraScale)
  const halfWidth = (style === "diamond" || style === "diamond-filled" ? 8 : 7) / renderContext.cameraScale
  const ux = Math.cos(angle)
  const uy = Math.sin(angle)
  const px = -uy
  const py = ux
  const back = { x: tip.x - length * ux, y: tip.y - length * uy }
  const left = { x: back.x + halfWidth * px, y: back.y + halfWidth * py }
  const right = { x: back.x - halfWidth * px, y: back.y - halfWidth * py }
  const ctx = renderContext.context
  ctx.save()
  ctx.strokeStyle = node.style.color
  ctx.fillStyle = node.style.color
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / renderContext.cameraScale)
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  if (style === "open") {
    ctx.beginPath(); ctx.moveTo(left.x, left.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(right.x, right.y); ctx.stroke()
    ctx.restore()
    return
  }
  if (style === "diamond" || style === "diamond-filled") {
    const middle = { x: tip.x - length * 0.5 * ux, y: tip.y - length * 0.5 * uy }
    const points: Array<[number, number]> = [
      [tip.x, tip.y], [middle.x + halfWidth * px, middle.y + halfWidth * py],
      [back.x, back.y], [middle.x - halfWidth * px, middle.y - halfWidth * py],
    ]
    ctx.beginPath(); ctx.moveTo(points[0]![0], points[0]![1])
    for (const point of points.slice(1)) ctx.lineTo(point[0], point[1])
    ctx.closePath()
    if (style === "diamond-filled") ctx.fill()
    ctx.stroke(); ctx.restore()
    return
  }
  ctx.beginPath(); ctx.moveTo(tip.x, tip.y); ctx.lineTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.closePath()
  if (style === "end") ctx.fill()
  ctx.stroke(); ctx.restore()
}

function asRoute(value: unknown): ArrowRoute {
  return value === "elbow" || value === "curve" ? value : "straight"
}

function asHead(value: unknown): ArrowHead {
  return value === "none" || value === "both" || value === "triangle" || value === "diamond" || value === "diamond-filled" || value === "open" ? value : "end"
}

function isStyledHead(head: ArrowHead): boolean {
  return head === "triangle" || head === "diamond" || head === "diamond-filled" || head === "open"
}

function headLength(head: ArrowHead, scale: number): number {
  return (head === "diamond" || head === "diamond-filled" ? 20 : 14) / scale
}

export function endpointLabelPoint(
  path: Point[],
  source: boolean,
  perpendicularOffset: number,
  tangentOffset: number,
): Point {
  const anchor = source ? path[0]! : path[path.length - 1]!
  const step = source ? 1 : -1
  let neighborIndex = source ? 1 : path.length - 2
  while (
    neighborIndex >= 0 &&
    neighborIndex < path.length &&
    distance(anchor, path[neighborIndex]!) === 0
  ) {
    neighborIndex += step
  }
  const neighbor = path[neighborIndex] ?? anchor
  const dx = source ? neighbor.x - anchor.x : anchor.x - neighbor.x
  const dy = source ? neighbor.y - anchor.y : anchor.y - neighbor.y
  const length = Math.hypot(dx, dy) || 1
  const tangentX = dx / length
  const tangentY = dy / length
  const side = source ? -1 : 1
  const tangentDirection = source ? 1 : -1
  return {
    x: anchor.x + tangentX * tangentOffset * tangentDirection - tangentY * perpendicularOffset * side,
    y: anchor.y + tangentY * tangentOffset * tangentDirection + tangentX * perpendicularOffset * side,
  }
}

function trimPolyline(path: Point[], distanceFromEnd: number): Point[] {
  if (path.length < 2 || distanceFromEnd <= 0) return path
  let remaining = distanceFromEnd
  const result = [...path]
  while (result.length > 1 && remaining > 0) {
    const tip = result[result.length - 1]!
    const previous = result[result.length - 2]!
    const length = distance(previous, tip)
    if (length <= remaining) {
      result.pop()
      remaining -= length
    } else {
      const fraction = (length - remaining) / length
      result[result.length - 1] = { x: previous.x + (tip.x - previous.x) * fraction, y: previous.y + (tip.y - previous.y) * fraction }
      remaining = 0
    }
  }
  return result
}

function readWaypoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return []
  return value.filter((point): point is Point => typeof point === "object" && point !== null &&
    typeof (point as Point).x === "number" && Number.isFinite((point as Point).x) &&
    typeof (point as Point).y === "number" && Number.isFinite((point as Point).y))
}

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function nodeBounds(node: SceneNode): BoundingBox {
  return node.type === "ink" ? inkBoundingBox(node) : ShapeRegistry[node.type].boundingBox(node)
}
