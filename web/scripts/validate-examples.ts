import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createCanvas, DOMMatrix, GlobalFonts, Path2D } from "@napi-rs/canvas"
import { createServer } from "vite"
import { Timeline } from "../src/timeline/timeline.ts"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDirectory, "..")
const defaultExamples = path.resolve(scriptDirectory, "../../../Strokeline-Skills/skills/strokeline/examples")
const input = path.resolve(process.argv[2] ?? defaultExamples)
const fontPaths = [
  ["../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2", "Caveat Variable"],
  ["../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "Inter Variable"],
  ["../node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2", "Amiri"],
]
for (const [fontPath, family] of fontPaths)
  if (!GlobalFonts.has(family)) GlobalFonts.registerFromPath(fileURLToPath(new URL(fontPath, import.meta.url)), family)
Object.defineProperties(globalThis, {
  Path2D: { configurable: true, value: Path2D },
  DOMMatrix: { configurable: true, value: DOMMatrix },
  document: {
    configurable: true,
    value: {
      createElement(tagName: string) {
        if (tagName !== "canvas") throw new Error(`Unsupported validator element: ${tagName}`)
        return createCanvas(1, 1)
      },
    },
  },
})

async function collect(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.filter((entry) => entry.isDirectory()).map((entry) => collect(path.join(directory, entry.name))))
  return [
    ...entries.filter((entry) => entry.isFile() && entry.name.endsWith(".wbs")).map((entry) => path.join(directory, entry.name)),
    ...nested.flat(),
  ]
}

const files = (await collect(input)).sort()
if (!files.length) throw new Error(`No .wbs examples found in ${input}`)
const server = await createServer({
  root: webRoot,
  configFile: path.join(webRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
})
let errors = 0
let warnings = 0
try {
  const { runScript } = await server.ssrLoadModule("/src/dsl/index.ts")
  for (const file of files) {
    const result = runScript(await readFile(file, "utf8"))
    const blocking = result.diagnostics.filter((diagnostic: { code: string }) => !diagnostic.code.startsWith("W_"))
    const quality = result.diagnostics.filter((diagnostic: { code: string }) => diagnostic.code.startsWith("W_"))
    errors += blocking.length
    warnings += quality.length
    console.log(`${path.relative(input, file)}: ${blocking.length} errors, ${quality.length} warnings`)
    for (const diagnostic of result.diagnostics) {
      console.log(`  ${diagnostic.severity} ${diagnostic.code} ${diagnostic.line}:${diagnostic.col} ${diagnostic.message}`)
    }
    if (result.document) {
      const duration = result.document.scenes.reduce((sum, scene) => sum + new Timeline(scene, result.document!.canvas).duration + (scene.transition?.duration ?? 0) + (scene.gapAfter ?? 0), 0)
      console.log(`  duration ${duration.toFixed(1)}s`)
      if (duration > 45) {
        errors++
        console.log(`  error E_EXAMPLE_DURATION Script is ${duration.toFixed(1)}s; examples must not exceed 45s.`)
      }
    }
  }
} finally {
  await server.close()
}
console.log(`Validated ${files.length} example(s): ${errors} errors, ${warnings} warnings.`)
if (errors) process.exitCode = 1
