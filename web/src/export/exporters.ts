import { GIFEncoder, applyPalette, quantize } from "gifenc"
import type { SayLine, SceneDocument } from "@/ir/types.ts"
import { loadHandwrittenFont } from "@/renderer/handdrawn.ts"
import { drawScene } from "@/renderer/draw.ts"
import { preloadImages } from "@/renderer/images.ts"
import { SequencePlayer } from "@/player/usePlayer.ts"
import { Timeline } from "@/timeline/timeline.ts"
import {
  frameCountForDuration,
  frameTimestamp,
  pingPongFrameTimes,
} from "@/export/frameTiming.ts"
import { plainSubtitleText, scheduleSays, subtitleExportEntries, subtitleTimecode } from "@/subtitles/subtitles.ts"
import { getKokoroState, generateKokoroAudio, subscribeKokoro } from "@/player/kokoro.ts"
import { readReaderVolume } from "@/player/readerVolume.ts"
import {
  FREE_BRANDING_ENTITLEMENTS,
  type BrandingEntitlements,
} from "@/branding/entitlements.ts"
import { captionStyleFromStorage, isVerticalCanvas } from "@/reels/reels.ts"

function exportSubtitleSettings(document: SceneDocument): {
  subtitles: boolean
  readAlong: boolean
  captionStyle: ReturnType<typeof captionStyleFromStorage>
} {
  const readSetting = (key: string): boolean | null => {
    try {
      const value = localStorage.getItem(key)
      return value === "on" ? true : value === "off" ? false : null
    } catch {
      return null
    }
  }
  return {
    subtitles: readSetting("strokeline.subtitles.v1") ??
      (document.subtitles ?? (
        isVerticalCanvas(document.canvas) &&
        document.scenes.some((scene) => (scene.says?.length ?? 0) > 0)
      )),
    readAlong: readSetting("strokeline.voice.v1") ?? false,
    captionStyle: captionStyleFromStorage(),
  }
}

function exportVoiceId(): string {
  try {
    return localStorage.getItem("strokeline.voiceId.v1") || "af_heart"
  } catch {
    return "af_heart"
  }
}

export type VideoResolution = "720p" | "1080p"
export type VideoExportFormat = "mp4" | "webm"

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

function timestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const yieldToUi = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, 0))

export interface ExportOptions {
  fps?: number
  scale?: number
  resolution?: VideoResolution
  includeNarration?: boolean
  seamlessLoop?: boolean
  brandingEntitlements?: BrandingEntitlements
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
  onFormat?: (format: VideoExportFormat) => void
  onMessage?: (message: string) => void
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError")
  }
}

function sceneTimelines(document: SceneDocument): Timeline[] {
  return document.scenes.map((scene) => new Timeline(scene, document.canvas))
}

export function videoExportDimensions(
  document: SceneDocument,
  resolution: VideoResolution
) {
  const target = resolution === "720p" ? 720 : 1080
  if (document.canvas.height > document.canvas.width) {
    const width = target
    const height = Math.max(
      2,
      Math.round((document.canvas.height * width) / document.canvas.width / 2) *
        2
    )
    return { width, height }
  }
  const height = target
  const width = Math.max(
    2,
    Math.round((document.canvas.width * height) / document.canvas.height / 2) *
      2
  )
  return { width, height }
}

export async function preferredVideoExportFormat(
  width: number,
  height: number,
  fps: number,
  includeAudio = false
): Promise<VideoExportFormat> {
  if (typeof VideoEncoder === "undefined") return "webm"
  try {
    const {
      getFirstEncodableAudioCodec,
      getFirstEncodableVideoCodec,
    } = await import("mediabunny")
    const codec = await getFirstEncodableVideoCodec(["avc"], {
      width,
      height,
      frameRate: fps,
    })
    if (
      codec === "avc" &&
      includeAudio &&
      (await getFirstEncodableAudioCodec(["aac"])) !== "aac"
    ) return "webm"
    return codec === "avc" ? "mp4" : "webm"
  } catch {
    return "webm"
  }
}

