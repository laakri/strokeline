import { compile } from "@/dsl/compiler.ts"
import { parseScript } from "@/dsl/parser.ts"
import { validate } from "@/validator/validate.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { MAX_SCRIPT_LENGTH, normalizeScriptSource } from "@/dsl/source.ts"
import { scheduleDocumentSays } from "@/subtitles/subtitles.ts"
import type { Diagnostic } from "@/ir/types.ts"
import type { SceneDocument } from "@/ir/types.ts"

export interface PipelineResult {
  document: SceneDocument | null
  diagnostics: Diagnostic[]
}

export function runScript(source: string): PipelineResult {
  const normalized = normalizeScriptSource(source)
  if (normalized.tooLarge)
    return {
      document: null,
      diagnostics: [
        {
          severity: "error",
          code: "E_SCRIPT_TOO_LARGE",
          message: `Script exceeds the ${MAX_SCRIPT_LENGTH.toLocaleString()} character limit.`,
          line: 1,
          col: 1,
        },
      ],
    }
  const parsed = parseScript(normalized.source)
  const compiled = compile(parsed.ast)
  const diagnostics = [
    ...parsed.diagnostics,
    ...compiled.diagnostics,
    ...validate(compiled.document),
  ]
  const document = scheduleDocumentSays(compiled.document)
  return {
    document: diagnostics.some(blocksScriptRun) ? null : document,
    diagnostics,
  }
}

export { compile, parseScript }
export { ICON_NAMES, type IconName } from "@/dsl/grammar.ts"
