import { useEffect, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { Volume2 } from "lucide-react"

import { getKokoroState, loadKokoro, subscribeKokoro, type KokoroVoice } from "@/player/kokoro.ts"

type Props = {
  open: boolean
  selectedVoice: string
  volume: number
  onVolumeChange: (volume: number) => void
  preparing: { completed: number; total: number }
  preparingActive: boolean
  narrationLineCount: number
  error: string
  onClose: () => void
  onUseVoice: (voice: string) => void
}

export function VoiceSettingsDialog({
  open,
  selectedVoice,
  volume,
  onVolumeChange,
  preparing,
  preparingActive,
  narrationLineCount,
  error,
  onClose,
  onUseVoice,
}: Props) {
  const kokoro = useSyncExternalStore(subscribeKokoro, getKokoroState, getKokoroState)
  const [draftVoice, setDraftVoice] = useState(selectedVoice)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  const loading = kokoro.status === "loading"
  const ready = kokoro.status === "ready"
  const chosenVoice = kokoro.voices.some((voice) => voice.id === draftVoice)
    ? draftVoice
    : kokoro.voices[0]?.id || "af_heart"
  const chosenVoiceInfo = kokoro.voices.find((voice) => voice.id === chosenVoice)
  const voiceLabel = (voice: KokoroVoice) =>
    `${voice.name || voice.id} — ${voice.language || voice.id} ${voice.gender || ""}`.trim()

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="kokoro-title"
        aria-describedby="kokoro-description"
        className="my-auto max-h-[min(90dvh,780px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/70 bg-background p-5 shadow-2xl sm:p-6"
      >
        <header className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <Volume2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="kokoro-title" className="text-lg font-semibold tracking-tight">Reader setup</h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                On this device
              </span>
            </div>
            <p id="kokoro-description" className="mt-1 text-sm text-muted-foreground">
              Set up the voice once, then prepare narration for this script.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close reader settings"
            onClick={onClose}
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            ×
          </button>
        </header>

        <div className="mt-5 rounded-xl bg-secondary/45 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Voice engine</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {ready
                  ? "Ready for this session. Model files stay in this browser’s cache; refreshing loads them into memory again."
                  : "First setup downloads about 92 MB. Later visits load the cached model without downloading it again."}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${ready ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : loading ? "bg-primary/10 text-primary" : "bg-background/75 text-muted-foreground"}`}>
              {ready ? "Ready" : loading ? "Loading" : kokoro.status === "error" ? "Needs retry" : "Not loaded"}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 grid gap-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  {kokoro.message || "Loading the voice engine…"}
                </span>
                <span className="shrink-0 font-mono tabular-nums">{kokoro.progress}%</span>
              </div>
              <progress
                aria-label="Voice engine setup progress"
                max={100}
                value={kokoro.progress}
                className="h-1.5 w-full accent-primary"
              />
            </div>
          ) : !ready ? (
            <button
              type="button"
              onClick={() => void loadKokoro().catch(() => undefined)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {kokoro.status === "error" ? "Retry voice setup" : "Load voice engine"}
              <span className="text-xs font-normal opacity-75">· about 92 MB first time</span>
            </button>
          ) : null}

          {kokoro.error && !loading && (
            <p role="alert" className="mt-3 text-sm text-destructive">{kokoro.error}</p>
          )}
        </div>

        {ready && (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                Reader voice
                <select
                  aria-label="Kokoro reader voice"
                  value={chosenVoice}
                  onChange={(event) => setDraftVoice(event.target.value)}
                  className="h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {kokoro.voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>{voiceLabel(voice)}</option>
                  ))}
                </select>
                <span className="text-xs font-normal text-muted-foreground">
                  {chosenVoiceInfo ? `${chosenVoiceInfo.language} · ${chosenVoiceInfo.gender || "voice"}` : chosenVoice}
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  Reader volume
                  <output htmlFor="reader-volume" className="font-mono text-xs tabular-nums text-muted-foreground">
                    {Math.round(volume * 100)}%
                  </output>
                </span>
                <input
                  id="reader-volume"
                  type="range"
                  min="0"
                  max="150"
                  step="5"
                  value={Math.round(volume * 100)}
                  onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
                  aria-label="Reader volume"
                  className="mt-2 w-full accent-primary"
                />
                <span className="text-xs font-normal text-muted-foreground">Saved in this browser.</span>
              </label>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <p className="text-sm font-semibold">Narration for this script</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {narrationLineCount > 0
                  ? `${narrationLineCount} SAY line${narrationLineCount === 1 ? "" : "s"}. Missing audio is prepared before playback; saved clips are reused for the same text and voice.`
                  : "This script has no SAY lines yet. You can still save this reader choice and turn narration on."}
              </p>

              {preparingActive && (
                <div className="mt-4 grid gap-2" role="status" aria-live="polite">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {preparing.total > 0 ? "Creating narration audio" : "Starting reader…"}
                    </span>
                    {preparing.total > 0 && (
                      <span className="font-mono tabular-nums">
                        {preparing.completed} / {preparing.total}
                      </span>
                    )}
                  </div>
                  {preparing.total > 0 ? (
                    <progress
                      aria-label="Narration audio preparation progress"
                      max={preparing.total}
                      value={preparing.completed}
                      className="h-1.5 w-full accent-primary"
                    />
                  ) : (
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              )}

              {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

              <button
                type="button"
                onClick={() => onUseVoice(chosenVoice)}
                disabled={preparingActive}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              >
                {preparingActive
                  ? "Preparing narration…"
                  : narrationLineCount > 0
                    ? "Prepare and use reader"
                    : "Save voice and enable"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body
  )
}