/** Snapshot of one scene at a given playhead second, as a PNG file. */
export async function exportPng(
  document: SceneDocument,
  sceneIndex: number,
  elapsed: number,
  brandingEntitlements: BrandingEntitlements = FREE_BRANDING_ENTITLEMENTS
): Promise<void> {
  const scene = document.scenes[sceneIndex]
  if (!scene) return
  const timeline = new Timeline(scene, document.canvas)
  const at = Math.min(Math.max(0, elapsed), timeline.duration)
  await preloadImages(document)
  await loadHandwrittenFont()
  const canvas = createCanvas(document.canvas.width * 2, document.canvas.height * 2)
  const context = canvas.getContext("2d")
  if (!context) return
  const subtitleSettings = exportSubtitleSettings(document)
  drawScene(
    context,
    timeline.resolveAt(at),
    undefined,
    document.canvas,
    document.background,
    document.style.mode,
    document.style.board,
    document.style.hand,
    subtitleSettings.subtitles,
    subtitleSettings.readAlong,
    brandingEntitlements,
    subtitleSettings.captionStyle
  )
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  )
  if (blob) download(blob, `strokeline-${timestamp()}.png`)
}

/** Animated GIF of every scene, encoded offline with gifenc. */
export async function exportGif(
  document: SceneDocument,
  options: ExportOptions = {}
): Promise<void> {
  const {
    fps = 12,
    scale = 0.5,
    seamlessLoop = false,
    signal,
    onProgress,
    brandingEntitlements = FREE_BRANDING_ENTITLEMENTS,
  } = options
  await preloadImages(document)
  await loadHandwrittenFont()
  const width = Math.max(1, Math.round(document.canvas.width * scale))
  const height = Math.max(1, Math.round(document.canvas.height * scale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  if (!context) return
  const renderCanvas = createCanvas(document.canvas.width, document.canvas.height)
  const renderContext = renderCanvas.getContext("2d")
  if (!renderContext) return
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  const subtitleSettings = exportSubtitleSettings(document)
  const timelines = sceneTimelines(document)
  if (seamlessLoop) {
    const sequence = createSequenceRenderer(
      document,
      timelines,
      document.canvas.width,
      document.canvas.height,
      brandingEntitlements
    )
    try {
      const times = pingPongFrameTimes(sequence.player.duration, fps)
      const encoder = GIFEncoder()
      const delay = Math.round(1000 / fps)
      for (const [frame, time] of times.entries()) {
        throwIfAborted(signal)
        sequence.renderAt(time)
        context.clearRect(0, 0, width, height)
        context.drawImage(sequence.canvas, 0, 0, width, height)
        const { data } = context.getImageData(0, 0, width, height)
        const palette = quantize(data, 256)
        const index = applyPalette(data, palette)
        encoder.writeFrame(index, width, height, {
          palette,
          delay,
          repeat: 0,
        })
        onProgress?.((frame + 1) / times.length)
        if (frame % 3 === 0) await yieldToUi()
      }
      throwIfAborted(signal)
      encoder.finish()
      download(
        new Blob([encoder.bytes()], { type: "image/gif" }),
        `strokeline-loop-${timestamp()}.gif`
      )
      return
    } finally {
      sequence.player.dispose()
    }
  }
  const totalFrames = timelines.reduce(
    (sum, timeline) => sum + Math.max(1, Math.round(timeline.duration * fps)),
    0
  )
  const encoder = GIFEncoder()
  const delay = Math.round(1000 / fps)
  let done = 0
  for (const timeline of timelines) {
    const frames = Math.max(1, Math.round(timeline.duration * fps))
    for (let frame = 0; frame < frames; frame++) {
      throwIfAborted(signal)
      const t = Math.min(timeline.duration, frame / fps)
      drawScene(
        renderContext,
        timeline.resolveAt(t),
        undefined,
        document.canvas,
        document.background,
        document.style.mode,
        document.style.board,
        document.style.hand,
        subtitleSettings.subtitles,
        subtitleSettings.readAlong,
        brandingEntitlements,
        subtitleSettings.captionStyle
      )
      context.clearRect(0, 0, width, height)
      context.drawImage(renderCanvas, 0, 0, width, height)
      const { data } = context.getImageData(0, 0, width, height)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      encoder.writeFrame(index, width, height, { palette, delay })
      done++
      onProgress?.(done / totalFrames)
      if (frame % 3 === 0) await yieldToUi()
    }
  }
  throwIfAborted(signal)
  encoder.finish()
  download(
    new Blob([encoder.bytes()], { type: "image/gif" }),
    `strokeline-${timestamp()}.gif`
  )
}

/** Deterministically export every scene and transition as H.264 MP4 when supported. */
export async function exportVideo(
  document: SceneDocument,
  options: ExportOptions = {}
): Promise<VideoExportFormat> {
  const {
    fps = 30,
    resolution = "1080p",
    signal,
    onProgress,
    onFormat,
    onMessage,
    brandingEntitlements = FREE_BRANDING_ENTITLEMENTS,
  } = options
  const voiceEnabled = (options.includeNarration ?? exportSubtitleSettings(document).readAlong) &&
    document.scenes.some((scene) => (scene.says?.length ?? 0) > 0)
  const audioContext = voiceEnabled && typeof AudioContext !== "undefined"
    ? new AudioContext()
    : null
  if (audioContext) void audioContext.resume()
  try {
    await preloadImages(document)
    await loadHandwrittenFont()
    const { width, height } = videoExportDimensions(document, resolution)
    const timelines = sceneTimelines(document)
    const sequence = createSequenceRenderer(document, timelines, width, height, brandingEntitlements)
    const total = sequence.player.duration
    if (total <= 0) {
      sequence.player.dispose()
      throw new Error("The script has no playable duration to record.")
    }
    try {
      throwIfAborted(signal)
      const narration = voiceEnabled
        ? await renderNarrationAudio(
            document,
            sequence.sceneStartTimes,
            total,
            exportVoiceId(),
            signal,
            (fraction, message) => {
              onProgress?.(fraction * 0.25)
              onMessage?.(message)
            }
          )
        : null
      const format = await preferredVideoExportFormat(
        width,
        height,
        fps,
        narration !== null
      )
      onFormat?.(format)
      throwIfAborted(signal)
      onMessage?.(narration ? "Rendering video with narration…" : "Rendering video…")
      const videoProgress = (fraction: number) =>
        onProgress?.((narration ? 0.25 : 0) + fraction * (narration ? 0.75 : 1))
      const blob = format === "mp4"
        ? await exportMp4(sequence, height, fps, signal, videoProgress, narration)
        : await recordCanvasWebm(sequence, fps, total, signal, videoProgress, narration, audioContext)
      throwIfAborted(signal)
      download(blob, `strokeline-${timestamp()}.${format}`)
      return format
    } finally {
      sequence.player.dispose()
    }
  } finally {
    await audioContext?.close().catch(() => undefined)
  }
}

type TimedSay = { line: SayLine; start: number }

function timedSays(document: SceneDocument, sceneStarts: number[]): TimedSay[] {
  return document.scenes.flatMap((scene, index) =>
    scheduleSays(scene.says ?? []).map((line) => ({
      line,
      start: (sceneStarts[index] ?? 0) + line.start,
    }))
  )
}

function isUnsupportedNarration(line: SayLine): boolean {
  return line.lang?.toLowerCase().startsWith("ar") === true || /\p{Script=Arabic}/u.test(line.text)
}

async function renderNarrationAudio(
  document: SceneDocument,
  sceneStarts: number[],
  totalDuration: number,
  voice: string,
  signal: AbortSignal | undefined,
  onProgress: (fraction: number, message: string) => void
): Promise<AudioBuffer | null> {
  const allSays = timedSays(document, sceneStarts)
  const says = allSays.filter(({ line }) => !isUnsupportedNarration(line))
  const skipped = allSays.length - says.length
  if (skipped) onProgress(0, `Kokoro skipped ${skipped} Arabic line${skipped === 1 ? "" : "s"}; rendering supported narration…`)
  if (!says.length) return null

  const unsubscribe = subscribeKokoro(() => {
    const state = getKokoroState()
    if (state.status === "loading") {
      onProgress(state.progress * 0.12 / 100, `${state.message} ${state.progress}%`)
    }
  })
  try {
    onProgress(0, "Preparing saved narration…")
    const audioContext = new OfflineAudioContext(
      1,
      Math.max(1, Math.ceil(totalDuration * 24_000)),
      24_000
    )
    const gain = audioContext.createGain()
    gain.gain.value = 0.82 * readReaderVolume()
    const limiter = audioContext.createDynamicsCompressor()
    limiter.threshold.value = -1
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.003
    limiter.release.value = 0.08
    gain.connect(limiter)
    limiter.connect(audioContext.destination)
    for (let index = 0; index < says.length; index++) {
      throwIfAborted(signal)
      const { line, start } = says[index]!
      onProgress(0.12 + (index / says.length) * 0.13, `Preparing narration ${index + 1}/${says.length}…`)
      const audio = await generateKokoroAudio(plainSubtitleText(line.text).trim(), voice)
      if (start >= totalDuration) continue
      const buffer = audioContext.createBuffer(1, audio.samples.length, audio.sampleRate)
      buffer.copyToChannel(audio.samples, 0)
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(gain)
      source.start(Math.max(0, start))
    }
    throwIfAborted(signal)
    onProgress(0.25, "Mixing narration into the video…")
    return await audioContext.startRendering()
  } finally {
    unsubscribe()
  }
}

interface SequenceRenderer {
  canvas: HTMLCanvasElement
  player: SequencePlayer
  sceneStartTimes: number[]
  renderAt: (time: number) => void
}

function createSequenceRenderer(
  document: SceneDocument,
  timelines: Timeline[],
  width: number,
  height: number,
  brandingEntitlements: BrandingEntitlements
): SequenceRenderer {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D unavailable.")
  const fromCanvas = createCanvas(width, height)
  const toCanvas = createCanvas(width, height)
  const fromContext = fromCanvas.getContext("2d")
  const toContext = toCanvas.getContext("2d")
  if (!fromContext || !toContext) throw new Error("Canvas 2D unavailable.")
  const subtitleSettings = exportSubtitleSettings(document)
  const player = new SequencePlayer(
    timelines,
    (state, _sceneIndex, _elapsed, transition) => {
      if (!transition) {
        drawScene(
          context,
          state,
          undefined,
          document.canvas,
          document.background,
          document.style.mode,
          document.style.board,
          document.style.hand,
          subtitleSettings.subtitles,
          subtitleSettings.readAlong,
          brandingEntitlements,
          subtitleSettings.captionStyle
        )
        return
      }
      drawScene(
        fromContext,
        transition.from,
        undefined,
        document.canvas,
        document.background,
        document.style.mode,
        document.style.board,
        document.style.hand,
        subtitleSettings.subtitles,
        subtitleSettings.readAlong,
        brandingEntitlements,
        subtitleSettings.captionStyle
      )
      drawScene(
        toContext,
        transition.to,
        undefined,
        document.canvas,
        document.background,
        document.style.mode,
        document.style.board,
        document.style.hand,
        subtitleSettings.subtitles,
        subtitleSettings.readAlong,
        brandingEntitlements,
        subtitleSettings.captionStyle
      )
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, width, height)
      context.drawImage(fromCanvas, 0, 0)
      if (transition.type === "fade") {
        context.globalAlpha = transition.progress
        context.drawImage(toCanvas, 0, 0)
      } else {
        context.beginPath()
        context.rect(0, 0, width * transition.progress, height)
        context.clip()
        context.drawImage(toCanvas, 0, 0)
      }
      context.restore()
    },
    document.scenes.map((scene) => scene.transition)
  )
  return {
    canvas,
    player,
    sceneStartTimes: player.sceneStartTimes,
    renderAt: (time) => player.seek(time),
  }
}

export function exportSrt(document: SceneDocument): void {
  const body = subtitleExportEntries(document)
    .map((entry, index) => `${index + 1}\n${subtitleTimecode(entry.start, ",")} --> ${subtitleTimecode(entry.end, ",")}\n${entry.text}\n`)
    .join("\n")
  download(new Blob([body], { type: "application/x-subrip;charset=utf-8" }), `strokeline-${timestamp()}.srt`)
}

export function exportVtt(document: SceneDocument): void {
  const body = subtitleExportEntries(document)
    .map((entry) => `${subtitleTimecode(entry.start, ".")} --> ${subtitleTimecode(entry.end, ".")}\n${entry.text}`)
    .join("\n\n")
  download(new Blob([`WEBVTT\n\n${body}${body ? "\n" : ""}`], { type: "text/vtt;charset=utf-8" }), `strokeline-${timestamp()}.vtt`)
}

async function exportMp4(
  sequence: SequenceRenderer,
  height: number,
  fps: number,
  signal: AbortSignal | undefined,
  onProgress: ((fraction: number) => void) | undefined,
  narration: AudioBuffer | null = null
): Promise<Blob> {
  const { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } =
    await import("mediabunny")
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  })
  const videoSource = new CanvasSource(sequence.canvas, {
    codec: "avc",
    quality: new Quality({ bitrate: height >= 1080 ? 8_000_000 : 5_000_000 }),
    keyFrameInterval: 2,
  })
  output.addVideoTrack(videoSource, { frameRate: fps })
  const audioSource = narration
    ? new AudioBufferSource({ codec: "aac", bitrate: 128_000 })
    : null
  if (audioSource) output.addAudioTrack(audioSource)

  let cancelTask: Promise<void> | undefined
  const cancelOutput = () => {
    if (
      output.state === "pending" ||
      output.state === "started" ||
      output.state === "finalizing"
    ) {
      cancelTask ??= output.cancel()
    }
  }
  signal?.addEventListener("abort", cancelOutput, { once: true })
  try {
    throwIfAborted(signal)
    await output.start()
    if (audioSource && narration) await audioSource.add(narration)
    const frameCount = frameCountForDuration(sequence.player.duration, fps)
    for (let frame = 0; frame < frameCount; frame++) {
      throwIfAborted(signal)
      const time = frameTimestamp(frame, fps)
      sequence.renderAt(time)
      await videoSource.add(time, 1 / fps, {
        keyFrame: frame % (fps * 2) === 0,
      })
      const progressInterval = Math.max(1, Math.floor(frameCount / 100))
      if ((frame + 1) % progressInterval === 0 || frame + 1 === frameCount) {
        onProgress?.(((frame + 1) / frameCount) * 0.95)
      }
      if (frame % 4 === 3) await yieldToUi()
    }
    throwIfAborted(signal)
    await output.finalize()
    throwIfAborted(signal)
    onProgress?.(1)
    const buffer = target.buffer
    if (!buffer) throw new Error("The MP4 muxer produced no output data.")
    return new Blob([buffer], { type: "video/mp4" })
  } catch (error) {
    if (
      output.state === "pending" ||
      output.state === "started" ||
      output.state === "finalizing"
    ) {
      cancelOutput()
    }
    await cancelTask?.catch(() => undefined)
    throw error
  } finally {
    signal?.removeEventListener("abort", cancelOutput)
  }
}

