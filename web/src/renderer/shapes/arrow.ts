import type { Point, SceneNode } from "@/ir/types.ts"
import { formatMathText } from "@/lib/mathText.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { resolveArrowEndpoints } from "@/renderer/geometry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { inkBoundingBox } from "@/renderer/ink/draw.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { ShapeRegistry } from "@/renderer/shapes/registry.ts"
import { cameraScaledFontSize, drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"

type ArrowRoute = "straight" | "elbow" | "curve"
type ArrowHead = "none" | "end" | "both" | "triangle" | "diamond" | "diamond-filled" | "open"
type ArrowLabelPlacement = { center: Point; box: BoundingBox }

const LABEL_PADDING = 6
const LABEL_GAP = 12

export function arrowBoundingBox(node: SceneNode): BoundingBox {
  return { x: node.position.x, y: node.position.y, width: 0, height: 0 }
}

export function arrowLabelGlass(background: string): {
  color: string
  background: string
  border: string
} {
  const luminance = backgroundLuminance(background)
  return luminance < 0.45
    ? {
        color: "#FFFFFF",
        background: "rgba(235, 245, 255, 0.16)",
        border: "rgba(235, 245, 255, 0.34)",
      }
    : {
        color: "#FFFFFF",
        background: "rgba(15, 23, 42, 0.84)",
        border: "rgba(255, 255, 255, 0.38)",
      }
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

  const labelText = node.label ?? node.text
  const placement = renderContext.arrowLabelLayouts?.get(node.id) ??
    placeArrowLabel(
      path,
      labelText ?? "",
      cameraScaledFontSize(node.style.fontSize ?? DEFAULT_LABEL_SIZE, renderContext.cameraScale),
      node.style.fontFamily,
      [],
      [],
      [],
      node.id,
    )
  const glass = arrowLabelGlass(renderContext.backgroundColor ?? "#FAFAFA")
  drawLabel(renderContext, labelText, placement.center, {
    color: glass.color,
    fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE,
    fontFamily: node.style.fontFamily,
    background: glass.background,
    backgroundOpacity: 1,
    backgroundPadding: LABEL_PADDING,
    backgroundCorners: 6,
    backgroundBorder: glass.border,
    backgroundBorderOpacity: 1,
  }, progress)
}

export const arrow: ShapeRenderer = { draw: drawArrow, boundingBox: arrowBoundingBox }

export function layoutArrowLabels(
  nodes: Map<string, SceneNode>,
  cameraScale: number,
): Map<string, ArrowLabelPlacement> {
  const placements = new Map<string, ArrowLabelPlacement>()
  const reserved: BoundingBox[] = []
  const arrowNodes = [...nodes.values()]
    .filter((node) => node.type === "arrow" && (node.label ?? node.text))
    .sort((left, right) => left.id.localeCompare(right.id))
  const paths = new Map<string, Point[]>()
  for (const arrowNode of arrowNodes) {
    const from = nodes.get(String(arrowNode.data?.fromId ?? ""))
    const to = nodes.get(String(arrowNode.data?.toId ?? ""))
    if (!from || !to) continue
    const endpoints = resolveArrowEndpoints(arrowNode, nodes, nodeBounds)
    paths.set(arrowNode.id, from.id === to.id
      ? selfLoop(nodeBounds(from), cameraScale)
      : routePoints(endpoints.start, endpoints.end, asRoute(arrowNode.data?.route), readWaypoints(arrowNode.data?.waypoints)))
  }

  for (const arrowNode of arrowNodes) {
    const path = paths.get(arrowNode.id)
    const text = arrowNode.label ?? arrowNode.text
    if (!path || !text) continue
    const fontSize = cameraScaledFontSize(
      arrowNode.style.fontSize ?? DEFAULT_LABEL_SIZE,
      cameraScale,
    )
    const sourceId = String(arrowNode.data?.fromId ?? "")
    const targetId = String(arrowNode.data?.toId ?? "")
    const obstacles = [...nodes.values()]
      .filter((candidate) =>
        candidate.type !== "arrow" &&
        candidate.id !== sourceId &&
        candidate.id !== targetId,
      )
      .map(nodeBounds)
    const otherPaths = [...paths.entries()]
      .filter(([id]) => id !== arrowNode.id)
      .map(([, otherPath]) => otherPath)
    const placement = placeArrowLabel(
      path,
      text,
      fontSize,
      arrowNode.style.fontFamily,
      obstacles,
      otherPaths,
      reserved,
      arrowNode.id,
    )
    placements.set(arrowNode.id, placement)
    reserved.push(placement.box)
  }
  return placements
}

export function placeArrowLabel(
  path: Point[],
  text: string,
  fontSize: number,
  fontFamily: string | undefined,
  obstacles: BoundingBox[],
  otherPaths: Point[][],
  reserved: BoundingBox[],
  seed: string,
): ArrowLabelPlacement {
  const width = Math.max(1, measureTextWidth(formatMathText(text), fontSize, fontFamily))
  const height = fontSize * 1.3
  const tangentOffsets = [0, -0.5, 0.5, -1, 1]
  const fractions = [0.5, 0.36, 0.64, 0.22, 0.78]
  const preferredSide = hashString(seed) % 2 === 0 ? -1 : 1
  const sideOffsets = [preferredSide, -preferredSide]
  const candidates: ArrowLabelPlacement[] = []
  for (const fraction of fractions) {
    const anchor = pointAlongPath(path, fraction)
    const tangentRoom = Math.max(LABEL_GAP + width / 2, 24)
    for (const side of sideOffsets) {
      for (const tangentOffset of tangentOffsets) {
        const center = {
          x: anchor.point.x + anchor.normal.x * side * (height / 2 + LABEL_GAP) + anchor.tangent.x * tangentRoom * tangentOffset,
          y: anchor.point.y + anchor.normal.y * side * (height / 2 + LABEL_GAP) + anchor.tangent.y * tangentRoom * tangentOffset,
        }
        candidates.push({
          center,
          box: {
            x: center.x - width / 2 - LABEL_PADDING,
            y: center.y - height / 2 - LABEL_PADDING,
            width: width + LABEL_PADDING * 2,
            height: height + LABEL_PADDING * 2,
          },
        })
      }
    }
  }
  if (!candidates.length) {
    const center = path[0] ?? { x: 0, y: 0 }
    return { center, box: { x: center.x, y: center.y, width, height } }
  }
  let best = candidates[0]!
  let bestScore = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const shapeHits = obstacles.filter((box) => boxesOverlap(candidate.box, box)).length
    const labelHits = reserved.filter((box) => boxesOverlap(candidate.box, box)).length
    const ownLineHit = pathIntersectsBox(path, inflateBox(candidate.box, 2))
    const otherLineHits = otherPaths.filter((otherPath) =>
      pathIntersectsBox(otherPath, inflateBox(candidate.box, 2)),
    ).length
    const score = shapeHits * 1000 + labelHits * 800 + (ownLineHit ? 400 : 0) + otherLineHits * 300
    if (score < bestScore) {
      best = candidate
      bestScore = score
      if (score === 0) break
    }
  }
  return best
}

