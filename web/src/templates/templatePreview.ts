import { runScript } from "@/dsl/index.ts"

const compiledTemplates = new Map<string, ReturnType<typeof runScript>>()

export function compileTemplate(script: string) {
  const cached = compiledTemplates.get(script)
  if (cached) return cached
  const result = runScript(script)
  compiledTemplates.set(script, result)
  return result
}
