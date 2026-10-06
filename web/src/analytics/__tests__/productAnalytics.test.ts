import { beforeEach, describe, expect, it, vi } from "vitest"

const { rpc, getSession } = vi.hoisted(() => ({ rpc: vi.fn(), getSession: vi.fn() }))
vi.mock("@/lib/supabase.ts", () => ({
  supabase: { rpc, auth: { getSession } },
}))

import { trackProductEvent } from "@/analytics/productAnalytics.ts"

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

describe("authenticated product analytics", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", new MemoryStorage())
    rpc.mockReset().mockResolvedValue({ error: null })
    getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  })

  it("does not send events for signed-out visitors", async () => {
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: "flowchart" },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getSession).toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sends structured events only for signed-in sessions", async () => {
    getSession.mockResolvedValue({ data: { session: {} }, error: null })
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: "flowchart" },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(rpc).toHaveBeenCalledWith("track_product_event", {
      p_event_name: "template_selected",
      p_session_id: expect.any(String),
      p_properties: { template_id: "flowchart" },
    })
  })
})
