import { useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Check,
  Copy,
} from "lucide-react"
import { useAppStore } from "@/app/store.ts"

export function DiagnosticsPanel() {
  const diagnostics = useAppStore((state) => state.diagnostics)
  const requestEditorJump = useAppStore((state) => state.requestEditorJump)
  const [copied, setCopied] = useState(false)

  const copyAll = async () => {
    if (diagnostics.length === 0) return
    try {
      const text = diagnostics
        .map(
          (d) =>
            `${d.line}:${d.col} ${d.code} ${d.message}${d.suggestion ? ` (${d.suggestion})` : ""}`
        )
        .join("\n")
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section
      data-workspace-guide-target="diagnostics"
      className="flex min-h-11 max-h-52 flex-col overflow-hidden border-t border-border bg-card"
      aria-label="Diagnostics"
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 bg-card px-4 py-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        <span>Diagnostics</span>
        <span>{diagnostics.length}</span>
        <button
          type="button"
          aria-label="Copy all diagnostics"
          disabled={diagnostics.length === 0}
          onClick={() => void copyAll()}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 tracking-normal normal-case transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
        >
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
      {diagnostics.length === 0 ? (
        <div className="flex items-center gap-2 px-4 pb-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          No errors
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {diagnostics.map((diagnostic, index) => (
            <button
              key={`${diagnostic.code}-${diagnostic.line}-${index}`}
              type="button"
              onClick={() => requestEditorJump(diagnostic.line, diagnostic.col)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              {diagnostic.severity === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
              )}
              <span className="min-w-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {diagnostic.line}:{diagnostic.col} {diagnostic.code}
                </span>{" "}
                {diagnostic.message}
                {diagnostic.suggestion ? (
                  <span className="block pl-1 text-xs text-muted-foreground">
                    {diagnostic.suggestion}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
