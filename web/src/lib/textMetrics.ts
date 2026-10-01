import caveatFontUrl from "@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2?url"
import interFontUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url"
import amiriFontUrl from "@fontsource/amiri/files/amiri-arabic-400-normal.woff2?url"

export const HANDWRITTEN_FONT_FAMILY = "Caveat Variable"
export function fontFamilyFor(name = "handwritten"): string {
  if (name.toLowerCase() === "arabic") return "Amiri"
  if (name.toLowerCase() === "neat") return "Inter Variable"
  if (name.toLowerCase() === "marker") return "Inter Variable"
  return HANDWRITTEN_FONT_FAMILY
}

let fontPromise: Promise<void> | undefined
let fontReady = false
let measureContext: CanvasRenderingContext2D | null = null

export function loadTextFont(): Promise<void> {
  if (typeof document === "undefined") {
    fontReady = true
    return Promise.resolve()
  }
  if (typeof FontFace === "undefined" || !document.fonts) {
    fontReady = true
    return Promise.resolve()
  }
  fontPromise ??= (async () => {
    const font = new FontFace(HANDWRITTEN_FONT_FAMILY, `url(${caveatFontUrl})`)
    const fonts = [font,
      new FontFace("Inter Variable", `url(${interFontUrl})`),
      new FontFace("Amiri", `url(${amiriFontUrl})`),
    ]
    for (const face of fonts) document.fonts.add(await face.load())
    await document.fonts.load(`16px "${HANDWRITTEN_FONT_FAMILY}"`)
    await document.fonts.ready
    fontReady = true
  })()
  return fontPromise
}

export function measureTextWidth(text: string, fontSize: number, family = HANDWRITTEN_FONT_FAMILY): number {
  if (!fontReady) {
    throw new Error("The handwritten font must load before measuring text.")
  }
  const context = getMeasureContext()
  context.font = `${fontSize}px "${family}", "Cambria Math", "STIX Two Math", "Times New Roman", serif`
  return context.measureText(text).width
}

function getMeasureContext(): CanvasRenderingContext2D {
  if (measureContext) return measureContext
  if (typeof document === "undefined") {
    throw new Error("Canvas text measurement requires a document canvas.")
  }
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas 2D text measurement is unavailable.")
  measureContext = context
  return context
}

await loadTextFont()
