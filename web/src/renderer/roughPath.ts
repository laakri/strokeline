import type { Drawable, Op } from "roughjs/bin/core"
import type { RoughCanvas } from "roughjs/bin/canvas"
import type { RoughGenerator } from "roughjs/bin/generator"
import rough from "roughjs/bundled/rough.esm.js"
import type { Point, SceneNode } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"

export interface SampledPath {
  points: Point[]
}

export interface SampledPathGroup {
  paths: SampledPath[]
  main: SampledPath
}

const cache = new Map<string, SampledPath[]>()
const pathGenerator = rough.generator()

function roughOptions(node: SceneNode, cameraScale: number) {
  const pen = node.style.pen
  let hash = 2166136261
  for (let index = 0; index < node.id.length; index++) {
    hash ^= node.id.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  const roughness = typeof node.data?.roughness === "number"
    ? node.data.roughness
    : pen === "clean" ? 0 : pen === "chalk" ? 2 : pen === "pencil" ? 1.5 : pen === "marker" ? 0.25 : pen === "brush" ? 1.8 : 1.2
  const bowing = typeof node.data?.bowing === "number"
    ? node.data.bowing
    : pen === "marker" || pen === "clean" ? 0 : 1
  return {
    seed: typeof node.data?.roughSeed === "number" ? node.data.roughSeed : hash >>> 0,
    stroke: node.style.color,
    strokeWidth: node.style.strokeWidth / cameraScale,
    fill: node.style.fill,
    roughness,
    bowing,
    fillStyle: node.data?.roughFill === "none" ? undefined : node.data?.roughFill,
  }
}

export function drawRoughFill(
  roughCanvas: RoughCanvas,
  generator: RoughGenerator,
  node: SceneNode,
  cameraScale = 1
): void {
  const fillStyle = node.data?.roughFill
  if (!node.style.fill || typeof fillStyle !== "string" || fillStyle === "none") return
  const options = {
    ...roughOptions(node, cameraScale),
    fill: node.style.fill,
    fillStyle: fillStyle === "cross-hatch" ? "cross-hatch" : fillStyle,
    fillWeight: 2 / cameraScale,
    hachureGap: 7 / cameraScale,
    stroke: "transparent",
    strokeWidth: 0,
  }

  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  if (node.type === "rectangle")
    roughCanvas.draw(generator.rectangle(node.position.x - width / 2, node.position.y - height / 2, width, height, options))
  else if (node.type === "ellipse" || node.type === "circle")
    roughCanvas.draw(generator.ellipse(node.position.x, node.position.y, node.type === "circle" ? (node.radius ?? 0) * 2 : width, node.type === "circle" ? (node.radius ?? 0) * 2 : height, options))
  else if (node.type === "diamond")
    roughCanvas.draw(generator.polygon([
      [node.position.x, node.position.y - height / 2],
      [node.position.x + width / 2, node.position.y],
      [node.position.x, node.position.y + height / 2],
      [node.position.x - width / 2, node.position.y],
    ], options))
}

export function usesPatternedRoughFill(node: SceneNode): boolean {
  const fillStyle = node.data?.roughFill
  return typeof fillStyle === "string" && fillStyle !== "none" && fillStyle !== "solid"
}

function sampleCubic(start: Point, data: number[], samples: number): Point[] {
  const [x1, y1, x2, y2, x3, y3] = data
  return Array.from({ length: samples }, (_, index) => {
    const t = (index + 1) / samples
    const inverse = 1 - t
    return {
      x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * x1 + 3 * inverse * t ** 2 * x2 + t ** 3 * x3,
      y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * y1 + 3 * inverse * t ** 2 * y2 + t ** 3 * y3,
    }
  })
}

function sampleOps(ops: Op[], samplesPerCurve: number): SampledPath[] {
  const paths: SampledPath[] = []
  let path: Point[] = []
  let current: Point | undefined
  for (const operation of ops) {
    if (operation.op === "move") {
      if (path.length > 1) paths.push({ points: path })
      current = { x: operation.data[0]!, y: operation.data[1]! }
      path = [current]
    } else if (operation.op === "lineTo") {
      current = { x: operation.data[0]!, y: operation.data[1]! }
      path.push(current)
    } else if (operation.op === "bcurveTo" && current) {
      const points = sampleCubic(current, operation.data, samplesPerCurve)
      path.push(...points)
      current = points[points.length - 1]
    }
  }
  if (path.length > 1) paths.push({ points: path })
  return paths
}

/** Converts deterministic roughjs operations into stable polylines for reveal and replay. */
export function sampleRoughDrawable(drawable: Drawable, samplesPerCurve = 14): SampledPath[] {
  return drawable.sets
    .filter((set) => set.type === "path")
    .flatMap((set) => sampleOps(set.ops, samplesPerCurve))
}

export function cachedSampledRoughPath(
  key: string,
  factory: () => SampledPath[]
): SampledPath[] {
  const existing = cache.get(key)
  if (existing) return existing
  const paths = factory()
  if (cache.size > 256) cache.delete(cache.keys().next().value!)
  cache.set(key, paths)
  return paths
}

/** Returns the exact sampled outline used by opt-in geometric renderers. */
export function sampledRoughPathsForNode(
  node: SceneNode,
  cameraScale = 1
): SampledPath[] {
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  const options = roughOptions(node, cameraScale)
  const key = `node:${node.id}:${node.type}:${node.position.x}:${node.position.y}:${width}:${height}:${node.radius ?? 0}:${node.style.pen}:${node.style.strokeWidth}:${cameraScale}:${String(node.data?.roughness)}:${String(node.data?.roughSeed)}:${String(node.data?.bowing)}:${String(node.data?.roughFill)}`
  return cachedSampledRoughPath(key, () => {
    if (node.type === "rectangle")
      return sampleRoughDrawable(pathGenerator.rectangle(node.position.x - width / 2, node.position.y - height / 2, width, height, options))
    if (node.type === "ellipse")
      return sampleRoughDrawable(pathGenerator.ellipse(node.position.x, node.position.y, width, height, options))
    if (node.type === "circle")
      return sampleRoughDrawable(pathGenerator.ellipse(node.position.x, node.position.y, (node.radius ?? 0) * 2, (node.radius ?? 0) * 2, options))
    if (node.type === "diamond") {
      const points: [number, number][] = [
        [node.position.x, node.position.y - height / 2],
        [node.position.x + width / 2, node.position.y],
        [node.position.x, node.position.y + height / 2],
        [node.position.x - width / 2, node.position.y],
      ]
      return sampleRoughDrawable(pathGenerator.polygon(points, options))
    }
    const from = node.data?.from as Point | undefined
    const to = node.data?.to as Point | undefined
    if ((node.type === "line" || node.type === "arrow") && from && to)
      return sampleRoughDrawable(pathGenerator.line(from.x, from.y, to.x, to.y, options))
    return []
  })
}

export function roughSampledGeometryEnabled(node: SceneNode): boolean {
  return node.data?.roughSampledGeometry === true || node.data?._roughSampledGeometry === true
}

export function shouldUseRoughSampledGeometry(node: SceneNode): boolean {
  return features.roughSampledGeometry || roughSampledGeometryEnabled(node)
}

export function polylineLength(points: Point[]): number {
  let length = 0
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y)
  }
  return length
}

