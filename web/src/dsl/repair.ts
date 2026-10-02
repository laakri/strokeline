import { HEADER_KEYWORDS, PROPERTY_KEYS, SHAPE_TYPES, STATEMENT_KEYWORDS } from "@/dsl/grammar.ts"
import { runScript } from "@/dsl/index.ts"
import type { Diagnostic } from "@/ir/types.ts"

export interface ScriptRepairFix {
  line: number
  description: string
}

export interface ScriptRepairResult {
  script: string
  fixes: ScriptRepairFix[]
  unfixable: string[]
  truncated: boolean
}

export interface AiRepairRequest {
  error: Diagnostic
  script: string
}

export interface ScriptRepairLoopResult extends ScriptRepairResult {
  diagnostics: Diagnostic[]
  retries: number
}

type Line = { text: string; number: number }
type LineToken = {
  kind: "word" | "string" | "arrow"
  value: string
  start: number
  end: number
  closed?: boolean
}
type OpenBlock = { name: string; indent: string }
type OpenScene = { indent: string; depth: number; cameraChanged: boolean }

const knownWords = new Set<string>([
  ...HEADER_KEYWORDS,
  ...STATEMENT_KEYWORDS,
  "AS",
  "TO",
])
const blockWords = new Set([
  "CREATE",
  "PARALLEL",
  "GROUP",
  "STACK",
  "GRID",
  "TABLE",
  "DEFINE",
  "BARCHART",
  "LINECHART",
  "PIECHART",
  "INK",
])
const durationWords = new Set(["DRAW", "DURATION", "WAIT", "GAP", "PERIOD", "STAGGER"])
const colorWords = new Set(["COLOR", "FILL", "BACKGROUND", "HEADERCOLOR", "BORDER"])
const toneWords = new Set(["explain", "hook", "warning", "punchline", "recap"])
const referenceStatementWords = new Set(["ANIMATE", "ENTER", "EXIT", "DELETE", "LOOP"])
const referenceProperties = new Set(["ABOVE", "BELOW", "LEFTOF", "RIGHTOF", "CENTERON", "TARGET"])
const idlessInkModes = new Set(["ARROW", "UNDERLINE", "CIRCLE"])
const propertyWords = new Set<string>([...PROPERTY_KEYS, ...SHAPE_TYPES])
const statementBoundaries = new Set(
  STATEMENT_KEYWORDS.filter((keyword) => !propertyWords.has(keyword))
)
const colorHex = /^(?:#)?(?:[\da-f]{3}|[\da-f]{6})$/i
const numberValue = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
const emojiPattern = /\p{Extended_Pictographic}/u

function tokenizeLine(source: string): LineToken[] {
  const result: LineToken[] = []
  let i = 0
  while (i < source.length) {
    if (/\s/.test(source[i]!)) {
      i++
      continue
    }
    if (source.startsWith("//", i)) break
    if (source[i] === "#") {
      const match = source.slice(i).match(/^#[\da-f]{3}(?:[\da-f]{3})?(?![\da-f])/i)?.[0]
      if (!match) break
      result.push({ kind: "word", value: match, start: i, end: i + match.length })
      i += match.length
      continue
    }
    if (source[i] === '"') {
      const start = i++
      let value = ""
      let closed = false
      while (i < source.length) {
        if (source[i] === "\\" && i + 1 < source.length) {
          value += source.slice(i, i + 2)
          i += 2
        } else if (source[i] === '"') {
          i++
          closed = true
          break
        } else {
          const point = source.codePointAt(i)!
          const char = String.fromCodePoint(point)
          value += char
          i += char.length
        }
      }
      result.push({ kind: "string", value, start, end: i, closed })
      continue
    }
    if (source.startsWith("->", i)) {
      result.push({ kind: "arrow", value: "->", start: i, end: i + 2 })
      i += 2
      continue
    }
    const start = i
    while (
      i < source.length &&
      !/\s/.test(source[i]!) &&
      !source.startsWith("//", i) &&
      !source.startsWith("->", i)
    ) {
      if (source[i] === '"') break
      i++
    }
    if (i === start) i++
    result.push({ kind: "word", value: source.slice(start, i), start, end: i })
  }
  return result
}

function word(token: LineToken | undefined): string {
  return token?.kind === "word" ? token.value.toUpperCase() : ""
}

function indentOf(source: string): string {
  return source.slice(0, source.length - source.trimStart().length)
}

function isEndScene(tokens: LineToken[]): boolean {
  return word(tokens[0]) === "END" && word(tokens[1]) === "SCENE"
}

function isScene(tokens: LineToken[]): boolean {
  return word(tokens[0]) === "SCENE"
}

function isEmojiPoint(point: number, char: string): boolean {
  return (
    emojiPattern.test(char) ||
    (point >= 0x1f1e6 && point <= 0x1f1ff) ||
    (point >= 0x1f3fb && point <= 0x1f3ff) ||
    point === 0x200d ||
    point === 0x20e3 ||
    point === 0xfe0f
  )
}

function sanitizeLine(source: string): string {
  let output = ""
  let inString = false
  let i = 0
  while (i < source.length) {
    const char = source[i]!
    if (char === "\\" && inString && i + 1 < source.length) {
      output += source.slice(i, i + 2)
      i += 2
      continue
    }
    if (char === '"') {
      inString = !inString
      output += char
      i++
      continue
    }
    if (inString && char === "#") {
      i++
      continue
    }
    if (inString && source.startsWith("//", i)) {
      i += 2
      continue
    }
    const point = source.codePointAt(i)!
    const current = String.fromCodePoint(point)
    if (!isEmojiPoint(point, current)) output += current
    i += current.length
  }
  return output
}

function addFix(fixes: ScriptRepairFix[], line: number, description: string): void {
  fixes.push({ line, description })
}

function cleanInput(
  source: string,
  fixes: ScriptRepairFix[],
  preserveContent = false
): { lines: Line[]; trailingNewline: boolean } {
  const normalized = source.replace(/\r\n?/g, "\n")
  if (normalized !== source) addFix(fixes, 1, "Normalized line endings to LF.")
  const trailingNewline = normalized.endsWith("\n")
  let lines = normalized.split("\n").map((text, index) => {
    const expanded = text.replace(/\t/g, "  ")
    const trimmed = expanded.replace(/[ \t]+$/g, "")
    if (expanded !== text || trimmed !== expanded)
      addFix(fixes, index + 1, "Converted tabs to spaces and trimmed trailing whitespace.")
    const sanitized = preserveContent ? trimmed : sanitizeLine(trimmed)
    if (!preserveContent && sanitized !== trimmed)
      addFix(fixes, index + 1, "Removed emoji and comment markers inside strings.")
    return { text: sanitized, number: index + 1 }
  })

  const withoutFences = lines.filter((line) => {
    if (!line.text.trimStart().startsWith("```")) return true
    addFix(fixes, line.number, "Removed a Markdown code fence.")
    return false
  })
  lines = withoutFences

  const versionIndex = lines.findIndex((line) => word(tokenizeLine(line.text)[0]) === "VERSION")
  if (
    versionIndex > 0 &&
    lines.slice(0, versionIndex).some((line) => line.text.trim() && tokenizeLine(line.text).length > 0)
  ) {
    addFix(fixes, lines[0]?.number ?? 1, "Removed prose before VERSION.")
    lines = lines.slice(versionIndex)
  }

  let lastEndScene = -1
  for (let i = 0; i < lines.length; i++) {
    if (isEndScene(tokenizeLine(lines[i]!.text))) lastEndScene = i
  }
  if (lastEndScene >= 0) {
    let proseIndex = -1
    for (let i = lastEndScene + 1; i < lines.length; i++) {
      const tokens = tokenizeLine(lines[i]!.text)
      if (tokens.length && !knownWords.has(word(tokens[0]))) {
        proseIndex = i
        break
      }
    }
    if (proseIndex >= 0) {
      addFix(fixes, lines[proseIndex]!.number, "Removed prose after the last END SCENE.")
      lines = lines.slice(0, proseIndex)
    }
  }

  return { lines, trailingNewline }
}

function ensureRequiredStructure(lines: Line[], fixes: ScriptRepairFix[]): Line[] {
  const output = [...lines]
  let versionIndex = output.findIndex(
    (line) => word(tokenizeLine(line.text)[0]) === "VERSION"
  )
  if (versionIndex < 0) {
    output.unshift({ text: "VERSION 1.0", number: 1 })
    versionIndex = 0
    addFix(fixes, 1, "Inserted missing VERSION 1.0 header.")
  }

  let firstContent = versionIndex + 1
  while (firstContent < output.length && !output[firstContent]!.text.trim()) firstContent++
  if (word(tokenizeLine(output[firstContent]?.text ?? "")[0]) !== "CANVAS") {
    const existingCanvas = output.findIndex(
      (line, index) => index > versionIndex && word(tokenizeLine(line.text)[0]) === "CANVAS"
    )
    if (existingCanvas >= 0) {
      const [canvas] = output.splice(existingCanvas, 1)
      output.splice(versionIndex + 1, 0, canvas!)
      addFix(fixes, canvas!.number, "Moved CANVAS directly after VERSION.")
    } else {
      output.splice(versionIndex + 1, 0, { text: "CANVAS 1920 1080", number: output[versionIndex]!.number })
      addFix(fixes, output[versionIndex]!.number, "Inserted default CANVAS 1920 1080.")
    }
  }

  if (output.some((line) => isScene(tokenizeLine(line.text)))) return output

  let insertion = 0
  while (insertion < output.length) {
    const tokens = tokenizeLine(output[insertion]!.text)
    const first = word(tokens[0])
    if (!first || HEADER_KEYWORDS.includes(first as typeof HEADER_KEYWORDS[number])) {
      insertion++
      continue
    }
    if (first !== "DEFINE") break

    const stack: string[] = []
    let definitionEnd = insertion
    for (; definitionEnd < output.length; definitionEnd++) {
      const definitionTokens = tokenizeLine(output[definitionEnd]!.text)
      if (word(definitionTokens[0]) === "END" && word(definitionTokens[1]) !== "SCENE") {
        stack.pop()
        if (stack.length === 0) {
          definitionEnd++
          break
        }
      } else {
        const opener = openerName(definitionTokens)
        if (opener) stack.push(opener)
      }
    }
    insertion = definitionEnd
  }

  output.splice(insertion, 0, { text: 'SCENE 1 "Scene 1"', number: output[insertion]?.number ?? 1 })
  addFix(fixes, output[insertion]!.number, 'Inserted a SCENE wrapper for top-level content.')
  return output
}

function replaceTokens(line: Line, tokens: LineToken[], replacements: Map<number, string>): boolean {
  if (replacements.size === 0) return false
  for (const [index, replacement] of [...replacements.entries()].sort((a, b) => b[0] - a[0])) {
    const token = tokens[index]!
    line.text = line.text.slice(0, token.start) + replacement + line.text.slice(token.end)
  }
  return true
}

function normalizeColor(value: string): string | undefined {
  if (!colorHex.test(value)) return undefined
  const hasHash = value.startsWith("#")
  const digits = hasHash ? value.slice(1) : value
  const expanded = digits.length === 3 ? [...digits].map((char) => `${char}${char}`).join("") : digits
  const result = `#${expanded}`
  return result === value ? undefined : result
}

function fixMechanicalProperties(
  lines: Line[],
  fixes: ScriptRepairFix[],
  syntaxOnly = false
): Line[] {
  const output: Line[] = []
  for (const line of lines) {
    const tokens = tokenizeLine(line.text)
    if (!syntaxOnly && word(tokens[0]) === "TONE" && !toneWords.has(tokens[1]?.value.toLowerCase() ?? "")) {
      addFix(fixes, line.number, "Removed an unsupported SAY TONE line.")
      continue
    }

    const replacements = new Map<number, string>()
    let durationChanged = false
    let opacityChanged = false
    let colorChanged = false
    for (let i = 0; !syntaxOnly && i < tokens.length; i++) {
      const key = word(tokens[i])
      const value = tokens[i + 1]
      if (!value || value.kind !== "word") continue
      if (durationWords.has(key) && numberValue.test(value.value)) {
        replacements.set(i + 1, `${value.value}s`)
        durationChanged = true
      } else if (key === "OPACITY" && numberValue.test(value.value)) {
        const clamped = Math.min(1, Math.max(0, Number(value.value)))
        if (clamped !== Number(value.value)) {
          replacements.set(i + 1, String(clamped))
          opacityChanged = true
        }
      } else if (colorWords.has(key)) {
        const normalized = normalizeColor(value.value)
        if (normalized) {
          replacements.set(i + 1, normalized)
          colorChanged = true
        }
      }
    }
    if (replaceTokens(line, tokens, replacements)) {
      if (durationChanged) addFix(fixes, line.number, "Added missing seconds units to a duration.")
      if (opacityChanged) addFix(fixes, line.number, "Clamped OPACITY to the 0..1 range.")
      if (colorChanged) addFix(fixes, line.number, "Expanded a shorthand or unhashed color to #RRGGBB.")
    }

    let updatedTokens = tokenizeLine(line.text)
    const first = word(updatedTokens[0])
    const animateVerb = word(updatedTokens[2])
    if (
      first === "ANIMATE" &&
      ["MOVE", "SCALE", "ROTATE"].includes(animateVerb) &&
      updatedTokens.length > 3 &&
      !updatedTokens.some((token) => word(token) === "TO")
    ) {
      const target = updatedTokens[3]!
      line.text = `${line.text.slice(0, target.start)}TO ${line.text.slice(target.start)}`
      addFix(fixes, line.number, "Inserted missing TO after an ANIMATE verb.")
      updatedTokens = tokenizeLine(line.text)
    } else if (
      first === "INK" &&
      word(updatedTokens[1]) === "ARROW" &&
      word(updatedTokens[2]) === "FROM" &&
      updatedTokens.length === 7 &&
      updatedTokens.slice(3).every((token) => token.kind === "word" && numberValue.test(token.value)) &&
      !updatedTokens.some((token) => word(token) === "TO")
    ) {
      const target = updatedTokens[5]!
      line.text = `${line.text.slice(0, target.start)}TO ${line.text.slice(target.start)}`
      addFix(fixes, line.number, "Inserted missing TO between INK ARROW endpoints.")
      updatedTokens = tokenizeLine(line.text)
    }

    if (
      word(updatedTokens[0]) === "FROM" &&
      updatedTokens.length >= 6 &&
      word(updatedTokens[3]) === "TO"
    ) {
      const first = line.text.slice(0, updatedTokens[2]!.end)
      const second = `${indentOf(line.text)}${line.text.slice(updatedTokens[3]!.start)}`
      output.push({ ...line, text: first }, { ...line, text: second })
      addFix(fixes, line.number, "Split inline FROM/TO coordinates into separate lines.")
    } else output.push(line)
  }
  return output
}

function normalizeSceneHeadings(lines: Line[], fixes: ScriptRepairFix[]): Line[] {
  const output: Line[] = []
  let sceneIndex = 0
  let previousTitle: string | undefined
  let onlyBlankLinesSinceHeading = false
  for (const line of lines) {
    const tokens = tokenizeLine(line.text)
    if (!isScene(tokens)) {
      output.push(line)
      if (line.text.trim()) onlyBlankLinesSinceHeading = false
      continue
    }
    const title = tokens.find((token) => token.kind === "string")?.value
    if (onlyBlankLinesSinceHeading && title === previousTitle) {
      addFix(fixes, line.number, "Removed a consecutive duplicate SCENE heading.")
      continue
    }
    sceneIndex++
    const numberToken = tokens[1]
    const originalNumber = numberToken && numberToken.kind === "word" && /^\d+$/.test(numberToken.value)
      ? Number(numberToken.value)
      : undefined
    const titleToken = tokens.find((token) => token.kind === "string")
    const rawTitle = titleToken ? ` ${line.text.slice(titleToken.start).trim()}` : ""
    const normalized = `${indentOf(line.text)}SCENE ${sceneIndex}${rawTitle}`
    if (normalized !== line.text) {
      const description = originalNumber === undefined
        ? `Added scene number ${sceneIndex}.`
        : `Renumbered scene as SCENE ${sceneIndex}.`
      addFix(fixes, line.number, description)
      line.text = normalized
    }
    output.push(line)
    previousTitle = title
    onlyBlankLinesSinceHeading = true
  }
  return output
}

function removeLastSceneDirectives(lines: Line[], fixes: ScriptRepairFix[]): Line[] {
  let lastScene = -1
  for (let i = 0; i < lines.length; i++) {
    if (isScene(tokenizeLine(lines[i]!.text))) lastScene = i
  }
  if (lastScene < 0) return lines
  const output: Line[] = []
  let inLastScene = false
  for (const line of lines) {
    const tokens = tokenizeLine(line.text)
    if (isScene(tokens)) inLastScene = line === lines[lastScene]
    if (inLastScene && ["TRANSITION", "GAP"].includes(word(tokens[0]))) {
      addFix(fixes, line.number, `Removed ${word(tokens[0])} from the last scene.`)
      continue
    }
    output.push(line)
    if (isEndScene(tokens)) inLastScene = false
  }
  return output
}

function declarationRange(tokens: LineToken[]): [number, number] | undefined {
  const first = word(tokens[0])
  if (first === "DEFINE")
    return tokens[1]?.kind === "word" ? [1, 1] : undefined
  if (first === "TABLE" || ["BARCHART", "LINECHART", "PIECHART"].includes(first))
    return tokens[1]?.kind === "word" ? [1, tokens.length - 1] : undefined
  if (first === "CREATE") {
    const asIndex = tokens.findIndex((token) => word(token) === "AS")
    return asIndex > 1 ? [1, asIndex - 1] : undefined
  }
  if (first === "USE") {
    const asIndex = tokens.findIndex((token) => word(token) === "AS")
    const atIndex = tokens.findIndex((token) => word(token) === "AT")
    return asIndex > 0 && atIndex > asIndex + 1 ? [asIndex + 1, atIndex - 1] : undefined
  }
  if (first === "DUPLICATE") {
    const fromIndex = tokens.findIndex((token) => word(token) === "FROM")
    return fromIndex > 1 ? [1, fromIndex - 1] : undefined
  }
  if (first === "INK" && tokens[1] && !idlessInkModes.has(word(tokens[1])))
    return tokens[1].kind === "word" ? [1, tokens.length - 1] : undefined
  if ((SHAPE_TYPES as readonly string[]).includes(first) && tokens[1]?.kind === "word")
    return [1, 1]
  return undefined
}

function replaceReference(
  line: Line,
  tokens: LineToken[],
  tokenIndex: number,
  aliases: Map<string, string>
): { from: string; to: string } | undefined {
  if (!tokens[tokenIndex]) return undefined
  const start = tokens[tokenIndex]!.start
  let match: { end: number; value: string } | undefined
  for (let i = tokenIndex; i < tokens.length; i++) {
    const raw = line.text.slice(start, tokens[i]!.end)
    const target = aliases.get(raw)
    if (target) match = { end: tokens[i]!.end, value: target }
  }
  if (!match) return undefined
  const from = line.text.slice(start, match.end)
  if (from === match.value) return undefined
  line.text = line.text.slice(0, start) + match.value + line.text.slice(match.end)
  return { from, to: match.value }
}

function rewriteReferences(line: Line, tokens: LineToken[], aliases: Map<string, string>): Array<{ from: string; to: string }> {
  const first = word(tokens[0])
  let indices: number[] = []
  if (first === "ARROW") {
    const arrow = tokens.findIndex((token) => token.kind === "arrow")
    indices = [1, arrow + 1]
  } else if (referenceStatementWords.has(first)) indices = [1]
  else if (first === "CAMERA" && word(tokens[1]) === "FOLLOW") indices = [2]
  else if (first === "DUPLICATE") {
    const fromIndex = tokens.findIndex((token) => word(token) === "FROM")
    if (fromIndex >= 0) indices = [fromIndex + 1]
  } else if (first === "INK" && ["UNDERLINE", "CIRCLE"].includes(word(tokens[1]))) indices = [2]
  else if (referenceProperties.has(first)) indices = [1]

  const changes: Array<{ from: string; to: string }> = []
  for (const index of indices.sort((a, b) => b - a)) {
    const current = tokenizeLine(line.text)
    const change = replaceReference(line, current, index, aliases)
    if (change) changes.push(change)
  }
  return changes
}

function normalizeIds(lines: Line[], fixes: ScriptRepairFix[]): void {
  let usedIds = new Set<string>()
  let sceneAliases = new Map<string, string>()
  const macroAliases = new Map<string, string>()

  for (const line of lines) {
    let tokens = tokenizeLine(line.text)
    if (isScene(tokens)) {
      usedIds = new Set()
      sceneAliases = new Map()
      continue
    }
    if (word(tokens[0]) === "DEFINE") {
      const range: [number, number] | undefined = tokens[1]?.kind === "word" ? [1, 1] : undefined
      if (range) {
        const [startIndex, endIndex] = range
        const raw = line.text.slice(tokens[startIndex]!.start, tokens[endIndex]!.end)
        const normalized = raw.replace(/[\s-]+/g, "_")
        if (normalized !== raw) {
          line.text = line.text.slice(0, tokens[startIndex]!.start) + normalized + line.text.slice(tokens[endIndex]!.end)
          addFix(fixes, line.number, `Normalized macro id "${raw}" to "${normalized}".`)
          macroAliases.set(raw, normalized)
        }
      }
      continue
    }

    if (word(tokens[0]) === "USE" && tokens[1]) {
      const macroName = tokens[1]!.value
      const normalizedMacroName = macroAliases.get(macroName)
      if (normalizedMacroName) {
        line.text = line.text.slice(0, tokens[1]!.start) + normalizedMacroName + line.text.slice(tokens[1]!.end)
        addFix(fixes, line.number, `Updated macro reference "${macroName}" to "${normalizedMacroName}".`)
        tokens = tokenizeLine(line.text)
      }
    }

    for (const change of rewriteReferences(line, tokens, sceneAliases))
      addFix(fixes, line.number, `Updated reference "${change.from}" to "${change.to}".`)
    tokens = tokenizeLine(line.text)
    const range = declarationRange(tokens)
    if (!range) continue
    const [startIndex, endIndex] = range
    const startToken = tokens[startIndex]
    const endToken = tokens[endIndex]
    if (!startToken || !endToken || startToken.kind !== "word") continue
    const raw = line.text.slice(startToken.start, endToken.end)
    const base = raw.replace(/[\s-]+/g, "_")
    if (!base) continue

    let assigned = base
    if (usedIds.has(base)) {
      let suffix = 2
      while (usedIds.has(`${base}_${suffix}`)) suffix++
      assigned = `${base}_${suffix}`
      addFix(fixes, line.number, `Renamed duplicate id "${raw}" to "${assigned}".`)
    } else if (base !== raw) {
      addFix(fixes, line.number, `Normalized id "${raw}" to "${base}".`)
    }
    usedIds.add(assigned)
    sceneAliases.set(raw, assigned)
    sceneAliases.set(base, assigned)
    if (assigned !== raw) {
      line.text = line.text.slice(0, startToken.start) + assigned + line.text.slice(endToken.end)
    }
  }
}

function isTruncated(lines: Line[]): boolean {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    const tokens = tokenizeLine(line.text)
    if (tokens.length === 0) continue
    if (tokens.some((token) => token.kind === "string" && token.closed === false)) return true
    const first = word(tokens[0])
    const last = word(tokens[tokens.length - 1])
    const dangling = new Set([
      "AS", "TO", "FROM", "AT", "DURATION", "EASE", "POSITION", "SIZE", "WIDTH", "HEIGHT",
      "DRAW", "REVEAL", "OPACITY", "COLOR", "FILL", "TONE", "LANG", "WHO", "DETAIL", "COLUMNS",
      "ROW", "DATA", "PERIOD", "AMPLITUDE", "DIRECTION", "GAP", "WITH", "MASK", "CORNERS",
      "BORDER", "HEADERCOLOR", "HIGHLIGHT", "FIT", "ALIGN", "STROKE",
    ])
    if (dangling.has(last)) return true
    if (first === "CREATE" && (!tokens.some((token) => word(token) === "AS") || last === "AS")) return true
    if (first === "SAY" && tokens[1]?.kind !== "string") return true
    if (first === "ARROW" && (tokens.length < 4 || tokens.at(-2)?.kind !== "arrow" && !tokens.some((token) => token.kind === "arrow"))) return true
    if (first === "INK" && word(tokens[1]) === "ARROW" && last === "TO") return true
    if (first === "FROM" && tokens.length > 0 && tokens.some((token) => word(token) === "TO") && tokens.length < 6) return true
    if (first === "WAIT" && tokens.length < 2) return true
    if (first === "CAMERA" && tokens.length < 2) return true
    return false
  }
  return false
}

function closeBlock(block: OpenBlock, out: Line[], fixes: ScriptRepairFix[], line: number): void {
  out.push({ text: `${block.indent}END`, number: line })
  addFix(fixes, line, `Inserted END for unclosed ${block.name}.`)
}

function openerName(tokens: LineToken[]): string | undefined {
  const first = word(tokens[0])
  if (!blockWords.has(first)) return undefined
  if (first === "INK" && word(tokens[1]) === "ARROW") return "INK ARROW"
  return first
}

function balanceBlocks(
  lines: Line[],
  fixes: ScriptRepairFix[],
  truncated: boolean,
  resetCamera = true
): Line[] {
  const output: Line[] = []
  const blocks: OpenBlock[] = []
  let scene: OpenScene | undefined
  const trailing: Line[] = []
  const content = [...lines]
  while (content.length && !content.at(-1)!.text.trim()) trailing.unshift(content.pop()!)

  const closeScene = (line: number, explicitEnd?: Line) => {
    if (!scene) return
    while (blocks.length > scene.depth) closeBlock(blocks.pop()!, output, fixes, line)
    if (resetCamera && scene.cameraChanged) {
      output.push({ text: `${scene.indent}  CAMERA RESET`, number: line })
      addFix(fixes, line, "Inserted CAMERA RESET before the scene ended.")
    }
    if (explicitEnd) output.push(explicitEnd)
    else {
      output.push({ text: `${scene.indent}END SCENE`, number: line })
      addFix(fixes, line, "Inserted missing END SCENE.")
    }
    scene = undefined
  }

  for (const line of content) {
    const tokens = tokenizeLine(line.text)
    const first = word(tokens[0])
    if (isScene(tokens)) {
      if (scene) closeScene(line.number)
      while (blocks.length) closeBlock(blocks.pop()!, output, fixes, line.number)
      output.push(line)
      scene = { indent: indentOf(line.text), depth: blocks.length, cameraChanged: false }
      continue
    }
    if (isEndScene(tokens)) {
      if (scene) closeScene(line.number, line)
      else addFix(fixes, line.number, "Removed END SCENE with no open scene.")
      continue
    }
    if (first === "END" && tokens.length === 1) {
      const floor = scene?.depth ?? 0
      if (blocks.length > floor) {
        blocks.pop()
        output.push(line)
      } else addFix(fixes, line.number, "Removed END with no open block.")
      continue
    }

    const opener = openerName(tokens)
    const isStatementBoundary = statementBoundaries.has(first)
    while (
      ["CREATE", "INK ARROW", "TABLE", "BARCHART", "LINECHART", "PIECHART"].includes(blocks.at(-1)?.name ?? "") &&
      (opener !== undefined || isStatementBoundary)
    ) {
      closeBlock(blocks.pop()!, output, fixes, line.number)
    }

    output.push(line)
    if (opener) blocks.push({ name: opener, indent: indentOf(line.text) })
    if (scene && first === "CAMERA") {
      const verb = word(tokens[1])
      if (verb === "ZOOM" || verb === "PAN") scene.cameraChanged = true
      else if (verb === "RESET") scene.cameraChanged = false
    }
  }

  const eofLine = lines.at(-1)?.number ?? 1
  if (!truncated) {
    if (scene) closeScene(eofLine)
    while (blocks.length) closeBlock(blocks.pop()!, output, fixes, eofLine)
  }
  output.push(...trailing)
  return output
}

function unfixableDiagnostics(script: string): string[] {
  const diagnostics = runScript(script).diagnostics
  return diagnostics
    .filter((diagnostic) =>
      diagnostic.severity === "error" &&
      (diagnostic.code === "E_UNKNOWN_REF" || diagnostic.code === "E_MISSING_REQUIRED_PROP")
    )
    .map((diagnostic) => `line ${diagnostic.line}: ${diagnostic.code} ${diagnostic.message}`)
}

export function repair(source: string): ScriptRepairResult {
  const fixes: ScriptRepairFix[] = []
  const { lines: cleaned, trailingNewline } = cleanInput(source, fixes)
  const structured = ensureRequiredStructure(cleaned, fixes)
  const mechanical = fixMechanicalProperties(structured, fixes)
  const headings = normalizeSceneHeadings(mechanical, fixes)
  const directives = removeLastSceneDirectives(headings, fixes)
  normalizeIds(directives, fixes)
  const truncated = isTruncated(directives)
  const balanced = balanceBlocks(directives, fixes, truncated)
  let script = balanced.map((line) => line.text).join("\n")
  if (trailingNewline && script && !script.endsWith("\n")) script += "\n"
  const unfixable = truncated ? [] : unfixableDiagnostics(script)
  return { script, fixes, unfixable, truncated }
}

export function repairSyntax(source: string): ScriptRepairResult {
  const fixes: ScriptRepairFix[] = []
  const { lines: cleaned, trailingNewline } = cleanInput(source, fixes, true)
  const syntaxFixed = fixMechanicalProperties(cleaned, fixes, true)
  const truncated = isTruncated(syntaxFixed)
  const balanced = balanceBlocks(syntaxFixed, fixes, truncated, false)
  let script = balanced.map((line) => line.text).join("\n")
  if (trailingNewline && script && !script.endsWith("\n")) script += "\n"
  const unfixable = truncated ? [] : unfixableDiagnostics(script)
  return { script, fixes, unfixable, truncated }
}

export async function repairWithAiRetries(
  aiOutput: string,
  callAi: (request: AiRepairRequest) => Promise<string>,
  maxRetries = 2
): Promise<ScriptRepairLoopResult> {
  let result = repair(aiOutput)
  let diagnostics = result.truncated ? [] : runScript(result.script).diagnostics
  let retries = 0
  const retryLimit = Math.min(2, Math.max(0, Math.floor(maxRetries)))
  while (!result.truncated && retries < retryLimit) {
    const firstError = diagnostics.find((diagnostic) => diagnostic.severity === "error")
    if (!firstError) break
    const output = await callAi({ error: firstError, script: result.script })
    retries++
    const next = repair(output)
    result = { ...next, fixes: [...result.fixes, ...next.fixes] }
    diagnostics = result.truncated ? [] : runScript(result.script).diagnostics
  }
  return { ...result, diagnostics, retries }
}
