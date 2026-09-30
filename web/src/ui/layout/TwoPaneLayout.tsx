import { useRef, useState } from "react"
import { GripVertical } from "lucide-react"
import { ScriptEditor } from "@/ui/editor/ScriptEditor.tsx"
import { DiagnosticsPanel } from "@/ui/editor/DiagnosticsPanel.tsx"
import { PreviewPane } from "@/ui/preview/PreviewPane.tsx"
import { useIsMobile } from "@/ui/hooks/useMediaQuery.ts"

const SPLIT_KEY = "strokeline.split.ratio"
const MIN_RATIO = 0.3
const MAX_RATIO = 0.7
const DEFAULT_RATIO = 0.42

function loadRatio(): number {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_RATIO
    const saved = Number(localStorage.getItem(SPLIT_KEY))
    if (Number.isFinite(saved))
      return Math.min(MAX_RATIO, Math.max(MIN_RATIO, saved))
  } catch {
    /* ignore */
  }
  return DEFAULT_RATIO
}

function saveRatio(ratio: number): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(SPLIT_KEY, String(ratio))
  } catch {
    /* ignore */
  }
}

type MobileTab = "script" | "preview"

function clampRatio(ratio: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio))
}

export function TwoPaneLayout() {
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<MobileTab>("script")
  const [leftRatio, setLeftRatio] = useState(loadRatio)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const ratioRef = useRef(leftRatio)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const ratio = clampRatio((event.clientX - rect.left) / rect.width)
    ratioRef.current = ratio
    setLeftRatio(ratio)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
    saveRatio(ratioRef.current)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const direction = event.key === "ArrowRight" ? 1 : -1
      const ratio = clampRatio(ratioRef.current + direction * 0.02)
      ratioRef.current = ratio
      setLeftRatio(ratio)
      saveRatio(ratio)
    }
  }

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div role="tablist" aria-label="Workspace panes" className="flex shrink-0 items-center gap-1 border-b border-border bg-card px-3 py-2">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "script"}
            onClick={() => setMobileTab("script")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mobileTab === "script" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
          >
            Script
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            onClick={() => setMobileTab("preview")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mobileTab === "preview" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}
          >
            Preview
          </button>
        </div>
        {mobileTab === "script" ? (
          <section className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(44px,13rem)] overflow-hidden bg-card">
            <ScriptEditor />
            <DiagnosticsPanel />
          </section>
        ) : (
          <PreviewPane />
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex min-h-0 flex-1 overflow-hidden ${isDragging ? "select-none" : ""}`}
    >
      <section
        className="grid min-h-0 shrink-0 overflow-hidden border-r border-border bg-card grid-rows-[minmax(0,1fr)_minmax(44px,13rem)]"
        style={{ width: `${leftRatio * 100}%`, minWidth: 360, maxWidth: `${MAX_RATIO * 100}%` }}
      >
        <ScriptEditor />
        <DiagnosticsPanel />
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftRatio * 100)}
        aria-valuemin={Math.round(MIN_RATIO * 100)}
        aria-valuemax={Math.round(MAX_RATIO * 100)}
        tabIndex={0}
        className={`absolute top-1/2 z-10 flex h-9 w-4 -translate-x-1/2 -translate-y-1/2 touch-none select-none cursor-col-resize items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm outline-none transition-[transform,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 after:absolute after:inset-[-10px] after:content-[''] ${
          isDragging
            ? "scale-110 border-primary/40 shadow-md"
            : "hover:scale-110 hover:border-border hover:shadow-md"
        }`}
        style={{ left: `max(${leftRatio * 100}%, 360px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        <GripVertical className="size-3.5" />
      </div>

      <PreviewPane />
    </div>
  )
}