export function pointAtPolylineProgress(points: Point[], progress: number): { point: Point; angle: number } {
    const distance = polylineLength(points) * Math.max(0, Math.min(1, progress))
    let travelled = 0
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1]!, current = points[index]!
      const length = Math.hypot(current.x - previous.x, current.y - previous.y)
      if (travelled + length >= distance) {
        const amount = length ? (distance - travelled) / length : 0
        return {
          point: { x: previous.x + (current.x - previous.x) * amount, y: previous.y + (current.y - previous.y) * amount },
          angle: Math.atan2(current.y - previous.y, current.x - previous.x),
        }
      }
      travelled += length
    }
    const end = points.at(-1) ?? { x: 0, y: 0 }
    const previous = points.at(-2) ?? end
    return { point: end, angle: Math.atan2(end.y - previous.y, end.x - previous.x) }
  }

export function pointAtSampledProgress(paths: SampledPath[], progress: number): { point: Point; angle: number } {
    const groups = groupSampledPaths(paths)
    return pointAtSampledGroupProgress(groups, progress)
}

function pathEndpoints(path: SampledPath): { start: Point; end: Point } {
  return { start: path.points[0]!, end: path.points.at(-1)! }
}

function duplicateStroke(a: SampledPath, b: SampledPath): boolean {
  const first = pathEndpoints(a)
  const second = pathEndpoints(b)
  const length = Math.max(polylineLength(a.points), polylineLength(b.points), 1)
  const tolerance = Math.max(4, length * 0.12)
  const sameDirection = Math.hypot(first.start.x - second.start.x, first.start.y - second.start.y) <= tolerance
    && Math.hypot(first.end.x - second.end.x, first.end.y - second.end.y) <= tolerance
  const reverseDirection = Math.hypot(first.start.x - second.end.x, first.start.y - second.end.y) <= tolerance
    && Math.hypot(first.end.x - second.start.x, first.end.y - second.start.y) <= tolerance
  return sameDirection || reverseDirection
}

/** Groups Rough's duplicate passes while retaining the generator's edge order. */
export function groupSampledPaths(paths: SampledPath[]): SampledPathGroup[] {
  const groups: SampledPathGroup[] = []
  for (const path of paths) {
    const previous = groups.at(-1)
    if (previous && duplicateStroke(previous.main, path)) previous.paths.push(path)
    else groups.push({ paths: [path], main: path })
  }
  return groups
}

