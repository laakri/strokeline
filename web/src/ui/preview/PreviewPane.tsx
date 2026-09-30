import { useCallback, useEffect, useRef, useState } from "react"
import { Pause, Play, RotateCcw, SkipForward, Volume2 } from "lucide-react"
import { drawScene } from "@/renderer/draw.ts"
import { loadHandwrittenFont } from "@/renderer/handdrawn.ts"
import { useAppStore } from "@/app/store.ts"
import { Player, SequencePlayer } from "@/player/usePlayer.ts"
import { SubtitleNarration } from "@/player/subtitleNarration.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { SceneTabs } from "@/ui/preview/SceneTabs.tsx"

const SUBTITLES_STORAGE_KEY = "strokeline.subtitles.v1"
const READ_ALONG_STORAGE_KEY = "strokeline.voice.v1"
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

export function PreviewPane() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<Player | SequencePlayer | null>(null)
  const lastUiUpdate = useRef(0)
  const autoplayNext = useRef(false)
  const autoplayAll = useRef(false)
  const preservedPlayback = useRef<{ time: number; wasPlaying: boolean } | null>(null)
  const [playAllMode, setPlayAllMode] = useState(true)
  const [sequenceSceneIndex, setSequenceSceneIndex] = useState(0)
  const [sceneGapSeconds, setSceneGapSeconds] = useState<number | "script">("script")
  const [sceneAnimation, setSceneAnimation] = useState<SceneAnimation>("script")
  const [transitionDuration, setTransitionDuration] = useState(0.6)
  const [subtitleOverride, setSubtitleOverride] = useState<boolean | null>(readSubtitleOverride)
  const [readAlongOn, setReadAlongOn] = useState(readReadAlongSetting)
  const [sequenceStarts, setSequenceStarts] = useState<number[]>([])
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "ready" | "speaking" | "paused" | "error">("idle")
  const [narration] = useState(() => new SubtitleNarration(setVoiceStatus))
  const narrationRef = useRef(narration)
  const compiledIR = useAppStore((state) => state.compiledIR)
  const script = useAppStore((state) => state.script)
  const activeSceneIndex = useAppStore((state) => state.activeSceneIndex)
  const setActiveSceneIndex = useAppStore((state) => state.setActiveSceneIndex)
  const runId = useAppStore((state) => state.runId)
  const player = useAppStore((state) => state.player)
  const setPlayerState = useAppStore((state) => state.setPlayerState)
  const scene = compiledIR?.scenes[activeSceneIndex]
  const subtitlesOn = subtitleOverride ?? (compiledIR?.subtitles ?? false)
  const subtitlesOnRef = useRef(subtitlesOn)
  const readAlongRef = useRef(readAlongOn)
  useEffect(() => {
    subtitlesOnRef.current = subtitlesOn
  }, [subtitlesOn])
  useEffect(() => {
    readAlongRef.current = readAlongOn
  }, [readAlongOn])
  const voiceSupported = typeof window !== "undefined" &&
    ("AudioContext" in window || ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"))

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

  const toggleReadAlong = useCallback(() => {
    const next = !readAlongRef.current
    readAlongRef.current = next
    setReadAlongOn(next)
    try {
      localStorage.setItem(READ_ALONG_STORAGE_KEY, next ? "on" : "off")
    } catch {
      /* storage unavailable */
    }
    if (next) {
      void narrationRef.current?.unlock()
    } else {
      narrationRef.current?.cancel()
      setVoiceStatus("idle")
    }
  }, [])

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
    if (!scene || !compiledIR || !canvasRef.current) {
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
    const controller = playAllMode
      ? new SequencePlayer(
          timelines,
          (state, sceneIndex, elapsed, transition) => {
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
  }, [compiledIR, activeSceneIndex, scene, playAllMode, sceneGapSeconds, sceneAnimation, transitionDuration, setPlayerState])

  useEffect(() => {
    if (runId > 0) playerRef.current?.play()
  }, [runId])

  const seek = (value: string) => playerRef.current?.seek(Number(value))
  const sceneCount = compiledIR?.scenes.length ?? 0
  const hasNext = !playAllMode && activeSceneIndex < sceneCount - 1
  const ended =
    player.duration > 0 &&
    player.elapsed >= player.duration &&
    !player.isPlaying
  const sequenceSceneStarts = playAllMode ? sequenceStarts : []
  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/30"
      aria-label="Preview"
    >
      <SceneTabs
        activeIndex={playAllMode ? sequenceSceneIndex : activeSceneIndex}
        onSelect={() => setPlayAllMode(false)}
      />
      <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4">
        {scene ? (
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full border border-border bg-background shadow-sm"
          />
        ) : script.trim() === "" ? (
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Write a scene in the editor, then run it to preview.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Run a valid script to preview it.
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-2 py-2 sm:gap-3 sm:px-4 sm:py-3">
        {sceneCount > 1 && (
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
          className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${subtitlesOn ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
        >
          CC
        </button>
        <button
          type="button"
          aria-label={`Spoken narration ${readAlongOn ? "on" : "off"}`}
          aria-pressed={readAlongOn}
          title={!voiceSupported ? "Audio playback is unavailable in this browser" : voiceStatus === "error" ? "The browser voice could not speak this line." : "Toggle spoken narration and phrase highlight"}
          disabled={!voiceSupported}
          onClick={toggleReadAlong}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${readAlongOn ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          Voice
        </button>
        <button
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
              void narrationRef.current?.unlock()
              narrationRef.current?.resume()
              playerRef.current.play()
              setPlayerState({ isPlaying: true })
            }
          }}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-accent"
        >
          {player.isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </button>
        <div className="relative order-last min-w-0 basis-full flex-1 sm:order-none sm:basis-auto">
          <input
            aria-label="Timeline scrubber"
            type="range"
            min="0"
            max={player.duration || 1}
            step="0.01"
            value={Math.min(player.elapsed, player.duration || 1)}
            onChange={(event) => seek(event.target.value)}
            className="relative z-10 block w-full"
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
              <span className="h-3.5 w-0.5 rounded-full bg-foreground/70 transition-colors group-hover:bg-primary" />
            </button>
          ))}
        </div>
        <span className="w-24 text-right font-mono text-xs text-muted-foreground">
          {player.elapsed.toFixed(2)} / {player.duration.toFixed(2)}s
        </span>
        {!playAllMode && ended && (
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
    </section>
  )
}
