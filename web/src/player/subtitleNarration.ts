import type { SayAudioTiming, SayLine } from "@/ir/types.ts"
import { plainSubtitleText, wordTimingsForDuration } from "@/subtitles/subtitles.ts"
import { generateKokoroAudio } from "@/player/kokoro.ts"
import { clampReaderVolume } from "@/player/readerVolume.ts"

export type VoiceStatus = "idle" | "ready" | "preparing" | "speaking" | "paused" | "error"

type NarratedLine = SayLine & { readingProgress: number }
type TimingReady = (timing: SayAudioTiming) => void
const speechTimings = new Map<string, SayAudioTiming>()

export function narrationPlaybackTiming(
  audioDuration: number,
  progress: number
): { playbackRate: number; offset: number } {
  const normalizedProgress = Math.max(0, Math.min(1, progress))
  return {
    playbackRate: 1,
    offset: audioDuration * normalizedProgress,
  }
}

function audioKey(text: string, voice: string, speed = 1): string {
  return JSON.stringify([text, voice, speed])
}

function isUnsupportedLine(line: SayLine): boolean {
  return line.lang?.toLowerCase().startsWith("ar") === true || /\p{Script=Arabic}/u.test(line.text)
}

export class SubtitleNarration {
  private activeKey: string | null = null
  private activeSource: AudioBufferSourceNode | null = null
  private context: AudioContext | null = null
  private voiceGain: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private readonly buffers = new Map<string, AudioBuffer>()
  private lastProgress = 0
  private lastUpdate = 0
  private voice = "af_heart"
  private volume = 1
  private preparationPaused = false
  private resumePreparationWaiter?: () => void

  constructor(private readonly onStatus: (status: VoiceStatus) => void = () => {}, volume = 1, voice = "af_heart") {
    this.volume = clampReaderVolume(volume)
    this.voice = voice
  }

  setVolume(volume: number): void {
    this.volume = clampReaderVolume(volume)
    if (this.voiceGain && this.context) {
      this.voiceGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.025)
    }
  }

  setVoice(voice: string): void {
    if (this.voice === voice) return
    this.cancel()
    this.voice = voice
    for (const key of this.buffers.keys()) {
      if (JSON.parse(key)[1] !== voice) this.buffers.delete(key)
    }
  }

  async unlock(): Promise<void> {
    await this.getContext().resume()
  }

  async prepare(
    lines: SayLine[],
    voice: string,
    onProgress?: (completed: number, total: number) => void,
    onTiming?: TimingReady
  ): Promise<{ skipped: number; timings: SayAudioTiming[] }> {
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
    const timings: SayAudioTiming[] = []
    onProgress?.(0, total)
    this.setStatus("preparing")
    for (const [key, text] of eligible) {
      if (!this.buffers.has(key)) {
        const generated = await generateKokoroAudio(text, voice, 1)
        await this.waitForPreparationResume()
        const buffer = this.getContext().createBuffer(
          1,
          generated.samples.length,
          generated.sampleRate
        )
        buffer.copyToChannel(generated.samples, 0)
        this.buffers.set(key, buffer)
      } else {
        await this.waitForPreparationResume()
      }
      const buffer = this.buffers.get(key)
      if (buffer) {
        const timing: SayAudioTiming = {
          text,
          voice,
          speed: 1,
          duration: buffer.duration,
          wordTimings: wordTimingsForDuration(text, buffer.duration),
        }
        speechTimings.set(key, timing)
        timings.push(timing)
        onTiming?.(timing)
      }
      completed++
      onProgress?.(completed, total)
    }
    this.setStatus("ready")
    return { skipped, timings }
  }

  pausePreparation(): void {
    this.preparationPaused = true
  }

  resumePreparation(): void {
    this.preparationPaused = false
    this.resumePreparationWaiter?.()
    this.resumePreparationWaiter = undefined
  }

  private async waitForPreparationResume(): Promise<void> {
    if (!this.preparationPaused) return
    await new Promise<void>((resolve) => {
      this.resumePreparationWaiter = resolve
    })
  }

  sync(line: NarratedLine | undefined, scope: string, enabled: boolean, playing: boolean): void {
    if (!enabled || !playing || !line) {
      if (this.activeKey || this.activeSource) this.cancel()
      this.setStatus(enabled ? "ready" : "idle")
      return
    }

    const text = plainSubtitleText(line.text).trim()
    const key = `${scope}:${line.start}:${audioKey(text, this.voice)}`
    const buffer = this.buffers.get(audioKey(text, this.voice))
    const audioTiming = speechTimings.get(audioKey(text, this.voice))
    if (audioTiming) {
      line.duration = Math.max(line.duration, audioTiming.duration)
      line.wordTimings = audioTiming.wordTimings
      line.audioTiming = audioTiming
    }
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
    if (!buffer) {
      this.activeKey = null
      this.setStatus("preparing")
      return
    }
    this.activeKey = key
    this.lastProgress = playhead
    this.lastUpdate = now
    const timing = narrationPlaybackTiming(buffer.duration, progress)
    const source = this.getContext().createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = timing.playbackRate
    source.connect(this.getVoiceGain())
    source.onended = () => {
      if (this.activeSource === source) {
        this.activeSource = null
        this.setStatus("ready")
      }
    }
    this.activeSource = source
    source.start(0, Math.min(buffer.duration, timing.offset))
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
    this.voiceGain?.disconnect()
    this.limiter?.disconnect()
    this.voiceGain = null
    this.limiter = null
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

  private getVoiceGain(): GainNode {
    if (this.voiceGain) return this.voiceGain
    const context = this.getContext()
    const gain = context.createGain()
    gain.gain.value = this.volume
    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -1
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.003
    limiter.release.value = 0.08
    gain.connect(limiter)
    limiter.connect(context.destination)
    this.voiceGain = gain
    this.limiter = limiter
    return gain
  }

  private setStatus(status: VoiceStatus): void {
    this.onStatus(status)
  }
}
