import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Eye, EyeOff, Pause, Play, RotateCcw, Settings2, SkipForward, Volume2, X } from "lucide-react"
import { drawScene } from "@/renderer/draw.ts"
import { preloadImages } from "@/renderer/images.ts"
import { loadHandwrittenFont } from "@/renderer/handdrawn.ts"
import { useAppStore } from "@/app/store.ts"
import { Player, SequencePlayer } from "@/player/usePlayer.ts"
import { SubtitleNarration, type VoiceStatus } from "@/player/subtitleNarration.ts"
import { getKokoroState, subscribeKokoro } from "@/player/kokoro.ts"
import { scheduleSays } from "@/subtitles/subtitles.ts"
import { Timeline, type RenderState } from "@/timeline/timeline.ts"
import { drawPreflightOverlay } from "@/renderer/preflightOverlay.ts"
import { SceneTabs } from "@/ui/preview/SceneTabs.tsx"
import { VoiceSettingsDialog } from "@/ui/preview/VoiceSettingsDialog.tsx"
import { readReaderVolume, saveReaderVolume } from "@/player/readerVolume.ts"

const SUBTITLES_STORAGE_KEY = "strokeline.subtitles.v1"
const READ_ALONG_STORAGE_KEY = "strokeline.voice.v1"
const VOICE_STORAGE_KEY = "strokeline.voiceId.v1"
type SceneAnimation = "script" | "none" | "fade" | "wipe" | "slide" | "erase"

function readSubtitleOverride(): boolean | null {
  try {
    const saved = localStorage.getItem(SUBTITLES_STORAGE_KEY)
    return saved === "on" ? true : saved === "off" ? false : null
  } catch {
    return null
  }
}

function readReadAlongSetting(): boolean {
  try {
    return localStorage.getItem(READ_ALONG_STORAGE_KEY) === "on"
  } catch {
    return false
  }
}

function readVoiceSetting(): string {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY) || "af_heart"
  } catch {
    return "af_heart"
  }
}

