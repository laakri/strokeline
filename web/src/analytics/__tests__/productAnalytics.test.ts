import { beforeEach, describe, expect, it, vi } from "vitest"

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock("@/lib/supabase.ts", () => ({ supabase: { rpc } }))

import {
  hasProductAnalyticsConsent,
  saveProductAnalyticsConsent,
  trackProductEvent,
} from "@/analytics/productAnalytics.ts"

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe("product analytics consent", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage())
    vi.stubGlobal("sessionStorage", new MemoryStorage())
    rpc.mockReset().mockResolvedValue({ error: null })
  })

  it("does not generate or send events before the user opts in", () => {
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: "flowchart" },
    })

    expect(hasProductAnalyticsConsent()).toBe(false)
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sends only the opted-in, structured event properties", async () => {
    expect(saveProductAnalyticsConsent(true)).toBe(true)
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: "flowchart" },
    })
    await Promise.resolve()

    expect(rpc).toHaveBeenCalledWith("track_product_event", {
      p_event_name: "template_selected",
      p_anonymous_id: expect.any(String),
      p_session_id: expect.any(String),
      p_properties: { template_id: "flowchart" },
    })
  })
})
