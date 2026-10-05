import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, AlertTriangle, Check, Clipboard, Code2, Eye, LayoutGrid, X } from "lucide-react"

type GuideStep = {
  target: string
  mobileTab?: "script" | "preview"
  fitCardToTarget?: boolean
  location: string
  title: string
  description: string
}

const steps: GuideStep[] = [
  {
    target: "diagram-templates",
    mobileTab: "script",
    location: "Templates",
    title: "Start with a diagram",
    description: "Choose a use case, class, sequence, Scrum, flowchart, or data model starter. Each one opens as an editable diagram you can play as an animation.",
  },
  {
    target: "editor",
    mobileTab: "script",
    location: "Script editor",
    title: "Customize the diagram",
    description: "Edit labels in the script or click objects on the canvas to move, edit, connect, and remove them.",
  },
  {
    target: "run",
    location: "Run",
    title: "Build the animation",
    description: "Press Run to tidy the indentation, check the script, and build the animation in Preview. If Strokeline finds a problem, it will show it in Diagnostics.",
  },
  {
    target: "diagnostics",
    mobileTab: "script",
    fitCardToTarget: true,
    location: "Diagnostics · Copy all",
    title: "Let the AI fix errors",
    description: "If errors appear here, press Copy all and paste them into the same AI chat. Ask it to fix the script, replace your code, then press Run again. Warnings are suggestions.",
  },
  {
    target: "preview",
    mobileTab: "preview",
    location: "Preview · Play and Present",
    title: "Review your animation",
    description: "Play the preview, scrub through the timeline, and check every scene. When it looks ready, use Present or Export.",
  },
  {
    target: "preview-layout",
    mobileTab: "preview",
    location: "Preview · Layout",
    title: "Check the layout before you export",
    description: "Turn on Layout to see the safe area, center guides, and diagnostic highlights. Click a highlighted object to jump to its code. These guides are only for editing and never appear in your export.",
  },
]

type Bounds = { top: number; left: number; width: number; height: number }
type Props = {
  step: number | null
  onStepChange: (step: number) => void
  onFinish: () => void
}

const spotlightPadding = 7

