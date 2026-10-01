import { applyCamera, identityCamera, type Camera } from "@/renderer/camera.ts"
import { AnimationRegistry } from "@/renderer/animations/registry.ts"
import { createRenderContext } from "@/renderer/handdrawn.ts"
import { InkRegistry } from "@/renderer/ink/registry.ts"
import {
  ShapeRegistry,
  type ShapeRenderer,
} from "@/renderer/shapes/registry.ts"
import type { RenderState } from "@/timeline/timeline.ts"
import { drawSubtitleLayer } from "@/renderer/subtitles.ts"
import { getImageStatus } from "@/renderer/images.ts"

interface CachedNode {
  image: HTMLCanvasElement
  x: number
  y: number
  width: number
  height: number
  key: string
}

interface CanvasCache {
  width: number
  height: number
  nodes: Map<string, CachedNode>
}

interface BoardTexture { key: string; canvas: HTMLCanvasElement }
const boardTextures = new WeakMap<HTMLCanvasElement, BoardTexture>()

const canvasCaches = new WeakMap<HTMLCanvasElement, CanvasCache>()

export function drawScene(
  context: CanvasRenderingContext2D,
  state: RenderState,
  camera?: Camera,
  canvasSize?: { width: number; height: number },
  background = "#FAFAFA",
  mode: "handdrawn" | "chalk" | "marker" | "pencil" | "brush" | "clean" = "handdrawn",
  board = "plain",
  hand = false,
  subtitlesEnabled = false,
  readAlong = false
): void {
  const canvas = context.canvas
  const logicalCanvas = canvasSize ?? {
    width: canvas.width,
    height: canvas.height,
  }
  const devicePixelRatio = Math.min(2, canvas.width / logicalCanvas.width)
  const visibleNodes = subtitlesEnabled
    ? state.nodes.map((node) =>
        node.type === "text" && Math.abs(node.position.y - 950) <= 1
          ? { ...node, position: { ...node.position, y: 900 } }
          : node
      )
    : state.nodes
  const nodes = new Map(visibleNodes.map((node) => [node.id, node]))
  pruneCanvasCache(canvas, nodes)
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  drawBoard(context, canvas, board, background)
  applyCamera(
    context,
    camera ?? state.camera ?? identityCamera(logicalCanvas),
    logicalCanvas,
    devicePixelRatio
  )
  const resolvedCamera = camera ?? state.camera ?? identityCamera(logicalCanvas)
  const renderContext = createRenderContext(
    context,
    nodes,
    resolvedCamera.scale,
    mode
  )
  for (const highlight of state.highlights) {
    const target = nodes.get(highlight.targetId)
    if (!target) continue
    context.save()
    context.globalAlpha = highlight.opacity * 0.45
    AnimationRegistry.highlight(
      renderContext,
      target,
      highlight.color,
      highlight.drawProgress
    )
    context.restore()
  }
  for (const node of visibleNodes) {
    if (node.data?.layoutContainer === true) continue
    const renderer =
      node.type === "ink" ? InkRegistry.ink : ShapeRegistry[node.type]
    if (!renderer) continue
    const renderNode = { ...node, style: { ...node.style, pen: node.style.pen ?? mode } }
    context.save()
    context.globalAlpha = node.opacity
    const cached =
      node.revealProgress >= 1 && node.rotation === 0
        ? getCachedNode(
            canvas,
          renderNode,
            renderer,
            nodes,
            resolvedCamera.scale,
            devicePixelRatio
          )
        : undefined
    if (cached) {
      context.drawImage(
        cached.image,
        cached.x,
        cached.y,
        cached.width,
        cached.height
      )
    } else {
      context.translate(node.position.x, node.position.y)
      context.rotate((node.rotation * Math.PI) / 180)
      context.scale(node.scale, node.scale)
      context.translate(-node.position.x, -node.position.y)
      renderer.draw(createRenderContext(context, nodes, resolvedCamera.scale, renderNode.style.pen ?? mode), renderNode)
    }
    if (hand && node.revealProgress > 0 && node.revealProgress < 1 && ["ink", "line", "text"].includes(node.type))
      drawHand(context, node)
    context.restore()
  }
  context.globalAlpha = 1
  context.restore()
  if (subtitlesEnabled && state.subtitle)
    drawSubtitleLayer(context, state.subtitle, logicalCanvas, devicePixelRatio, readAlong)
}

