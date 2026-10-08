import { DEFAULT_HIGHLIGHT_COLOR } from "@/defaults/defaults.ts"
import flubber from "flubber"
import type { AnimationSpec, Point, SayLine, Scene, SceneNode, TableHighlightTarget, TimelineOp } from "@/ir/types.ts"
import { scheduleSays } from "@/subtitles/subtitles.ts"
import { clamp, easing } from "@/timeline/easing.ts"
import {
  cameraProgress,
  clampCameraState,
  fitCameraToNode,
  interpolateAnimation,
  revealAt,
} from "@/timeline/interpolate.ts"
import { pointAtSampledProgress, sampledRoughPathsForNode, shouldUseRoughSampledGeometry } from "@/renderer/roughPath.ts"

export interface ResolvedNode extends SceneNode {
  revealProgress: number
  revealStyle: string
  scale: number
}

export interface RenderCamera {
  position: Point
  scale: number
}

export interface HighlightState {
  targetId: string
  color: string
  drawProgress: number
  opacity: number
  tableTarget?: TableHighlightTarget
}

export interface RenderState {
  nodes: ResolvedNode[]
  highlights: HighlightState[]
  camera: RenderCamera
  pen?: PenState
  subtitle?: SayLine & { opacity: number; readingProgress: number }
}

export interface PenState {
  targetId: string
  position: Point
  angle: number
  opacity: number
  phase: "drawing" | "traveling"
  lift: number
}

type CreateOp = Extract<TimelineOp, { kind: "create" }>
type AnimateOp = Extract<TimelineOp, { kind: "animate" }>

interface AnimationGroup {
  t: number
  ops: AnimateOp[]
  start: ResolvedNode
}

const morphInterpolatorCache = new Map<string, (progress: number) => string>()

export function morphInterpolatorCacheSize(): number {
  return morphInterpolatorCache.size
}

function cachedMorphInterpolator(fromPath: string, toPath: string, options = {}): (progress: number) => string {
  const key = JSON.stringify([fromPath, toPath, options])
  const existing = morphInterpolatorCache.get(key)
  if (existing) return existing
  const interpolator = flubber.interpolate(fromPath, toPath, options)
  morphInterpolatorCache.set(key, interpolator)
  return interpolator
}

export interface CanvasSize {
  width: number
  height: number
}

const defaultCanvas: CanvasSize = { width: 1920, height: 1080 }

export class Timeline {
  private readonly ops: TimelineOp[]
  private readonly sceneSays: SayLine[]
  private readonly createOps: CreateOp[]
  private readonly createsById = new Map<string, CreateOp>()
  private readonly animationsById = new Map<string, AnimationGroup[]>()
  readonly duration: number
  private readonly canvas: CanvasSize

