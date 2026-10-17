import type { SceneNode } from "@/ir/types.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import type { BoundingBox } from "@/renderer/shapes/registry.ts"

type Highlight = {
  target: { type: string; row?: number }
  color: string
  progress: number
}

export function componentContentBounds(node: SceneNode): BoundingBox {
  const box = componentBounds(node)
  if (node.data?.componentType === "PHONE") {
    return {
      x: box.x + 14,
      y: box.y + 96,
      width: Math.max(0, box.width - 28),
      height: Math.max(0, box.height - 110),
    }
  }
  return {
    x: box.x + 10,
    y: box.y + 72,
    width: Math.max(0, box.width - 20),
    height: Math.max(0, box.height - 82),
  }
}

export interface ComponentTextMetrics {
  fontSizes: number[]
  overflows: boolean
}

export function componentTextMetrics(
  node: SceneNode,
  canvasHeight: number
): ComponentTextMetrics {
  const type = node.data?.componentType
  const box = componentBounds(node)
  const scale = canvasHeight / 1080
  if (type === "CODE") {
    const lines = (node.data?.codeLines as string[] | undefined) ?? []
    const content = componentContentBounds(node)
    const fontSize = Math.max(
      26 * scale,
      Math.min(box.height * 0.11, content.height / Math.max(1, lines.length * 1.42))
    )
    const longest = Math.max(0, ...lines.map((line) => line.length))
    return {
      fontSizes: lines.length ? [fontSize, 26 * scale] : [],
      overflows: lines.length * fontSize * 1.42 > content.height ||
        longest * fontSize * 0.61 > content.width - 54,
    }
  }
  if (type === "TERMINAL") {
    const commands = (node.data?.commands as string[] | undefined) ?? []
    const outputs = (node.data?.outputs as string[] | undefined) ?? []
    const rows = Array.from(
      { length: Math.max(commands.length, outputs.length) },
      (_, index) => [commands[index], outputs[index]].filter(Boolean) as string[]
    ).flat()
    const content = componentContentBounds(node)
    const longest = Math.max(0, ...rows.map((line) => line.length)) + String(node.data?.prompt ?? "$").length + 1
    const fontSize = Math.max(
      26 * scale,
      Math.min(box.height * 0.1, content.height / Math.max(1, rows.length * 1.42))
    )
    return {
      fontSizes: rows.length ? [fontSize] : [],
      overflows: rows.length * fontSize * 1.42 > content.height ||
        longest * fontSize * 0.61 > content.width - 12,
    }
  }
  if (type === "BROWSER" || type === "PHONE") {
    const address = 24 * scale
    const title = typeof node.data?.title === "string" ? 24 * scale : undefined
    return {
      fontSizes: [address, ...(title ? [title] : [])],
      overflows: box.height < (type === "PHONE" ? 120 : title ? 100 : 78) * scale,
    }
  }
  if (type === "SPLIT" || type === "BEFORE-AFTER")
    return { fontSizes: [32 * scale], overflows: box.width < 120 * scale }
  if (type === "COUNTER")
    return { fontSizes: [Math.max(48 * scale, Math.min(box.height * 0.52, box.width / 4))], overflows: false }
  return { fontSizes: [], overflows: false }
}

export function drawComponent(
  render: RenderContext,
  node: SceneNode
): boolean {
  const componentType = node.data?.componentType
  if (typeof componentType !== "string") return false

  const ctx = render.context
  const box = componentBounds(node)
  const progress = clamp(
    (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1
  )
  const scale = Math.max(1, render.cameraScale)
  const ink = node.style.color
  const fill = node.style.fill ?? "#F5F7FA"
  const metrics = componentTextMetrics(node, render.canvasHeight)
  const fontSize = metrics.fontSizes[0] ?? 26 * render.canvasHeight / 1080

  ctx.save()
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / scale)
  ctx.strokeStyle = ink
  ctx.fillStyle = fill
  ctx.textBaseline = "middle"
  ctx.font = `500 ${fontSize}px ${componentType === "CODE" || componentType === "TERMINAL" ? "monospace" : "sans-serif"}`

  if (componentType === "BROWSER" || componentType === "PHONE") {
    drawBrowser(ctx, node, box, ink, fill, progress, componentType === "PHONE", render.canvasHeight)
  } else if (componentType === "CODE") {
    drawCode(ctx, node, box, fontSize, progress, render.canvasHeight)
  } else if (componentType === "TERMINAL") {
    drawTerminal(ctx, node, box, ink, fontSize, progress, render.canvasHeight)
  } else if (componentType === "COUNTER") {
    drawCounter(ctx, node, box, ink, fill, progress, render.canvasHeight)
  } else if (componentType === "SPLIT" || componentType === "BEFORE-AFTER") {
    drawSplit(ctx, node, box, ink, fill, fontSize, progress)
  }

  ctx.restore()
  return true
}

