import { supabase } from "@/lib/supabase.ts"

const CONSENT_KEY = "strokeline.analytics.consent.v1"
const ANONYMOUS_ID_KEY = "strokeline.analytics.anonymousId.v1"
const SESSION_ID_KEY = "strokeline.analytics.sessionId.v1"
export const ANALYTICS_PREFERENCES_EVENT = "strokeline:analytics-preferences"

export type ProductAnalyticsEvent =
  | {
      name: "app_opened"
      properties: { device_class: "touch" | "pointer"; viewport: "compact" | "regular" | "wide" }
    }
  | { name: "auth_signed_in"; properties: { provider: "google" | "github" | "other" } }
  | { name: "auth_signed_out"; properties: Record<string, never> }
  | { name: "template_selected"; properties: { template_id: string } }
  | {
      name: "script_run"
      properties: {
        result: "success" | "failure"
        diagnostic_codes: string[]
        scene_count: number
      }
    }
  | {
      name: "export_completed"
      properties: {
        format: "mp4" | "webm" | "gif" | "png" | "srt" | "vtt"
        resolution?: "720p" | "1080p"
        fps?: 30 | 60
      }
    }
  | { name: "preview_playback"; properties: { action: "play" | "pause"; mode: "scene" | "all" } }
  | { name: "scene_selected"; properties: { scene_index: number } }
  | { name: "layout_guides_toggled"; properties: { enabled: boolean } }
  | { name: "presentation_toggled"; properties: { enabled: boolean } }
  | { name: "analytics_consent_changed"; properties: { enabled: boolean } }

export function readProductAnalyticsConsent(): boolean | null {
  if (typeof localStorage === "undefined") return null
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    return value === "granted" ? true : value === "denied" ? false : null
  } catch (error) {
    console.warn("Unable to read analytics consent; analytics remain disabled.", error)
    return false
  }
}

export function hasProductAnalyticsConsent(): boolean {
  return readProductAnalyticsConsent() === true
}

function storedUuid(storage: Storage, key: string): string {
  const current = storage.getItem(key)
  if (current) return current
  const created = crypto.randomUUID()
  storage.setItem(key, created)
  return created
}

function analyticsIds(): { anonymousId: string; sessionId: string } | null {
  try {
    return {
      anonymousId: storedUuid(localStorage, ANONYMOUS_ID_KEY),
      sessionId: storedUuid(sessionStorage, SESSION_ID_KEY),
    }
  } catch (error) {
    console.warn("Unable to create analytics identifiers; this event was not recorded.", error)
    return null
  }
}

export function trackProductEvent(event: ProductAnalyticsEvent): void {
  if (!hasProductAnalyticsConsent() || !supabase) return
  const ids = analyticsIds()
  if (!ids) return

  void supabase.rpc("track_product_event", {
    p_event_name: event.name,
    p_anonymous_id: ids.anonymousId,
    p_session_id: ids.sessionId,
    p_properties: event.properties,
  }).then(({ error }) => {
    if (error) console.warn("Product analytics event was not recorded.", error.message)
  }).catch((error: unknown) => {
    console.warn("Product analytics event was not recorded.", error)
  })
}

export function saveProductAnalyticsConsent(enabled: boolean): boolean {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? "granted" : "denied")
    return true
  } catch (error) {
    console.error("Unable to save analytics preferences.", error)
    return false
  }
}

export async function eraseProductAnalytics(): Promise<boolean> {
  const ids = analyticsIds()
  try {
    if (ids && supabase) {
      const { error } = await supabase.rpc("delete_my_product_analytics", {
        p_anonymous_id: ids.anonymousId,
      })
      if (error) throw error
    }
    localStorage.removeItem(ANONYMOUS_ID_KEY)
    sessionStorage.removeItem(SESSION_ID_KEY)
    return true
  } catch (error) {
    console.warn("Could not erase previously recorded analytics.", error)
    return false
  }
}
