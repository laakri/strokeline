import { error, type Diagnostic } from "@/dsl/diagnostics.ts"
import { lex, type Token } from "@/dsl/lexer.ts"
import {
  ANIMATION_PROPERTY_KEYS,
  SHAPE_TYPES,
  STATEMENT_KEYWORDS,
} from "@/dsl/grammar.ts"

export type ASTValue = string | number
export interface ASTProperty {
  key: string
  values: ASTValue[]
  token: Token
}

export interface ASTCreate {
  kind: "create"
  id: string
  type: string
  props: ASTProperty[]
  token: Token
}
export interface ASTShape {
  kind: "shape"
  id?: string
  type: string
  props: ASTProperty[]
  token: Token
}
export interface ASTArrow {
  kind: "arrow"
  from: string
  to: string
  props: ASTProperty[]
  token: Token
}
export interface ASTAnimate {
  kind: "animate"
  targetId: string
  verb: string
  values: ASTValue[]
  duration?: ASTValue
  ease?: string
  at?: ASTValue
  color?: ASTValue
  arc?: number
  token: Token
}
export interface ASTEffect {
  kind: "effect"
  targetId: string
  phase: "enter" | "exit"
  effect: string
  duration?: ASTValue
  token: Token
}
export interface ASTDuplicate {
  kind: "duplicate"
  id: string
  sourceId: string
  props: ASTProperty[]
  token: Token
}
export interface ASTDelete {
  kind: "delete"
  targetId: string
  props: ASTProperty[]
  token: Token
}
export interface ASTInk {
  kind: "ink"
  id?: string
  mode: "raw" | "arrow" | "underline" | "circle"
  from?: { x: number; y: number }
  to?: { x: number; y: number }
  targetId?: string
  props: ASTProperty[]
  token: Token
}
export interface ASTCamera {
  kind: "camera"
  verb: string
  props: ASTProperty[]
  token: Token
}
export interface ASTWait {
  kind: "wait"
  duration: ASTValue
  token: Token
}
export interface ASTSay {
  kind: "say"
  text: string
  duration?: ASTValue
  who?: string
  tone?: string
  lang?: string
  detail?: string
  token: Token
}
export interface ASTLoop {
  kind: "loop"
  targetId: string
  effect: string
  amplitude: number
  period: ASTValue
  token: Token
}
export interface ASTUse {
  kind: "use"
  name: string
  id: string
  at: { x: number; y: number }
  args: Record<string, ASTValue>
  token: Token
}
export interface ASTChart {
  kind: "chart"
  chartType: "barchart" | "linechart" | "piechart"
  id: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  rows: Array<{ label: string; value: number }>
  token: Token
}
export interface ASTTable {
  kind: "table"
  id: string
  props: ASTProperty[]
  token: Token
}
export interface ASTBlock {
  kind: "parallel" | "group" | "stack" | "grid"
  id?: string
  statements: ASTStatement[]
  token: Token
  closed: boolean
  direction?: "vertical" | "horizontal"
  columns?: number
  gap?: number
  at?: { x: number; y: number }
  stagger?: ASTValue
}
export type ASTStatement =
  | ASTCreate
  | ASTShape
  | ASTArrow
  | ASTAnimate
  | ASTEffect
  | ASTCamera
  | ASTWait
  | ASTSay
  | ASTLoop
  | ASTUse
  | ASTChart
  | ASTTable
  | ASTBlock
  | ASTDuplicate
  | ASTDelete
  | ASTInk

export interface ASTScene {
  id: string
  index: number
  label?: string
  transition?: {
    type: "fade" | "wipe" | "slide" | "erase" | "none"
    duration: ASTValue
    token: Token
  }
  gapAfter?: { duration: ASTValue; token: Token }
  statements: ASTStatement[]
  token: Token
  closed: boolean
}

