import type { Point, SceneNode } from "@/ir/types.ts"
import { arrowEndpoints, pointOnBoundary } from "@/renderer/geometry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { ShapeRegistry } from "@/renderer/shapes/registry.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

type ArrowRoute = "straight" | "elbow" | "curve"
type ArrowHead = "none" | "end" | "both"

export function arrowBoundingBox(node: SceneNode): BoundingBox {
  return { x: node.position.x, y: node.position.y, width: 0, height: 0 }
}

export function drawArrow(renderContext: RenderContext, node: SceneNode): void {
  const from = renderContext.nodes.get(String(node.data?.fromId ?? ""))
  const to = renderContext.nodes.get(String(node.data?.toId ?? ""))
  if (!from || !to) return

  const route = asRoute(node.data?.route)
  const waypoints = readWaypoints(node.data?.waypoints)
  const fromBox = nodeBounds(from)
  const toBox = nodeBounds(to)
  let { start, end } = arrowEndpoints(from, to, fromBox, toBox)
  if (waypoints.length) {
    start = pointOnBoundary(from, waypoints[0]!, fromBox)
    end = pointOnBoundary(to, waypoints[waypoints.length - 1]!, toBox)
  } else if (route === "elbow") {
    if (Math.abs(to.position.x - from.position.x) >= Math.abs(to.position.y - from.position.y)) {
      start = alignedBoundary(from, to.position, fromBox, "horizontal")
      end = alignedBoundary(to, from.position, toBox, "horizontal")
    } else {
      start = alignedBoundary(from, to.position, fromBox, "vertical")
      end = alignedBoundary(to, from.position, toBox, "vertical")
    }
  }

  const path = routePoints(start, end, route, waypoints)
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const visiblePath = trimPath(path, progress)
  if (visiblePath.length > 1) {
    const options = { ...strokeOptions(node, renderContext.cameraScale) } as ReturnType<typeof strokeOptions> & { strokeLineDash?: number[] }
    const dashScale = 1 / renderContext.cameraScale
    if (node.style.lineStyle === "dashed") options.strokeLineDash = [10 * dashScale, 7 * dashScale]
    if (node.style.lineStyle === "dotted") options.strokeLineDash = [2 * dashScale, 6 * dashScale]
    const coordinates = visiblePath.map((point) => [point.x, point.y])
    if (route === "curve" && visiblePath.length >= 4) renderContext.roughCanvas.curve(coordinates, options)
    else renderContext.roughCanvas.linearPath(coordinates, options)
  }

  if (progress < 1 || visiblePath.length < 2) return
  const head = asHead(node.data?.head)
  if (head === "end" || head === "both") drawArrowHead(renderContext, node, path[path.length - 2]!, path[path.length - 1]!)
  if (head === "both") drawArrowHead(renderContext, node, path[1]!, path[0]!)

  const middle = trimPath(path, 0.5)
  const labelPosition = middle[middle.length - 1] ?? end
  const previous = middle[middle.length - 2] ?? start
  const angle = Math.atan2(labelPosition.y - previous.y, labelPosition.x - previous.x)
  const offset = { x: -Math.sin(angle) * 18 / renderContext.cameraScale, y: Math.cos(angle) * 18 / renderContext.cameraScale }
  drawLabel(renderContext, node.label ?? node.text, labelPosition, { color: node.style.color, fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE, offset }, progress)
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

function drawArrowHead(renderContext: RenderContext, node: SceneNode, from: Point, tip: Point): void {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const headLength = 14 / renderContext.cameraScale
  const headWidth = 6 / renderContext.cameraScale
  const left = { x: tip.x - headLength * Math.cos(angle) + headWidth * Math.sin(angle), y: tip.y - headLength * Math.sin(angle) - headWidth * Math.cos(angle) }
  const right = { x: tip.x - headLength * Math.cos(angle) - headWidth * Math.sin(angle), y: tip.y - headLength * Math.sin(angle) + headWidth * Math.cos(angle) }
  const options = { ...strokeOptions(node, renderContext.cameraScale), strokeLineDash: undefined }
  renderContext.roughCanvas.polygon([[tip.x, tip.y], [left.x, left.y], [right.x, right.y]], { ...options, fill: node.style.color, fillStyle: "solid" })
}

function asRoute(value: unknown): ArrowRoute {
  return value === "elbow" || value === "curve" ? value : "straight"
}

function asHead(value: unknown): ArrowHead {
  return value === "none" || value === "both" ? value : "end"
}

function readWaypoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return []
  return value.filter((point): point is Point => typeof point === "object" && point !== null &&
    typeof (point as Point).x === "number" && Number.isFinite((point as Point).x) &&
    typeof (point as Point).y === "number" && Number.isFinite((point as Point).y))
}

function alignedBoundary(node: SceneNode, toward: Point, box: BoundingBox, axis: "horizontal" | "vertical"): Point {
  if (node.type === "circle") return pointOnBoundary(node, toward, box)
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2
  if (axis === "horizontal") {
    const y = Math.max(node.position.y - halfHeight, Math.min(node.position.y + halfHeight, toward.y))
    return { x: node.position.x + Math.sign(toward.x - node.position.x || 1) * halfWidth, y }
  }
  const x = Math.max(node.position.x - halfWidth, Math.min(node.position.x + halfWidth, toward.x))
  return { x, y: node.position.y + Math.sign(toward.y - node.position.y || 1) * halfHeight }
}

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function nodeBounds(node: SceneNode): BoundingBox {
  return node.type === "ink" ? inkBoundingBox(node) : ShapeRegistry[node.type].boundingBox(node)
}
