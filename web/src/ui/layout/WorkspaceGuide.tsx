import { useEffect } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, AlertTriangle, Check, Clipboard, Code2, Eye, X } from "lucide-react"

const steps = [
  {
    icon: Clipboard,
    location: "Top bar · Copy AI Prompt",
    title: "Start with the AI guide",
    description: "Copy AI Prompt, paste it into your AI chat, then describe the video you want. The prompt teaches the AI Strokeline’s syntax and features.",
  },
  {
    icon: Code2,
    location: "Editor · Run",
    title: "Bring the script here",
    description: "Copy the AI’s complete script and paste it into the editor. Press Run to check it and build the animation. On mobile, choose the Script tab first.",
  },
  {
    icon: AlertTriangle,
    location: "Diagnostics · Copy all",
    title: "Ask the AI to fix errors",
    description: "If the script has errors, press Copy all and paste the diagnostics into the same AI chat. Ask it to fix the script, replace the code, then press Run again. Warnings are suggestions.",
  },
  {
    icon: Eye,
    location: "Preview · Play and Present",
    title: "Review your animation",
    description: "Play the preview, scrub the timeline, and check each scene. On mobile, choose Preview. When it looks ready, use Present or Export.",
  },
]

type Props = {
  step: number | null
  onStepChange: (step: number) => void
  onFinish: () => void
}

export function WorkspaceGuide({ step, onStepChange, onFinish }: Props) {
  useEffect(() => {
    if (step === null) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onFinish, step])

  if (step === null) return null
  const currentStep = Math.max(0, Math.min(step, steps.length - 1))
  const current = steps[currentStep]!
  const Icon = current.icon

  return createPortal(
    <div className="fixed inset-0 z-[200] grid place-items-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-guide-title"
        aria-describedby="workspace-guide-description"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111916] text-white shadow-2xl shadow-black/40"
      >
        <div className="h-1 bg-white/10">
          <div className="h-full bg-[#b5d39a] transition-[width] duration-300" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#b5d39a]/10 text-[#c6e6a8]">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-medium tracking-wide text-[#c6e6a8]">WORKSPACE GUIDE · {currentStep + 1} OF {steps.length}</p>
                <p className="mt-1 text-xs text-white/55">{current.location}</p>
              </div>
            </div>
            <button type="button" aria-label="Close workspace guide" onClick={onFinish} className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          <h2 id="workspace-guide-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{current.title}</h2>
          <p id="workspace-guide-description" className="mt-3 text-sm leading-6 text-white/70 sm:text-base">{current.description}</p>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button type="button" onClick={onFinish} className="rounded-lg px-2 py-2 text-sm text-white/55 transition-colors hover:text-white">Skip guide</button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button type="button" onClick={() => onStepChange(currentStep - 1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-white/80 transition-colors hover:bg-white/10">
                  <ArrowLeft className="size-4" /> Back
                </button>
              )}
              <button type="button" autoFocus onClick={() => currentStep === steps.length - 1 ? onFinish() : onStepChange(currentStep + 1)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#c6e6a8] px-4 text-sm font-semibold text-[#111916] transition-colors hover:bg-[#d6efbc]">
                {currentStep === steps.length - 1 ? <><Check className="size-4" /> Start creating</> : <>Next <ArrowRight className="size-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  )
}