export function PreviewPane({
  presentationMode = false,
  onExitPresentation,
}: {
  presentationMode?: boolean
  onExitPresentation?: () => void
} = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const preflightCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderStateRef = useRef<RenderState | null>(null)
  const playButtonRef = useRef<HTMLButtonElement>(null)
  const playerRef = useRef<Player | SequencePlayer | null>(null)
  const handledRunId = useRef(0)
  const lastUiUpdate = useRef(0)
  const autoplayNext = useRef(false)
  const autoplayAll = useRef(false)
  const preservedPlayback = useRef<{ time: number; wasPlaying: boolean } | null>(null)
  const [playAllMode, setPlayAllMode] = useState(true)
  const effectivePlayAllMode = presentationMode || playAllMode
  const [sequenceSceneIndex, setSequenceSceneIndex] = useState(0)
  const [sceneGapSeconds, setSceneGapSeconds] = useState<number | "script">("script")
  const [sceneAnimation, setSceneAnimation] = useState<SceneAnimation>("script")
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [preflightOn, setPreflightOn] = useState(false)
  const [subtitleOverride, setSubtitleOverride] = useState<boolean | null>(readSubtitleOverride)
  const [readAlongOn, setReadAlongOn] = useState(readReadAlongSetting)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(readVoiceSetting)
  const [readerVolume, setReaderVolume] = useState(readReaderVolume)
  const [voicePrepProgress, setVoicePrepProgress] = useState({ completed: 0, total: 0 })
  const [voiceNotice, setVoiceNotice] = useState("")
  const [sequenceStarts, setSequenceStarts] = useState<number[]>([])
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle")
  const [narration] = useState(() => new SubtitleNarration(setVoiceStatus, readReaderVolume()))
  const narrationRef = useRef(narration)
  const kokoroState = useSyncExternalStore(subscribeKokoro, getKokoroState, getKokoroState)
  const compiledIR = useAppStore((state) => state.compiledIR)
  const [imageReadiness, setImageReadiness] = useState<{
    document: typeof compiledIR
    ready: boolean
  }>({ document: null, ready: false })
  const script = useAppStore((state) => state.script)
  const activeSceneIndex = useAppStore((state) => state.activeSceneIndex)
  const setActiveSceneIndex = useAppStore((state) => state.setActiveSceneIndex)
  const runId = useAppStore((state) => state.runId)
  const player = useAppStore((state) => state.player)
  const setPlayerState = useAppStore((state) => state.setPlayerState)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const scene = compiledIR?.scenes[activeSceneIndex]
  const subtitlesOn = subtitleOverride ?? (compiledIR?.subtitles ?? false)
  const activeVoice = kokoroState.voices.find((voice) => voice.id === selectedVoice)
  const activeVoiceLabel = activeVoice?.name || selectedVoice
    .replace(/^[a-z]{2}_/, "")
    .replace(/^\w/, (letter) => letter.toUpperCase())
  const subtitlesOnRef = useRef(subtitlesOn)
  const readAlongRef = useRef(readAlongOn)
  useEffect(() => {
    let active = true
    if (!compiledIR) {
      useAppStore.getState().setImageDiagnostics([])
      return () => { active = false }
    }
    void preloadImages(compiledIR).then((diagnostics) => {
      if (!active) return
      useAppStore.getState().setImageDiagnostics(diagnostics)
      setImageReadiness({ document: compiledIR, ready: true })
    })
    return () => { active = false }
  }, [compiledIR])
  useEffect(() => {
    subtitlesOnRef.current = subtitlesOn
  }, [subtitlesOn])
  useEffect(() => {
    readAlongRef.current = readAlongOn
  }, [readAlongOn])
  const voiceSupported = typeof window !== "undefined" && "Worker" in window && "AudioContext" in window

  const preservePlaybackPosition = () => {
    preservedPlayback.current = {
      time: playerRef.current?.currentTime ?? player.elapsed,
      wasPlaying: playerRef.current?.isPlaying ?? player.isPlaying,
    }
  }

  const toggleSubtitles = useCallback(() => {
    setSubtitleOverride((current) => {
      const next = !(current ?? (compiledIR?.subtitles ?? false))
      try {
        localStorage.setItem(SUBTITLES_STORAGE_KEY, next ? "on" : "off")
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [compiledIR?.subtitles])

  const enableReader = useCallback(async (voice: string) => {
    const controller = playerRef.current
    const time = controller?.currentTime ?? player.elapsed
    const wasPlaying = controller?.isPlaying ?? player.isPlaying
    controller?.pause()
    setPlayerState({ isPlaying: false })
    narrationRef.current.setVoice(voice)
    setVoicePrepProgress({ completed: 0, total: 0 })
    setVoiceStatus("preparing")
    setVoiceNotice("Preparing reader and narration…")
    try {
      await narrationRef.current.unlock()
      const lines = compiledIR?.scenes.flatMap((item) => scheduleSays(item.says ?? [])) ?? []
      const { skipped } = await narrationRef.current.prepare(
        lines,
        voice,
        (completed, total) => setVoicePrepProgress({ completed, total })
      )
      await narrationRef.current.unlock()
      setSelectedVoice(voice)
      try {
        localStorage.setItem(VOICE_STORAGE_KEY, voice)
        localStorage.setItem(READ_ALONG_STORAGE_KEY, "on")
      } catch {
        /* storage unavailable */
      }
      readAlongRef.current = true
      setReadAlongOn(true)
      setVoiceNotice(skipped
        ? `Kokoro skipped ${skipped} Arabic line${skipped === 1 ? "" : "s"}; this model does not speak Arabic.`
        : lines.length === 0
          ? "This script has no SAY lines to read."
          : "")
      setVoiceDialogOpen(false)
      controller?.seek(time)
      if (wasPlaying) controller?.play()
      setPlayerState({ elapsed: time, isPlaying: wasPlaying })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      narrationRef.current.setVoice(selectedVoice)
      setVoicePrepProgress({ completed: 0, total: 0 })
      setVoiceStatus("error")
      setVoiceNotice(`Kokoro could not prepare narration: ${message}`)
      if (wasPlaying) controller?.play()
      setPlayerState({ elapsed: time, isPlaying: wasPlaying })
    }
  }, [compiledIR, player.elapsed, player.isPlaying, selectedVoice, setPlayerState])

  const toggleReadAlong = useCallback(() => {
    if (!voiceSupported) return
    if (!readAlongRef.current && kokoroState.status !== "ready") {
      setVoiceDialogOpen(true)
      return
    }
    if (!readAlongRef.current) {
      void enableReader(selectedVoice)
    } else {
      readAlongRef.current = false
      setReadAlongOn(false)
      try {
        localStorage.setItem(READ_ALONG_STORAGE_KEY, "off")
      } catch {
        /* storage unavailable */
      }
      narrationRef.current.cancel()
      setVoiceStatus("idle")
      setVoiceNotice("")
    }
  }, [enableReader, kokoroState.status, selectedVoice, voiceSupported])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.closest(".cm-editor"))) return
      event.preventDefault()
      toggleSubtitles()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [toggleSubtitles])

  useEffect(() => {
    if (!presentationMode) return
    const onPresentationKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === "Escape") {
        event.preventDefault()
        onExitPresentation?.()
      } else if (event.key === " " && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        playButtonRef.current?.click()
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault()
        const direction = event.key === "ArrowRight" ? 5 : -5
        const controller = playerRef.current
        if (controller)
          controller.seek(Math.max(0, Math.min(controller.duration, controller.currentTime + direction)))
      }
    }
    document.addEventListener("keydown", onPresentationKeyDown)
    return () => document.removeEventListener("keydown", onPresentationKeyDown)
  }, [presentationMode, onExitPresentation])

  useEffect(() => {
    const controller = playerRef.current
    if (!readAlongOn) narrationRef.current?.cancel()
    if (controller && !controller.isPlaying)
      controller.seek(controller.currentTime)
  }, [subtitlesOn, readAlongOn])

  useEffect(() => () => narrationRef.current?.dispose(), [])

  useEffect(() => {
    const preserved = preservedPlayback.current
    preservedPlayback.current = null
    playerRef.current?.dispose()
    playerRef.current = null
    if (!scene || !compiledIR || !canvasRef.current || imageReadiness.document !== compiledIR || !imageReadiness.ready) {
      renderStateRef.current = null
      setSequenceStarts([])
      setPlayerState({ elapsed: 0, duration: 0, isPlaying: false })
      return
    }
    const canvas = canvasRef.current
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(compiledIR.canvas.width * devicePixelRatio)
    canvas.height = Math.round(compiledIR.canvas.height * devicePixelRatio)
    canvas.style.aspectRatio = `${compiledIR.canvas.width} / ${compiledIR.canvas.height}`
    const context = canvas.getContext("2d")
    if (!context) return
    const timelines = compiledIR.scenes.map(
      (item) => new Timeline(item, compiledIR.canvas)
    )
    const transitionFromCanvas = document.createElement("canvas")
    const transitionToCanvas = document.createElement("canvas")
    transitionFromCanvas.width = transitionToCanvas.width = canvas.width
    transitionFromCanvas.height = transitionToCanvas.height = canvas.height
    const controller = effectivePlayAllMode
      ? new SequencePlayer(
          timelines,
          (state, sceneIndex, elapsed, transition) => {
            renderStateRef.current = state
            narrationRef.current?.sync(
              transition ? undefined : state.subtitle,
              `sequence:${sceneIndex}`,
              readAlongRef.current,
              controller.isPlaying
            )
            if (!transition) {
              drawScene(
                context,
                state,
                undefined,
                compiledIR.canvas,
                compiledIR.background,
                compiledIR.style.mode,
                compiledIR.style.board,
                compiledIR.style.hand,
                subtitlesOnRef.current,
                readAlongRef.current
              )
            } else {
              const fromContext = transitionFromCanvas.getContext("2d")
              const toContext = transitionToCanvas.getContext("2d")
              if (fromContext && toContext) {
                drawScene(
                  fromContext,
                  transition.from,
                  undefined,
                  compiledIR.canvas,
                  compiledIR.background,
                  compiledIR.style.mode,
                  compiledIR.style.board,
                  compiledIR.style.hand,
                  subtitlesOnRef.current,
                  readAlongRef.current
                )
                drawScene(
                  toContext,
                  transition.to,
                  undefined,
                  compiledIR.canvas,
                  compiledIR.background,
                  compiledIR.style.mode,
                  compiledIR.style.board,
                  compiledIR.style.hand,
                  subtitlesOnRef.current,
                  readAlongRef.current
                )
                context.save()
                context.setTransform(1, 0, 0, 1, 0, 0)
                context.clearRect(0, 0, canvas.width, canvas.height)
                context.drawImage(transitionFromCanvas, 0, 0)
                if (transition.type === "fade") {
                  context.globalAlpha = transition.progress
                  context.drawImage(transitionToCanvas, 0, 0)
                } else if (transition.type === "slide") {
                  context.drawImage(
                    transitionToCanvas,
                    canvas.width * (1 - transition.progress),
                    0
                  )
                } else {
                  context.beginPath()
                  if (transition.type === "wipe") {
                    context.rect(0, 0, canvas.width * transition.progress, canvas.height)
                  } else {
                    const edge = canvas.width * transition.progress
                    context.moveTo(0, 0)
                    context.lineTo(0, canvas.height)
                    for (let y = canvas.height; y >= 0; y -= 24)
                      context.lineTo(edge + Math.sin(y * 0.03 + sceneIndex) * 14, y)
                    context.closePath()
                  }
                  context.clip()
                  context.drawImage(transitionToCanvas, 0, 0)
                }
                context.restore()
              }
            }
            setSequenceSceneIndex(sceneIndex)
            const now = performance.now()
            if (
              now - lastUiUpdate.current >= 80 ||
              elapsed >= (playerRef.current?.duration ?? 0)
            ) {
              lastUiUpdate.current = now
              setPlayerState({
                elapsed,
                isPlaying:
                  controller.isPlaying && elapsed < controller.duration,
              })
            }
          },
          compiledIR.scenes.map((item) => {
            if (sceneAnimation === "script") return item.transition
            if (sceneAnimation === "none") return { type: "none" as const, duration: 0 }
            return { type: sceneAnimation, duration: transitionDuration }
          }),
          sceneGapSeconds === "script"
            ? compiledIR.scenes.map((item) => item.gapAfter ?? 0)
            : sceneGapSeconds
        )
      : new Player(timelines[activeSceneIndex]!, (state, elapsed) => {
          renderStateRef.current = state
          narrationRef.current?.sync(
            state.subtitle,
            `scene:${activeSceneIndex}`,
            readAlongRef.current,
            controller.isPlaying
          )
          drawScene(
            context,
            state,
            undefined,
            compiledIR.canvas,
            compiledIR.background,
            compiledIR.style.mode,
            compiledIR.style.board,
            compiledIR.style.hand,
            subtitlesOnRef.current,
            readAlongRef.current
          )
          const now = performance.now()
          if (
            now - lastUiUpdate.current >= 80 ||
            elapsed >= controller.duration
          ) {
            lastUiUpdate.current = now
            setPlayerState({
              elapsed,
              isPlaying: controller.isPlaying && elapsed < controller.duration,
            })
          }
        })
    playerRef.current = controller
    setSequenceStarts(
      controller instanceof SequencePlayer ? controller.sceneStartTimes : []
    )
    void loadHandwrittenFont().then(() =>
      controller.seek(controller.currentTime)
    )
    const startTime = preserved
      ? Math.min(preserved.time, controller.duration)
      : 0
    controller.seek(startTime)
    setPlayerState({
      elapsed: startTime,
      duration: controller.duration,
      isPlaying: false,
    })
    if (preserved?.wasPlaying) {
      controller.play()
    } else if (autoplayAll.current) {
      autoplayAll.current = false
      controller.play()
    } else if (autoplayNext.current) {
      autoplayNext.current = false
      controller.play()
    }
    return () => {
      controller.dispose()
      narrationRef.current?.cancel()
    }
  }, [compiledIR, activeSceneIndex, scene, effectivePlayAllMode, sceneGapSeconds, sceneAnimation, transitionDuration, imageReadiness, setPlayerState])

  useEffect(() => {
    const overlay = preflightCanvasRef.current
    const canvas = canvasRef.current
    if (!overlay || !canvas) return
    if (overlay.width !== canvas.width) overlay.width = canvas.width
    if (overlay.height !== canvas.height) overlay.height = canvas.height
    const context = overlay.getContext("2d")
    if (!context) return
    const state = renderStateRef.current
    if (!preflightOn || !state || !compiledIR) {
      context.clearRect(0, 0, overlay.width, overlay.height)
      return
    }
    const issueIds = new Set(
      state.nodes
        .filter((node) => diagnostics.some((item) => item.message.includes(`"${node.id}"`)))
        .map((node) => node.id)
    )
    drawPreflightOverlay(context, state, compiledIR.canvas, issueIds)
  }, [preflightOn, player.elapsed, diagnostics, compiledIR])

  useEffect(() => {
    if (runId <= 0 || handledRunId.current === runId) return
    const controller = playerRef.current
    if (!controller) return
    handledRunId.current = runId
    controller.seek(0)
    if (!readAlongOn || !compiledIR) {
      controller.play()
      return
    }
    let cancelled = false
    const lines = compiledIR.scenes.flatMap((item) => scheduleSays(item.says ?? []))
    setVoicePrepProgress({ completed: 0, total: 0 })
    setVoiceNotice(lines.length ? "Preparing narration…" : "This script has no SAY lines to read.")
    void narrationRef.current.prepare(
      lines,
      selectedVoice,
      (completed, total) => setVoicePrepProgress({ completed, total })
    ).then(async ({ skipped }) => {
      if (cancelled) return
      await narrationRef.current.unlock()
      if (cancelled) return
      setVoiceNotice(skipped
        ? `Kokoro skipped ${skipped} Arabic line${skipped === 1 ? "" : "s"}; this model does not speak Arabic.`
        : lines.length ? "" : "This script has no SAY lines to read.")
      controller.play()
    }).catch((error: unknown) => {
      if (cancelled) return
      setVoicePrepProgress({ completed: 0, total: 0 })
      setVoiceStatus("error")
      setVoiceNotice(`Kokoro could not prepare narration: ${error instanceof Error ? error.message : String(error)}`)
      controller.play()
    })
    return () => { cancelled = true }
  }, [compiledIR, imageReadiness, readAlongOn, runId, selectedVoice])

  const seek = (value: string) => playerRef.current?.seek(Number(value))
  const sceneCount = compiledIR?.scenes.length ?? 0
  const hasNext = !effectivePlayAllMode && activeSceneIndex < sceneCount - 1
  const ended =
    player.duration > 0 &&
    player.elapsed >= player.duration &&
    !player.isPlaying
  const sequenceSceneStarts = effectivePlayAllMode ? sequenceStarts : []
  const presentationSceneIndex = effectivePlayAllMode ? sequenceSceneIndex : activeSceneIndex
  const presentationScene = compiledIR?.scenes[presentationSceneIndex]
  const formatTime = (time: number) =>
    `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`
  return (
    <>
    <section
      className={presentationMode
        ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0b0e0d] text-white"
        : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/30"}
      aria-label="Preview"
    >
      {presentationMode && (
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 sm:h-14 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 font-semibold tracking-tight">Strokeline</span>
            <span className="text-white/30">/</span>
            <span className="truncate text-white/70">
              {presentationScene?.label ?? `Scene ${presentationSceneIndex + 1}`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-xs text-white/50 sm:inline">
              {presentationSceneIndex + 1} / {sceneCount}
            </span>
            <button
              type="button"
              onClick={onExitPresentation}
              title="Return to editing (Esc)"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="size-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      )}
      {!presentationMode && (
        <SceneTabs
          activeIndex={playAllMode ? sequenceSceneIndex : activeSceneIndex}
          onSelect={() => setPlayAllMode(false)}
        />
      )}
      <div className={presentationMode
        ? "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#101512] p-3 sm:p-8"
        : "relative flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4"}>
        {!presentationMode && (
          <button
            type="button"
            aria-pressed={preflightOn}
            onClick={() => setPreflightOn((enabled) => !enabled)}
            title="Show safe margins and object bounds; guides are not exported"
            className={`absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent ${preflightOn ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
          >
            {preflightOn ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            <span>Preflight</span>
            {diagnostics.length > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-600">
                {diagnostics.length}
              </span>
            )}
          </button>
        )}
        {scene ? (
          <div className="relative inline-flex max-h-full max-w-full">
            <canvas
              ref={canvasRef}
              className={presentationMode
                ? "block max-h-full max-w-full bg-background shadow-[0_24px_90px_rgba(0,0,0,0.48)]"
                : "block max-h-full max-w-full border border-border bg-background shadow-sm"}
            />
            {preflightOn && !presentationMode && (
              <canvas
                ref={preflightCanvasRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 block h-full w-full"
              />
            )}
          </div>
        ) : script.trim() === "" ? (
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Write a scene in the editor, then run it to preview.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run a valid script to preview it.
          </p>
        )}
        {presentationMode && ended && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/55 p-5 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-[#f1eddc] p-7 text-[#202923] shadow-2xl sm:p-9">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#64745f] uppercase">
                Presentation complete
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                That’s the whole story.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#576259]">
                Replay the explanation or return to your script.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playerRef.current?.seek(0)
                    playButtonRef.current?.click()
                  }}
                  className="rounded-full bg-[#202923] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#35453a]"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={onExitPresentation}
                  className="rounded-full px-4 py-2 text-sm font-medium text-[#202923] transition-colors hover:bg-black/5"
                >
                  Back to editor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={presentationMode
        ? "flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 bg-[#0b0e0d] px-3 py-3 text-white sm:gap-3 sm:px-8"
        : "flex flex-wrap items-center gap-2 border-t border-border bg-card px-2 py-2 sm:gap-3 sm:px-4 sm:py-3"}>
        {sceneCount > 1 && !presentationMode && (
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent">
              Scenes
            </summary>
            <div className="absolute bottom-full left-0 z-30 mb-2 grid min-w-56 gap-2 rounded-md border border-border bg-popover p-3 text-xs shadow-lg">
              <button
                type="button"
                aria-pressed={playAllMode}
                onClick={() => {
                  if (playAllMode) setPlayAllMode(false)
                  else {
                    autoplayAll.current = true
                    setPlayAllMode(true)
                  }
                }}
                className={`rounded-md border px-2.5 py-1.5 text-left text-xs font-medium ${playAllMode ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
              >
                {playAllMode ? "Playing all scenes" : "Play all scenes"}
              </button>
              <label className="grid gap-1 text-muted-foreground">
                Time between scenes
                <select
                  aria-label="Time between scenes"
                  value={sceneGapSeconds}
                  onChange={(event) => {
                    preservePlaybackPosition()
                    setSceneGapSeconds(event.target.value === "script" ? "script" : Number(event.target.value))
                  }}
                  className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
                >
                  <option value="script">Use script settings</option>
                  {[0, 0.25, 0.5, 1, 2, 3, 5].map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds}s</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-muted-foreground">
                Scene animation
                <select
                  aria-label="Scene animation"
                  value={sceneAnimation}
                  onChange={(event) => {
                    preservePlaybackPosition()
                    setSceneAnimation(event.target.value as SceneAnimation)
                  }}
                  className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
                >
                  <option value="script">Use script settings</option>
                  <option value="none">Cut</option>
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="slide">Slide</option>
                  <option value="erase">Erase</option>
                </select>
              </label>
              <label className="grid gap-1 text-muted-foreground">
                Animation duration
                <select
                  aria-label="Animation duration"
                  value={transitionDuration}
                  disabled={sceneAnimation === "script" || sceneAnimation === "none"}
                  onChange={(event) => {
                    preservePlaybackPosition()
                    setTransitionDuration(Number(event.target.value))
                  }}
                  className="h-8 rounded-md border border-border bg-background px-2 text-foreground disabled:opacity-50"
                >
                  {[0.3, 0.6, 1, 1.5, 2].map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds}s</option>
                  ))}
                </select>
              </label>
            </div>
          </details>
        )}
        <button
          type="button"
          aria-label={`Subtitles ${subtitlesOn ? "on" : "off"}; toggle with K`}
          aria-pressed={subtitlesOn}
          title="Toggle subtitles (K)"
          onClick={toggleSubtitles}
          className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${presentationMode
            ? `order-4 ${subtitlesOn ? "border-white bg-white text-[#0b0e0d]" : "border-white/20 bg-white/5 text-white hover:bg-white/10"}`
            : subtitlesOn ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
        >
          CC
        </button>
        <button
          type="button"
          aria-label={`Spoken narration ${readAlongOn ? "on" : "off"}`}
          aria-pressed={readAlongOn}
          title={!voiceSupported ? "Natural voice playback is unavailable in this browser" : voiceNotice || (kokoroState.status === "loading" ? `${kokoroState.message} ${kokoroState.progress}%` : `Kokoro ${readAlongOn ? "on" : "off"} · ${activeVoiceLabel}${activeVoice ? ` · ${activeVoice.language} · ${activeVoice.gender}` : ""}`)}
          disabled={!voiceSupported}
          onClick={toggleReadAlong}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${presentationMode
            ? `order-5 ${readAlongOn ? "border-white bg-white text-[#0b0e0d]" : "border-white/20 bg-white/5 text-white hover:bg-white/10"}`
            : readAlongOn ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          {!presentationMode && (kokoroState.status === "loading"
            ? `${kokoroState.progress}%`
            : voiceStatus === "preparing"
            ? voicePrepProgress.total > 0 ? `${voicePrepProgress.completed}/${voicePrepProgress.total}` : "Preparing…"
            : activeVoiceLabel)}
        </button>
        {!presentationMode && <button
          type="button"
          aria-label="Choose reader voice"
          title="Choose reader voice"
          onClick={() => setVoiceDialogOpen(true)}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent"
        >
          <Settings2 className="size-3.5" aria-hidden="true" />
        </button>}
        <button
          ref={playButtonRef}
          type="button"
          title={player.isPlaying ? "Pause" : "Play"}
          aria-label={player.isPlaying ? "Pause" : "Play"}
          onClick={() => {
            const store = useAppStore.getState()
            if (store.compiledSource !== store.script || !playerRef.current) {
              narrationRef.current?.cancel()
              store.run()
              return
            }
            if (playerRef.current.isPlaying) {
              narrationRef.current?.pause()
              playerRef.current.pause()
              setPlayerState({ isPlaying: false })
            } else {
              const controller = playerRef.current
              if (!controller) return
              void (async () => {
                try {
                  await narrationRef.current?.unlock()
                  if (readAlongOn && compiledIR && (voiceStatus === "idle" || voiceStatus === "error")) {
                    setVoiceStatus("preparing")
                    setVoicePrepProgress({ completed: 0, total: 0 })
                    setVoiceNotice("Preparing narration…")
                    const lines = compiledIR.scenes.flatMap((item) => scheduleSays(item.says ?? []))
                    const { skipped } = await narrationRef.current.prepare(
                      lines,
                      selectedVoice,
                      (completed, total) => setVoicePrepProgress({ completed, total })
                    )
                    await narrationRef.current?.unlock()
                    setVoiceNotice(skipped
                      ? `Kokoro skipped ${skipped} Arabic line${skipped === 1 ? "" : "s"}; this model does not speak Arabic.`
                      : lines.length ? "" : "This script has no SAY lines to read.")
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error)
                  setVoiceStatus("error")
                  setVoiceNotice(`Kokoro could not prepare narration: ${message}`)
                }
                narrationRef.current?.resume()
                controller.play()
                setPlayerState({ isPlaying: true })
              })()
            }
          }}
          aria-keyshortcuts="Space"
          className={presentationMode
            ? "order-1 inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white text-[#0b0e0d] transition-transform hover:scale-105"
            : "inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent"}
        >
          {player.isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </button>
        <div className={presentationMode
          ? "relative order-2 min-w-0 basis-full flex-1 sm:basis-auto"
          : "relative order-last min-w-0 basis-full flex-1 sm:order-none sm:basis-auto"}>
          <input
            aria-label="Timeline scrubber"
            type="range"
            min="0"
            max={player.duration || 1}
            step="0.01"
            value={Math.min(player.elapsed, player.duration || 1)}
            onChange={(event) => seek(event.target.value)}
            className={`relative z-10 block w-full ${presentationMode ? "accent-white" : ""}`}
          />
          {player.duration > 0 && sequenceSceneStarts.slice(1).map((time, index) => (
            <button
              key={`${index + 1}-${time}`}
              type="button"
              title={`Scene ${index + 2} starts at ${time.toFixed(1)}s`}
              aria-label={`Seek to scene ${index + 2}, ${time.toFixed(1)} seconds`}
              onClick={() => playerRef.current?.seek(time)}
              style={{ left: `${(time / player.duration) * 100}%` }}
              className="group absolute inset-y-0 z-20 flex w-4 -translate-x-1/2 items-center justify-center"
            >
              <span className={`h-3.5 w-0.5 rounded-full transition-colors ${presentationMode ? "bg-white/70 group-hover:bg-white" : "bg-foreground/70 group-hover:bg-primary"}`} />
            </button>
          ))}
        </div>
        <span className={presentationMode
          ? "order-3 w-24 text-right font-mono text-xs text-white/60"
          : "w-24 text-right font-mono text-xs text-muted-foreground"}>
          {presentationMode
            ? `${formatTime(player.elapsed)} / ${formatTime(player.duration)}`
            : `${player.elapsed.toFixed(2)} / ${player.duration.toFixed(2)}s`}
        </span>
        {!presentationMode && !playAllMode && ended && (
          <button
            type="button"
            title="Replay this scene"
            onClick={() => {
              playerRef.current?.seek(0)
              playerRef.current?.play()
            }}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            title={
              ended
                ? "Go to the next scene"
                : "Plays when the current scene ends"
            }
            disabled={!ended}
            onClick={() => {
              autoplayNext.current = true
              setActiveSceneIndex(activeSceneIndex + 1)
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SkipForward className="size-3.5" /> Next scene
          </button>
        )}
      </div>
      {(voiceNotice || voiceStatus === "preparing") && (
        <div
          role={voiceStatus === "error" ? "alert" : "status"}
          aria-live={voiceStatus === "error" ? "assertive" : "polite"}
          className={`flex items-center gap-2 border-t px-3 py-1.5 text-xs ${presentationMode ? "border-white/10" : "border-border"} ${voiceStatus === "error" ? "text-destructive" : presentationMode ? "text-white/60" : "text-muted-foreground"}`}
        >
          <span className="min-w-0 flex-1 truncate">
            {voiceNotice || (kokoroState.status === "loading"
              ? `${kokoroState.message} ${kokoroState.progress}%`
              : voicePrepProgress.total > 0
                ? `Preparing narration · ${voicePrepProgress.completed}/${voicePrepProgress.total}`
                : "Preparing reader…")}
          </span>
          <button type="button" aria-label="Dismiss reader message" onClick={() => setVoiceNotice("")} className="shrink-0 px-1 text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}
    </section>
    <VoiceSettingsDialog
      key={`${selectedVoice}:${voiceDialogOpen}`}
      open={voiceDialogOpen}
      selectedVoice={selectedVoice}
      volume={readerVolume}
      onVolumeChange={(volume) => {
        const savedVolume = saveReaderVolume(volume)
        setReaderVolume(savedVolume)
        narrationRef.current.setVolume(savedVolume)
      }}
      preparing={voicePrepProgress}
      preparingActive={voiceStatus === "preparing"}
      error={voiceStatus === "error" ? voiceNotice : ""}
      onClose={() => setVoiceDialogOpen(false)}
      onUseVoice={(voice) => void enableReader(voice)}
    />
    </>
  )
}
