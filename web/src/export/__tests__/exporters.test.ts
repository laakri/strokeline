import { afterEach, describe, expect, it, vi } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { exportPng } from "@/export/exporters.ts"

describe("PNG snapshot export", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("copies the currently displayed preview canvas into the PNG", async () => {
    const result = runScript(`VERSION 1.0
CANVAS 1600 900
SCENE 1 "Snapshot"
END SCENE`)
    expect(result.document).not.toBeNull()
    if (!result.document) return

    const drawImage = vi.fn()
    const blob = new Blob(["png"], { type: "image/png" })
    const outputCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback) => callback(blob),
    } as unknown as HTMLCanvasElement
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn(),
    }
    const originalBody = document.body
    Object.defineProperty(document, "body", {
      configurable: true,
      value: { appendChild: vi.fn() },
    })
    const sourceCanvas = {
      width: 3200,
      height: 1800,
    } as HTMLCanvasElement
    const originalCreateElement = document.createElement
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return outputCanvas
      if (tagName === "a") return anchor as unknown as HTMLAnchorElement
      return originalCreateElement.call(document, tagName)
    })
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    vi.stubGlobal("window", { setTimeout: vi.fn() })

    try {
      await exportPng(result.document, 0, 0, undefined, {
        previewCanvas: sourceCanvas,
      })

      expect(drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0, 1600, 900)
      expect(anchor.click).toHaveBeenCalledOnce()
    } finally {
      Object.defineProperty(document, "body", {
        configurable: true,
        value: originalBody,
      })
    }
  })
})