function drawHand(context: CanvasRenderingContext2D, node: RenderState["nodes"][number]): void {
  const progress = Math.max(0, Math.min(1, node.revealProgress))
  let x = node.position.x, y = node.position.y
  if (node.type === "ink" && node.points?.length) {
    const index = Math.min(node.points.length - 1, Math.floor(progress * (node.points.length - 1)))
    x = node.points[index]!.x; y = node.points[index]!.y
  } else if (node.type === "line") {
    const from = node.data?.from as { x: number; y: number } | undefined
    const to = node.data?.to as { x: number; y: number } | undefined
    if (from && to) { x = from.x + (to.x - from.x) * progress; y = from.y + (to.y - from.y) * progress }
  } else if (node.type === "text") {
    const text = node.text ?? node.label ?? ""
    const width = node.maxWidth ?? Math.max(40, text.length * (node.style.fontSize ?? 36) * 0.48)
    x = node.position.x - width / 2 + width * progress
    y = node.position.y + (node.style.fontSize ?? 36) * 0.7
  }
  context.save()
  context.strokeStyle = node.style.color
  context.lineWidth = 3
  context.lineCap = "round"
  context.beginPath()
  context.moveTo(x, y + 13)
  context.lineTo(x + 2, y - 7)
  context.lineTo(x + 7, y + 2)
  context.lineTo(x + 12, y - 3)
  context.lineTo(x + 14, y + 10)
  context.stroke()
  context.restore()
}

function drawBoard(context: CanvasRenderingContext2D, target: HTMLCanvasElement, board: string, base: string): void {
  if (typeof document === "undefined") {
    context.fillStyle = base
    context.fillRect(0, 0, target.width, target.height)
    return
  }
  const key = `${board}:${base}:${target.width}:${target.height}`
  let texture = boardTextures.get(target)
  if (texture?.key !== key) {
    const canvas = document.createElement("canvas")
    canvas.width = target.width
    canvas.height = target.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = base
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const w = canvas.width, h = canvas.height
    ctx.save()
    ctx.globalAlpha = 0.12
    if (["blueprint", "graph"].includes(board)) {
      ctx.strokeStyle = board === "blueprint" ? "#C9E7FF" : "#777"
      ctx.lineWidth = 1
      const step = board === "blueprint" ? Math.max(18, w / 60) : Math.max(24, w / 40)
      for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    } else if (board === "dotted") {
      ctx.fillStyle = "#444"
      for (let x = 12; x < w; x += 26) for (let y = 12; y < h; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill() }
    }
    if (board !== "plain") {
      ctx.globalAlpha = board === "chalkboard" ? 0.035 : 0.025
      let seed = 0x9e3779b9
      for (let i = 0; i < 1800; i++) {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
        ctx.fillStyle = seed & 1 ? "white" : "black"
        ctx.fillRect((seed >>> 1) % w, (seed >>> 9) % h, 1 + (seed % 2), 1 + ((seed >>> 4) % 2))
      }
    }
    ctx.globalAlpha = 1
    if (["paper", "kraft", "chalkboard"].includes(board)) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.72)
      gradient.addColorStop(0, "rgba(255,255,255,0)")
      gradient.addColorStop(1, "rgba(0,0,0,0.2)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    }
    if (["chalkboard", "whiteboard", "glass"].includes(board)) {
      ctx.globalAlpha = board === "chalkboard" ? 0.07 : 0.035
      for (let i = 0; i < 18; i++) {
        const x = (i * 7919 % 1000) / 1000 * w
        const y = (i * 3571 % 1000) / 1000 * h
        const radius = Math.min(w, h) * (0.025 + (i % 4) * 0.009)
        const smudge = ctx.createRadialGradient(x, y, 0, x, y, radius)
        smudge.addColorStop(0, board === "chalkboard" ? "#E6E1D2" : "#777777")
        smudge.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = smudge
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      }
    }
    if (board !== "plain") {
      ctx.strokeStyle = board === "glass" ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.25)"
      ctx.lineWidth = Math.max(4, w / 240)
      ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth)
    }
    ctx.restore()
    texture = { key, canvas }
    boardTextures.set(target, texture)
  }
  context.drawImage(texture.canvas, 0, 0)
}