  constructor(scene: Scene, canvas: CanvasSize = defaultCanvas) {
    this.sceneSays = scheduleSays(scene.says ?? [])
    const creates = scene.ops.filter((op): op is CreateOp => op.kind === "create")
    const members = new Map<string, SceneNode[]>()
    for (const op of creates) if (op.node.groupId) {
      const groupMembers = members.get(op.node.groupId) ?? []
      groupMembers.push(op.node)
      members.set(op.node.groupId, groupMembers)
    }
    this.ops = scene.ops.flatMap((op) =>
      op.kind === "animate" && members.has(op.targetId)
        ? expandGroupAnimation(op, members.get(op.targetId) ?? [])
        : [op]
    ).sort((left, right) => left.t - right.t)
    this.createOps = this.ops.filter(
      (op): op is CreateOp => op.kind === "create"
    )
    for (const op of this.createOps) {
      if (!this.createsById.has(op.node.id))
        this.createsById.set(op.node.id, op)
    }

    function expandGroupAnimation(
      op: AnimateOp,
      members: SceneNode[]
    ): AnimateOp[] {
      if (members.length === 0) return []

      const center = members.reduce(
        (sum, node) => ({
          x: sum.x + node.position.x / members.length,
          y: sum.y + node.position.y / members.length,
        }),
        { x: 0, y: 0 }
      )

      if (op.anim.verb === "move" && op.anim.to?.position) {
        const offset = {
          x: op.anim.to.position.x - center.x,
          y: op.anim.to.position.y - center.y,
        }
        return members.map((node) => ({
          ...op,
          targetId: node.id,
          anim: {
            ...op.anim,
            verb: "move",
            to: {
              ...op.anim.to,
              position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              },
            },
          },
        }))
      }

      if (op.anim.verb === "scale" && op.anim.to?.scale !== undefined) {
        const factor = op.anim.to.scale
        return members.map((node) => ({
          ...op,
          targetId: node.id,
          anim: {
            ...op.anim,
            to: {
              ...op.anim.to,
              position: {
                x: center.x + (node.position.x - center.x) * factor,
                y: center.y + (node.position.y - center.y) * factor,
              },
            },
          },
        }))
      }

      if (op.anim.verb === "rotate" && op.anim.to?.rotation !== undefined) {
        const radians = (op.anim.to.rotation * Math.PI) / 180
        const cosine = Math.cos(radians)
        const sine = Math.sin(radians)
        return members.map((node) => {
          const relative = {
            x: node.position.x - center.x,
            y: node.position.y - center.y,
          }
          return {
            ...op,
            targetId: node.id,
            anim: {
              ...op.anim,
              to: {
                ...op.anim.to,
                position: {
                  x: center.x + relative.x * cosine - relative.y * sine,
                  y: center.y + relative.x * sine + relative.y * cosine,
                },
                rotation: node.rotation + op.anim.to.rotation,
              },
            },
          }
        })
      }

      return members.map((node) => ({
        ...op,
        targetId: node.id,
        anim: { ...op.anim } as AnimationSpec,
      }))
    }
    this.cacheAnimations()
    this.canvas = canvas
    const opsDuration = this.ops.reduce((maximum, op) => {
      if (op.kind === "create")
        return Math.max(maximum, op.t + op.draw.duration)
      if (op.kind === "animate")
        return Math.max(maximum, op.t + op.anim.duration)
      return Math.max(maximum, op.t + op.camera.duration)
    }, 0)
    const narrationDuration = this.sceneSays.reduce(
      (maximum, say) => Math.max(maximum, say.start + say.duration),
      0
    )
    this.duration = Math.max(scene.duration ?? 0, opsDuration, narrationDuration)
  }

  resolveAt(time: number): RenderState {
    const at = Number.isFinite(time) ? time : 0
    const nodes = this.createOps
      .filter((op) => op.t <= at)
      .map((op) => this.resolveNodeAt(op.node.id, at))
      .filter((node): node is ResolvedNode => node !== undefined)
    const timeline = this
    const pen = resolvePen(nodes)
    return {
      nodes,
      highlights: this.resolveHighlightsAt(at),
      camera: this.resolveCameraAt(at),
      ...(pen ? { pen } : {}),
      ...this.resolveSubtitleAt(at),
    }

    function resolvePen(nodes: ResolvedNode[]): PenState | undefined {
      const candidates = timeline.createOps
        .filter((op) => op.node.data?.penFollow === true)
        .map((op, index) => ({
          op,
          node: nodes.find((candidate) => candidate.id === op.node.id) ?? timeline.resolveNodeAt(op.node.id, at),
          order: index,
        }))
        .filter((candidate): candidate is typeof candidate & { node: ResolvedNode } => {
          return candidate.node !== undefined && penPath(candidate.node).length > 1
        })
      for (let index = 0; index < candidates.length; index++) {
        const current = candidates[index]!
        const currentPath = penPath(current.node)
        const start = current.op.t
        const end = start + current.op.draw.duration
        if (at >= start && at < end) {
          const progress = clamp((at - start) / Math.max(0.001, current.op.draw.duration))
          const roughPaths = shouldUseRoughSampledGeometry(current.node)
            ? sampledRoughPathsForNode(current.node)
            : undefined
          const sampled = roughPaths?.length ? pointAtSampledProgress(roughPaths, progress) : undefined
          const position = sampled?.point ?? pointAtProgress(currentPath, progress)
          return {
            targetId: current.node.id,
            position,
            angle: sampled?.angle ?? -0.9,
            opacity: Math.min(1, progress * 12, (1 - progress) * 12),
            phase: "drawing",
            lift: 0,
          }
        }
        const next = candidates[index + 1]
        if (next && at >= end && at < next.op.t) {
          const nextPath = penPath(next.node)
          const currentRoughPaths = shouldUseRoughSampledGeometry(current.node)
            ? sampledRoughPathsForNode(current.node)
            : undefined
          const nextRoughPaths = shouldUseRoughSampledGeometry(next.node)
            ? sampledRoughPathsForNode(next.node)
            : undefined
          const from = currentRoughPaths?.length
            ? pointAtSampledProgress(currentRoughPaths, 1).point
            : pointAtProgress(currentPath, 1)
          const to = nextRoughPaths?.[0]?.points[0] ?? nextPath[0]!
          const travelProgress = clamp((at - end) / Math.max(0.001, next.op.t - end))
          const eased = easing.easeInOut(travelProgress)
          return {
            targetId: current.node.id,
            position: {
              x: from.x + (to.x - from.x) * eased,
              y: from.y + (to.y - from.y) * eased,
            },
            angle: -0.9,
            opacity: 0.78,
            phase: "traveling",
            lift: Math.sin(travelProgress * Math.PI),
          }
        }
      }
      return undefined
    }

    function penPath(node: ResolvedNode): Point[] {
      if (node.points && node.points.length > 1) return node.points
      const from = node.data?.from as Point | undefined
      const to = node.data?.to as Point | undefined
      if (from && to) return [from, to]
      const width = node.size?.width ?? 0
      const height = node.size?.height ?? 0
      if (node.type === "rectangle" && width > 0 && height > 0) {
        const left = node.position.x - width / 2
        const right = node.position.x + width / 2
        const top = node.position.y - height / 2
        const bottom = node.position.y + height / 2
        return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }, { x: left, y: top }]
      }
      if (node.type === "diamond" && width > 0 && height > 0)
        return [{ x: node.position.x, y: node.position.y - height / 2 }, { x: node.position.x + width / 2, y: node.position.y }, { x: node.position.x, y: node.position.y + height / 2 }, { x: node.position.x - width / 2, y: node.position.y }, { x: node.position.x, y: node.position.y - height / 2 }]
      if (node.type === "circle" && node.radius) {
        return Array.from({ length: 33 }, (_, index) => {
          const angle = -Math.PI / 2 + (index / 32) * Math.PI * 2
          return { x: node.position.x + Math.cos(angle) * node.radius!, y: node.position.y + Math.sin(angle) * node.radius! }
        })
      }
      return []
    }

    function pointAtProgress(points: Point[], progress: number): Point {
      const lengths = [0]
      for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1]! + Math.hypot(points[index]!.x - points[index - 1]!.x, points[index]!.y - points[index - 1]!.y))
      const total = lengths.at(-1) ?? 0
      const distance = total * clamp(progress)
      for (let index = 1; index < lengths.length; index++) {
        if (distance <= lengths[index]!) {
          const segment = lengths[index]! - lengths[index - 1]!
          const amount = segment ? (distance - lengths[index - 1]!) / segment : 0
          return { x: points[index - 1]!.x + (points[index]!.x - points[index - 1]!.x) * amount, y: points[index - 1]!.y + (points[index]!.y - points[index - 1]!.y) * amount }
        }
      }
      return points.at(-1)!
    }
  }

  private resolveSubtitleAt(time: number): Pick<RenderState, "subtitle"> {
    if (time < 0 || time >= this.duration) return {}
    const say = this.sceneSays.find(
      (item) => time >= item.start && time < item.start + item.duration
    )
    if (!say) return {}
    const elapsed = time - say.start
    const remaining = say.start + say.duration - time
    return {
      subtitle: {
        ...say,
        opacity: clamp(Math.min(1, elapsed / 0.15, remaining / 0.15)),
        readingProgress: clamp(elapsed / Math.max(0.001, say.duration)),
      },
    }
  }

  private resolveHighlightsAt(time: number): HighlightState[] {
    const highlights: HighlightState[] = []
    for (const op of this.ops) {
      if (op.kind !== "animate" || op.anim.verb !== "highlight" || op.t > time)
        continue
      const progress = clamp((time - op.t) / op.anim.duration)
      const drawProgress = clamp(progress / 0.35)
      const opacity = clamp((1 - progress) / 0.35)
      if (progress <= 0 || progress >= 1) continue
      highlights.push({
        targetId: op.targetId,
        color: op.anim.color ?? DEFAULT_HIGHLIGHT_COLOR,
        drawProgress,
        opacity,
        ...(op.anim.tableTarget ? { tableTarget: op.anim.tableTarget } : {}),
      })
    }
    return highlights
  }

  private resolveNodeAt(id: string, time: number): ResolvedNode | undefined {
    const create = this.createsById.get(id)
    if (!create || create.t > time) return undefined
    let node = revealAt(create.node, create.draw, time - create.t)
    for (const group of this.animationsById.get(id) ?? []) {
      if (group.t > time) break
      node = resolveAnimationGroupAtTime(node, group, time, (targetId) =>
        this.createsById.get(targetId)?.node
      )
    }
    return node
  }

  private cacheAnimations(): void {
    const opsById = new Map<string, AnimateOp[]>()
    for (const op of this.ops) {
      if (op.kind !== "animate") continue
      const create = this.createsById.get(op.targetId)
      if (!create || op.t < create.t) continue
      const animations = opsById.get(op.targetId) ?? []
      animations.push(op)
      opsById.set(op.targetId, animations)
    }

    for (const [id, animations] of opsById) {
      const create = this.createsById.get(id)
      if (!create) continue
      const groups: AnimationGroup[] = []
      for (const op of animations) {
        const previous = groups.at(-1)
        if (previous?.t === op.t) {
          previous.ops.push(op)
          continue
        }
        const start = previous
          ? this.resolveAnimationGroupAt(previous, op.t)
          : revealAt(create.node, create.draw, op.t - create.t)
        groups.push({ t: op.t, ops: [op], start })
      }
      this.animationsById.set(id, groups)
    }
  }

  private resolveAnimationGroupAt(
    group: AnimationGroup,
    time: number
  ): ResolvedNode {
    return resolveAnimationGroupAtTime(group.start, group, time, (targetId) =>
      this.createsById.get(targetId)?.node
    )
  }
  private resolveCameraAt(time: number): RenderCamera {
    let camera: RenderCamera = {
      position: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
      scale: 1,
    }
    for (const op of this.ops) {
      if (op.kind !== "camera" || op.t > time) continue
      const progress = cameraProgress(
        time - op.t,
        op.camera.duration,
        op.camera.ease
      )
      if (op.camera.verb === "reset") {
        camera = {
          position: {
            x:
              camera.position.x +
              (this.canvas.width / 2 - camera.position.x) * progress,
            y:
              camera.position.y +
              (this.canvas.height / 2 - camera.position.y) * progress,
          },
          scale: camera.scale + (1 - camera.scale) * progress,
        }
      } else if (op.camera.verb === "pan" && op.camera.position) {
        camera = {
          ...camera,
          position: {
            x:
              camera.position.x +
              (op.camera.position.x - camera.position.x) * progress,
            y:
              camera.position.y +
              (op.camera.position.y - camera.position.y) * progress,
          },
        }
      } else if (op.camera.verb === "zoom" && op.camera.targetId) {
        const target = this.resolveNodeAt(op.camera.targetId, op.t)
        if (target) {
          const fit = fitCameraToNode(target, this.canvas)
          camera = {
            position: {
              x:
                camera.position.x +
                (fit.position.x - camera.position.x) * progress,
              y:
                camera.position.y +
                (fit.position.y - camera.position.y) * progress,
            },
            scale: camera.scale + (fit.scale - camera.scale) * progress,
          }
        }
      } else if (op.camera.verb === "zoom" && op.camera.scale !== undefined) {
        camera = {
          ...camera,
          scale: camera.scale + (op.camera.scale - camera.scale) * progress,
        }
      } else if (op.camera.verb === "follow" && op.camera.targetId) {
        const target = this.resolveNodeAt(op.camera.targetId, time)
        if (target) {
          const smooth = 1 - Math.exp(-8 * Math.max(0, time - op.t))
          camera = {
            ...camera,
            position: {
              x: camera.position.x + (target.position.x - camera.position.x) * smooth,
              y: camera.position.y + (target.position.y - camera.position.y) * smooth,
            },
          }
        }
      } else if (op.camera.verb === "drift" || op.camera.verb === "shake") {
        const amplitude = op.camera.scale ?? 8
        const phase = (time - op.t) * (op.camera.verb === "shake" ? 31 : 2.2)
        camera = {
          ...camera,
          position: {
            x: camera.position.x + Math.sin(phase) * amplitude,
            y: camera.position.y + Math.cos(phase * 1.31) * amplitude,
          },
        }
      }
      camera = clampCameraState(camera, this.canvas)
    }
    return camera
  }
}

