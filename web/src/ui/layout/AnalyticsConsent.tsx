import { useEffect, useState } from "react"
import { BarChart3, X } from "lucide-react"
import {
  ANALYTICS_PREFERENCES_EVENT,
  eraseProductAnalytics,
  readProductAnalyticsConsent,
  saveProductAnalyticsConsent,
  trackProductEvent,
} from "@/analytics/productAnalytics.ts"
import { Button } from "@/ui/button"

export function AnalyticsConsent() {
  const [consent, setConsent] = useState<boolean | null>(readProductAnalyticsConsent)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [eraseError, setEraseError] = useState(false)

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener(ANALYTICS_PREFERENCES_EVENT, openSettings)
    return () => window.removeEventListener(ANALYTICS_PREFERENCES_EVENT, openSettings)
  }, [])

  const setPreference = (enabled: boolean) => {
    if (!saveProductAnalyticsConsent(enabled)) return
    setConsent(enabled)
    setSettingsOpen(false)
    if (enabled) {
      trackProductEvent({ name: "analytics_consent_changed", properties: { enabled: true } })
      trackProductEvent({
        name: "app_opened",
        properties: {
          device_class: matchMedia("(pointer: coarse)").matches ? "touch" : "pointer",
          viewport: window.innerWidth < 640 ? "compact" : window.innerWidth < 1280 ? "regular" : "wide",
        },
      })
    } else {
      setEraseError(false)
      void eraseProductAnalytics().then((erased) => setEraseError(!erased))
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Analytics and privacy settings"
        title="Analytics and privacy settings"
        onClick={() => setSettingsOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BarChart3 className="size-4" />
      </button>

      {consent === null && !settingsOpen && (
        <aside
          aria-label="Optional analytics preference"
          className="fixed inset-x-3 bottom-3 z-[150] mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-background/95 p-4 text-foreground shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 text-sm leading-5 text-muted-foreground">
            Help improve Strokeline with optional usage statistics. We record product actions, not your scripts, prompts, filenames, or exports.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreference(false)}>No thanks</Button>
            <Button size="sm" onClick={() => setPreference(true)}>Allow analytics</Button>
          </div>
        </aside>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[160] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-settings-title"
            className="w-full max-w-md rounded-xl border border-border bg-background p-5 text-foreground shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="analytics-settings-title" className="text-lg font-semibold">Analytics preferences</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                  Optional first-party statistics help us understand feature use, exports, and return visits. We never collect script text, prompts, filenames, or exported content. You can change this choice at any time.
                </p>
                {eraseError && (
                  <p role="status" className="mt-2 text-sm text-destructive">
                    Analytics are disabled, but previously stored events could not be deleted right now. Please try disabling again later.
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close analytics preferences"
                onClick={() => setSettingsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm">
              Current choice: <strong>{consent === null ? "not set" : consent ? "allowed" : "not allowed"}</strong>
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreference(false)}>Disable analytics</Button>
              <Button size="sm" onClick={() => setPreference(true)}>Allow analytics</Button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
