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
    if (highlight.tableTarget) continue
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
    const tableHighlights = state.highlights
      .filter((highlight) => highlight.targetId === node.id && highlight.tableTarget)
      .map((highlight) => ({ target: highlight.tableTarget!, color: highlight.color, progress: highlight.opacity }))
    const renderNode = {
      ...node,
      style: { ...node.style, pen: node.style.pen ?? mode },
      ...(tableHighlights.length ? { data: { ...node.data, _animatedTableHighlights: tableHighlights } } : {}),
    }
    context.save()
    context.globalAlpha = node.opacity
    const cached =
      node.revealProgress >= 1 && node.rotation === 0 && tableHighlights.length === 0
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

export function drawBoardPreview(
  context: CanvasRenderingContext2D,
  board: string,
  base: string
): void {
  const { canvas } = context
  context.save()
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  drawBoard(context, canvas, board, base)
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
    } else if (board === "celestial") {
      let starSeed = 0x51f15e
      const nextStar = () => {
        starSeed ^= starSeed << 13; starSeed ^= starSeed >>> 17; starSeed ^= starSeed << 5
        return (starSeed >>> 0) / 4294967296
      }
      const stars = Array.from({ length: 125 }, () => ({ x: nextStar() * w, y: nextStar() * h, r: 0.7 + nextStar() * 1.6 }))
      ctx.strokeStyle = "#82B8D9"
      ctx.lineWidth = Math.max(1, w / 1900)
      ctx.globalAlpha = 0.12
      for (let i = 0; i < 8; i++) {
        const a = stars[i * 13]!, b = stars[i * 13 + 4]!, c = stars[i * 13 + 8]!
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.stroke()
      }
      ctx.fillStyle = "#E5F0FF"
      for (const star of stars) { ctx.globalAlpha = 0.2 + nextStar() * 0.4; ctx.beginPath(); ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2); ctx.fill() }
    } else if (board === "topographic") {
      const centers = [[0.25, 0.42], [0.74, 0.63], [0.82, 0.12]] as const
      ctx.lineWidth = Math.max(1, w / 1800)
      for (let group = 0; group < centers.length; group++) {
        const [cx, cy] = centers[group]!
        for (let ring = 0; ring < 9; ring++) {
          ctx.globalAlpha = 0.075 + (ring % 3) * 0.012
          ctx.strokeStyle = ring % 2 ? "#D7C99A" : "#8BAE91"
          ctx.beginPath()
          for (let step = 0; step <= 100; step++) {
            const angle = step / 100 * Math.PI * 2
            const wobble = 1 + 0.11 * Math.sin(angle * 3 + group) + 0.06 * Math.cos(angle * 5 + ring)
            const radius = (0.045 + ring * 0.018) * Math.min(w, h) * wobble
            const x = cx * w + Math.cos(angle) * radius * 1.35
            const y = cy * h + Math.sin(angle) * radius
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
          }
          ctx.closePath(); ctx.stroke()
        }
      }
    } else if (board === "neon-grid") {
      const vanishX = w * 0.5, horizon = h * 0.4
      ctx.lineWidth = Math.max(1, w / 2200)
      for (let i = -12; i <= 12; i++) {
        ctx.globalAlpha = i % 3 === 0 ? 0.17 : 0.09
        ctx.strokeStyle = i % 2 ? "#55DDE0" : "#CB75E8"
        ctx.beginPath(); ctx.moveTo(vanishX + i * w * 0.035, horizon); ctx.lineTo(vanishX + i * w * 0.16, h); ctx.stroke()
      }
      for (let i = 1; i <= 16; i++) {
        const p = i / 16
        const y = horizon + (h - horizon) * p * p
        ctx.globalAlpha = 0.07 + p * 0.08
        ctx.strokeStyle = i % 4 === 0 ? "#CB75E8" : "#55DDE0"
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
    } else if (board === "editorial") {
      ctx.globalAlpha = 0.075
      ctx.strokeStyle = "#7D8AA0"
      ctx.lineWidth = Math.max(1, w / 2400)
      const step = Math.max(34, h / 24)
      for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(w * 0.07, y); ctx.lineTo(w * 0.93, y); ctx.stroke() }
      ctx.globalAlpha = 0.13
      ctx.strokeStyle = "#C87963"
      for (const x of [w * 0.07, w * 0.5, w * 0.93]) { ctx.beginPath(); ctx.moveTo(x, h * 0.05); ctx.lineTo(x, h * 0.95); ctx.stroke() }
      const mark = Math.min(w, h) * 0.015
      for (const x of [w * 0.035, w * 0.965]) for (const y of [h * 0.035, h * 0.965]) {
        ctx.beginPath(); ctx.moveTo(x - mark, y); ctx.lineTo(x + mark, y); ctx.moveTo(x, y - mark); ctx.lineTo(x, y + mark); ctx.stroke()
      }
    } else if (board === "blackboard") {
      let chalkSeed = 0x5ca17c
      const random = () => {
        chalkSeed ^= chalkSeed << 13
        chalkSeed ^= chalkSeed >>> 17
        chalkSeed ^= chalkSeed << 5
        return (chalkSeed >>> 0) / 4294967296
      }
      const surface = ctx.createRadialGradient(w * 0.46, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.78)
      surface.addColorStop(0, "rgba(255,255,255,0.055)")
      surface.addColorStop(0.62, "rgba(255,255,255,0.012)")
      surface.addColorStop(1, "rgba(0,0,0,0.16)")
      ctx.globalAlpha = 1
      ctx.fillStyle = surface
      ctx.fillRect(0, 0, w, h)

      for (let pass = 0; pass < 8; pass++) {
        const y = h * (0.08 + random() * 0.82)
        const band = h * (0.012 + random() * 0.025)
        const wipe = ctx.createLinearGradient(0, y - band, 0, y + band)
        wipe.addColorStop(0, "rgba(238,239,224,0)")
        wipe.addColorStop(0.5, `rgba(238,239,224,${0.018 + random() * 0.025})`)
        wipe.addColorStop(1, "rgba(238,239,224,0)")
        ctx.fillStyle = wipe
        ctx.fillRect(w * 0.04, y - band, w * 0.92, band * 2)
      }

      ctx.lineCap = "round"
      for (let mark = 0; mark < 90; mark++) {
        const x = w * (0.04 + random() * 0.9)
        const y = h * (0.05 + random() * 0.9)
        const length = w * (0.004 + random() * 0.025)
        ctx.globalAlpha = 0.025 + random() * 0.045
        ctx.strokeStyle = random() > 0.25 ? "#E7E4D8" : "#A9C2B2"
        ctx.lineWidth = Math.max(1, w * (0.0003 + random() * 0.0007))
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + length * 0.45, y - h * 0.003, x + length, y + h * 0.002)
        ctx.stroke()
      }

      ctx.lineCap = "butt"
      for (let i = 0; i < 360; i++) {
        ctx.globalAlpha = 0.025 + random() * 0.08
        ctx.fillStyle = random() > 0.4 ? "#F5F1E4" : "#B9C8BA"
        const dustSize = Math.max(1, w * (0.00025 + random() * 0.00055))
        ctx.fillRect(random() * w, random() * h, dustSize, dustSize)
      }
    } else if (board === "corkboard") {
      let corkSeed = 0x34b19d
      for (let i = 0; i < 1800; i++) {
        corkSeed ^= corkSeed << 13; corkSeed ^= corkSeed >>> 17; corkSeed ^= corkSeed << 5
        ctx.globalAlpha = 0.035 + ((corkSeed >>> 4) % 100) / 1800
        ctx.fillStyle = corkSeed & 1 ? "#704A2E" : "#F2D4A2"
        const x = (corkSeed >>> 1) % w, y = (corkSeed >>> 9) % h
        ctx.beginPath(); ctx.ellipse(x, y, 1 + (corkSeed & 3), 1 + ((corkSeed >>> 3) & 2), (corkSeed % 30) / 10, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 0.08
      ctx.fillStyle = "#523824"
      for (let i = 0; i < 22; i++) {
        const x = (i * 7919 % 1000) / 1000 * w, y = (i * 3571 % 1000) / 1000 * h
        ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, w / 1100), 0, Math.PI * 2); ctx.fill()
      }
    } else if (board === "linen") {
      ctx.lineWidth = 1
      ctx.strokeStyle = "#9B8E7D"
      ctx.globalAlpha = 0.035
      const weave = Math.max(7, w / 270)
      for (let x = 0; x < w; x += weave) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      ctx.globalAlpha = 0.025
      ctx.strokeStyle = "#FFFFFF"
      for (let y = 0; y < h; y += weave) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    } else if (board === "aurora") {
      const glow = ctx.createLinearGradient(0, h * 0.25, w, h * 0.82)
      glow.addColorStop(0, "#63F2D5"); glow.addColorStop(0.48, "#4386D8"); glow.addColorStop(1, "#C57BDB")
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.035 + (i % 2) * 0.012
        ctx.strokeStyle = glow
        ctx.lineWidth = h * (0.055 + i * 0.009)
        ctx.beginPath()
        ctx.moveTo(-w * 0.1, h * (0.25 + i * 0.13))
        ctx.bezierCurveTo(w * 0.2, h * (0.05 + i * 0.12), w * 0.58, h * (0.5 + i * 0.07), w * 1.1, h * (0.2 + i * 0.14))
        ctx.stroke()
      }
    } else if (board === "circuit") {
      const spacing = Math.max(34, w / 34)
      ctx.lineWidth = Math.max(1.5, w / 1500)
      for (let route = 0; route < 24; route++) {
        const startX = w * (0.04 + ((route * 137) % 700) / 1000)
        const startY = h * (0.04 + ((route * 251) % 700) / 1000)
        const turnX = Math.min(w * 0.96, startX + spacing * (2 + route % 5))
        const endY = Math.min(h * 0.96, startY + spacing * (1 + route % 4))
        ctx.globalAlpha = route % 4 === 0 ? 0.24 : 0.13
        ctx.strokeStyle = route % 3 === 0 ? "#4EE0C1" : "#D6A85F"
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(turnX, startY)
        ctx.lineTo(turnX, endY)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(turnX, endY, Math.max(2, w / 500), 0, Math.PI * 2)
        ctx.fillStyle = ctx.strokeStyle
        ctx.fill()
      }
    } else if (board === "notebook") {
      const spacing = Math.max(24, h / 18)
      ctx.lineWidth = Math.max(1, w / 2000)
      ctx.strokeStyle = "#6489B5"
      ctx.globalAlpha = 0.16
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(w * 0.055, y)
        ctx.lineTo(w * 0.97, y)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = "#D76E6E"
      ctx.beginPath()
      ctx.moveTo(w * 0.12, h * 0.04)
      ctx.lineTo(w * 0.12, h * 0.96)
      ctx.stroke()
      ctx.fillStyle = "#E8D5B8"
      for (let i = 0; i < 3; i++) {
        const y = h * (0.2 + i * 0.3)
        ctx.beginPath()
        ctx.arc(w * 0.035, y, Math.max(3, w / 250), 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (board === "terrazzo") {
      let speckleSeed = 0x7a31c5
      const nextSpeckle = () => {
        speckleSeed ^= speckleSeed << 13
        speckleSeed ^= speckleSeed >>> 17
        speckleSeed ^= speckleSeed << 5
        return (speckleSeed >>> 0) / 4294967296
      }
      const colors = ["#B65F4A", "#416A68", "#D6A85F", "#8172A8", "#5C7284"]
      for (let i = 0; i < 300; i++) {
        const x = nextSpeckle() * w
        const y = nextSpeckle() * h
        const size = Math.max(2, w * (0.002 + nextSpeckle() * 0.005))
        ctx.globalAlpha = 0.22 + nextSpeckle() * 0.18
        ctx.fillStyle = colors[Math.floor(nextSpeckle() * colors.length)]!
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(nextSpeckle() * Math.PI)
        ctx.beginPath()
        ctx.ellipse(0, 0, size * (0.55 + nextSpeckle()), size, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
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
    if (["paper", "kraft", "chalkboard", "celestial", "topographic", "neon-grid", "blackboard", "corkboard", "aurora", "circuit"].includes(board)) {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.72)
      gradient.addColorStop(0, "rgba(255,255,255,0)")
      gradient.addColorStop(1, "rgba(0,0,0,0.2)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
    }
    if (["chalkboard", "blackboard", "whiteboard", "glass"].includes(board)) {
      ctx.globalAlpha = board === "chalkboard" ? 0.07 : board === "blackboard" ? 0.055 : 0.035
      for (let i = 0; i < 18; i++) {
        const x = (i * 7919 % 1000) / 1000 * w
        const y = (i * 3571 % 1000) / 1000 * h
        const radius = Math.min(w, h) * (0.025 + (i % 4) * 0.009)
        const smudge = ctx.createRadialGradient(x, y, 0, x, y, radius)
        smudge.addColorStop(0, ["chalkboard", "blackboard"].includes(board) ? "#E6E1D2" : "#777777")
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
    if (board === "blackboard") {
      const rail = Math.max(16, w / 90)
      const woodAcross = ctx.createLinearGradient(0, 0, w, 0)
      woodAcross.addColorStop(0, "#493024")
      woodAcross.addColorStop(0.12, "#946442")
      woodAcross.addColorStop(0.48, "#B18054")
      woodAcross.addColorStop(0.84, "#875A3B")
      woodAcross.addColorStop(1, "#3E2A21")
      const woodDown = ctx.createLinearGradient(0, 0, 0, h)
      woodDown.addColorStop(0, "#3E2A21")
      woodDown.addColorStop(0.16, "#A77950")
      woodDown.addColorStop(0.5, "#B18054")
      woodDown.addColorStop(0.86, "#805438")
      woodDown.addColorStop(1, "#39271F")
      const side = rail * 0.86
      ctx.globalAlpha = 1
      ctx.fillStyle = woodDown
      ctx.fillRect(0, 0, w, rail)
      ctx.fillRect(0, h - rail, w, rail)
      ctx.fillStyle = woodAcross
      ctx.fillRect(0, rail, side, h - rail * 2)
      ctx.fillRect(w - side, rail, side, h - rail * 2)

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, w, rail)
      ctx.rect(0, h - rail, w, rail)
      ctx.rect(0, rail, side, h - rail * 2)
      ctx.rect(w - side, rail, side, h - rail * 2)
      ctx.clip()
      let grainSeed = 0x4b61d2
      for (let i = 0; i < 34; i++) {
        grainSeed ^= grainSeed << 13
        grainSeed ^= grainSeed >>> 17
        grainSeed ^= grainSeed << 5
        const y = (grainSeed >>> 0) / 4294967296 * h
        ctx.globalAlpha = 0.09 + (i % 4) * 0.025
        ctx.strokeStyle = i % 2 ? "#33231C" : "#E0B47D"
        ctx.lineWidth = Math.max(1, rail * 0.018)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.bezierCurveTo(w * 0.28, y - rail * 0.14, w * 0.7, y + rail * 0.12, w, y - rail * 0.04)
        ctx.stroke()
      }
      ctx.restore()

      ctx.globalAlpha = 0.62
      ctx.strokeStyle = "#E4C493"
      ctx.lineWidth = Math.max(1, rail * 0.035)
      ctx.strokeRect(rail * 0.42, rail * 0.42, w - rail * 0.84, h - rail * 0.84)
      ctx.globalAlpha = 0.52
      ctx.strokeStyle = "#33251E"
      ctx.lineWidth = Math.max(1, rail * 0.04)
      ctx.strokeRect(side, rail, w - side * 2, h - rail * 2)

      const trayX = w * 0.1
      const trayWidth = w * 0.8
      const trayHeight = Math.max(12, rail * 0.38)
      const trayY = h - rail - trayHeight * 0.58
      const tray = ctx.createLinearGradient(0, trayY, 0, trayY + trayHeight)
      tray.addColorStop(0, "#C39160")
      tray.addColorStop(0.22, "#9A6945")
      tray.addColorStop(1, "#543827")
      ctx.save()
      ctx.shadowColor = "rgba(0,0,0,0.42)"
      ctx.shadowBlur = rail * 0.16
      ctx.fillStyle = tray
      ctx.fillRect(trayX, trayY, trayWidth, trayHeight)
      ctx.restore()
      ctx.globalAlpha = 0.58
      ctx.strokeStyle = "#E5BF8D"
      ctx.lineWidth = Math.max(1, rail * 0.025)
      ctx.beginPath()
      ctx.moveTo(trayX, trayY)
      ctx.lineTo(trayX + trayWidth, trayY)
      ctx.stroke()

      const chalkY = trayY - Math.max(4, rail * 0.11)
      const chalkLength = Math.max(12, rail * 0.9)
      const chalkHeight = Math.max(4, rail * 0.16)
      const sticks = [
        { x: trayX + trayWidth * 0.12, color: "#F2EDDD", angle: -0.025 },
        { x: trayX + trayWidth * 0.12 + chalkLength * 1.04, color: "#E8B8A5", angle: 0.018 },
        { x: trayX + trayWidth * 0.12 + chalkLength * 2.08, color: "#D8D487", angle: -0.012 },
      ]
      for (const stick of sticks) {
        ctx.save()
        ctx.translate(stick.x, chalkY)
        ctx.rotate(stick.angle)
        ctx.globalAlpha = 0.24
        ctx.fillStyle = "#15100D"
        ctx.fillRect(2, 2, chalkLength, chalkHeight)
        ctx.globalAlpha = 1
        ctx.fillStyle = stick.color
        ctx.fillRect(0, 0, chalkLength, chalkHeight)
        ctx.globalAlpha = 0.35
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(1, 1, chalkLength * 0.72, Math.max(1, chalkHeight * 0.18))
        ctx.restore()
      }

      const eraserX = trayX + trayWidth * 0.78
      const eraserY = trayY - chalkHeight * 0.15
      const eraserWidth = chalkLength * 1.75
      const eraserHeight = chalkHeight * 1.2
      ctx.fillStyle = "#342E2A"
      ctx.fillRect(eraserX, eraserY, eraserWidth, eraserHeight)
      ctx.fillStyle = "#B98A60"
      ctx.fillRect(eraserX, eraserY + eraserHeight * 0.76, eraserWidth, eraserHeight * 0.24)

      const screwRadius = Math.max(2, rail * 0.065)
      for (const [x, y] of [[rail * 0.5, rail * 0.5], [w - rail * 0.5, rail * 0.5], [rail * 0.5, h - rail * 0.5], [w - rail * 0.5, h - rail * 0.5]]) {
        const screw = ctx.createRadialGradient(x - screwRadius * 0.3, y - screwRadius * 0.3, 0, x, y, screwRadius)
        screw.addColorStop(0, "#D0BCA0")
        screw.addColorStop(0.42, "#786653")
        screw.addColorStop(1, "#30241E")
        ctx.fillStyle = screw
        ctx.beginPath()
        ctx.arc(x, y, screwRadius, 0, Math.PI * 2)
        ctx.fill()
      }
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