function resolveAnimationGroupAtTime(
  current: ResolvedNode,
  group: AnimationGroup,
  time: number,
  lookupNode: (id: string) => SceneNode | undefined
): ResolvedNode {
  let node = current
  for (const op of group.ops) {
    const animated = interpolateAnimation(group.start, op.anim, time - op.t)
    if (op.anim.verb === "morph" && op.anim.morphTargetId) {
      const target = lookupNode(op.anim.morphTargetId)
      if (target) {
        const progress = clamp((time - op.t) / Math.max(op.anim.duration, 0.001))
        const eased = easing[op.anim.ease](clamp(progress))
        const fromPath = geometryPath(group.start)
        const toPath = geometryPath(target)
        if (fromPath && toPath) {
          const path = cachedMorphInterpolator(fromPath, toPath)(eased)
          node = {
            ...node,
            position: {
              x: group.start.position.x + (target.position.x - group.start.position.x) * eased,
              y: group.start.position.y + (target.position.y - group.start.position.y) * eased,
            },
            data: { ...node.data, morphPath: path },
          }
        }
      }
      continue
    }
    if (op.anim.verb === "move")
      node = { ...node, position: animated.position }
    if (op.anim.verb === "scale") {
      node = {
        ...node,
        ...(op.anim.to?.position ? { position: animated.position } : {}),
        scale: animated.scale,
      }

    }
    if (op.anim.verb === "rotate") {
      node = {
        ...node,
        ...(op.anim.to?.position ? { position: animated.position } : {}),
        rotation: animated.rotation,
      }
    }
    if (op.anim.verb === "fade" || op.anim.verb === "opacity")
      node = { ...node, opacity: animated.opacity }
    if (op.anim.verb === "color")
      node = { ...node, style: { ...node.style, color: animated.style.color } }
    if (op.anim.verb === "erase")
      node = { ...node, revealProgress: animated.revealProgress }
    if (op.anim.verb === "loop") {
      if (op.anim.loopName === "pulse" || op.anim.loopName === "breathe")
        node = { ...node, scale: animated.scale }
      else if (op.anim.loopName === "blink")
        node = { ...node, opacity: animated.opacity }
      else if (op.anim.loopName === "wobble")
        node = { ...node, rotation: animated.rotation }
      else node = { ...node, position: animated.position }
    }
    if (op.anim.verb === "enter" || op.anim.verb === "exit") {
      const effect = op.anim.effectName ?? "fade"
      if (["fade", "write", "erase"].includes(effect)) {
        node = { ...node, opacity: animated.opacity }
        if (effect === "write" || effect === "erase")
          node = { ...node, revealProgress: animated.revealProgress }
      } else if (["pop", "shrink", "zoom"].includes(effect))
        node = { ...node, scale: animated.scale }
      else node = { ...node, position: animated.position }
    }
  }
  return node
}