function pointAlongPath(path: Point[], fraction: number): {
  point: Point
  tangent: Point
  normal: Point
} {
  if (path.length < 2) {
    const point = path[0] ?? { x: 0, y: 0 }
    return { point, tangent: { x: 1, y: 0 }, normal: { x: 0, y: -1 } }
  }
  const lengths = path.slice(1).map((point, index) => distance(path[index]!, point))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * fraction
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!
    if (remaining > length && index < lengths.length - 1) {
      remaining -= length
      continue
    }
    const start = path[index]!
    const end = path[index + 1]!
    const tangent = {
      x: (end.x - start.x) / (length || 1),
      y: (end.y - start.y) / (length || 1),
    }
    const progress = length ? Math.max(0, Math.min(1, remaining / length)) : 0
    return {
      point: { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress },
      tangent,
      normal: { x: -tangent.y, y: tangent.x },
    }
  }
  const end = path[path.length - 1]!
  return { point: end, tangent: { x: 1, y: 0 }, normal: { x: 0, y: -1 } }
}

function boxesOverlap(left: BoundingBox, right: BoundingBox): boolean {
  return left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
}

function inflateBox(box: BoundingBox, amount: number): BoundingBox {
  return {
    x: box.x - amount,
    y: box.y - amount,
    width: box.width + amount * 2,
    height: box.height + amount * 2,
  }
}

function pathIntersectsBox(path: Point[], box: BoundingBox): boolean {
  for (let index = 1; index < path.length; index++) {
    const start = path[index - 1]!
    const end = path[index]!
    let t0 = 0, t1 = 1
    const dx = end.x - start.x, dy = end.y - start.y
    const clips: Array<[number, number]> = [
      [-dx, start.x - box.x],
      [dx, box.x + box.width - start.x],
      [-dy, start.y - box.y],
      [dy, box.y + box.height - start.y],
    ]
    let intersects = true
    for (const [p, q] of clips) {
      if (p === 0) {
        if (q < 0) { intersects = false; break }
      } else {
        const ratio = q / p
        if (p < 0) t0 = Math.max(t0, ratio)
        else t1 = Math.min(t1, ratio)
        if (t0 > t1) { intersects = false; break }
      }
    }
    if (intersects) return true
  }
  return false
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function backgroundLuminance(color: string): number {
  const hex = color.trim().replace(/^#/, "")
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return 1
  const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex
  const channels = [0, 2, 4].map((index) => parseInt(expanded.slice(index, index + 2), 16) / 255)
  return channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]!
  }, 0)
}

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