async function recordCanvasWebm(
  sequence: SequenceRenderer,
  fps: number,
  total: number,
  signal: AbortSignal | undefined,
  onProgress: ((fraction: number) => void) | undefined,
  narration: AudioBuffer | null = null,
  audioContext: AudioContext | null = null
): Promise<Blob> {
  throwIfAborted(signal)
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "This browser supports neither H.264 WebCodecs nor MediaRecorder."
    )
  }
  const candidates = narration
    ? ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus"]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
  const mimeType = candidates.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate)
  )
  if (!mimeType && !narration) throw new Error("This browser cannot record WebM video.")

  const stream = sequence.canvas.captureStream(fps)
  const audioDestination = narration && audioContext
    ? audioContext.createMediaStreamDestination()
    : null
  const audioSource = narration && audioContext
    ? audioContext.createBufferSource()
    : null
  if (narration && (!audioContext || !audioDestination || !audioSource)) {
    throw new Error("Audio export needs Web Audio support in this browser.")
  }
  if (audioSource && narration && audioDestination) {
    audioSource.buffer = narration
    audioSource.connect(audioDestination)
    for (const track of audioDestination.stream.getAudioTracks()) stream.addTrack(track)
  }
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 8_000_000,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const settled = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
    recorder.onerror = () => resolve()
  })

  let animationFrame = 0
  let cancelled = false
  let finishFrames: (() => void) | undefined
  const onAbort = () => {
    cancelled = true
    cancelAnimationFrame(animationFrame)
    finishFrames?.()
  }
  signal?.addEventListener("abort", onAbort, { once: true })
  try {
    if (audioSource && audioContext) await audioContext.resume()
    sequence.renderAt(0)
    recorder.start(250)
    const startedAt = performance.now()
    audioSource?.start()
    await new Promise<void>((resolve) => {
      finishFrames = resolve
      const step = (now: number) => {
        const elapsed = (now - startedAt) / 1000
        if (cancelled || elapsed >= total) {
          if (!cancelled) {
            sequence.renderAt(Math.max(0, total - 1 / fps))
            onProgress?.(1)
          }
          resolve()
          return
        }
        sequence.renderAt(elapsed)
        onProgress?.(Math.min(1, elapsed / total))
        animationFrame = requestAnimationFrame(step)
      }
      animationFrame = requestAnimationFrame(step)
    })
    recorder.stop()
    await Promise.race([
      settled,
      new Promise<void>((resolve) => window.setTimeout(resolve, 8_000)),
    ])
    if (cancelled) throw new DOMException("Export cancelled.", "AbortError")
    if (chunks.length === 0)
      throw new Error("MediaRecorder produced no WebM data.")
    return new Blob(chunks, { type: "video/webm" })
  } finally {
    cancelAnimationFrame(animationFrame)
    finishFrames = undefined
    signal?.removeEventListener("abort", onAbort)
    if (recorder.state !== "inactive") recorder.stop()
    for (const track of stream.getTracks()) track.stop()
  }
}
