import type { Diagnostic } from "@/ir/types.ts"

export type { Diagnostic }

export function error(
  code: string,
  message: string,
  line: number,
  col: number,
  suggestion?: string
): Diagnostic {
  return { severity: "error", code, message, line, col, suggestion }
}

export function warning(
  code: string,
  message: string,
  line: number,
  col: number,
  suggestion?: string
): Diagnostic {
  return { severity: "warning", code, message, line, col, suggestion }
}

export function blocksScriptRun(diagnostic: Diagnostic): boolean {
  return !diagnostic.code.startsWith("W_")
}
