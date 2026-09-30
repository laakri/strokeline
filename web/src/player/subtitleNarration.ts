import type { SayLine } from "@/ir/types.ts"
import { plainSubtitleText } from "@/subtitles/subtitles.ts"
import { generateKokoroAudio } from "@/player/kokoro.ts"

export type VoiceStatus = "idle" | "ready" | "preparing" | "speaking" | "paused" | "error"

type NarratedLine = SayLine & { readingProgress: number }

function audioKey(text: string, voice: string): string {
  return `${voice}:${text}`
}

function isUnsupportedLine(line: SayLine): boolean {
  return line.lang?.toLowerCase().startsWith("ar") === true || /\p{Script=Arabic}/u.test(line.text)
}

export class SubtitleNarration {
  private activeKey: string | null = null
  private activeSource: AudioBufferSourceNode | null = null
  private context: AudioContext | null = null
  private readonly buffers = new Map<string, AudioBuffer>()
  private lastProgress = 0
  private lastUpdate = 0
  private voice = "af_heart"

  constructor(private readonly onStatus: (status: VoiceStatus) => void = () => {}) {}

  setVoice(voice: string): void {
    if (this.voice === voice) return
    this.cancel()
    this.voice = voice
    this.buffers.clear()
  }

  async unlock(): Promise<void> {
    await this.getContext().resume()
  }

  async prepare(
    lines: SayLine[],
    voice: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ skipped: number }> {
    this.setVoice(voice)
    const eligible = new Map<string, string>()
    let skipped = 0
    for (const line of lines) {
      const text = plainSubtitleText(line.text).trim()
      if (!text) continue
      if (isUnsupportedLine(line)) {
        skipped++
        continue
      }
      eligible.set(audioKey(text, voice), text)
    }
    const total = eligible.size
    let completed = 0
    onProgress?.(0, total)
    this.setStatus("preparing")
    for (const [key, text] of eligible) {
      if (!this.buffers.has(key)) {
        const generated = await generateKokoroAudio(text, voice)
        const buffer = this.getContext().createBuffer(
          1,
          generated.samples.length,
          generated.sampleRate
        )
        buffer.copyToChannel(generated.samples, 0)
        this.buffers.set(key, buffer)
      }
      completed++
      onProgress?.(completed, total)
    }
    this.setStatus("ready")
    return { skipped }
  }

  sync(line: NarratedLine | undefined, scope: string, enabled: boolean, playing: boolean): void {
    if (!enabled || !playing || !line) {
      if (this.activeKey || this.activeSource) this.cancel()
      this.setStatus(enabled ? "ready" : "idle")
      return
    }

    const text = plainSubtitleText(line.text).trim()
    const key = `${scope}:${line.start}:${audioKey(text, this.voice)}`
    const progress = Math.max(0, Math.min(1, line.readingProgress))
    const now = performance.now()
    const wallDelta = Math.max(0, (now - this.lastUpdate) / 1000)
    const playhead = progress * line.duration
    const timelineDelta = playhead - this.lastProgress
    const jumped = key === this.activeKey && (
      timelineDelta < -0.12 ||
      Math.abs(timelineDelta - wallDelta) > 0.35
    )
    if (key === this.activeKey && !jumped) {
      this.lastProgress = playhead
      this.lastUpdate = now
      return
    }

    this.stopSource()
    const buffer = this.buffers.get(audioKey(text, this.voice))
    if (!buffer) {
      this.activeKey = null
      this.setStatus("preparing")
      return
    }
    this.activeKey = key
    this.lastProgress = playhead
    this.lastUpdate = now
    const source = this.getContext().createBufferSource()
    source.buffer = buffer
    source.connect(this.getContext().destination)
    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null
        this.setStatus("ready")
      }
    }
    this.activeSource = source
    source.start(0, Math.min(buffer.duration, playhead))
    this.setStatus("speaking")
  }

  pause(): void {
    this.lastUpdate = performance.now()
    if (this.context?.state === "running") void this.context.suspend()
    this.setStatus("paused")
  }

  resume(): void {
    this.lastUpdate = performance.now()
    if (this.context?.state === "suspended") void this.context.resume()
    this.setStatus(this.activeKey ? "speaking" : "ready")
  }

  cancel(): void {
    this.stopSource()
    this.activeKey = null
    this.lastProgress = 0
    this.lastUpdate = 0
  }

  dispose(): void {
    this.cancel()
    void this.context?.close()
    this.context = null
  }

  private stopSource(): void {
    const source = this.activeSource
    this.activeSource = null
    if (!source) return
    source.onended = null
    try {
      source.stop()
    } catch {
      /* already stopped */
    }
    source.disconnect()
  }

  private getContext(): AudioContext {
    this.context ??= new AudioContext()
    return this.context
  }

  private setStatus(status: VoiceStatus): void {
    this.onStatus(status)
  }
}