export interface ASTScript {
  version: string
  canvas: { width: number; height: number }
  background?: string
  style?: string
  font?: string
  stroke?: number
  board?: string
  theme?: string
  hand?: boolean
  subtitles?: boolean
  macros: ASTMacro[]
  scenes: ASTScene[]
}
export interface ASTMacro {
  name: string
  params: string[]
  statements: ASTStatement[]
  token: Token
}

export interface ParseResult {
  ast: ASTScript
  diagnostics: Diagnostic[]
}

export function parseScript(source: string): ParseResult {
  return new Parser(lex(source)).parse()
}

class Parser {
  private position = 0
  private readonly diagnostics: Diagnostic[] = []
  private readonly tokens: Token[]

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): ParseResult {
    const header = this.parseHeader()
    const macros: ASTMacro[] = []
    while (this.word() === "DEFINE") macros.push(this.parseDefinition())
    const scenes: ASTScene[] = []
    while (!this.atEnd()) {
      const start = this.position
      this.skipNewlines()
      if (this.atEnd()) break
      if (this.word() === "DEFINE") macros.push(this.parseDefinition())
      else if (this.word() === "SCENE") scenes.push(this.parseScene())
      else {
        this.report(
          this.word() === "SAY" ? "E_SAY_OUTSIDE_SCENE" : "E_EXPECTED_SCENE",
          this.word() === "SAY" ? "SAY is only valid inside a SCENE." : "Expected SCENE at the top level.",
          this.peek()
        )
        this.recover()
      }
      this.ensureProgress(start)
    }
    if (scenes.length === 0)
      this.report(
        "E_MISSING_SCENE",
        "The script must contain at least one SCENE.",
        this.peek()
      )
    return { ast: { ...header, macros, scenes }, diagnostics: this.diagnostics }
  }

  private parseHeader(): Omit<ASTScript, "scenes" | "macros"> {
    this.skipNewlines()
    let version = ""
    let canvas = { width: 1920, height: 1080 }
    let background: string | undefined
    let style: string | undefined
    let font: string | undefined
    let stroke: number | undefined
    let board: string | undefined
    let theme: string | undefined
    let hand: boolean | undefined
    let subtitles: boolean | undefined
    if (this.word() === "VERSION") {
      this.take()
      version = this.readValue()?.toString() ?? ""
      if (version !== "1" && version !== "1.0")
        this.report(
          "E_BAD_VERSION",
          `Unsupported VERSION "${version}".`,
          this.previous()
        )
      this.endLine()
    } else
      this.report(
        "E_MISSING_HEADER",
        "The script must start with VERSION 1.0.",
        this.peek()
      )
    if (this.word() === "CANVAS") {
      const token = this.take()
      const width = this.readNumber("E_BAD_CANVAS", token)
      const height = this.readNumber("E_BAD_CANVAS", token)
      if (width !== undefined && height !== undefined)
        canvas = { width, height }
      this.endLine()
    } else
      this.report(
        "E_MISSING_HEADER",
        "The script must define CANVAS width height.",
        this.peek()
      )
    while (!this.atEnd() && this.word() !== "SCENE" && this.word() !== "DEFINE") {
      const start = this.position
      const key = this.word()
      if (key === "BACKGROUND") {
        this.take()
        background = this.readValue()?.toString()
        this.endLine()
      } else if (key === "STYLE") {
        this.take()
        style = this.readValue()?.toString()
        this.endLine()
      } else if (key === "FONT") {
        this.take()
        font = this.readValue()?.toString()
        this.endLine()
      } else if (key === "STROKE") {
        const token = this.take()
        stroke = this.readNumber("E_BAD_RANGE", token)
        this.endLine()
      } else if (key === "BOARD" || key === "THEME") {
        this.take()
        const value = this.readValue()?.toString()
        if (key === "BOARD") board = value
        else theme = value
        this.endLine()
      } else if (key === "HAND") {
        this.take()
        hand = this.readValue()?.toString().toLowerCase() !== "off"
        this.endLine()
      } else if (key === "SUBTITLES") {
        const token = this.take()
        const value = this.readValue()?.toString().toLowerCase()
        if (value === "on" || value === "off") subtitles = value === "on"
        else this.report("E_BAD_SUBTITLES", "SUBTITLES must be on or off.", token)
        this.endLine()
      } else if (key === "SAY") {
        const token = this.take()
        this.report("E_SAY_OUTSIDE_SCENE", "SAY is only valid inside a SCENE.", token)
        this.endLine()
      } else {
        this.skipNewlines()
        if (this.word() === "SCENE") break
        this.report(
          "E_UNEXPECTED_TOKEN",
          `Unexpected header token "${this.peek().value}".`,
          this.peek()
        )
        this.recover()
      }
      this.skipNewlines()
      this.ensureProgress(start)
    }
    return { version, canvas, background, style, font, stroke, board, theme, hand, subtitles }
  }

  private parseScene(): ASTScene {
    const token = this.take()
    const index = this.readNumber("E_BAD_SCENE", token) ?? 0
    const label =
      this.peek().kind === "string" ? String(this.take().value) : undefined
    this.endLine()
    const statements = this.parseStatements(["END", "TRANSITION", "GAP"])
    let transition: ASTScene["transition"]
    if (this.word() === "TRANSITION") {
      const transitionToken = this.take()
      const type = this.takeValue(
        "E_BAD_TRANSITION",
        transitionToken
      ).toLowerCase()
      if (!["fade", "wipe", "slide", "erase", "none"].includes(type)) {
        this.report(
          "E_BAD_TRANSITION",
          `Unknown transition "${type}". Use fade, wipe, slide, erase, or none.`,
          transitionToken
        )
      }
      this.expect("DURATION", transitionToken)
      const duration = this.readValue() ?? ""
      this.endLine()
      transition = {
        type: ["fade", "wipe", "slide", "erase"].includes(type) ? type as "fade" | "wipe" | "slide" | "erase" : "none",
        duration,
        token: transitionToken,
      }
    }
    let gapAfter: ASTScene["gapAfter"]
    if (this.word() === "GAP") {
      const gapToken = this.take()
      this.expect("DURATION", gapToken)
      gapAfter = { duration: this.readValue() ?? "", token: gapToken }
      this.endLine()
    }
    let closed = false
    if (this.word() === "END") {
      this.take()
      if (this.word() === "SCENE") this.take()
      else this.report("E_UNEXPECTED_TOKEN", "Expected END SCENE.", this.peek())
      this.endLine()
      closed = true
    } else this.report("E_UNCLOSED_BLOCK", "Scene is missing END SCENE.", token)
    return {
      id: String(index),
      index,
      label,
      statements,
      gapAfter,
      token,
      transition,
      closed,
    }
  }

  private parseStatements(stopWords: string[]): ASTStatement[] {
    const statements: ASTStatement[] = []
    while (!this.atEnd()) {
      this.skipNewlines()
      const word = this.word()
      if (stopWords.includes(word) || word === "SCENE") break
      const start = this.position
      const statement = this.parseStatement()
      if (statement) statements.push(statement)
      if (this.position === start) {
        this.recover()
        this.ensureProgress(start)
      }
    }
    return statements
  }

  private parseStatement(): ASTStatement | undefined {
    const word = this.word()
    if (word === "CREATE") return this.parseCreate()
    if ((SHAPE_TYPES as readonly string[]).includes(word))
      return this.parseShape()
    if (word === "ARROW") return this.parseArrow()
    if (word === "ANIMATE") return this.parseAnimate()
    if (word === "ENTER" || word === "EXIT") return this.parseEffect()
    if (word === "CAMERA") return this.parseCamera()
    if (word === "WAIT") return this.parseWait()
    if (word === "SAY") return this.parseSay()
    if (word === "LOOP") return this.parseLoop()
    if (word === "USE") return this.parseUse()
    if (word === "TABLE") return this.parseTable()
    if (["BARCHART", "LINECHART", "PIECHART"].includes(word)) return this.parseChart()
    if (word === "DUPLICATE") return this.parseDuplicate()
    if (word === "DELETE") return this.parseDelete()
    if (word === "INK") return this.parseInk()
    if (word === "PARALLEL" || word === "GROUP")
      return this.parseBlock(word.toLowerCase() as "parallel" | "group")
    if (word === "STACK" || word === "GRID")
      return this.parseLayoutBlock(word.toLowerCase() as "stack" | "grid")
    this.report(
      "E_UNKNOWN_STATEMENT",
      `Unknown statement "${this.peek().value}".`,
      this.peek()
    )
    return undefined
  }

  private parseCreate(): ASTCreate {
    const token = this.take()
    const id = this.readIdent("E_EXPECTED_ID", token)
    this.expect("AS", token)
    const type = this.takeValue("E_EXPECTED_TYPE", token)
    this.endLine()
    const props = this.parseProperties(["END"])
    if (this.word() === "END") {
      this.take()
      this.endLine()
    } else
      this.report("E_UNCLOSED_BLOCK", `CREATE ${id} is missing END.`, token)
    return { kind: "create", id, type, props, token }
  }

  private parseShape(): ASTShape {
    const token = this.take()
    const id =
      this.peek().line === token.line && this.peek().kind === "ident"
        ? this.take().value
        : undefined
    this.endLine()
    return {
      kind: "shape",
      id,
      type: token.value,
      props: this.parseProperties([]),
      token,
    }
  }

  private parseArrow(): ASTArrow {
    const token = this.take()
    const from = this.readIdent("E_EXPECTED_ID", token)
    if (this.peek().kind === "arrow") this.take()
    else
      this.report(
        "E_EXPECTED_ARROW",
        "Expected -> between arrow endpoints.",
        this.peek()
      )
    const to = this.readIdent("E_EXPECTED_ID", token)
    this.endLine()
    return { kind: "arrow", from, to, props: this.parseProperties([]), token }
  }

  private parseAnimate(): ASTAnimate {
    const token = this.take()
    const targetId = this.readIdent("E_EXPECTED_ID", token)
    const verb = this.takeValue("E_EXPECTED_ANIMATION", token)
    if (verb === "MOVE" || verb === "SCALE" || verb === "ROTATE" || verb === "OPACITY" || verb === "COLOR")
      this.expect("TO", token)
    const values: ASTValue[] = []
    let duration: ASTValue | undefined
    let ease: string | undefined
    let at: ASTValue | undefined
    let color: ASTValue | undefined
    let arc: number | undefined
    while (!this.atEnd() && this.peek().kind !== "newline") {
      if (this.word() === "DURATION") {
        this.take()
        duration = this.readValue()
        continue
      }
      if (this.word() === "EASE") {
        this.take()
        ease = this.readValue()?.toString()
        continue
      }
      if (this.word() === "AT") {
        this.take()
        at = this.readValue()
        continue
      }
      if (this.word() === "COLOR") {
        this.take()
        color = this.readValue()
        continue
      }
      if (this.word() === "ARC") {
        this.take()
        const value = this.readValue()
        arc = typeof value === "number" ? value : Number(value)
        continue
      }
      const value = this.readValue()
      if (value !== undefined) values.push(value)
      else this.take()
    }
    this.endLine()
    while (!this.atEnd()) {
      this.skipNewlines()
      if (!(ANIMATION_PROPERTY_KEYS as readonly string[]).includes(this.word()))
        break
      const property = this.take()
      const value = this.readValue()
      this.endLine()
      if (property.value.toUpperCase() === "DURATION") duration = value
      else if (property.value.toUpperCase() === "EASE") ease = value?.toString()
      else if (property.value.toUpperCase() === "COLOR") color = value
      else at = value
    }
    return {
      kind: "animate",
      targetId,
      verb,
      values,
      duration,
      ease,
      at,
      color,
      arc,
      token,
    }
  }

  private parseEffect(): ASTEffect {
    const token = this.take()
    const targetId = this.readIdent("E_EXPECTED_ID", token)
    const effect = this.takeValue("E_EXPECTED_ANIMATION", token).toLowerCase()
    let duration: ASTValue | undefined
    while (!this.atEnd() && this.peek().kind !== "newline") {
      if (this.word() === "DURATION") {
        this.take()
        duration = this.readValue()
      } else this.take()
    }
    this.endLine()
    return { kind: "effect", targetId, phase: token.value.toLowerCase() as "enter" | "exit", effect, duration, token }
  }

  private parseCamera(): ASTCamera {
    const token = this.take()
    const verb = this.takeValue("E_EXPECTED_CAMERA", token)
    const props: ASTProperty[] = []
    if (verb.toUpperCase() === "FOLLOW" && this.peek().kind !== "newline") {
      const target = this.take()
      props.push({ key: "TARGET", values: [target.value], token: target })
    }
    this.endLine()
    return { kind: "camera", verb, props: [...props, ...this.parseProperties([])], token }
  }

  private parseWait(): ASTWait {
    const token = this.take()
    const duration = this.readValue() ?? "0x"
    this.endLine()
    return { kind: "wait", duration, token }
  }

  private parseSay(): ASTSay {
    const token = this.take()
    const textToken = this.peek()
    const text = textToken.kind === "string" ? String(this.take().value) : ""
    if (textToken.kind !== "string")
      this.report("E_EXPECTED_STRING", "SAY needs quoted text.", token)
    this.endLine()
    const props = this.parseProperties([])
    const value = (key: string) => props.find((item) => item.key === key)?.values[0]
    return {
      kind: "say",
      text,
      duration: value("DURATION"),
      who: value("WHO")?.toString(),
      tone: value("TONE")?.toString().toLowerCase(),
      lang: value("LANG")?.toString(),
      detail: value("DETAIL")?.toString(),
      token,
    }
  }

  private parseLoop(): ASTLoop {
    const token = this.take()
    const targetId = this.readIdent("E_EXPECTED_ID", token)
    const effect = this.takeValue("E_EXPECTED_ANIMATION", token).toLowerCase()
    let amplitude = 8
    let period: ASTValue = "2s"
    while (!this.atEnd() && this.peek().kind !== "newline") {
      if (this.word() === "AMPLITUDE") {
        this.take()
        amplitude = this.readNumber("E_BAD_RANGE", token) ?? amplitude
      } else if (this.word() === "PERIOD") {
        this.take()
        period = this.readValue() ?? period
      } else this.take()
    }
    this.endLine()
    return { kind: "loop", targetId, effect, amplitude, period, token }
  }

  private parseDefinition(): ASTMacro {
    const token = this.take()
    const name = this.readIdent("E_EXPECTED_ID", token)
    const params: string[] = []
    if (this.word() === "PARAMS") {
      this.take()
      while (!this.atEnd() && this.peek().kind !== "newline") params.push(this.take().value)
    }
    this.endLine()
    const statements = this.parseStatements(["END"])
    if (this.word() === "END") { this.take(); this.endLine() }
    else this.report("E_UNCLOSED_BLOCK", `DEFINE ${name} is missing END.`, token)
    return { name, params, statements, token }
  }

  private parseUse(): ASTUse {
    const token = this.take()
    const name = this.readIdent("E_EXPECTED_ID", token)
    this.expect("AS", token)
    const id = this.readIdent("E_EXPECTED_ID", token)
    this.expect("AT", token)
    const x = this.readNumber("E_BAD_RANGE", token) ?? 0
    const y = this.readNumber("E_BAD_RANGE", token) ?? 0
    const args: Record<string, ASTValue> = {}
    if (this.word() === "WITH") {
      this.take()
      while (!this.atEnd() && this.peek().kind !== "newline") {
        const key = this.take().value
        const value = this.readValue()
        if (value !== undefined) args[key] = value
      }
    }
    this.endLine()
    return { kind: "use", name, id, at: { x, y }, args, token }
  }

  private parseChart(): ASTChart {
    const token = this.take()
    const chartType = token.value.toLowerCase() as ASTChart["chartType"]
    const id = this.readIdent("E_EXPECTED_ID", token)
    let position = { x: 960, y: 540 }
    let size = { width: 800, height: 500 }
    const rows: ASTChart["rows"] = []
    this.endLine()
    while (!this.atEnd()) {
      this.skipNewlines()
      if (this.atEnd() || this.word() === "END") break
      const key = this.word()
      const rowToken = this.take()
      if (key === "POSITION") position = { x: this.readNumber("E_BAD_RANGE", rowToken) ?? 960, y: this.readNumber("E_BAD_RANGE", rowToken) ?? 540 }
      else if (key === "SIZE") size = { width: this.readNumber("E_BAD_RANGE", rowToken) ?? 800, height: this.readNumber("E_BAD_RANGE", rowToken) ?? 500 }
      else if (key === "DATA") {
        const label = String(this.readValue() ?? "")
        const value = this.readNumber("E_BAD_RANGE", rowToken)
        if (value !== undefined) rows.push({ label, value })
      } else this.report("E_UNKNOWN_PROP", `Unknown chart property "${rowToken.value}".`, rowToken)
      this.endLine()
    }
    if (this.word() === "END") { this.take(); this.endLine() }
    else this.report("E_UNCLOSED_BLOCK", `${chartType.toUpperCase()} ${id} is missing END.`, token)
    return { kind: "chart", chartType, id, position, size, rows, token }
  }

  private parseTable(): ASTTable {
    const token = this.take()
    const id = this.readIdent("E_EXPECTED_ID", token)
    this.endLine()
    const props = this.parseProperties(["END"])
    if (this.word() === "END") {
      this.take()
      this.endLine()
    } else this.report("E_UNCLOSED_BLOCK", `TABLE ${id} is missing END.`, token)
    return { kind: "table", id, props, token }
  }

  private parseDuplicate(): ASTDuplicate {
    const token = this.take()
    const id = this.readIdent("E_EXPECTED_ID", token)
    this.expect("FROM", token)
    const sourceId = this.readIdent("E_EXPECTED_ID", token)
    this.endLine()
    return {
      kind: "duplicate",
      id,
      sourceId,
      props: this.parseProperties([]),
      token,
    }
  }

  private parseDelete(): ASTDelete {
    const token = this.take()
    const targetId = this.readIdent("E_EXPECTED_ID", token)
    this.endLine()
    return { kind: "delete", targetId, props: this.parseProperties([]), token }
  }

  private parseInk(): ASTInk {
    const token = this.take()
    const mode = this.word()
    if (mode === "ARROW") {
      this.take()
      this.expect("FROM", token)
      const from = {
        x: this.readNumber("E_EXPECTED_NUMBER", token) ?? 0,
        y: this.readNumber("E_EXPECTED_NUMBER", token) ?? 0,
      }
      this.expect("TO", token)
      const to = {
        x: this.readNumber("E_EXPECTED_NUMBER", token) ?? 0,
        y: this.readNumber("E_EXPECTED_NUMBER", token) ?? 0,
      }
      this.endLine()
      const props = this.parseProperties(["END"])
      this.parseInkEnd(token, "INK ARROW")
      return { kind: "ink", mode: "arrow", from, to, props, token }
    }
    if (mode === "UNDERLINE") {
      this.take()
      const targetId = this.readIdent("E_EXPECTED_ID", token)
      this.endLine()
      const props = this.parseProperties(["END"])
      this.parseInkEndOptional()
      return { kind: "ink", mode: "underline", targetId, props, token }
    }
    if (mode === "CIRCLE") {
      this.take()
      const targetId = this.readIdent("E_EXPECTED_ID", token)
      this.endLine()
      const props = this.parseProperties(["END"])
      this.parseInkEndOptional()
      return { kind: "ink", mode: "circle", targetId, props, token }
    }
    const id = this.readIdent("E_EXPECTED_ID", token)
    this.endLine()
    const props = this.parseProperties(["END"])
    this.parseInkEnd(token, "INK")
    return { kind: "ink", mode: "raw", id, props, token }
  }

  private parseInkEnd(token: Token, label: string): void {
    if (this.word() === "END") {
      this.take()
      this.endLine()
    } else this.report("E_UNCLOSED_BLOCK", `${label} is missing END.`, token)
  }

  private parseInkEndOptional(): void {
    if (this.word() === "END") {
      this.take()
      this.endLine()
    }
  }

  private parseBlock(kind: "parallel" | "group"): ASTBlock {
    const token = this.take()
    const id =
      kind === "group" && this.peek().kind === "ident"
        ? this.take().value
        : undefined
    let stagger: ASTValue | undefined
    if (kind === "parallel" && this.word() === "STAGGER") {
      this.take()
      stagger = this.readValue()
    }
    this.endLine()
    const statements = this.parseStatements(["END"])
    let closed = false
    if (this.word() === "END") {
      this.take()
      this.endLine()
      closed = true
    } else
      this.report(
        "E_UNCLOSED_BLOCK",
        `${kind.toUpperCase()} is missing END.`,
        token
      )
    return { kind, id, statements, token, closed, stagger }
  }

  private parseLayoutBlock(kind: "stack" | "grid"): ASTBlock {
    const token = this.take()
    const id =
      kind === "stack"
        ? this.readIdent("E_EXPECTED_ID", token)
        : !this.atEnd() &&
            this.peek().kind !== "newline" &&
            !["COLUMNS", "DIRECTION", "GAP", "AT"].includes(this.word())
          ? this.take().value
          : undefined
    let direction: ASTBlock["direction"]
    let columns: number | undefined
    let gap: number | undefined
    let at: { x: number; y: number } | undefined
    const parseOption = (): boolean => {
      const keyToken = this.peek()
      const key = this.word()
      if (!("DIRECTION COLUMNS GAP AT".split(" ").includes(key))) return false
      this.take()
      if (key === "DIRECTION") {
        const value = this.takeValue("E_BAD_RANGE", keyToken).toLowerCase()
        if (value === "vertical" || value === "horizontal") direction = value
        else
          this.report(
            "E_BAD_RANGE",
            "DIRECTION must be vertical or horizontal.",
            keyToken
          )
      } else if (key === "COLUMNS") {
        columns = this.readNumber("E_BAD_RANGE", keyToken)
      } else if (key === "GAP") {
        gap = this.readNumber("E_BAD_RANGE", keyToken)
      } else if (key === "AT") {
        const x = this.readNumber("E_BAD_RANGE", keyToken)
        const y = this.readNumber("E_BAD_RANGE", keyToken)
        if (x !== undefined && y !== undefined) at = { x, y }
      }
      return true
    }
    while (!this.atEnd() && this.peek().kind !== "newline") {
      if (parseOption()) continue
      const keyToken = this.take()
      this.report("E_UNKNOWN_PROP", `Unknown ${kind.toUpperCase()} option "${keyToken.value}".`, keyToken)
      break
    }
    this.endLine()
    while (!this.atEnd()) {
      this.skipNewlines()
      if (!("DIRECTION COLUMNS GAP AT".split(" ").includes(this.word()))) break
      while (!this.atEnd() && this.peek().kind !== "newline") {
        if (parseOption()) continue
        const keyToken = this.take()
        this.report("E_UNKNOWN_PROP", `Unknown ${kind.toUpperCase()} option "${keyToken.value}".`, keyToken)
        break
      }
      this.endLine()
    }
    if (kind === "stack" && direction === undefined)
      this.report(
        "E_MISSING_REQUIRED_PROP",
        "STACK needs DIRECTION vertical or horizontal.",
        token
      )
    if (kind === "grid" && (columns === undefined || columns <= 0))
      this.report(
        "E_MISSING_REQUIRED_PROP",
        "GRID needs positive COLUMNS n.",
        token
      )
    if (gap === undefined)
      this.report(
        "E_MISSING_REQUIRED_PROP",
        `${kind.toUpperCase()} needs GAP n.`,
        token
      )
    const statements = this.parseStatements(["END"])
    let closed = false
    if (this.word() === "END") {
      this.take()
      this.endLine()
      closed = true
    } else {
      this.report(
        "E_UNCLOSED_BLOCK",
        `${kind.toUpperCase()} is missing END.`,
        token
      )
    }
    return {
      kind,
      id,
      statements,
      token,
      closed,
      direction,
      columns,
      gap,
      at,
    }
  }

  private parseProperties(stopWords: string[]): ASTProperty[] {
    const props: ASTProperty[] = []
    while (!this.atEnd()) {
      this.skipNewlines()
      if (stopWords.includes(this.word()) || this.isStatementBoundary()) break
      const token = this.take()
      const values: ASTValue[] = []
      while (!this.atEnd() && this.peek().kind !== "newline") {
        const value = this.readValue()
        if (value !== undefined) values.push(value)
        else this.take()
      }
      props.push({ key: token.value.toUpperCase(), values, token })
      this.endLine()
    }
    return props
  }

  private readValue(): ASTValue | undefined {
    const token = this.peek()
    if (token.kind === "number") {
      this.take()
      const value = Number(token.value)
      return Number.isNaN(value) ? token.value : value
    }
    if (
      token.kind === "duration" ||
      token.kind === "string" ||
      token.kind === "color" ||
      token.kind === "ident" ||
      token.kind === "keyword"
    ) {
      this.take()
      return token.value
    }
    return undefined
  }

  private readNumber(code: string, related: Token): number | undefined {
    const value = this.readValue()
    if (typeof value === "number") return value
    this.report(
      code,
      `Expected a number, received "${String(value ?? "")}".`,
      related
    )
    return undefined
  }

  private readIdent(code: string, related: Token): string {
    const token = this.peek()
    if (token.kind === "ident" || token.kind === "keyword") {
      this.take()
      return token.value
    }
    this.report(code, "Expected an identifier.", related)
    return ""
  }

  private takeValue(code: string, related: Token): string {
    const value = this.readValue()
    if (value !== undefined) return String(value)
    this.report(code, "Expected a value.", related)
    return ""
  }

  private expect(word: string, related: Token): void {
    if (this.word() === word) this.take()
    else this.report("E_EXPECTED_TOKEN", `Expected ${word}.`, related)
  }

  private endLine(): void {
    while (this.peek().kind !== "newline" && !this.atEnd()) this.take()
    if (this.peek().kind === "newline") this.take()
  }
  private skipNewlines(): void {
    while (this.peek().kind === "newline") this.take()
  }
  private recover(): void {
    while (!this.atEnd()) {
      if (
        this.peek().lineStart &&
        (STATEMENT_KEYWORDS as readonly string[]).includes(this.word())
      )
        return
      this.take()
    }
  }
  private ensureProgress(start: number): void {
    if (this.position !== start || this.atEnd()) return
    this.report(
      "E_PARSER_STALLED",
      "Parser recovery made no progress; skipped one token.",
      this.peek()
    )
    this.take()
  }
  private isStatementBoundary(): boolean {
    const word = this.word()
    const propertyLikeShape =
      word === "TEXT" ||
      word === "CIRCLE" ||
      word === "RECTANGLE" ||
      word === "LINE"
    return (
      this.peek().lineStart &&
      !propertyLikeShape &&
      (STATEMENT_KEYWORDS as readonly string[]).includes(word)
    )
  }
  private report(code: string, message: string, token: Token): void {
    this.diagnostics.push(error(code, message, token.line, token.col))
  }
  private word(): string {
    return this.peek().value.toUpperCase()
  }
  private take(): Token {
    return this.tokens[this.position++]
  }
  private previous(): Token {
    return this.tokens[Math.max(0, this.position - 1)]
  }
  private peek(): Token {
    return this.tokens[this.position]
  }
  private atEnd(): boolean {
    return this.peek().kind === "eof"
  }
}
