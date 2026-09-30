import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Download, FileText, FileVideo, Film, ImageDown, Loader2, X } from "lucide-react"
import { useAppStore } from "@/app/store.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import {
  exportGif,
  exportPng,
  exportSrt,
  exportVtt,
  exportVideo,
  preferredVideoExportFormat,
  videoExportDimensions,
  type VideoExportFormat,
  type VideoResolution,
} from "@/export/exporters.ts"
import { Button } from "@/ui/button"

type ExportKind = "video" | "gif" | "png" | "srt" | "vtt"

const MENU_WIDTH = 320
const MENU_OFFSET = 6

export function ExportMenu() {
  const compiledIR = useAppStore((state) => state.compiledIR)
  const activeSceneIndex = useAppStore((state) => state.activeSceneIndex)
  const player = useAppStore((state) => state.player)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<ExportKind | null>(null)
  const [exportError, setExportError] = useState("")
  const [progress, setProgress] = useState<number | null>(null)
  const [exportMessage, setExportMessage] = useState("")
  const [resolution, setResolution] = useState<VideoResolution>("1080p")
  const [fps, setFps] = useState<30 | 60>(30)
  const [includeNarration, setIncludeNarration] = useState(true)
  const [videoFormatProbe, setVideoFormatProbe] = useState<{
    key: string
    format: VideoExportFormat
  } | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const errorCount = diagnostics.filter(blocksScriptRun).length
  const { script, compiledSource, run } = useAppStore.getState()
  const needsRecompile = compiledSource !== script
  const canExport = !!compiledIR && !needsRecompile && errorCount === 0
  const itemDisabledReason = !compiledIR
    ? "Compile the script first"
    : needsRecompile
      ? "Re-run the script to refresh the build"
      : errorCount > 0
        ? `${errorCount} error${errorCount === 1 ? "" : "s"} to fix`
        : undefined
  const exporting = busy !== null
  const hasNarration = !!compiledIR?.scenes.some((scene) => (scene.says?.length ?? 0) > 0)
  const videoFormatKey = `${compiledIR?.canvas.width ?? 0}x${compiledIR?.canvas.height ?? 0}:${resolution}:${fps}:${hasNarration && includeNarration ? "audio" : "silent"}`
  const videoFormat: VideoExportFormat | "checking" =
    videoFormatProbe?.key === videoFormatKey
      ? videoFormatProbe.format
      : "checking"

  useEffect(() => {
    if (!open || !compiledIR) return
    let current = true
    if (hasNarration && includeNarration) {
      setVideoFormatProbe({ key: videoFormatKey, format: "webm" })
      return () => {
        current = false
      }
    }
    const { width, height } = videoExportDimensions(compiledIR, resolution)
    void preferredVideoExportFormat(width, height, fps).then((format) => {
      if (current) setVideoFormatProbe({ key: videoFormatKey, format })
    })
    return () => {
      current = false
    }
  }, [open, compiledIR, resolution, fps, includeNarration, hasNarration, videoFormatKey])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (
        !triggerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", closeOnOutside)
    return () => document.removeEventListener("pointerdown", closeOnOutside)
  }, [open])

  const toggleMenu = () => {
    const trigger = triggerRef.current
    if (!trigger) {
      setOpen((current) => !current)
      return
    }
    const rect = trigger.getBoundingClientRect()
    const left = Math.min(
      Math.max(rect.right - MENU_WIDTH, 8),
      window.innerWidth - MENU_WIDTH - 8
    )
    setPosition({ top: rect.bottom + MENU_OFFSET, left })
    setOpen((current) => !current)
  }

  const runExport = async (kind: ExportKind) => {
    if (!canExport) return
    await run()
    const state = useAppStore.getState()
    if (!state.compiledIR) return
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(kind)
    setExportError("")
    setCancelling(false)
    setExportMessage("")
    setProgress(["png", "srt", "vtt"].includes(kind) ? 100 : 0)
    setOpen(false)
    try {
      if (kind === "srt") {
        exportSrt(state.compiledIR)
      } else if (kind === "vtt") {
        exportVtt(state.compiledIR)
      } else if (kind === "video") {
        await exportVideo(state.compiledIR, {
          resolution,
          fps,
          includeNarration,
          signal: controller.signal,
          onProgress: (fraction) => setProgress(Math.round(fraction * 100)),
          onMessage: setExportMessage,
          onFormat: (format) =>
            setVideoFormatProbe({ key: videoFormatKey, format }),
        })
      } else if (kind === "gif") {
        await exportGif(state.compiledIR, {
          signal: controller.signal,
          onProgress: (fraction) => setProgress(Math.round(fraction * 100)),
        })
      } else {
        await exportPng(state.compiledIR, activeSceneIndex, player.elapsed)
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        /* user cancelled */
      } else {
        console.error("Export failed:", error)
        setExportError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      controllerRef.current = null
      setBusy(null)
      setCancelling(false)
      setProgress(null)
      setExportMessage("")
    }
  }

  const handleCancel = () => {
    controllerRef.current?.abort()
    setCancelling(true)
  }

  const items: Array<{
    kind: ExportKind
    label: string
    icon: React.ReactNode
  }> = [
    {
      kind: "video",
      label:
        videoFormat === "mp4"
          ? "Video MP4 (H.264, full script)"
          : videoFormat === "webm"
            ? "Video WebM (real-time fallback)"
            : "Video (checking browser support)",
      icon: <FileVideo className="size-4" />,
    },
    {
      kind: "gif",
      label: "Animated GIF (.gif)",
      icon: <Film className="size-4" />,
    },
    {
      kind: "png",
      label: "PNG snapshot (current frame)",
      icon: <ImageDown className="size-4" />,
    },
    { kind: "srt", label: "Subtitles (.srt)", icon: <FileText className="size-4" /> },
    { kind: "vtt", label: "Subtitles (.vtt)", icon: <FileText className="size-4" /> },
  ]

  return (
    <div ref={containerRef} className="relative">
      {!exporting && (
        <Button
          ref={triggerRef}
          variant="outline"
          size="sm"
          onClick={toggleMenu}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Download className="size-4" />
          Export
        </Button>
      )}
      {exporting && (
        <>
          <div
            className="flex min-w-32 flex-col gap-1"
            role="status"
            aria-live="polite"
          >
            <span className="text-xs text-muted-foreground">
              {cancelling
                ? "Cancelling export…"
                : `${exportMessage || `Exporting ${videoFormat === "mp4" ? "MP4" : videoFormat === "webm" ? "WebM fallback" : (busy ?? "file")}`} · ${progress ?? 0}%`}
            </span>
            <progress
              max={100}
              value={progress ?? 0}
              aria-label="Export progress"
              className="h-1.5 w-full accent-primary"
            />
          </div>
          <Button variant="outline" size="sm" disabled aria-label="Exporting">
            <Loader2 className="size-4 animate-spin" />
            {cancelling ? "Cancelling" : "Exporting"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={cancelling}
            onClick={handleCancel}
            title="Cancel export"
            aria-label="Cancel export"
          >
            <X className="size-4" />
            Cancel
          </Button>
        </>
      )}
      {exportError && !exporting && (
        <div role="alert" className="absolute right-0 top-full z-50 mt-2 flex w-80 items-start gap-2 rounded-md border border-destructive/40 bg-background p-3 text-sm shadow-lg">
          <span className="flex-1">Export failed: {exportError}</span>
          <button type="button" aria-label="Dismiss export error" onClick={() => setExportError("")} className="shrink-0 text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}
      {createPortal(
        open && position ? (
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Export options"
            style={{
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
            }}
            className="fixed z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          >
            <div className="border-b border-border px-3 py-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Export
            </div>
            <div className="grid grid-cols-2 gap-3 border-b border-border px-3 py-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Resolution
                <select
                  aria-label="Video resolution"
                  value={resolution}
                  onChange={(event) =>
                    setResolution(event.target.value as VideoResolution)
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Frame rate
                <select
                  aria-label="Video frame rate"
                  value={fps}
                  onChange={(event) =>
                    setFps(Number(event.target.value) as 30 | 60)
                  }
                  className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps</option>
                </select>
              </label>
            </div>
            {hasNarration && (
              <label className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeNarration}
                  onChange={(event) => setIncludeNarration(event.target.checked)}
                />
                Include Kokoro narration in video
              </label>
            )}
            {items.map((item) => {
              const itemDisabled = !canExport
              return (
                <button
                  key={item.kind}
                  type="button"
                  role="menuitem"
                  disabled={itemDisabled}
                  onClick={() => void runExport(item.kind)}
                  title={itemDisabledReason}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:text-muted-foreground"
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </div>
        ) : null,
        document.body
      )}
    </div>
  )
}
