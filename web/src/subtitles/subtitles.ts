import type { SayLine, SceneDocument } from "@/ir/types.ts"

export function plainSubtitleText(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1").replace(/\*/g, "").replace(/\s+/g, " ").trim()
}

export function wrapSubtitleText(text: string, maxChars = 44): string[] {
  const words = plainSubtitleText(text).split(" ").filter(Boolean)
  if (!words.length) return []
  const whole = words.join(" ")
  if (whole.length <= maxChars) return [whole]
  const candidates = words.slice(1).map((_, index) => {
    const left = words.slice(0, index + 1).join(" ")
    const right = words.slice(index + 1).join(" ")
    return { left, right, balance: Math.abs(left.length - right.length), rightWords: words.length - index - 1 }
  }).filter(({ left, right, rightWords }) =>
    left.length <= maxChars && right.length <= maxChars &&
    (words.length <= 2 || rightWords > 1)
  ).sort((a, b) => a.balance - b.balance)
  if (candidates[0]) return [candidates[0].left, candidates[0].right]
  const lines: string[] = []
  let line: string[] = []
  for (const word of words) {
    if (line.length && [...line, word].join(" ").length > maxChars) {
      lines.push(line.join(" "))
      line = []
    }
    line.push(word)
  }
  if (line.length) lines.push(line.join(" "))
  if (lines.length === 2 && lines[1]!.split(" ").length === 1) {
    const firstWords = lines[0]!.split(" ")
    if (firstWords.length > 2) {
      const candidate = `${firstWords.at(-1)} ${lines[1]}`
      if (candidate.length <= maxChars) {
        firstWords.pop()
        lines[0] = firstWords.join(" ")
        lines[1] = candidate
      }
    }
  }
  return lines
}

export function scheduleSays(says: SayLine[]): SayLine[] {
  let cursor = 0
  return says.map((say, index) => {
    const need = estimateSayDuration(say.text)
    const duration = Math.max(say.duration, need)
    const start = Math.max(say.start, cursor)
    cursor = start + duration + (index < says.length - 1 ? 0.22 : 0)
    return { ...say, start, duration }
  })
}

/** Estimate natural speech time with a little breathing room for punctuation. */
export function estimateSayDuration(text: string): number {
  const spoken = plainSubtitleText(text)
  const words = spoken.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []
  const wordTime = words.length / 2.6
  const punctuationTime =
    (spoken.match(/[,，、:：;]/g)?.length ?? 0) * 0.16 +
    (spoken.match(/[.!?。！？]/g)?.length ?? 0) * 0.32 +
    (spoken.match(/[—–]/g)?.length ?? 0) * 0.2
  return Math.max(1.8, Math.ceil((wordTime + punctuationTime) * 10) / 10)
}

export function scheduleDocumentSays(document: SceneDocument): SceneDocument {
  return {
    ...document,
    scenes: document.scenes.map((scene) =>
      scene.says?.length ? { ...scene, says: scheduleSays(scene.says) } : scene
    ),
  }
}

export function subtitleTimecode(seconds: number, separator: "." | ","): string {
  const milliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1000)
  const millis = milliseconds % 1000
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(millis).padStart(3, "0")}`
}

export function subtitleExportEntries(document: SceneDocument) {
  let offset = 0
  const entries: Array<{ start: number; end: number; text: string; lang?: string }> = []
  for (const scene of document.scenes) {
    const says = scheduleSays(scene.says ?? [])
    const opsDuration = scene.ops.reduce((end, op) => {
      if (op.kind === "create") return Math.max(end, op.t + op.draw.duration)
      if (op.kind === "animate") return Math.max(end, op.t + op.anim.duration)
      return Math.max(end, op.t + op.camera.duration)
    }, 0)
    const narrationDuration = says.reduce(
      (end, say) => Math.max(end, say.start + say.duration),
      0
    )
    const duration = Math.max(scene.duration ?? 0, opsDuration, narrationDuration)
    for (const say of says) {
      const localEnd = Math.min(duration, say.start + say.duration)
      if (say.start < duration && localEnd > say.start)
        entries.push({
          start: offset + say.start,
          end: offset + localEnd,
          text: plainSubtitleText(say.text),
          ...(say.lang ? { lang: say.lang } : {}),
        })
    }
    offset += duration
    if (scene.transition && scene.transition.type !== "none")
      offset += scene.transition.duration
  }
  return entries.sort((a, b) => a.start - b.start)
}
