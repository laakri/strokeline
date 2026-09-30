import { useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { getKokoroState, loadKokoro, subscribeKokoro, type KokoroVoice } from "@/player/kokoro.ts"

type Props = {
  open: boolean
  selectedVoice: string
  preparing: { completed: number; total: number }
  preparingActive: boolean
  error: string
  onClose: () => void
  onUseVoice: (voice: string) => void
}

export function VoiceSettingsDialog({ open, selectedVoice, preparing, preparingActive, error, onClose, onUseVoice }: Props) {
  const kokoro = useSyncExternalStore(subscribeKokoro, getKokoroState, getKokoroState)
  const [draftVoice, setDraftVoice] = useState(selectedVoice)
  if (!open) return null

  const loading = kokoro.status === "loading"
  const ready = kokoro.status === "ready"
  const chosenVoice = kokoro.voices.some((voice) => voice.id === draftVoice)
    ? draftVoice
    : kokoro.voices[0]?.id || "af_heart"
  const chosenVoiceInfo = kokoro.voices.find((voice) => voice.id === chosenVoice)
  const selectVoice = (voice: KokoroVoice) => `${voice.name || voice.id} — ${voice.language || voice.id} ${voice.gender || ""}`

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="kokoro-title"
        className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="kokoro-title" className="text-base font-semibold">Natural voice reader</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kokoro runs on this device and can also provide audio for video export.</p>
          </div>
          <button type="button" aria-label="Close voice settings" onClick={onClose} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-accent">×</button>
        </div>

        {!ready ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">First setup downloads about 92 MB once. The model stays in this browser’s cache. Refreshing reloads it into memory; saved narration clips are reused for the same text and voice.</p>
            {loading ? (
              <div className="grid gap-2" aria-live="polite">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{kokoro.message || "Preparing voice…"}</span>
                  <span className="font-mono">{kokoro.progress}%</span>
                </div>
                <progress aria-label="Kokoro download progress" max={100} value={kokoro.progress} className="h-2 w-full accent-primary" />
              </div>
            ) : (
              <button type="button" onClick={() => void loadKokoro().catch(() => undefined)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                {kokoro.status === "error" ? "Retry Kokoro setup" : "Load Kokoro voice"}
              </button>
            )}
            {kokoro.error && <p role="alert" className="text-sm text-destructive">{kokoro.error}</p>}
          </div>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Choose a reader
              <select
                aria-label="Kokoro reader voice"
                value={chosenVoice}
                onChange={(event) => setDraftVoice(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3"
              >
                {kokoro.voices.map((voice) => <option key={voice.id} value={voice.id}>{selectVoice(voice)}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">Selected reader: {selectVoice(chosenVoiceInfo ?? { id: chosenVoice })}. Kokoro downloads the shared model once; this voice is cached when first used.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {preparingActive && (
              <div className="grid gap-2" aria-live="polite">
                <div className="flex justify-between text-sm"><span>{preparing.total > 0 ? "Preparing narration…" : "Preparing reader…"}</span>{preparing.total > 0 && <span className="font-mono">{preparing.completed}/{preparing.total}</span>}</div>
                <progress aria-label="Narration preparation progress" max={Math.max(1, preparing.total)} value={preparing.total > 0 ? preparing.completed : undefined} className="h-2 w-full accent-primary" />
              </div>
            )}
            <button type="button" onClick={() => onUseVoice(chosenVoice)} disabled={preparingActive} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
              {preparingActive ? "Preparing voice…" : "Use this reader"}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body
  )
}
