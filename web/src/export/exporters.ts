import { GIFEncoder, applyPalette, quantize } from "gifenc"
import type { SceneDocument } from "@/ir/types.ts"
import { loadHandwrittenFont } from "@/renderer/handdrawn.ts"
import { drawScene } from "@/renderer/draw.ts"
import { SequencePlayer } from "@/player/usePlayer.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { frameCountForDuration, frameTimestamp } from "@/export/frameTiming.ts"
import { subtitleExportEntries, subtitleTimecode } from "@/subtitles/subtitles.ts"

function exportSubtitleSettings(document: SceneDocument): { subtitles: boolean; readAlong: boolean } {
  const readSetting = (key: string): boolean | null => {
    try {
      const value = localStorage.getItem(key)
      return value === "on" ? true : value === "off" ? false : null
    } catch {
      return null
    }
  }
  return {
    subtitles: readSetting("strokeline.subtitles.v1") ?? (document.subtitles ?? false),
    readAlong: readSetting("strokeline.voice.v1") ?? false,
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
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
  onFormat?: (format: VideoExportFormat) => void
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
  const height = resolution === "720p" ? 720 : 1080
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
  fps: number
): Promise<VideoExportFormat> {
  if (typeof VideoEncoder === "undefined") return "webm"
  try {
    const { getFirstEncodableVideoCodec } = await import("mediabunny")
    const codec = await getFirstEncodableVideoCodec(["avc"], {
      width,
      height,
      frameRate: fps,
    })
    return codec === "avc" ? "mp4" : "webm"
  } catch {
    return "webm"
  }
}

/** Snapshot of one scene at a given playhead second, as a PNG file. */
export async function exportPng(
  document: SceneDocument,
  sceneIndex: number,
  elapsed: number
): Promise<void> {
  const scene = document.scenes[sceneIndex]
  if (!scene) return
  const timeline = new Timeline(scene, document.canvas)
  const at = Math.min(Math.max(0, elapsed), timeline.duration)
  await loadHandwrittenFont()
  const canvas = createCanvas(document.canvas.width, document.canvas.height)
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
    subtitleSettings.readAlong
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
  const { fps = 12, scale = 0.5, signal, onProgress } = options
  await loadHandwrittenFont()
  const width = Math.max(1, Math.round(document.canvas.width * scale))
  const height = Math.max(1, Math.round(document.canvas.height * scale))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  if (!context) return
  const subtitleSettings = exportSubtitleSettings(document)
  const timelines = sceneTimelines(document)
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
        context,
        timeline.resolveAt(t),
        undefined,
        document.canvas,
        document.background,
        document.style.mode,
        document.style.board,
        document.style.hand,
        subtitleSettings.subtitles,
        subtitleSettings.readAlong
      )
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
  } = options
  await loadHandwrittenFont()
  const { width, height } = videoExportDimensions(document, resolution)
  const timelines = sceneTimelines(document)
  const sequence = createSequenceRenderer(document, timelines, width, height)
  const total = sequence.player.duration
  if (total <= 0) {
    throw new Error("The script has no playable duration to record.")
  }
  const format = await preferredVideoExportFormat(width, height, fps)
  onFormat?.(format)
  throwIfAborted(signal)
  try {
    const blob =
      format === "mp4"
        ? await exportMp4(sequence, height, fps, signal, onProgress)
        : await recordCanvasWebm(sequence, fps, total, signal, onProgress)
    throwIfAborted(signal)
    download(blob, `strokeline-${timestamp()}.${format}`)
    return format
  } finally {
    sequence.player.dispose()
  }
}

interface SequenceRenderer {
  canvas: HTMLCanvasElement
  player: SequencePlayer
  renderAt: (time: number) => void
}

function createSequenceRenderer(
  document: SceneDocument,
  timelines: Timeline[],
  width: number,
  height: number
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
          subtitleSettings.readAlong
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
        subtitleSettings.readAlong
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
        subtitleSettings.readAlong
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
  return { canvas, player, renderAt: (time) => player.seek(time) }
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
  onProgress: ((fraction: number) => void) | undefined
): Promise<Blob> {
  const { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } =
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
  onProgress: ((fraction: number) => void) | undefined
): Promise<Blob> {
  throwIfAborted(signal)
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "This browser supports neither H.264 WebCodecs nor MediaRecorder."
    )
  }
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ]
  const mimeType = candidates.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate)
  )
  if (!mimeType) throw new Error("This browser cannot record WebM video.")

  const stream = sequence.canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, {
    mimeType,
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
  const startedAt = performance.now()
  try {
    sequence.renderAt(0)
    recorder.start(250)
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