function getCachedNode(
  canvas: HTMLCanvasElement,
  node: RenderState["nodes"][number],
  renderer: ShapeRenderer,
  nodes: Map<string, RenderState["nodes"][number]>,
  cameraScale: number,
  devicePixelRatio: number
): CachedNode | undefined {
  if (typeof document === "undefined") return undefined
  let cache = canvasCaches.get(canvas)
  if (
    !cache ||
    cache.width !== canvas.width ||
    cache.height !== canvas.height
  ) {
    cache = { width: canvas.width, height: canvas.height, nodes: new Map() }
    canvasCaches.set(canvas, cache)
  }
  const key = cacheKey(node, nodes, cameraScale, devicePixelRatio)
  const previous = cache.nodes.get(node.id)
  if (previous?.key === key) return previous

  const box = renderer.boundingBox(node)
  const fullCanvas = node.type === "arrow"
  const padding = 64 / cameraScale
  const x = fullCanvas ? 0 : box.x - padding
  const y = fullCanvas ? 0 : box.y - padding
  const width = fullCanvas ? canvas.width : Math.max(1, box.width + padding * 2)
  const height = fullCanvas
    ? canvas.height
    : Math.max(1, box.height + padding * 2)
  const image = document.createElement("canvas")
  image.width = Math.ceil(width * devicePixelRatio)
  image.height = Math.ceil(height * devicePixelRatio)
  const imageContext = image.getContext("2d")
  if (!imageContext) return undefined
  const imageRenderContext = createRenderContext(
    imageContext,
    nodes,
    cameraScale,
    node.style.pen ?? "handdrawn"
  )
  imageContext.save()
  imageContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  imageContext.translate(-x, -y)
  imageContext.translate(node.position.x, node.position.y)
  imageContext.rotate((node.rotation * Math.PI) / 180)
  imageContext.scale(node.scale, node.scale)
  imageContext.translate(-node.position.x, -node.position.y)
  renderer.draw(imageRenderContext, node)
  imageContext.restore()
  const entry = { image, x, y, width, height, key }
  cache.nodes.set(node.id, entry)
  return entry
}

function cacheKey(
  node: RenderState["nodes"][number],
  nodes: Map<string, RenderState["nodes"][number]>,
  cameraScale: number,
  devicePixelRatio: number
): string {
  const dependencies =
    node.type === "arrow"
      ? [String(node.data?.fromId ?? ""), String(node.data?.toId ?? "")].map(
          (id) => {
            const dependency = nodes.get(id)
            return dependency
              ? {
                  id,
                  position: dependency.position,
                  size: dependency.size,
                  radius: dependency.radius,
                  scale: dependency.scale,
                }
              : { id }
          }
        )
      : undefined
  return JSON.stringify({
    node: { ...node, opacity: undefined, revealProgress: undefined },
    imageStatus: node.type === "image" ? getImageStatus(node.image?.url) : undefined,
    cameraScale,
    devicePixelRatio,
    dependencies,
  })
}

function pruneCanvasCache(
  canvas: HTMLCanvasElement,
  nodes: Map<string, RenderState["nodes"][number]>
): void {
  const cache = canvasCaches.get(canvas)
  if (!cache) return
  for (const id of cache.nodes.keys())
    if (!nodes.has(id)) cache.nodes.delete(id)
}
