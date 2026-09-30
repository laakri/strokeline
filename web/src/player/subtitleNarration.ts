import type { SayLine } from "@/ir/types.ts"
import { plainSubtitleText } from "@/subtitles/subtitles.ts"

type NarratedLine = SayLine & { readingProgress: number }
type VoiceStatus = "idle" | "ready" | "speaking" | "paused" | "error"

export class SubtitleNarration {
  private status: VoiceStatus = "idle"
  private activeKey: string | null = null
  private nativeUtterance: SpeechSynthesisUtterance | null = null
  private generation = 0
  private lastProgress = 0
  private lastUpdate = 0

  constructor(private readonly onStatus: (status: VoiceStatus) => void = () => {}) {}

  async unlock(): Promise<void> {}

  sync(line: NarratedLine | undefined, scope: string, enabled: boolean, playing: boolean): void {
    if (!enabled || !playing || !line) {
      this.cancel()
      this.setStatus(enabled ? "ready" : "idle")
      return
    }

    const key = `${scope}:${line.start}:${line.text}`
    const progress = Math.max(0, Math.min(1, line.readingProgress))
    const now = performance.now()
    const wallDelta = Math.max(0, (now - this.lastUpdate) / 1000)
    const expectedDelta = Math.min(0.2, wallDelta / Math.max(0.1, line.duration))
    const jumped = key === this.activeKey && (
      progress < this.lastProgress - 0.08 ||
      progress - this.lastProgress > expectedDelta + 0.08
    )
    if (key === this.activeKey && !jumped) {
      this.lastProgress = progress
      this.lastUpdate = now
      return
    }

    this.cancel()
    const token = this.generation
    this.activeKey = key
    this.lastProgress = progress
    this.lastUpdate = now
    const text = this.remainingText(line)
    if (text) this.speakSystem(line, text, token)
  }

  pause(): void {
    if (!this.supportsSystemVoice()) return
    window.speechSynthesis.pause()
    this.setStatus("paused")
  }

  resume(): void {
    if (this.supportsSystemVoice()) window.speechSynthesis.resume()
    this.setStatus(this.activeKey ? "speaking" : "ready")
  }

  cancel(): void {
    this.generation++
    this.activeKey = null
    this.lastProgress = 0
    this.lastUpdate = 0
    this.nativeUtterance = null
    if (this.supportsSystemVoice()) window.speechSynthesis.cancel()
  }

  dispose(): void {
    this.cancel()
  }

  private speakSystem(line: NarratedLine, text: string, token: number): void {
    if (!this.supportsSystemVoice()) {
      this.setStatus("error")
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = line.lang || (/\p{Script=Arabic}/u.test(line.text) ? "ar" : "en-US")
    utterance.voice = this.selectVoice(utterance.lang)
    utterance.rate = 1.03
    utterance.onstart = () => {
      if (token === this.generation) this.setStatus("speaking")
    }
    utterance.onend = () => {
      if (token === this.generation) this.setStatus("ready")
    }
    utterance.onerror = () => {
      if (token === this.generation) this.setStatus("error")
    }
    this.nativeUtterance = utterance
    window.speechSynthesis.speak(utterance)
    this.setStatus("speaking")
  }

  private selectVoice(language: string): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices()
    const base = language.toLowerCase().split("-")[0]!
    const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(base))
    const local = matching.filter((voice) => voice.localService)
    const preferred = /natural|neural|enhanced|premium|aria|jenny|samantha|ava|zira|google/i
    return local.find((voice) => preferred.test(voice.name))
      ?? local.find((voice) => voice.lang.toLowerCase() === language.toLowerCase())
      ?? local[0]
      ?? matching.find((voice) => voice.lang.toLowerCase() === language.toLowerCase())
      ?? matching[0]
      ?? null
  }

  private supportsSystemVoice(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
  }

  private remainingText(line: NarratedLine): string {
    const text = plainSubtitleText(line.text)
    let offset = Math.floor(Math.max(0, Math.min(0.999, line.readingProgress)) * text.length)
    if (offset > 0) {
      while (offset < text.length && !/\s/u.test(text[offset]!)) offset++
      while (offset < text.length && /\s/u.test(text[offset]!)) offset++
    }
    return text.slice(offset).trim()
  }

  private setStatus(status: VoiceStatus): void {
    if (this.status === status) return
    this.status = status
    this.onStatus(status)
  }
}
