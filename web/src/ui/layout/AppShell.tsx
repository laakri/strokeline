import { useEffect, useRef, useState } from "react"
import { Check, CircleHelp, Clipboard, FolderOpen, Maximize, Play, Save } from "lucide-react"
import aiPrompt from "../../../../AI_prompt_kit.MD?raw"
import { BRAND_ICON_CATALOG } from "@/defaults/brandIcons.generated.ts"
import { useAppStore } from "@/app/store.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { ICON_NAMES } from "@/dsl/grammar.ts"
import { TwoPaneLayout } from "@/ui/layout/TwoPaneLayout.tsx"
import { ExportMenu } from "@/ui/layout/ExportMenu.tsx"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"
import { Button } from "@/ui/button"
import { WorkspaceGuide } from "@/ui/layout/WorkspaceGuide.tsx"
import { trackProductEvent } from "@/analytics/productAnalytics.ts"
import logo from "@/assets/logo.png"
import blackLogo from "@/assets/black-logo.png"

const WORKSPACE_GUIDE_KEY = "strokeline.workspaceGuide.v1"

function initialGuideStep(): number | null {
  try {
    return localStorage.getItem(WORKSPACE_GUIDE_KEY) === "done" ? null : 0
  } catch {
    return 0
  }
}

export function AppShell() {
  const [presentationMode, setPresentationMode] = useState(false)
  const [guideStep, setGuideStep] = useState<number | null>(initialGuideStep)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const run = useAppStore((state) => state.run)
  const loadScript = useAppStore((state) => state.loadScript)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [saved, setSaved] = useState(false)
  const errors = diagnostics.filter(blocksScriptRun).length
  const finishGuide = () => {
    try {
      localStorage.setItem(WORKSPACE_GUIDE_KEY, "done")
    } catch {
      /* storage unavailable */
    }
    setGuideStep(null)
  }
  const copyPrompt = async () => {
    await navigator.clipboard.writeText(
      aiPrompt
        .replace("{{ICON_LIST}}", ICON_NAMES.join(", "))
        .replace("{{BRAND_ICON_LIST}}", BRAND_ICON_CATALOG.map(({ title, slug }) => `${title} (/brand-icons/${slug}.svg)`).join("\n"))
    )
  }
  const handleSave = () => {
    const script = useAppStore.getState().script
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `strokeline-${new Date().toISOString().slice(0, 10)}.wbs`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }
  const handleLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    loadScript(text)
    event.target.value = ""
  }
  const enterPresentation = () => {
    trackProductEvent({ name: "presentation_toggled", properties: { enabled: true } })
    setPresentationMode(true)
    if (document.documentElement.requestFullscreen)
      void document.documentElement.requestFullscreen().catch(() => {})
  }
  const exitPresentation = () => {
    trackProductEvent({ name: "presentation_toggled", properties: { enabled: false } })
    setPresentationMode(false)
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {})
  }

  useEffect(() => {
    if (!presentationMode) return
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setPresentationMode(false)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [presentationMode])

  useEffect(() => {
    trackProductEvent({
      name: "app_opened",
      properties: {
        device_class: matchMedia("(pointer: coarse)").matches ? "touch" : "pointer",
        viewport: window.innerWidth < 640 ? "compact" : window.innerWidth < 1280 ? "regular" : "wide",
      },
    })
  }, [])

  return (
    <main className={presentationMode
      ? "fixed inset-0 z-[100] flex h-svh w-screen flex-col overflow-hidden bg-[#0b0e0d] text-white"
      : "flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground"}>
      {!presentationMode && <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2 sm:flex sm:min-h-14 sm:gap-3 sm:px-4">
        <div className="order-1 flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <img src={blackLogo} alt="Strokeline Logo" className="h-6 w-6 shrink-0 object-contain dark:hidden" />
            <img src={logo} alt="" aria-hidden="true" className="hidden h-6 w-6 shrink-0 object-contain dark:block" />
            <span className="hidden sm:inline">Strokeline</span>
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Workspace guide" title="Workspace guide" onClick={() => setGuideStep(0)}>
            <CircleHelp className="size-4" />
          </Button>
          <span className="hidden text-xs text-muted-foreground lg:inline">
            whiteboard animation studio
          </span>
        </div>
        <div className="order-2 justify-self-end sm:order-3 sm:ml-2">
          <AccountMenu compact />
        </div>
        <div className="order-3 col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:order-2 sm:ml-auto sm:flex-nowrap sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyPrompt()}
            title="Copy AI Prompt"
            data-workspace-guide-target="copy-prompt"
          >
            <Clipboard className="size-4" />
            <span className="hidden md:inline">Copy AI Prompt</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            title="Save script as .wbs"
          >
            {saved ? <Check className="size-4" /> : <Save className="size-4" />}
            <span className="hidden md:inline">{saved ? "Saved" : "Save"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Load a .wbs script"
          >
            <FolderOpen className="size-4" />
            <span className="hidden md:inline">Load</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wbs,.txt,text/plain"
            onChange={(event) => void handleLoad(event)}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={enterPresentation}
            title="Present fullscreen"
          >
            <Maximize className="size-4" />
            <span className="hidden md:inline">Present</span>
          </Button>
          <ExportMenu />
          <Button
            size="sm"
            onClick={run}
            data-workspace-guide-target="run"
            title={
              errors
                ? `Format, then try to fix ${errors} error${errors === 1 ? "" : "s"} and run`
                : "Format and run the script"
            }
          >
            <Play className="size-4" />
            <span className="hidden md:inline">
              {errors ? `Fix & Run (${errors})` : "Run"}
            </span>
          </Button>
        </div>
      </header>}
      <TwoPaneLayout
        presentationMode={presentationMode}
        onExitPresentation={exitPresentation}
        onTemplateSelected={finishGuide}
      />
      {!presentationMode && <WorkspaceGuide step={guideStep} onStepChange={setGuideStep} onFinish={finishGuide} />}
    </main>
  )
}
