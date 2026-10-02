import type { SceneNode } from "@/ir/types.ts"

export interface ObjectEditValues {
  x: string
  y: string
  text: string
  size: string
  width: string
  height: string
  radius: string
  color: string
  fill: string
  opacity: string
}

export interface SourceEdit {
  from: number
  to: number
  insert: string
}

interface BlockRange {
  start: number
  end: number
  lines: string[]
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function findBlock(source: string, id: string): BlockRange | undefined {
  const lines = source.split("\n")
  const safeId = escaped(id)
  const opener = new RegExp(`^\\s*(?:CREATE\\s+${safeId}\\s+AS\\b|(?:TABLE|BARCHART|LINECHART|PIECHART)\\s+${safeId}\\b)`, "i")
  for (let start = 0; start < lines.length; start += 1) {
    if (!opener.test(lines[start] ?? "")) continue
    for (let end = start + 1; end < lines.length; end += 1) {
      if (/^\s*END\s*$/i.test(lines[end] ?? "")) return { start, end, lines }
      if (/^\s*END\s+SCENE\s*$/i.test(lines[end] ?? "")) return undefined
    }
  }
  return undefined
}

function rawProperty(block: BlockRange, key: string): string | undefined {
  const property = new RegExp(`^\\s*${key}\\s+(.*?)\\s*$`, "i")
  for (let index = block.end - 1; index > block.start; index -= 1) {
    const match = property.exec(block.lines[index] ?? "")
    if (match) return match[1]
  }
  return undefined
}

function numberValues(value: string | undefined): number[] {
  if (!value) return []
  return value.trim().split(/\s+/).map(Number).filter(Number.isFinite)
}

function stringValue(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const raw = value.trim()
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try { return JSON.parse(raw) as string } catch { return raw.slice(1, -1).replace(/\\"/g, '"') }
  }
  return raw
}

export function readObjectEditValues(source: string, node: SceneNode): ObjectEditValues {
  const block = findBlock(source, node.id)
  if (!block) {
    return {
      x: String(node.position.x), y: String(node.position.y), text: node.text ?? "",
      size: String(node.style.fontSize ?? (node.type === "icon" ? 104 : 36)),
      width: String(node.size?.width ?? 420), height: String(node.size?.height ?? 220),
      radius: String(node.radius ?? 100), color: node.style.color || "#222222",
      fill: node.style.fill ?? "#FFFFFF", opacity: String(node.opacity ?? 1),
    }
  }
  const position = numberValues(rawProperty(block, "POSITION"))
  const size = numberValues(rawProperty(block, "SIZE"))
  const width = Number(rawProperty(block, "WIDTH"))
  const height = Number(rawProperty(block, "HEIGHT"))
  const radius = Number(rawProperty(block, "RADIUS"))
  const opacity = Number(rawProperty(block, "OPACITY"))
  return {
    x: String(position[0] ?? node.position.x),
    y: String(position[1] ?? node.position.y),
    text: stringValue(rawProperty(block, "TEXT"), node.text ?? ""),
    size: String(size[0] ?? node.style.fontSize ?? (node.type === "icon" ? 104 : 36)),
    width: String(width || size[0] || node.size?.width || 420),
    height: String(height || size[1] || node.size?.height || 220),
    radius: String(radius || node.radius || 100),
    color: stringValue(rawProperty(block, "COLOR"), node.style.color || "#222222"),
    fill: stringValue(rawProperty(block, "FILL"), node.style.fill ?? "#FFFFFF"),
    opacity: String(Number.isFinite(opacity) ? opacity : node.opacity ?? 1),
  }
}

function lineOffset(lines: string[], line: number): number {
  let offset = 0
  for (let index = 0; index < line; index += 1) offset += (lines[index]?.length ?? 0) + 1
  return offset
}

export function objectSourceCapability(source: string, id: string): {
  editable: boolean
  deletable: boolean
  positionEditable: boolean
  deleteReason?: string
  line?: number
} {
  const block = findBlock(source, id)
  if (!block) return { editable: false, deletable: false, positionEditable: false }
  const idPattern = escaped(id)
  const references = new RegExp(
    `^\\s*(?:ANIMATE\\s+${idPattern}\\b|ENTER\\s+${idPattern}\\b|EXIT\\s+${idPattern}\\b|DELETE\\s+${idPattern}\\b|DUPLICATE\\s+\\S+\\s+FROM\\s+${idPattern}\\b|INK\\s+(?:CIRCLE|UNDERLINE)\\s+${idPattern}\\b|ARROW\\s+${idPattern}\\s*->|ARROW\\s+\\S+\\s*->\\s*${idPattern}\\b)`,
    "i"
  )
  const referenced = block.lines.some((line, index) =>
    (index < block.start || index > block.end) && references.test(line)
  )
  const positionEditable = !block.lines.slice(block.start + 1, block.end)
    .some((line) => /^\s*(?:BELOW|ABOVE|LEFTOF|RIGHTOF|CENTERON)\b/i.test(line))
  return {
    editable: true,
    deletable: !referenced,
    positionEditable,
    ...(referenced ? { deleteReason: "This object is used by another animation or connector." } : {}),
    line: block.start + 1,
  }
}

export function removeObjectBlock(source: string, id: string): SourceEdit | undefined {
  const block = findBlock(source, id)
  if (!block) return undefined
  const start = lineOffset(block.lines, block.start)
  let end = lineOffset(block.lines, block.end) + (block.lines[block.end]?.length ?? 0)
  if (source[end] === "\n") end += 1
  return { from: start, to: end, insert: "" }
}

export function editObjectProperties(
  source: string,
  node: SceneNode,
  values: ObjectEditValues
): SourceEdit[] | undefined {
  const block = findBlock(source, node.id)
  if (!block) return undefined
  const hasRelativePosition = block.lines.slice(block.start + 1, block.end)
    .some((line) => /^\s*(?:BELOW|ABOVE|LEFTOF|RIGHTOF|CENTERON)\b/i.test(line))
  const entries: Array<[string, string]> = []
  if (!hasRelativePosition) entries.push(["POSITION", `${values.x} ${values.y}`])
  if (node.type === "text" && node.text !== undefined) {
    const text = values.text.replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
    entries.push(["TEXT", `"${text}"`])
  }
  if (node.type === "text" || node.type === "icon") entries.push(["SIZE", values.size])
  else if (node.type === "table" || node.type === "chart") entries.push(["SIZE", `${values.width} ${values.height}`])
  else if (node.type === "circle") entries.push(["RADIUS", values.radius])
  else if (node.type === "image" || node.type === "rectangle" || node.type === "line") {
    entries.push(["WIDTH", values.width], ["HEIGHT", values.height])
  }
  entries.push(["COLOR", values.color], ["OPACITY", values.opacity])
  if (node.style.fill !== undefined) entries.push(["FILL", values.fill])

  const edits: SourceEdit[] = []
  const missing: string[] = []
  for (const [key, value] of entries) {
    const property = new RegExp(`^(\\s*${key}\\s+)(.*)$`, "i")
    let found = false
    for (let index = block.start + 1; index < block.end; index += 1) {
      const match = property.exec(block.lines[index] ?? "")
      if (!match) continue
      found = true
      const from = lineOffset(block.lines, index) + (match[1]?.length ?? 0)
      const to = lineOffset(block.lines, index) + (block.lines[index]?.length ?? 0)
      edits.push({ from, to, insert: value })
    }
    if (!found) missing.push(`  ${key} ${value}`)
  }
  if (missing.length) {
    const endOffset = lineOffset(block.lines, block.end)
    const indent = /^\s*/.exec(block.lines[block.start] ?? "")?.[0] ?? ""
    edits.push({ from: endOffset, to: endOffset, insert: missing.map((line) => indent + line).join("\n") + "\n" })
  }
  return edits
}
