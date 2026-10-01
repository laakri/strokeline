import { useRef, useState } from "react"
import { Check, Clipboard, FolderOpen, Play, Save } from "lucide-react"
import aiPrompt from "../../../../AI_prompt_kit.MD?raw"
import { useAppStore } from "@/app/store.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { TwoPaneLayout } from "@/ui/layout/TwoPaneLayout.tsx"
import { ExportMenu } from "@/ui/layout/ExportMenu.tsx"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"
import { Button } from "@/ui/button"
import logo from "@/assets/logo.png"

export function AppShell() {
  const diagnostics = useAppStore((state) => state.diagnostics)
  const run = useAppStore((state) => state.run)
  const loadScript = useAppStore((state) => state.loadScript)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [saved, setSaved] = useState(false)
  const errors = diagnostics.filter(blocksScriptRun).length
  const copyPrompt = async () => {
    await navigator.clipboard.writeText(aiPrompt)
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
  return (
    <main className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2 sm:flex sm:min-h-14 sm:gap-3 sm:px-4">
        <div className="order-1 flex shrink-0 items-center gap-3">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <img src={logo} alt="Strokeline Logo" className="h-6 w-6" />
            <span className="hidden sm:inline">Strokeline</span>
          </span>
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
          <ExportMenu />
          <Button
            size="sm"
            onClick={run}
            title={
              errors
                ? `Run blocked (${errors} error${errors === 1 ? "" : "s"})`
                : "Run the script"
            }
          >
            <Play className="size-4" />
            <span className="hidden md:inline">
              {errors ? `Run (${errors})` : "Run"}
            </span>
          </Button>
        </div>
      </header>
      <TwoPaneLayout />
    </main>
  )
}
