import { HEADER_KEYWORDS, STATEMENT_KEYWORDS } from "@/dsl/grammar.ts"

export type TokenKind =
  | "keyword"
  | "ident"
  | "number"
  | "string"
  | "color"
  | "duration"
  | "arrow"
  | "newline"
  | "eof"

export interface Token {
  kind: TokenKind
  value: string
  line: number
  col: number
  lineStart: boolean
}

const keywords = new Set<string>([
  ...HEADER_KEYWORDS,
  ...STATEMENT_KEYWORDS,
  "AS",
  "TO",
])
const mathCommands = new Set([
  "nabla", "neq", "ne", "nleq", "ngeq", "nsubseteq", "nsupseteq", "nmid", "notin", "nexists", "nparallel", "ncong", "not", "nu", "nless", "ngtr",
  "theta", "vartheta", "tau", "times", "tfrac", "text", "to", "triangle", "therefore", "tan", "top",
  "rho", "right", "rightarrow", "Rightarrow", "rightleftarrows", "rightrightarrows", "rangle", "rbrace", "rceil", "rfloor", "Re", "rel", "rvert",
])

export function lex(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  let line = 1
  let col = 1
  let atLineStart = true

  const add = (
    kind: TokenKind,
    value: string,
    tokenLine: number,
    tokenCol: number,
    lineStart: boolean
  ) => {
    tokens.push({ kind, value, line: tokenLine, col: tokenCol, lineStart })
  }

  while (index < source.length) {
    const char = source[index]
    if (char === " " || char === "\t" || char === "\r") {
      index++
      col++
      continue
    }
    if (char === "\n") {
      add("newline", "\n", line, col, atLineStart)
      index++
      line++
      col = 1
      atLineStart = true
      continue
    }
    if (char === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index++
        col++
      }
      continue
    }
    const tokenLine = line
    const tokenCol = col
    const tokenLineStart = atLineStart
    atLineStart = false
    if (source.startsWith("->", index)) {
      add("arrow", "->", tokenLine, tokenCol, tokenLineStart)
      index += 2
      col += 2
      continue
    }
    if (char === '"') {
      index++
      col++
      let value = ""
      while (
        index < source.length &&
        source[index] !== '"' &&
        source[index] !== "\n"
      ) {
        if (source[index] === "\\" && index + 1 < source.length) {
          const escaped = source[index + 1]
          const mathCommand = source.slice(index + 1).match(/^[A-Za-z]+/)?.[0]
          if (mathCommand && mathCommands.has(mathCommand)) {
            value += `\\${mathCommand}`
            index += mathCommand.length + 1
            col += mathCommand.length + 1
            continue
          }
          if (escaped === "n") value += "\n"
          else if (escaped === "r") value += "\r"
          else if (escaped === "t") value += "\t"
          else if (escaped === '"' || escaped === "\\") value += escaped
          else value += `\\${escaped}`
          index += 2
          col += 2
          continue
        }
        value += source[index]
        index++
        col++
      }
      if (source[index] === '"') {
        index++
        col++
      }
      add("string", value, tokenLine, tokenCol, tokenLineStart)
      continue
    }
    if (char === "#") {
      const six = source.slice(index, index + 7)
      const three = source.slice(index, index + 4)
      const isSixDigit = /^#[0-9a-fA-F]{6}$/.test(six)
      const isThreeDigit =
        /^#[0-9a-fA-F]{3}$/.test(three) &&
        (source[index + 4] === undefined ||
          !/[0-9a-fA-F]/.test(source[index + 4]))
      if (isSixDigit) {
        add("color", six, tokenLine, tokenCol, tokenLineStart)
        index += 7
        col += 7
        continue
      }
      if (isThreeDigit) {
        add("color", three, tokenLine, tokenCol, tokenLineStart)
        index += 4
        col += 4
        continue
      }
      while (index < source.length && source[index] !== "\n") {
        index++
        col++
      }
      continue
    }
    if (/[0-9.-]/.test(char)) {
      let value = ""
      while (index < source.length && /[0-9.eE+-]/.test(source[index])) {
        value += source[index]
        index++
        col++
      }
      const unitStart = index
      while (index < source.length && /[a-zA-Z]/.test(source[index])) {
        index++
        col++
      }
      const unit = source.slice(unitStart, index)
      add(
        unit === "s" || unit === "ms" ? "duration" : "number",
        value + unit,
        tokenLine,
        tokenCol,
        tokenLineStart
      )
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      let value = ""
      while (index < source.length && /[A-Za-z0-9_.-]/.test(source[index])) {
        value += source[index]
        index++
        col++
      }
      add(
        keywords.has(value.toUpperCase()) ? "keyword" : "ident",
        value,
        tokenLine,
        tokenCol,
        tokenLineStart
      )
      continue
    }
    add("ident", char, tokenLine, tokenCol, tokenLineStart)
    index++
    col++
  }
  add("eof", "", line, col, atLineStart)
  return tokens
}