export function pointAtSampledGroupProgress(
  groups: SampledPathGroup[],
  progress: number
): { point: Point; angle: number; groupIndex: number } {
  const lengths = groups.map((group) => polylineLength(group.main.points))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * Math.max(0, Math.min(1, progress))
  for (let index = 0; index < groups.length; index++) {
    if (remaining <= lengths[index]!)
      return { ...pointAtPolylineProgress(groups[index]!.main.points, lengths[index] ? remaining / lengths[index]! : 0), groupIndex: index }
    remaining -= lengths[index]!
  }
  const last = groups.at(-1)
  return { ...pointAtPolylineProgress(last?.main.points ?? [], 1), groupIndex: Math.max(0, groups.length - 1) }
}

/** Follows disconnected sampled strokes without teleporting between their endpoints. */
export function pointAtSampledPenProgress(
  paths: SampledPath[],
  progress: number
): { point: Point; angle: number; lift: number } {
  const lengths = paths.map((path) => polylineLength(path.points))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  if (!total) return { ...pointAtSampledProgress(paths, progress), lift: 0 }
  const normalized = Math.max(0, Math.min(1, progress))
  let travelled = 0
  for (let index = 0; index < paths.length - 1; index++) {
    travelled += lengths[index]!
    const boundary = travelled / total
    const window = Math.min(0.025, 12 / total)
    if (normalized >= boundary - window && normalized <= boundary + window) {
      const before = paths[index]!.points.at(-1)!
      const after = paths[index + 1]!.points[0]!
      const amount = (normalized - (boundary - window)) / (window * 2)
      return {
        point: {
          x: before.x + (after.x - before.x) * amount,
          y: before.y + (after.y - before.y) * amount,
        },
        angle: Math.atan2(after.y - before.y, after.x - before.x),
        lift: Math.sin(amount * Math.PI),
      }
    }
  }
  return { ...pointAtSampledProgress(paths, normalized), lift: 0 }
}

function trimPolyline(points: Point[], distance: number): Point[] {
  if (points.length < 2 || distance <= 0) return distance <= 0 ? points.slice(0, 1) : points.slice()
  const result = [points[0]!]
  let remaining = distance
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!, current = points[index]!
    const segment = Math.hypot(current.x - previous.x, current.y - previous.y)
    if (remaining >= segment) {
      result.push(current)
      remaining -= segment
      continue
    }
    const ratio = segment ? remaining / segment : 0
    result.push({ x: previous.x + (current.x - previous.x) * ratio, y: previous.y + (current.y - previous.y) * ratio })
    break
  }
  return result
}

/** Draws all sampled strokes in one global length domain, making draw-on deterministic. */
export function drawSampledPaths(
  context: CanvasRenderingContext2D,
  paths: SampledPath[],
  progress = 1
): void {
  const lengths = paths.map((path) => polylineLength(path.points))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * Math.max(0, Math.min(1, progress))
  context.beginPath()
  for (let index = 0; index < paths.length; index++) {
    const points = trimPolyline(paths[index]!.points, remaining)
    remaining -= Math.min(remaining, lengths[index]!)
    if (points.length < 2) continue
    context.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) context.lineTo(point.x, point.y)
  }
  context.stroke()
}

/** Reveals Rough.js overdraw strokes together so the pen never retraces them. */
export function drawSampledPathsParallel(
  context: CanvasRenderingContext2D,
  paths: SampledPath[],
  progress = 1
): void {
  const clamped = Math.max(0, Math.min(1, progress))
  context.beginPath()
  for (const path of paths) {
    const points = trimPolyline(path.points, polylineLength(path.points) * clamped)
    if (points.length < 2) continue
    context.moveTo(points[0]!.x, points[0]!.y)
    for (const point of points.slice(1)) context.lineTo(point.x, point.y)
  }
  context.stroke()
}

/** Reveals one Rough edge group at a time, keeping duplicate passes synchronized. */
export function drawSampledPathGroups(
  context: CanvasRenderingContext2D,
  groups: SampledPathGroup[],
  progress = 1
): void {
  const lengths = groups.map((group) => polylineLength(group.main.points))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  let remaining = total * Math.max(0, Math.min(1, progress))
  context.beginPath()
  for (let index = 0; index < groups.length; index++) {
    const local = lengths[index] ? Math.max(0, Math.min(1, remaining / lengths[index]!)) : 0
    for (const path of groups[index]!.paths) {
      const points = trimPolyline(path.points, polylineLength(path.points) * local)
      if (points.length < 2) continue
      context.moveTo(points[0]!.x, points[0]!.y)
      for (const point of points.slice(1)) context.lineTo(point.x, point.y)
    }
    remaining -= Math.min(remaining, lengths[index]!)
    if (remaining <= 0) break
  }
  context.stroke()
}
