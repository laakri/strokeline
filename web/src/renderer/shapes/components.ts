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
      y: box.y + 76,
      width: Math.max(0, box.width - 28),
      height: Math.max(0, box.height - 90),
    }
  }
  return {
    x: box.x + 10,
    y: box.y + 48,
    width: Math.max(0, box.width - 20),
    height: Math.max(0, box.height - 58),
  }
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
  const fontSize = Math.max(12, Math.min(node.style.fontSize ?? 20, box.height / 8))

  ctx.save()
  ctx.lineWidth = Math.max(1, node.style.strokeWidth / scale)
  ctx.strokeStyle = ink
  ctx.fillStyle = fill
  ctx.textBaseline = "middle"
  ctx.font = `500 ${fontSize}px ${componentType === "CODE" || componentType === "TERMINAL" ? "monospace" : "sans-serif"}`

  if (componentType === "BROWSER" || componentType === "PHONE") {
    drawBrowser(ctx, node, box, ink, fill, progress, componentType === "PHONE")
  } else if (componentType === "CODE") {
    drawCode(ctx, node, box, ink, fill, fontSize, progress)
  } else if (componentType === "TERMINAL") {
    drawTerminal(ctx, node, box, ink, fill, fontSize, progress)
  } else if (componentType === "COUNTER") {
    drawCounter(ctx, node, box, ink, fill, progress)
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
  phone: boolean
): void {
  ctx.save()
  ctx.globalAlpha *= progress
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
    ctx.font = "10px sans-serif"
    ctx.fillStyle = "#596778"
    ctx.fillText(String(node.data?.address ?? "https://example.com"), screen.x + 8, screen.y + 38, Math.max(0, screen.width - 16))
    if (typeof node.data?.title === "string") {
      ctx.font = "600 12px sans-serif"
      ctx.fillStyle = ink
      ctx.fillText(node.data.title, screen.x + 8, screen.y + 52, Math.max(0, screen.width - 16))
    }
  } else {
    const toolbarHeight = 42
    ctx.save()
    rounded(ctx, screen, radius - inset)
    ctx.clip()
    ctx.fillStyle = "#E9EEF3"
    ctx.fillRect(screen.x, screen.y, screen.width, toolbarHeight)
    ctx.fillStyle = "#E77667"
    ctx.beginPath()
    ctx.arc(screen.x + 16, screen.y + 15, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#E7B24B"
    ctx.beginPath()
    ctx.arc(screen.x + 30, screen.y + 15, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#75B56A"
    ctx.beginPath()
    ctx.arc(screen.x + 44, screen.y + 15, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#FFFFFF"
    rounded(ctx, { x: screen.x + 62, y: screen.y + 6, width: Math.max(0, screen.width - 76), height: 20 }, 8)
    ctx.fill()
    ctx.textAlign = "left"
    ctx.font = "12px sans-serif"
    ctx.fillStyle = "#596778"
    ctx.fillText(String(node.data?.address ?? "https://example.com"), screen.x + 72, screen.y + 16, Math.max(0, screen.width - 94))
    const title = node.data?.title
    if (typeof title === "string" && title) {
      ctx.font = "600 13px sans-serif"
      ctx.fillStyle = ink
      ctx.fillText(title, screen.x + 14, screen.y + 34, Math.max(0, screen.width - 28))
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
  ink: string,
  fill: string,
  fontSize: number,
  progress: number
): void {
  drawWindow(ctx, node, box, ink, fill, String(node.data?.title ?? "Code"))
  const lines = (node.data?.codeLines as string[] | undefined) ?? []
  const language = String(node.data?.language ?? "js")
  const highlights = new Set((node.data?.highlightLines as number[] | undefined) ?? [])
  const animated = (node.data?._animatedTableHighlights as Highlight[] | undefined) ?? []
  const content = componentContentBounds(node)
  const lineHeight = Math.max(fontSize * 1.45, content.height / Math.max(1, Math.min(lines.length, 12)))
  const maxLines = Math.min(lines.length, Math.floor(content.height / lineHeight))
  const totalChars = lines.reduce((sum, line) => sum + line.length + 1, 0)
  let remaining = Math.ceil(totalChars * progress)
  ctx.save()
  ctx.beginPath()
  ctx.rect(content.x, content.y, content.width, content.height)
  ctx.clip()
  for (let index = 0; index < maxLines; index++) {
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
    ctx.font = `${Math.max(11, fontSize * 0.72)}px monospace`
    ctx.fillStyle = "#7D8997"
    ctx.fillText(String(lineNumber), content.x + 30, y)
    const visible = line.slice(0, Math.max(0, Math.min(line.length, remaining)))
    remaining -= Math.min(line.length + 1, Math.max(0, remaining))
    ctx.textAlign = "left"
    ctx.font = `${Math.max(11, fontSize * 0.78)}px monospace`
    drawColoredCode(ctx, visible, content.x + 42, y, language)
  }
  ctx.restore()
}

function drawTerminal(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  box: BoundingBox,
  ink: string,
  fill: string,
  fontSize: number,
  progress: number
): void {
  const terminalFill = fill === "#F5F7FA" ? "#111923" : fill
  ctx.fillStyle = terminalFill
  rounded(ctx, box, 12)
  ctx.fill()
  ctx.fillStyle = "#263240"
  rounded(ctx, { x: box.x, y: box.y, width: box.width, height: 36 }, 12)
  ctx.fill()
  ctx.fillStyle = "#D8E0EA"
  ctx.textAlign = "left"
  ctx.font = "600 13px sans-serif"
  ctx.fillText(String(node.data?.title ?? "Terminal"), box.x + 14, box.y + 19, Math.max(0, box.width - 28))
  const content = componentContentBounds(node)
  const commands = (node.data?.commands as string[] | undefined) ?? []
  const outputs = (node.data?.outputs as string[] | undefined) ?? []
  const prompt = String(node.data?.prompt ?? "$")
  const rows = Array.from({ length: Math.max(commands.length, outputs.length) }, (_, index) => [
    ...(commands[index] ? [{ text: `${prompt} ${commands[index]}`, color: "#A8E6A3" }] : []),
    ...(outputs[index] ? [{ text: outputs[index]!, color: "#D8E0EA" }] : []),
  ]).flat()
  const lineHeight = Math.max(fontSize * 1.45, content.height / Math.max(1, Math.min(rows.length, 12)))
  const maxRows = Math.min(rows.length, Math.floor(content.height / lineHeight))
  const totalChars = rows.reduce((sum, row) => sum + row.text.length + 1, 0)
  let remaining = Math.ceil(totalChars * progress)
  ctx.save()
  ctx.beginPath()
  ctx.rect(content.x, content.y, content.width, content.height)
  ctx.clip()
  ctx.font = `${Math.max(11, fontSize * 0.78)}px monospace`
  ctx.textAlign = "left"
  rows.slice(0, maxRows).forEach((row, index) => {
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
  progress: number
): void {
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
  ctx.font = `700 ${Math.max(24, Math.min(box.height * 0.52, box.width / 4))}px sans-serif`
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
  ctx.font = `600 ${Math.max(12, Math.min(fontSize, box.height / 5))}px sans-serif`
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
  ink: string,
  fill: string,
  title: string
): void {
  if (node.data?.componentType === "TERMINAL") return
  ctx.fillStyle = fill === "#F5F7FA" ? "#FFFFFF" : fill
  rounded(ctx, box, 12)
  ctx.fill()
  ctx.strokeStyle = ink
  rounded(ctx, box, 12)
  ctx.stroke()
  ctx.fillStyle = "#E6EBF0"
  rounded(ctx, { x: box.x, y: box.y, width: box.width, height: Math.min(38, box.height) }, 12)
  ctx.fill()
  ctx.fillStyle = ink
  ctx.textAlign = "left"
  ctx.font = "600 13px sans-serif"
  ctx.fillText(title, box.x + 14, box.y + 20, Math.max(0, box.width - 28))
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
  ctx.fillStyle = "#31445A"
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0
    const before = line.slice(cursor, index)
    ctx.fillText(before, x + offset, y)
    offset += ctx.measureText(before).width
    const token = match[0]
    const color = token.startsWith("//") || (language === "python" && token.startsWith("#"))
      ? "#8492A6"
      : token.startsWith('"') || token.startsWith("'") || token.startsWith("`")
        ? "#2E8B57"
        : /^\d/.test(token)
          ? "#B26B26"
          : /^<\/?/.test(token)
            ? "#8B5CF6"
            : /^[{}[\]():;,]$/.test(token)
              ? "#D05B78"
              : "#2463A6"
    ctx.fillStyle = color
    ctx.fillText(token, x + offset, y)
    offset += ctx.measureText(token).width
    cursor = index + token.length
  }
  const tail = line.slice(cursor)
  ctx.fillStyle = "#31445A"
  ctx.fillText(tail, x + offset, y)
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