export function WorkspaceGuide({ step, onStepChange, onFinish }: Props) {
  const [measuredBounds, setMeasuredBounds] = useState<{ step: number; bounds: Bounds } | null>(null)
  const currentIndex = step === null ? 0 : Math.max(0, Math.min(step, steps.length - 1))
  const current = steps[currentIndex]!

  useEffect(() => {
    if (step === null) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onFinish, step])

  useEffect(() => {
    if (step === null) {
      return
    }
    const targetStep = steps[currentIndex]!
    if (targetStep.mobileTab) {
      document.querySelector<HTMLButtonElement>(`[data-workspace-guide-tab="${targetStep.mobileTab}"]`)?.click()
    }

    let animationFrame = 0
    let target: HTMLElement | null = null
    let observer: ResizeObserver | undefined
    const updateBounds = () => {
      target = document.querySelector<HTMLElement>(`[data-workspace-guide-target="${targetStep.target}"]`)
      if (!target) return
      const rect = target.getBoundingClientRect()
      setMeasuredBounds({ step: currentIndex, bounds: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } })
    }
    animationFrame = requestAnimationFrame(() => {
      animationFrame = requestAnimationFrame(() => {
        updateBounds()
        if (target && "ResizeObserver" in window) {
          observer = new ResizeObserver(updateBounds)
          observer.observe(target)
        }
      })
    })
    window.addEventListener("resize", updateBounds)
    window.visualViewport?.addEventListener("resize", updateBounds)
    return () => {
      cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      window.removeEventListener("resize", updateBounds)
      window.visualViewport?.removeEventListener("resize", updateBounds)
    }
  }, [currentIndex, step])

  if (step === null) return null

  const bounds = measuredBounds?.step === currentIndex ? measuredBounds.bounds : null
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const pad = spotlightPadding
  const left = bounds ? Math.max(0, bounds.left - pad) : 0
  const top = bounds ? Math.max(0, bounds.top - pad) : 0
  const right = bounds ? Math.min(viewportWidth, bounds.left + bounds.width + pad) : viewportWidth
  const bottom = bounds ? Math.min(viewportHeight, bounds.top + bounds.height + pad) : viewportHeight
  const cardWidth = Math.min(
    390,
    viewportWidth - 24,
    current.fitCardToTarget && bounds ? bounds.width : 390
  )
  const cardHeight = viewportWidth < 480 ? 330 : 280
  const cardLeft = bounds
    ? Math.max(12, Math.min(bounds.left, viewportWidth - cardWidth - 12))
    : Math.max(12, (viewportWidth - cardWidth) / 2)
  const belowTop = bounds ? bounds.top + bounds.height + pad + 14 : 0
  const cardTop = bounds && belowTop + cardHeight <= viewportHeight - 12
    ? belowTop
    : bounds
      ? Math.max(12, Math.min(bounds.top - cardHeight - pad - 14, viewportHeight - cardHeight - 12))
      : Math.max(12, (viewportHeight - cardHeight) / 2)
  const Icon = [Clipboard, Code2, Code2, AlertTriangle, Eye, LayoutGrid][currentIndex]!

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200]">
      {bounds ? (
        <>
          <div className="pointer-events-auto fixed left-0 right-0 top-0 bg-black/55 backdrop-blur-sm" style={{ height: top }} />
          <div className="pointer-events-auto fixed left-0 bg-black/55 backdrop-blur-sm" style={{ top, width: left, height: bottom - top }} />
          <div className="pointer-events-auto fixed right-0 bg-black/55 backdrop-blur-sm" style={{ top, left: right, height: bottom - top }} />
          <div className="pointer-events-auto fixed bottom-0 left-0 right-0 bg-black/55 backdrop-blur-sm" style={{ top: bottom }} />
          <div className="pointer-events-auto fixed bg-transparent" style={{ top, left, width: right - left, height: bottom - top }} />
          <div className="pointer-events-none fixed rounded-xl border-2 border-amber-100 shadow-[0_0_0_4px_rgba(255,248,230,0.2)]" style={{ top, left, width: right - left, height: bottom - top }} />
        </>
      ) : (
        <div className="pointer-events-auto fixed inset-0 bg-black/55 backdrop-blur-sm" />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-guide-title"
        aria-describedby="workspace-guide-description"
        className="pointer-events-auto fixed w-[min(390px,calc(100vw-24px))] rounded-xl border border-[#e8ddc5] bg-[#fff9ec] p-5 text-[#26241f] shadow-2xl shadow-black/35"
        style={{ top: cardTop, left: cardLeft }}
      >
        <div className="mb-3 flex items-start justify-between gap-3 pr-0">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a7042]">
            <Icon className="size-4" />
            <span className="truncate">{current.location}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-[#817969]">{currentIndex + 1}/{steps.length}</span>
            <button type="button" aria-label="Close workspace guide" onClick={onFinish} className="-mr-2 -mt-2 rounded-md p-1 text-[#817969] hover:bg-black/5 hover:text-[#26241f]">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <h2 id="workspace-guide-title" className="text-lg font-semibold tracking-tight">{current.title}</h2>
        <p id="workspace-guide-description" className="mt-2 text-sm leading-5 text-[#5c574d]">{current.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onFinish} className="rounded-md py-2 text-sm text-[#756e60] underline decoration-[#c6b99f] underline-offset-4 hover:text-[#26241f]">Skip guide</button>
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button type="button" onClick={() => onStepChange(currentIndex - 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#ddd2bb] px-3 text-sm hover:bg-black/5">
                <ArrowLeft className="size-3.5" /> Back
              </button>
            )}
            <button type="button" autoFocus onClick={() => currentIndex === steps.length - 1 ? onFinish() : onStepChange(currentIndex + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#282720] px-3.5 text-sm font-semibold text-[#fff9ec] hover:bg-[#3a382f]">
              {currentIndex === steps.length - 1 ? <><Check className="size-3.5" /> Done</> : <>Next <ArrowRight className="size-3.5" /></>}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  )
}
