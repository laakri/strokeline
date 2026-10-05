import { PROPERTY_KEYS, SHAPE_TYPES } from "@/dsl/grammar.ts"

const blockOpeners = /^(?:CREATE|TABLE|BARCHART|LINECHART|PIECHART|PARALLEL|GROUP|STACK|GRID|DEFINE)\b/i
const propertyKeys = new Set(PROPERTY_KEYS)
const continuationCommands = new Set([
  "ANIMATE",
  "ARROW",
  "CAMERA",
  "DELETE",
  "DUPLICATE",
  "INK",
  "SAY",
])

function isInkBlock(line: string, lines: string[], index: number): boolean {
  const mode = line.match(/^INK(?:\s+([A-Z]+))?/i)?.[1]?.toUpperCase()
  if (mode !== "UNDERLINE" && mode !== "CIRCLE") return true

  for (let next = index + 1; next < lines.length; next++) {
    const candidate = lines[next]!.trim()
    if (!candidate || candidate.startsWith("//")) continue
    if (/^END\b/i.test(candidate)) return true
    const property = candidate.match(/^([A-Z_]+)/i)?.[1]?.toUpperCase()
    if (!property || !propertyKeys.has(property)) return false
  }
  return false
}

export function formatScript(source: string): string {
  const lines = source.replace(/\r\n?/g, "\n").split("\n")
  const formatted: string[] = []
  const blockStack: string[] = []
  let depth = 0
  let propertyContinuation = false

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index]!
    const line = rawLine.trim()
    if (!line) {
      formatted.push("")
      continue
    }

    if (/^END\s+SCENE\b/i.test(line)) {
      depth = 0
      blockStack.length = 0
      propertyContinuation = false
      formatted.push(line)
      continue
    }

    if (/^END\b/i.test(line)) {
      depth = Math.max(0, depth - 1)
      blockStack.pop()
      propertyContinuation = false
      formatted.push(`${"  ".repeat(depth)}${line}`)
      continue
    }

    if (/^SCENE\b/i.test(line)) {
      formatted.push(line)
      depth = 1
      blockStack.push("SCENE")
      propertyContinuation = false
      continue
    }

    const command = line.match(/^([A-Z_]+)/i)?.[1]?.toUpperCase()
    const isComment = line.startsWith("//")
    if (
      propertyContinuation &&
      (isComment || (command && propertyKeys.has(command)))
    ) {
      formatted.push(`${"  ".repeat(depth + 1)}${line}`)
      continue
    }

    propertyContinuation = false
    formatted.push(`${"  ".repeat(depth)}${line}`)
    if (blockOpeners.test(line) || (/^INK\b/i.test(line) && isInkBlock(line, lines, index))) {
      depth += 1
      blockStack.push(command ?? "BLOCK")
    } else if (
      command &&
      (continuationCommands.has(command) ||
        ((SHAPE_TYPES as readonly string[]).includes(command) &&
          !(blockStack.at(-1) === "CREATE" && propertyKeys.has(command))))
    ) {
      propertyContinuation = true
    }
  }

  return formatted.join("\n")
}
