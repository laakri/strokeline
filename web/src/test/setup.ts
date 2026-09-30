import { createCanvas, DOMMatrix, GlobalFonts, Path2D } from "@napi-rs/canvas"
import { fileURLToPath } from "node:url"

const fontPath = fileURLToPath(
  new URL(
    "../../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2",
    import.meta.url
  )
)
if (!GlobalFonts.has("Caveat Variable")) {
  GlobalFonts.registerFromPath(fontPath, "Caveat Variable")
}

Object.defineProperty(globalThis, "Path2D", {
  configurable: true,
  value: Path2D,
})
Object.defineProperty(globalThis, "DOMMatrix", {
  configurable: true,
  value: DOMMatrix,
})
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: {
    createElement: (tagName: string) => {
      if (tagName !== "canvas") {
        throw new Error(`Unsupported test element: ${tagName}`)
      }
      return createCanvas(1, 1)
    },
  },
})
