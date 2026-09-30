import { DEFAULT_EASE } from "@/defaults/defaults.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import type {
  AnimationSpec,
  EaseName,
  Point,
  Reveal,
  SceneNode,
} from "@/ir/types.ts"
import { clamp, easing, lerp } from "@/timeline/easing.ts"
import type { ResolvedNode } from "@/timeline/timeline.ts"

export function easedProgress(
  elapsed: number,
  duration: number,
  ease: EaseName
): number {
  if (duration <= 0) return elapsed >= 0 ? 1 : 0
  return easing[ease](clamp(elapsed / duration))
}

export function revealAt(
  node: SceneNode,
  reveal: Reveal,
  elapsed: number
): ResolvedNode {
  return {
    ...node,
    revealProgress: easedProgress(elapsed, reveal.duration, reveal.ease),
    revealStyle: reveal.style,
    scale: 1,
  }
}

export function interpolateAnimation(
  node: ResolvedNode,
  animation: AnimationSpec,
  elapsed: number
): ResolvedNode {
  const progress = easedProgress(elapsed, animation.duration, animation.ease)
  const target = animation.to
  if (animation.verb === "enter" || animation.verb === "exit") {
    const progress = easedProgress(elapsed, animation.duration, animation.ease)
    const entering = animation.verb === "enter"
    const amount = entering ? progress : 1 - progress
    const effect = animation.effectName ?? "fade"
    if (["fade", "write", "erase"].includes(effect))
      return { ...node, opacity: effect === "write" || effect === "erase" ? node.opacity : node.opacity * amount,
        revealProgress: effect === "write" ? amount : effect === "erase" ? amount : node.revealProgress }
    if (["pop", "shrink", "zoom"].includes(effect))
      return { ...node, scale: node.scale * (effect === "pop" || effect === "zoom" ? 0.7 + amount * 0.3 : amount) }
    const distance = effect === "drop" ? -80 : 70
    const axis = effect.endsWith("left") || effect.endsWith("right") ? "x" : "y"
    const direction = effect.endsWith("left") || effect.endsWith("up") ? -1 : 1
    const offset = (entering ? 1 - progress : progress) * distance * direction
    return { ...node, position: { ...node.position, [axis]: node.position[axis] + offset } }
  }
  if (animation.verb === "loop") {
    const period = Math.max(animation.period ?? 2, 0.001)
    const phase = elapsed / period * Math.PI * 2
    const amplitude = animation.amplitude ?? 8
    if (animation.loopName === "pulse" || animation.loopName === "breathe")
      return { ...node, scale: node.scale + Math.sin(phase) * amplitude / 100 }
    if (animation.loopName === "blink")
      return { ...node, opacity: node.opacity * (0.55 + 0.45 * Math.sin(phase) ** 2) }
    if (animation.loopName === "wobble")
      return { ...node, rotation: node.rotation + Math.sin(phase) * amplitude }
    return { ...node, position: { ...node.position, y: node.position.y + Math.sin(phase) * amplitude } }
  }
  if (animation.verb === "move" && target?.position) {
    return {
      ...node,
      position: {
        x: lerp(node.position.x, target.position.x, progress),
        y: lerp(node.position.y, target.position.y, progress),
      },
    }
  }
  if (animation.verb === "fade" && target?.opacity !== undefined) {
    return { ...node, opacity: lerp(node.opacity, target.opacity, progress) }
  }
  if (animation.verb === "scale" && target?.scale !== undefined) {
    return { ...node, scale: lerp(node.scale, target.scale, progress) }
  }
  if (animation.verb === "rotate" && target?.rotation !== undefined) {
    return { ...node, rotation: lerp(node.rotation, target.rotation, progress) }
  }
  if (animation.verb === "erase") {
    return { ...node, revealProgress: lerp(node.revealProgress, 0, progress) }
  }
  return node
}

export interface TimelineBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export function fitCameraToNode(
  node: ResolvedNode,
  canvas: { width: number; height: number },
  paddingRatio = 0.15
): { position: Point; scale: number } {
  const bounds = nodeBoundingBox(node)
  const paddedWidth = Math.max(1, bounds.width) * (1 + paddingRatio * 2)
  const paddedHeight = Math.max(1, bounds.height) * (1 + paddingRatio * 2)
  return clampCameraState(
    {
      position: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
      scale: Math.min(
        3,
        canvas.width / paddedWidth,
        canvas.height / paddedHeight
      ),
    },
    canvas
  )
}

export function cameraProgress(elapsed: number, duration: number): number {
  return easing[DEFAULT_EASE](
    duration <= 0 ? (elapsed >= 0 ? 1 : 0) : clamp(elapsed / duration)
  )
}

function nodeBoundingBox(node: ResolvedNode): TimelineBoundingBox {
  const scale = node.scale
  if (node.type === "circle") {
    const diameter = (node.radius ?? 0) * 2 * scale
    return {
      x: node.position.x - diameter / 2,
      y: node.position.y - diameter / 2,
      width: diameter,
      height: diameter,
    }
  }
  if (node.type === "text") {
    const fontSize = node.style.fontSize ?? 32
    const text = node.text ?? node.label ?? ""
    const bounds = layoutText(
      text,
      fontSize,
      node.maxWidth,
      (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
      node.lineHeight
    )
    return {
      x: node.position.x - (bounds.width * scale) / 2,
      y: node.position.y - (bounds.height * scale) / 2,
      width: bounds.width * scale,
      height: bounds.height * scale,
    }
  }
  if (node.type === "ink") {
    return boundsOfPoints(node.points ?? [])
  }
  const width = (node.size?.width ?? 0) * scale
  const height = (node.size?.height ?? 0) * scale
  return {
    x: node.position.x - width / 2,
    y: node.position.y - height / 2,
    width,
    height,
  }
}

function boundsOfPoints(points: Point[]): TimelineBoundingBox {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function clampCameraState(
  camera: { position: Point; scale: number },
  canvas: { width: number; height: number }
): { position: Point; scale: number } {
  const visibleWidth = canvas.width / camera.scale
  const visibleHeight = canvas.height / camera.scale
  return {
    ...camera,
    position: {
      x:
        visibleWidth >= canvas.width
          ? canvas.width / 2
          : Math.min(
              canvas.width - visibleWidth / 2,
              Math.max(visibleWidth / 2, camera.position.x)
            ),
      y:
        visibleHeight >= canvas.height
          ? canvas.height / 2
          : Math.min(
              canvas.height - visibleHeight / 2,
              Math.max(visibleHeight / 2, camera.position.y)
            ),
    },
  }
}