function drawBrowser(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  ink: string,
  fill: string,
  progress: number,
  phone: boolean,
  canvasHeight: number
): void {
  ctx.save()
  ctx.globalAlpha *= progress
  drawPanelShadow(ctx, box)
  const radius = phone ? Math.min(box.width, box.height) * 0.1 : 14
  ctx.fillStyle = "#202A36"
  rounded(ctx, box, radius)
  ctx.fill()
  const inset = phone ? 8 : 2
  const screen = {
    x: box.x + inset,
    y: box.y + inset,
    width: Math.max(0, box.width - inset * 2),
    height: Math.max(0, box.height - inset * 2),
  }
  ctx.fillStyle = fill === "#F5F7FA" ? "#FFFFFF" : fill
  rounded(ctx, screen, Math.max(2, radius - inset))
  ctx.fill()
  if (phone) {
    ctx.fillStyle = "#202A36"
    rounded(ctx, { x: box.x + box.width * 0.34, y: box.y + 8, width: box.width * 0.32, height: 10 }, 5)
    ctx.fill()
    ctx.textAlign = "left"
    const textSize = 24 * canvasHeight / 1080
    ctx.font = `${textSize}px sans-serif`
    ctx.fillStyle = "#344256"
    ctx.fillText(String(node.data?.address ?? "https://example.com"), screen.x + 8, screen.y + 42, Math.max(0, screen.width - 16))
    if (typeof node.data?.title === "string") {
      ctx.font = `600 ${textSize}px sans-serif`
      ctx.fillStyle = "#18212B"
      ctx.fillText(node.data.title, screen.x + 8, screen.y + 74, Math.max(0, screen.width - 16))
    }
  } else {
    const toolbarHeight = 66 * canvasHeight / 1080
    ctx.save()
    rounded(ctx, screen, radius - inset)
    ctx.clip()
    ctx.fillStyle = "#E9EEF3"
    ctx.fillRect(screen.x, screen.y, screen.width, toolbarHeight)
    ctx.fillStyle = "#E77667"
    ctx.beginPath()
    ctx.arc(screen.x + 18, screen.y + 18, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#E7B24B"
    ctx.beginPath()
    ctx.arc(screen.x + 40, screen.y + 18, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#75B56A"
    ctx.beginPath()
    ctx.arc(screen.x + 62, screen.y + 18, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#FFFFFF"
    rounded(ctx, { x: screen.x + 82, y: screen.y + 7, width: Math.max(0, screen.width - 96), height: 34 * canvasHeight / 1080 }, 10)
    ctx.fill()
    ctx.textAlign = "left"
    const textSize = 24 * canvasHeight / 1080
    ctx.font = `${textSize}px sans-serif`
    ctx.fillStyle = "#344256"
    ctx.fillText(String(node.data?.address ?? "https://example.com"), screen.x + 96, screen.y + 24, Math.max(0, screen.width - 110))
    const title = node.data?.title
    if (typeof title === "string" && title) {
      ctx.font = `600 ${textSize}px sans-serif`
      ctx.fillStyle = "#18212B"
      ctx.fillText(title, screen.x + 14, screen.y + 54, Math.max(0, screen.width - 28))
    }
    ctx.restore()
  }
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / 2)
  rounded(ctx, box, radius)
  ctx.stroke()
  ctx.restore()
}

function drawCode(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  fontSize: number,
  progress: number,
  canvasHeight: number
): void {
  drawWindow(ctx, node, box, String(node.data?.title ?? "Code"), canvasHeight)
  const lines = (node.data?.codeLines as string[] | undefined) ?? []
  const language = String(node.data?.language ?? "js")
  const highlights = new Set((node.data?.highlightLines as number[] | undefined) ?? [])
  const animated = (node.data?._animatedTableHighlights as Highlight[] | undefined) ?? []
  const content = componentContentBounds(node)
  const lineHeight = fontSize * 1.42
  const totalChars = lines.reduce((sum, line) => sum + line.length + 1, 0)
  let remaining = Math.ceil(totalChars * progress)
  ctx.save()
  ctx.beginPath()
  ctx.rect(content.x, content.y, content.width, content.height)
  ctx.clip()
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    const y = content.y + (index + 0.5) * lineHeight
    const lineNumber = index + 1
    const rowHighlights = animated.filter(
      (entry) => entry.target.type === "row" && entry.target.row === lineNumber
    )
    const dynamicHighlight = rowHighlights.reduce(
      (amount, entry) => Math.max(amount, entry.progress),
      0
    )
    if (highlights.has(lineNumber) || dynamicHighlight > 0) {
      ctx.globalAlpha = dynamicHighlight > 0 ? dynamicHighlight * 0.35 : 0.25
      ctx.fillStyle = rowHighlights.sort((left, right) => right.progress - left.progress)[0]?.color ?? "#FFD166"
      ctx.fillRect(content.x, y - lineHeight * 0.48, content.width, lineHeight)
      ctx.globalAlpha = 1
    }
    ctx.textAlign = "right"
    ctx.font = `${26 * canvasHeight / 1080}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`
    ctx.fillStyle = "#AAB4C2"
    ctx.fillText(String(lineNumber), content.x + 30, y)
    const visible = line.slice(0, Math.max(0, Math.min(line.length, remaining)))
    remaining -= Math.min(line.length + 1, Math.max(0, remaining))
    ctx.textAlign = "left"
    ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`
    drawColoredCode(ctx, visible, content.x + 42, y, language)
  }
  ctx.restore()
}

function drawTerminal(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  ink: string,
  fontSize: number,
  progress: number,
  canvasHeight: number
): void {
  const terminalFill = "#111923"
  drawPanelShadow(ctx, box)
  ctx.fillStyle = terminalFill
  rounded(ctx, box, 12)
  ctx.fill()
  ctx.fillStyle = "#263240"
  rounded(ctx, { x: box.x, y: box.y, width: box.width, height: 64 }, 12)
  ctx.fill()
  drawWindowDots(ctx, box)
  ctx.fillStyle = "#D8E0EA"
  ctx.textAlign = "left"
  ctx.font = `600 ${24 * canvasHeight / 1080}px sans-serif`
  ctx.fillText(String(node.data?.title ?? "Terminal"), box.x + 92, box.y + 32, Math.max(0, box.width - 108))
  const content = componentContentBounds(node)
  const commands = (node.data?.commands as string[] | undefined) ?? []
  const outputs = (node.data?.outputs as string[] | undefined) ?? []
  const prompt = String(node.data?.prompt ?? "$")
  const rows = Array.from({ length: Math.max(commands.length, outputs.length) }, (_, index) => [
    ...(commands[index] ? [{ text: `${prompt} ${commands[index]}`, color: "#A8E6A3" }] : []),
    ...(outputs[index] ? [{ text: outputs[index]!, color: "#D8E0EA" }] : []),
  ]).flat()
  const lineHeight = fontSize * 1.42
  const totalChars = rows.reduce((sum, row) => sum + row.text.length + 1, 0)
  let remaining = Math.ceil(totalChars * progress)
  ctx.save()
  ctx.beginPath()
  ctx.rect(content.x, content.y, content.width, content.height)
  ctx.clip()
  ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`
  ctx.textAlign = "left"
  rows.forEach((row, index) => {
    const visible = row.text.slice(0, Math.max(0, Math.min(row.text.length, remaining)))
    remaining -= Math.min(row.text.length + 1, Math.max(0, remaining))
    ctx.fillStyle = row.color
    ctx.fillText(visible, content.x + 6, content.y + (index + 0.5) * lineHeight, content.width - 12)
  })
  ctx.restore()
  ctx.strokeStyle = ink
  ctx.globalAlpha *= 0.55
  rounded(ctx, box, 12)
  ctx.stroke()
}

function drawCounter(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  ink: string,
  fill: string,
  progress: number,
  canvasHeight: number
): void {
  drawPanelShadow(ctx, box)
  ctx.fillStyle = fill === "#F5F7FA" ? "#FFFFFF" : fill
  rounded(ctx, box, 18)
  ctx.fill()
  ctx.strokeStyle = ink
  rounded(ctx, box, 18)
  ctx.stroke()
  const value = Number(node.data?.value ?? 0)
  const decimals = String(value).split(".")[1]?.length ?? 0
  const displayed = (value * progress).toFixed(Math.min(6, decimals))
  ctx.fillStyle = ink
  ctx.textAlign = "center"
  ctx.font = `700 ${Math.max(48 * canvasHeight / 1080, Math.min(box.height * 0.52, box.width / 4))}px sans-serif`
  ctx.fillText(`${String(node.data?.prefix ?? "")}${displayed}${String(node.data?.suffix ?? "")}`, node.position.x, node.position.y, box.width - 24)
}

function drawSplit(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  ink: string,
  fill: string,
  fontSize: number,
  progress: number
): void {
  const middle = box.x + box.width / 2
  const firstFill = fill === "#F5F7FA" ? "#E8F2F5" : fill
  ctx.fillStyle = firstFill
  ctx.fillRect(box.x, box.y, box.width / 2, box.height)
  ctx.fillStyle = "#F3EBDD"
  ctx.fillRect(middle, box.y, box.width / 2, box.height)
  ctx.strokeStyle = ink
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / 2)
  ctx.strokeRect(box.x, box.y, box.width, box.height)
  ctx.textAlign = "center"
  ctx.fillStyle = ink
  ctx.font = `600 ${Math.max(32 * fontSize / 32, Math.min(fontSize, box.height / 5))}px sans-serif`
  const left = String(node.data?.left ?? "")
  const right = String(node.data?.right ?? "")
  ctx.fillText(left, box.x + box.width / 4, node.position.y, box.width / 2 - 16)
  ctx.fillText(right, box.x + box.width * 0.75, node.position.y, box.width / 2 - 16)
  const sweepX = box.x + box.width * Math.min(0.5, progress * 0.5)
  ctx.fillStyle = "#FFD166"
  ctx.fillRect(sweepX - 2, box.y, 4, box.height)
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  title: string,
  canvasHeight: number
): void {
  if (node.data?.componentType === "TERMINAL") return
  drawPanelShadow(ctx, box)
  ctx.fillStyle = "#151B24"
  rounded(ctx, box, 12)
  ctx.fill()
  ctx.strokeStyle = "#394555"
  rounded(ctx, box, 12)
  ctx.stroke()
  ctx.fillStyle = "#263240"
  rounded(ctx, { x: box.x, y: box.y, width: box.width, height: Math.min(64, box.height) }, 12)
  ctx.fill()
  drawWindowDots(ctx, box)
  ctx.fillStyle = "#E4EAF1"
  ctx.textAlign = "left"
  ctx.font = `600 ${24 * canvasHeight / 1080}px sans-serif`
  ctx.fillText(title, box.x + 92, box.y + 32, Math.max(0, box.width - 108))
}

function drawColoredCode(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  language: string
): void {
  const pattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b(?:const|let|var|function|return|if|else|class|import|from|export|default|async|await|def|for|in|print|true|false|null|None|type|interface)\b|<\/?[\w-]+|[{}[\]():;,])/g
  let cursor = 0
  let offset = 0
  ctx.fillStyle = "#E4EAF1"
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    const before = line.slice(cursor, index)
    ctx.fillText(before, x + offset, y)
    offset += ctx.measureText(before).width
    const token = match[0]
    const color = token.startsWith("//") || (language === "python" && token.startsWith("#"))
      ? "#AAB4C2"
      : token.startsWith('"') || token.startsWith("'") || token.startsWith("`")
        ? "#C3E88D"
        : /^\d/.test(token)
          ? "#FFB86C"
          : /^<\/?/.test(token)
            ? "#D6A8FF"
            : /^[{}[\]():;,]$/.test(token)
              ? "#FF8FA3"
              : "#82AAFF"
    ctx.fillStyle = color
    ctx.fillText(token, x + offset, y)
    offset += ctx.measureText(token).width
    cursor = index + token.length
  }
  const tail = line.slice(cursor)
  ctx.fillStyle = "#E4EAF1"
  ctx.fillText(tail, x + offset, y)
}

function drawPanelShadow(ctx: CanvasRenderingContext2D, box: BoundingBox): void {
  ctx.save()
  ctx.fillStyle = "rgba(12, 18, 28, 0.28)"
  ctx.shadowColor = "rgba(12, 18, 28, 0.32)"
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 5
  rounded(ctx, box, 12)
  ctx.fill()
  ctx.restore()
}

function drawWindowDots(ctx: CanvasRenderingContext2D, box: BoundingBox): void {
  const colors = ["#FF6B67", "#FFC857", "#58C78A"]
  colors.forEach((color, index) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(box.x + 24 + index * 22, box.y + 32, 6, 0, Math.PI * 2)
    ctx.fill()
  })
}

function componentBounds(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

function rounded(
  ctx: CanvasRenderingContext2D,
  box: BoundingBox,
  radius: number
): void {
  ctx.beginPath()
  ctx.roundRect(box.x, box.y, box.width, box.height, Math.max(0, Math.min(radius, box.width / 2, box.height / 2)))
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}
