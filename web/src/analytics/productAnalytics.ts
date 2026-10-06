import { supabase } from "@/lib/supabase.ts"

const SESSION_ID_KEY = "strokeline.analytics.sessionId.v1"

export type ProductAnalyticsEvent =
  | {
      name: "app_opened"
      properties: { device_class: "touch" | "pointer"; viewport: "compact" | "regular" | "wide" }
    }
  | { name: "auth_signed_in"; properties: { provider: "google" | "github" | "other" } }
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

function sessionId(): string | null {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    sessionStorage.setItem(SESSION_ID_KEY, created)
    return created
  } catch (error) {
    console.warn("Unable to create an analytics session identifier; this event was not recorded.", error)
    return null
  }
}

export function trackProductEvent(event: ProductAnalyticsEvent): void {
  if (!supabase) return
  void supabase.auth.getSession().then(({ data, error: sessionError }) => {
    if (sessionError) {
      console.warn("Unable to verify analytics session; event was not recorded.", sessionError.message)
      return
    }
    if (!data.session) return
    const currentSessionId = sessionId()
    if (!currentSessionId) return
    return supabase.rpc("track_product_event", {
      p_event_name: event.name,
      p_session_id: currentSessionId,
      p_properties: event.properties,
    }).then(({ error }) => {
      if (error) console.warn("Product analytics event was not recorded.", error.message)
    })
  }).catch((error: unknown) => {
    console.warn("Product analytics event was not recorded.", error)
  })
}