function geometryPath(node: SceneNode): string | undefined {
  const { x, y } = node.position
  if (node.type === "circle") {
    const r = node.radius ?? 0
    return `M ${x - r},${y} A ${r},${r} 0 1 0 ${x + r},${y} A ${r},${r} 0 1 0 ${x - r},${y}`
  }
  const width = node.size?.width
  const height = node.size?.height
  if (width === undefined || height === undefined) return undefined
  if (node.type === "diamond")
    return `M ${x},${y - height / 2} L ${x + width / 2},${y} L ${x},${y + height / 2} L ${x - width / 2},${y} Z`
  if (node.type === "ellipse")
    return `M ${x - width / 2},${y} A ${width / 2},${height / 2} 0 1 0 ${x + width / 2},${y} A ${width / 2},${height / 2} 0 1 0 ${x - width / 2},${y}`
  if (node.type === "rectangle")
    return `M ${x - width / 2},${y - height / 2} L ${x + width / 2},${y - height / 2} L ${x + width / 2},${y + height / 2} L ${x - width / 2},${y + height / 2} Z`
  return undefined
}
export function resolveAt(
  time: number,
  ops: TimelineOp[],
  canvas: CanvasSize = defaultCanvas
): RenderState {
  return new Timeline({ id: "resolved", index: 0, ops }, canvas).resolveAt(time)
}
