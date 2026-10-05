import type { Point, SceneNode } from "@/ir/types.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"

export function pointOnBoundary(node: SceneNode, toward: Point, box: BoundingBox): Point {
  const center = node.position
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  if (dx === 0 && dy === 0) return center
  if (node.type === "circle") {
    const radius = node.radius ?? Math.min(box.width, box.height) / 2
    const length = Math.hypot(dx, dy)
    return { x: center.x + (dx / length) * radius, y: center.y + (dy / length) * radius }
  }
  if (node.type === "ellipse") {
    const radiusX = Math.max(1, box.width / 2)
    const radiusY = Math.max(1, box.height / 2)
    const scale = 1 / Math.sqrt((dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY))
    return { x: center.x + dx * scale, y: center.y + dy * scale }
  }
  if (node.type === "diamond") {
    const halfWidth = Math.max(1, box.width / 2), halfHeight = Math.max(1, box.height / 2)
    const scale = 1 / (Math.abs(dx) / halfWidth + Math.abs(dy) / halfHeight)
    return { x: center.x + dx * scale, y: center.y + dy * scale }
  }
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2
  const scale = Math.min(Math.abs(halfWidth / dx) || Number.POSITIVE_INFINITY, Math.abs(halfHeight / dy) || Number.POSITIVE_INFINITY)
  return { x: center.x + dx * scale, y: center.y + dy * scale }
}

type ConnectionSide = "left" | "right" | "top" | "bottom"
type ArrowEndpoint = "source" | "target"
type BoundsForNode = (node: SceneNode) => BoundingBox

interface ArrowPort {
  arrowId: string
  endpoint: ArrowEndpoint
  owner: SceneNode
  side: ConnectionSide
  toward: Point
  sortValue: number
}

/** Resolve side anchors for all arrows together so parallel links get distinct ports. */
export function resolveArrowEndpoints(
  arrowNode: SceneNode,
  nodes: Map<string, SceneNode>,
  boundsFor: BoundsForNode,
): { start: Point; end: Point } {
  const ports: ArrowPort[] = []
  const arrows = [...nodes.values()].filter((node) => node.type === "arrow")
  if (!arrows.some((node) => node.id === arrowNode.id)) arrows.push(arrowNode)

  for (const arrow of arrows) {
    const source = nodes.get(String(arrow.data?.fromId ?? ""))
    const target = nodes.get(String(arrow.data?.toId ?? ""))
    if (!source || !target) continue
    const waypoints = readWaypoints(arrow.data?.waypoints)
    const endpoints: Array<{ endpoint: ArrowEndpoint; owner: SceneNode; other: SceneNode; toward: Point }> = [
      { endpoint: "source", owner: source, other: target, toward: waypoints[0] ?? target.position },
      { endpoint: "target", owner: target, other: source, toward: waypoints.at(-1) ?? source.position },
    ]
    for (const item of endpoints) {
      const box = boundsFor(item.owner)
      const side = nearestSide(item.owner.position, item.toward, box)
      const sortValue = side === "left" || side === "right" ? item.other.position.y : item.other.position.x
      ports.push({ arrowId: arrow.id, endpoint: item.endpoint, owner: item.owner, side, toward: item.toward, sortValue })
    }
  }

  const selected = ports.filter((port) => port.arrowId === arrowNode.id)
  const findPort = (endpoint: ArrowEndpoint) => {
    const port = selected.find((candidate) => candidate.endpoint === endpoint)
    if (!port) return { x: 0, y: 0 }
    const group = ports
      .filter((candidate) => candidate.owner.id === port.owner.id && candidate.side === port.side)
      .sort((left, right) => left.sortValue - right.sortValue || left.arrowId.localeCompare(right.arrowId))
    const index = Math.max(0, group.findIndex((candidate) => candidate.arrowId === arrowNode.id && candidate.endpoint === endpoint))
    const fraction = group.length > 1
      ? 0.15 + 0.7 * (index + 1) / (group.length + 1)
      : sideFraction(port.toward, boundsFor(port.owner), port.side)
    return pointOnSide(port.owner, boundsFor(port.owner), port.side, fraction)
  }

  return { start: findPort("source"), end: findPort("target") }
}

function nearestSide(center: Point, toward: Point, box: BoundingBox): ConnectionSide {
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  const horizontal = Math.abs(dx) / Math.max(1, box.width / 2)
  const vertical = Math.abs(dy) / Math.max(1, box.height / 2)
  if (horizontal >= vertical) return dx < 0 ? "left" : "right"
  return dy < 0 ? "top" : "bottom"
}

function sideFraction(toward: Point, box: BoundingBox, side: ConnectionSide): number {
  const fraction = side === "left" || side === "right"
    ? (toward.y - box.y) / Math.max(1, box.height)
    : (toward.x - box.x) / Math.max(1, box.width)
  return Math.max(0.15, Math.min(0.85, fraction))
}

function pointOnSide(node: SceneNode, box: BoundingBox, side: ConnectionSide, fraction: number): Point {
  const x = box.x + box.width * fraction
  const y = box.y + box.height * fraction
  if (node.type === "diamond") {
    const normalized = side === "left" || side === "right"
      ? Math.abs((y - node.position.y) / Math.max(1, box.height / 2))
      : Math.abs((x - node.position.x) / Math.max(1, box.width / 2))
    const extent = Math.max(0, 1 - normalized)
    if (side === "left") return { x: node.position.x - box.width / 2 * extent, y }
    if (side === "right") return { x: node.position.x + box.width / 2 * extent, y }
    if (side === "top") return { x, y: node.position.y - box.height / 2 * extent }
    return { x, y: node.position.y + box.height / 2 * extent }
  }
  if (node.type !== "circle" && node.type !== "ellipse") {
    if (side === "left") return { x: box.x, y }
    if (side === "right") return { x: box.x + box.width, y }
    if (side === "top") return { x, y: box.y }
    return { x, y: box.y + box.height }
  }
  const radiusX = Math.max(1, box.width / 2)
  const radiusY = Math.max(1, box.height / 2)
  const normalized = side === "left" || side === "right"
    ? (y - node.position.y) / radiusY
    : (x - node.position.x) / radiusX
  const extent = Math.sqrt(Math.max(0, 1 - normalized * normalized))
  if (side === "left") return { x: node.position.x - radiusX * extent, y }
  if (side === "right") return { x: node.position.x + radiusX * extent, y }
  if (side === "top") return { x, y: node.position.y - radiusY * extent }
  return { x, y: node.position.y + radiusY * extent }
}

function readWaypoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return []
  return value.filter((point): point is Point => typeof point === "object" && point !== null &&
    typeof (point as Point).x === "number" && Number.isFinite((point as Point).x) &&
    typeof (point as Point).y === "number" && Number.isFinite((point as Point).y))
}

export function arrowEndpoints(source: SceneNode, target: SceneNode, sourceBox: BoundingBox, targetBox: BoundingBox): { start: Point; end: Point } {
  const sourceSide = nearestSide(source.position, target.position, sourceBox)
  const targetSide = nearestSide(target.position, source.position, targetBox)
  return {
    start: pointOnSide(source, sourceBox, sourceSide, sideFraction(target.position, sourceBox, sourceSide)),
    end: pointOnSide(target, targetBox, targetSide, sideFraction(source.position, targetBox, targetSide)),
  }
}
