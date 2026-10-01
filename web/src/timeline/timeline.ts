import { DEFAULT_HIGHLIGHT_COLOR } from "@/defaults/defaults.ts"
import type { Point, SayLine, Scene, SceneNode, TableHighlightTarget, TimelineOp } from "@/ir/types.ts"
import { scheduleSays } from "@/subtitles/subtitles.ts"
import { clamp } from "@/timeline/easing.ts"
import {
  cameraProgress,
  clampCameraState,
  fitCameraToNode,
  interpolateAnimation,
  revealAt,
} from "@/timeline/interpolate.ts"

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
  subtitle?: SayLine & { opacity: number; readingProgress: number }
}

type CreateOp = Extract<TimelineOp, { kind: "create" }>
type AnimateOp = Extract<TimelineOp, { kind: "animate" }>

interface AnimationGroup {
  t: number
  ops: AnimateOp[]
  start: ResolvedNode
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
    const members = new Map<string, string[]>()
    for (const op of creates) if (op.node.groupId) {
      const group = members.get(op.node.groupId) ?? []
      group.push(op.node.id)
      members.set(op.node.groupId, group)
    }
    this.ops = scene.ops.flatMap((op) =>
      op.kind === "animate" && members.has(op.targetId)
        ? (members.get(op.targetId) ?? []).map((targetId) => ({ ...op, targetId }))
        : [op]
    ).sort((left, right) => left.t - right.t)
    this.createOps = this.ops.filter(
      (op): op is CreateOp => op.kind === "create"
    )
    for (const op of this.createOps) {
      if (!this.createsById.has(op.node.id))
        this.createsById.set(op.node.id, op)
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
    return {
      nodes,
      highlights: this.resolveHighlightsAt(at),
      camera: this.resolveCameraAt(at),
      ...this.resolveSubtitleAt(at),
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
      for (const op of group.ops) {
        node = interpolateAnimation(
          { ...group.start, revealProgress: node.revealProgress },
          op.anim,
          time - op.t
        )
      }
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
    let node = group.start
    for (const op of group.ops) {
      node = interpolateAnimation(
        { ...group.start, revealProgress: node.revealProgress },
        op.anim,
        time - op.t
      )
    }
    return node
  }

  private resolveCameraAt(time: number): RenderCamera {
    let camera: RenderCamera = {
      position: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
      scale: 1,
    }
    for (const op of this.ops) {
      if (op.kind !== "camera" || op.t > time) continue
      const progress = cameraProgress(time - op.t, op.camera.duration)
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

export function resolveAt(
  time: number,
  ops: TimelineOp[],
  canvas: CanvasSize = defaultCanvas
): RenderState {
  return new Timeline({ id: "resolved", index: 0, ops }, canvas).resolveAt(time)
}
