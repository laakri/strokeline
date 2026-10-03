import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Check, Eye, EyeOff, Pause, Play, RotateCcw, Settings2, SkipForward, Volume2, X } from "lucide-react"
import { drawScene } from "@/renderer/draw.ts"
import { preloadImages } from "@/renderer/images.ts"
import { loadHandwrittenFont } from "@/renderer/handdrawn.ts"
import { useAppStore, type EditorSourceEdit } from "@/app/store.ts"
import { Player, SequencePlayer } from "@/player/usePlayer.ts"
import { SubtitleNarration, type VoiceStatus } from "@/player/subtitleNarration.ts"
import { getKokoroState, subscribeKokoro } from "@/player/kokoro.ts"
import { scheduleSays } from "@/subtitles/subtitles.ts"
import { Timeline, type RenderState } from "@/timeline/timeline.ts"
import { drawPreflightOverlay, preflightNodeAt, preflightNodesAt } from "@/renderer/preflightOverlay.ts"
import { makeSceneInsertEdit } from "@/dsl/insertSnippet.ts"
import { editObjectProperties, objectSourceCapability, removeObjectBlock } from "@/dsl/objectSourceEdits.ts"
import { ObjectActions } from "@/ui/preview/ObjectActions.tsx"
import type { ObjectEditValues } from "@/dsl/objectSourceEdits.ts"
import { SceneTabs } from "@/ui/preview/SceneTabs.tsx"
import { VoiceSettingsDialog } from "@/ui/preview/VoiceSettingsDialog.tsx"
import { readReaderVolume, saveReaderVolume } from "@/player/readerVolume.ts"

const SUBTITLES_STORAGE_KEY = "strokeline.subtitles.v1"
const READ_ALONG_STORAGE_KEY = "strokeline.voice.v1"
const VOICE_STORAGE_KEY = "strokeline.voiceId.v1"
type SceneAnimation = "script" | "none" | "fade" | "wipe" | "slide" | "erase"

interface PreviewDrag {
  pointerId: number
  id: string
  state: RenderState
  startWorldX: number
  startWorldY: number
  startClientX: number
  startClientY: number
  sourceLine?: number
  canMove: boolean
  cycleOnClick: boolean
  hitIds: string[]
  moved: boolean
}

function worldPointAt(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  state: RenderState,
  size: { width: number; height: number }
): { x: number; y: number } | undefined {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return undefined
  const screenX = ((clientX - rect.left) / rect.width) * size.width
  const screenY = ((clientY - rect.top) / rect.height) * size.height
  const scale = state.camera.scale || 1
  return {
    x: state.camera.position.x + (screenX - size.width / 2) / scale,
    y: state.camera.position.y + (screenY - size.height / 2) / scale,
  }
}

function positionEditsForDrag(
  source: string,
  sourceLine: number,
  deltaX: number,
  deltaY: number
): EditorSourceEdit[] | undefined {
  const lines = source.split("\n")
  const startIndex = sourceLine - 1
  if (startIndex < 0 || startIndex >= lines.length) return undefined
  const number = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?"
  const positionPattern = new RegExp(`^(\\s*POSITION\\s+)(${number})(\\s+)(${number})\\s*$`, "i")
  let lineOffset = lines.slice(0, startIndex).reduce((sum, line) => sum + line.length + 1, 0)
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index] ?? ""
    if (index > startIndex && /^\s*END(?:\s+SCENE)?\s*$/i.test(line)) return undefined
    if (index > startIndex && /^\s*(?:SCENE|CREATE|TABLE|DEFINE|BARCHART|LINECHART|PIECHART)\b/i.test(line)) return undefined
    const match = positionPattern.exec(line)
    if (match) {
      const x = Number(match[2]) + deltaX
      const y = Number(match[4]) + deltaY
      if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined
      const xFrom = lineOffset + (match[1]?.length ?? 0)
      const yFrom = xFrom + (match[2]?.length ?? 0) + (match[3]?.length ?? 0)
      const format = (value: number) => String(Math.round(value * 10) / 10)
      return [
        { from: xFrom, to: xFrom + (match[2]?.length ?? 0), insert: format(x) },
        { from: yFrom, to: yFrom + (match[4]?.length ?? 0), insert: format(y) },
      ]
    }
    lineOffset += line.length + 1
  }
  return undefined
}

