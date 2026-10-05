export const MAX_SCRIPT_LENGTH = 56_000

export interface NormalizedSource {
  source: string
  tooLarge: boolean
}

/** Removes only a leading AI code fence; prose remains visible to the parser. */
export function normalizeScriptSource(input: string): NormalizedSource {
  const source = input.replace(/^\uFEFF/, "")
  if (source.length > MAX_SCRIPT_LENGTH) return { source, tooLarge: true }
  const openingFence = source.match(/^```(?:wbs|strokeline)?[ \t]*(?:\r?\n|$)/i)
  if (!openingFence) return { source, tooLarge: false }
  const withoutOpening = source.slice(openingFence[0].length)
  const closingFence = withoutOpening.match(/(?:\r?\n)?```[ \t]*\s*$/)
  return { source: closingFence ? withoutOpening.slice(0, -closingFence[0].length) : withoutOpening, tooLarge: false }
}