function moveRenderNode(state: RenderState, id: string, x: number, y: number): RenderState {
  return {
    ...state,
    nodes: state.nodes.map((node) => node.id === id
      ? { ...node, position: { x: node.position.x + x, y: node.position.y + y } }
      : node),
  }
}

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
  const dragRef = useRef<PreviewDrag | null>(null)
  const suppressPreflightClick = useRef(false)
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
  const [preflightSelectedId, setPreflightSelectedId] = useState<string | null>(null)
  const [dragVisualState, setDragVisualState] = useState<RenderState | null>(null)
  const [objectMenu, setObjectMenu] = useState<{
    id: string
    clientX: number
    clientY: number
    worldX: number
    worldY: number
    hitIds: string[]
    sceneIndex: number
  } | null>(null)
  const [connectFrom, setConnectFrom] = useState<{ id: string; sceneIndex: number } | null>(null)
  const [objectNotice, setObjectNotice] = useState("")
  const [subtitleOverride, setSubtitleOverride] = useState<boolean | null>(readSubtitleOverride)
  const [readAlongOn, setReadAlongOn] = useState(readReadAlongSetting)
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(readVoiceSetting)
  const [readerVolume, setReaderVolume] = useState(readReaderVolume)
  const [voicePrepProgress, setVoicePrepProgress] = useState({ completed: 0, total: 0 })
  const [voiceNotice, setVoiceNotice] = useState("")
  const [readerToast, setReaderToast] = useState("")
  const readerToastTimer = useRef<number | null>(null)
  const showReaderToast = useCallback((message: string) => {
    setReaderToast(message)
    if (readerToastTimer.current !== null) window.clearTimeout(readerToastTimer.current)
    readerToastTimer.current = window.setTimeout(() => {
      setReaderToast("")
      readerToastTimer.current = null
    }, 5000)
  }, [])
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

  useEffect(() => () => {
    if (readerToastTimer.current !== null) window.clearTimeout(readerToastTimer.current)
  }, [])
  const script = useAppStore((state) => state.script)
  const compiledSource = useAppStore((state) => state.compiledSource)
  const activeSceneIndex = useAppStore((state) => state.activeSceneIndex)
  const setActiveSceneIndex = useAppStore((state) => state.setActiveSceneIndex)
  const runId = useAppStore((state) => state.runId)
  const player = useAppStore((state) => state.player)
  const setPlayerState = useAppStore((state) => state.setPlayerState)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const requestEditorJump = useAppStore((state) => state.requestEditorJump)
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
        : "")
      setVoiceDialogOpen(false)
      autoplayAll.current = false
      autoplayNext.current = false
      preservedPlayback.current = null
      controller?.pause()
      setPlayAllMode(true)
      controller?.seek(0)
      setPlayerState({ elapsed: 0, isPlaying: false })
      showReaderToast(skipped
        ? `Reader ready. All scenes reset and paused; ${skipped} Arabic line${skipped === 1 ? " was" : "s were"} skipped.`
        : lines.length === 0
          ? "Reader ready. All scenes reset and paused. Add SAY lines for narration."
          : "Reader ready. All scenes reset and paused.")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      narrationRef.current.setVoice(selectedVoice)
      setVoicePrepProgress({ completed: 0, total: 0 })
      setVoiceStatus("error")
      setVoiceNotice(`Kokoro could not prepare narration: ${message}`)
      if (wasPlaying) controller?.play()
      setPlayerState({ elapsed: time, isPlaying: wasPlaying })
    }
  }, [compiledIR, player.elapsed, player.isPlaying, selectedVoice, setPlayAllMode, setPlayerState, showReaderToast])

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
    let cachedTransitionFrom: RenderState | null = null
    let cachedTransitionTo: RenderState | null = null
    let cachedTransitionSubtitles: boolean | null = null
    let cachedTransitionReadAlong: boolean | null = null
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
                const subtitlesEnabled = subtitlesOnRef.current
                const readAlongEnabled = readAlongRef.current
                if (
                  cachedTransitionFrom !== transition.from ||
                  cachedTransitionTo !== transition.to ||
                  cachedTransitionSubtitles !== subtitlesEnabled ||
                  cachedTransitionReadAlong !== readAlongEnabled
                ) {
                  drawScene(
                    fromContext,
                    transition.from,
                    undefined,
                    compiledIR.canvas,
                    compiledIR.background,
                    compiledIR.style.mode,
                    compiledIR.style.board,
                    compiledIR.style.hand,
                    subtitlesEnabled,
                    readAlongEnabled
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
                    subtitlesEnabled,
                    readAlongEnabled
                  )
                  cachedTransitionFrom = transition.from
                  cachedTransitionTo = transition.to
                  cachedTransitionSubtitles = subtitlesEnabled
                  cachedTransitionReadAlong = readAlongEnabled
                }
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
    const state = dragVisualState ?? renderStateRef.current
    if ((!preflightOn && !preflightSelectedId) || !state || !compiledIR) {
      context.clearRect(0, 0, overlay.width, overlay.height)
      return
    }
    const issueSeverities = new Map<string, "error" | "warning">()
    for (const node of state.nodes) {
      const issue = diagnostics.find((item) => item.message.includes(`"${node.id}"`))
      if (issue) issueSeverities.set(node.id, issue.severity)
    }
    drawPreflightOverlay(
      context,
      state,
      compiledIR.canvas,
      issueSeverities,
      preflightSelectedId ?? undefined,
      preflightOn,
      !preflightOn
    )
  }, [preflightOn, preflightSelectedId, player.elapsed, diagnostics, compiledIR, dragVisualState])

  const jumpToObject = (targetId: string) => {
    if (!compiledIR) return
    const issue = diagnostics.find((item) => item.message.includes('"' + targetId + '"'))
    const sceneIndex = effectivePlayAllMode ? sequenceSceneIndex : activeSceneIndex
    const source = compiledIR.scenes[sceneIndex]?.ops.find(
      (op) => op.kind === "create" && op.node.id === targetId
    )?.source
    const location = issue ?? source
    if (location) requestEditorJump(location.line, location.col)
  }

  const handlePreflightPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !compiledIR) return
    const state = renderStateRef.current
    const canvas = preflightCanvasRef.current
    if (!state || !canvas) return
    const point = worldPointAt(event.clientX, event.clientY, canvas, state, compiledIR.canvas)
    if (!point) return
    const hitIds = preflightNodesAt(state, point.x, point.y)
    if (!hitIds.length) {
      dragRef.current = null
      return
    }
    const cycleOnClick = preflightSelectedId !== null && hitIds.includes(preflightSelectedId)
    const targetId = cycleOnClick ? preflightSelectedId : hitIds[0]!
    const sceneIndex = effectivePlayAllMode ? sequenceSceneIndex : activeSceneIndex
    const source = compiledIR.scenes[sceneIndex]?.ops.find(
      (op) => op.kind === "create" && op.node.id === targetId
    )?.source
    const currentSource = useAppStore.getState().editorSourceReader?.() ?? script
    dragRef.current = {
      pointerId: event.pointerId,
      id: targetId,
      state,
      startWorldX: point.x,
      startWorldY: point.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      sourceLine: source?.line,
      canMove: source !== undefined && currentSource === compiledSource &&
        positionEditsForDrag(compiledSource, source.line, 0, 0) !== undefined,
      cycleOnClick,
      hitIds,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePreflightPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const canvas = preflightCanvasRef.current
    if (!drag || drag.pointerId !== event.pointerId || !drag.canMove || !canvas || !compiledIR) return
    if (!drag.moved && Math.hypot(event.clientX - drag.startClientX, event.clientY - drag.startClientY) < 4) return
    if (!drag.moved) {
      drag.moved = true
      setPreflightSelectedId(drag.id)
      jumpToObject(drag.id)
      const controller = playerRef.current
      preservedPlayback.current = {
        time: controller?.currentTime ?? player.elapsed,
        wasPlaying: false,
      }
      controller?.pause()
      setPlayerState({ isPlaying: false })
    }
    const point = worldPointAt(event.clientX, event.clientY, canvas, drag.state, compiledIR.canvas)
    if (!point) return
    const visualState = moveRenderNode(
      drag.state,
      drag.id,
      point.x - drag.startWorldX,
      point.y - drag.startWorldY
    )
    setDragVisualState(visualState)
    const context = canvasRef.current?.getContext("2d")
    if (context) {
      drawScene(
        context,
        visualState,
        undefined,
        compiledIR.canvas,
        compiledIR.background,
        compiledIR.style.mode,
        compiledIR.style.board,
        compiledIR.style.hand,
        subtitlesOnRef.current,
        readAlongRef.current
      )
    }
    event.preventDefault()
  }

  const handlePreflightPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const canvas = preflightCanvasRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (drag.moved && drag.sourceLine !== undefined && canvas && compiledIR) {
      const point = worldPointAt(event.clientX, event.clientY, canvas, drag.state, compiledIR.canvas)
      const currentSource = useAppStore.getState().editorSourceReader?.() ?? script
      if (point && currentSource === compiledSource) {
        const edits = positionEditsForDrag(
          compiledSource,
          drag.sourceLine,
          point.x - drag.startWorldX,
          point.y - drag.startWorldY
        )
        if (edits) {
          jumpToObject(drag.id)
          useAppStore.getState().applyEditorSourceEdits(edits)
        }
      }
      suppressPreflightClick.current = true
      window.setTimeout(() => { suppressPreflightClick.current = false }, 0)
    }
    setDragVisualState(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePreflightPointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragVisualState(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handlePreflightClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (suppressPreflightClick.current) {
      suppressPreflightClick.current = false
      return
    }
    const state = renderStateRef.current
    const canvas = preflightCanvasRef.current
    if (!state || !canvas || !compiledIR) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const screenX = ((event.clientX - rect.left) / rect.width) * compiledIR.canvas.width
    const screenY = ((event.clientY - rect.top) / rect.height) * compiledIR.canvas.height
    const worldX = state.camera.position.x + (screenX - compiledIR.canvas.width / 2) / state.camera.scale
    const worldY = state.camera.position.y + (screenY - compiledIR.canvas.height / 2) / state.camera.scale
    const hitIds = preflightNodesAt(state, worldX, worldY)
    const targetId = preflightNodeAt(state, worldX, worldY, preflightSelectedId)
    if (!targetId) {
      setPreflightSelectedId(null)
      setObjectMenu(null)
      if (connectFrom) setObjectNotice("Click an object to connect the arrow, or cancel.")
      return
    }
    setObjectNotice("")
    if (connectFrom) {
      if (targetId === connectFrom.id) {
        setObjectNotice("Choose a different object as the arrow destination.")
        return
      }
      const current = useAppStore.getState()
      const source = current.editorSourceReader?.() ?? current.script
      const edit = makeSceneInsertEdit(source, `ARROW ${connectFrom.id} -> ${targetId}`, connectFrom.sceneIndex)
      if (!edit) {
        setObjectNotice("Add a SCENE before connecting objects.")
        setConnectFrom(null)
        return
      }
      current.applyEditorSourceEdits([edit])
      window.requestAnimationFrame(() => useAppStore.getState().compileScript())
      setObjectNotice(`Arrow connected: ${connectFrom.id} → ${targetId}`)
      setConnectFrom(null)
      setObjectMenu(null)
      return
    }
    setPreflightSelectedId(targetId)
    const issue = diagnostics.find((item) => item.message.includes(`"${targetId}"`))
    const sceneIndex = effectivePlayAllMode ? sequenceSceneIndex : activeSceneIndex
    const source = compiledIR.scenes[sceneIndex]?.ops.find(
      (op) => op.kind === "create" && op.node.id === targetId
    )?.source
    const location = issue ?? source
    if (location) requestEditorJump(location.line, location.col)
    setObjectMenu({
      id: targetId,
      clientX: event.clientX,
      clientY: event.clientY,
      worldX,
      worldY,
      hitIds,
      sceneIndex,
    })
  }

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
  const narrationLineCount = compiledIR?.scenes.reduce(
    (count, scene) => count + (scene.says?.length ?? 0),
    0
  ) ?? 0
  const hasNext = !effectivePlayAllMode && activeSceneIndex < sceneCount - 1
  const ended =
    player.duration > 0 &&
    player.elapsed >= player.duration &&
    !player.isPlaying
  const sequenceSceneStarts = effectivePlayAllMode ? sequenceStarts : []
  const presentationSceneIndex = effectivePlayAllMode ? sequenceSceneIndex : activeSceneIndex
  const presentationScene = compiledIR?.scenes[presentationSceneIndex]
  const selectedObjectNode = objectMenu
    ? compiledIR?.scenes[objectMenu.sceneIndex]?.ops.find(
        (op) => op.kind === "create" && op.node.id === objectMenu.id
      )?.node
    : undefined
  const currentEditorSource = useAppStore.getState().editorSourceReader?.() ?? script
  const objectCapability = objectMenu
    ? objectSourceCapability(currentEditorSource, objectMenu.id)
    : { editable: false, deletable: false, positionEditable: false }
  const sourceIsCurrent = currentEditorSource === compiledSource
  const applyAndCompileEdits = (edits: EditorSourceEdit[]) => {
    const current = useAppStore.getState()
    current.applyEditorSourceEdits(edits)
    window.requestAnimationFrame(() => useAppStore.getState().compileScript())
  }
  const editSelectedObject = (values: ObjectEditValues): boolean => {
    if (!selectedObjectNode || !objectMenu) return false
    const source = useAppStore.getState().editorSourceReader?.() ?? useAppStore.getState().script
    const edits = editObjectProperties(source, selectedObjectNode, values)
    if (!edits?.length) return false
    applyAndCompileEdits(edits)
    return true
  }
  const deleteSelectedObject = () => {
    if (!objectMenu || !objectCapability.deletable || !sourceIsCurrent) return
    const source = useAppStore.getState().editorSourceReader?.() ?? useAppStore.getState().script
    const edit = removeObjectBlock(source, objectMenu.id)
    if (!edit) return
    applyAndCompileEdits([edit])
    setObjectMenu(null)
    setPreflightSelectedId(null)
  }
  const formatTime = (time: number) =>
    `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`
  return (
    <>
    <section
      data-workspace-guide-target="preview"
      className={presentationMode
        ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0b0e0d] text-white"
        : "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/30"}
      aria-label="Preview"
    >
      {readerToast && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-5">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl border border-emerald-600/20 bg-background/95 px-4 py-3 text-sm text-foreground shadow-xl backdrop-blur"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">{readerToast}</span>
            <button
              type="button"
              aria-label="Dismiss reader preparation message"
              onClick={() => setReaderToast("")}
              className="shrink-0 rounded-md px-1 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
            onClick={() => {
              setPreflightOn((enabled) => !enabled)
              setPreflightSelectedId(null)
              setObjectMenu(null)
              setConnectFrom(null)
            }}
            title="Show the safe area, center guides, and diagnostic highlights; not exported"
            className={`absolute right-3 top-3 z-20 inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-accent ${preflightOn ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
          >
            {preflightOn ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            <span>Layout</span>
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
            {!presentationMode && (
              <canvas
                ref={preflightCanvasRef}
                aria-label="Click an object to edit it or connect it; drag to reposition."
                onClick={handlePreflightClick}
                onPointerDown={handlePreflightPointerDown}
                onPointerMove={handlePreflightPointerMove}
                onPointerUp={handlePreflightPointerUp}
                onPointerCancel={handlePreflightPointerCancel}
                title="Click an object for edit, delete, or arrow actions; drag to reposition"
                className="absolute inset-0 block h-full w-full touch-none cursor-pointer active:cursor-grabbing"
              />
            )}
            {connectFrom && !presentationMode && (
              <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl ring-1 ring-border/70">
                <span>Click a destination object to connect the arrow.</span>
                <button type="button" onClick={() => { setConnectFrom(null); setObjectNotice("") }} className="font-semibold text-primary hover:underline">Cancel</button>
              </div>
            )}
            {objectNotice && !connectFrom && !presentationMode && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-xl bg-popover px-3 py-2 text-xs text-popover-foreground shadow-xl ring-1 ring-border/70">
                {objectNotice}
              </div>
            )}
            {preflightOn && !presentationMode && (
              <div aria-label="Layout guide key" className="pointer-events-none absolute bottom-2 left-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-background/90 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#f2c96d]" />Safe area</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#57c7d4]" />Center</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#ffad55]" />Warning</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#ff7777]" />Error</span>
                <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#72d9a0]" />Other objects</span>
                <span className="basis-full pt-0.5 sm:basis-auto sm:pt-0">
                  {preflightSelectedId ? `Selected ${preflightSelectedId} · click again to cycle` : "Click an object to jump to code"}
                </span>
              </div>
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
          aria-label="Open reader settings"
          title="Reader settings"
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
      narrationLineCount={narrationLineCount}
      error={voiceStatus === "error" ? voiceNotice : ""}
      onClose={() => setVoiceDialogOpen(false)}
      onUseVoice={(voice) => void enableReader(voice)}
    />
    {objectMenu && selectedObjectNode && !presentationMode && (
      <ObjectActions
        key={`${objectMenu.sceneIndex}:${objectMenu.id}`}
        node={selectedObjectNode}
        source={currentEditorSource}
        clientX={objectMenu.clientX}
        clientY={objectMenu.clientY}
        editable={sourceIsCurrent && objectCapability.editable}
        positionEditable={objectCapability.positionEditable}
        editReason={!sourceIsCurrent ? "Run the edited script before changing preview objects." : undefined}
        deletable={sourceIsCurrent && objectCapability.deletable}
        deleteReason={!sourceIsCurrent ? "Run the edited script before deleting preview objects." : objectCapability.deleteReason}
        overlapCount={objectMenu.hitIds.length}
        onClose={() => setObjectMenu(null)}
        onEdit={editSelectedObject}
        onDelete={deleteSelectedObject}
        onJump={() => jumpToObject(objectMenu.id)}
        onCycle={() => {
          const state = renderStateRef.current
          if (!state) return
          const id = preflightNodeAt(state, objectMenu.worldX, objectMenu.worldY, objectMenu.id)
          if (!id) return
          setPreflightSelectedId(id)
          setObjectMenu((previous) => previous ? { ...previous, id } : null)
          jumpToObject(id)
        }}
        onConnect={() => {
          setConnectFrom({ id: objectMenu.id, sceneIndex: objectMenu.sceneIndex })
          setObjectMenu(null)
          setObjectNotice("")
        }}
      />
    )}
    </>
  )
}
