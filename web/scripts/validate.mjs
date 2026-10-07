import { createCanvas, DOMMatrix, GlobalFonts, Path2D } from "@napi-rs/canvas"
import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(scriptDir, "..")
const fontPaths = [
  ["../node_modules/@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2", "Caveat Variable"],
  ["../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2", "Inter Variable"],
  ["../node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2", "Amiri"],
]

for (const [relativePath, family] of fontPaths) {
  const fontPath = fileURLToPath(new URL(relativePath, import.meta.url))
  if (!GlobalFonts.has(family)) GlobalFonts.registerFromPath(fontPath, family)
}

Object.defineProperties(globalThis, {
  Path2D: { configurable: true, value: Path2D },
  DOMMatrix: { configurable: true, value: DOMMatrix },
  document: {
    configurable: true,
    value: {
      createElement(tagName) {
        if (tagName !== "canvas")
          throw new Error(`Unsupported document element in validator: ${tagName}`)
        return createCanvas(1, 1)
      },
    },
  },
})

async function collectFiles(inputPath) {
  const inputStat = await stat(inputPath).catch((error) => {
    if (error.code === "ENOENT") throw new Error(`Path does not exist: ${inputPath}`)
    throw error
  })

  if (inputStat.isFile()) {
    if (path.extname(inputPath).toLowerCase() !== ".wbs")
      throw new Error(`Expected a .wbs file: ${inputPath}`)
    return [inputPath]
  }
  if (!inputStat.isDirectory())
    throw new Error(`Path is not a file or directory: ${inputPath}`)

  const entries = await readdir(inputPath, { withFileTypes: true })
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => collectFiles(path.join(inputPath, entry.name))),
  )
  return [
    ...entries
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".wbs")
      .map((entry) => path.join(inputPath, entry.name)),
    ...nested.flat(),
  ]
}

const inputs = process.argv.slice(2)
if (inputs.length === 0) {
  console.error("Usage: node scripts/validate.mjs <file.wbs | directory> [...]")
  process.exit(2)
}

let files
try {
  files = [
    ...new Set(
      (
        await Promise.all(inputs.map((input) => collectFiles(path.resolve(input))))
      ).flat(),
    ),
  ].sort()
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

if (files.length === 0) {
  console.error("No .wbs files found in the supplied paths.")
  process.exit(2)
}

const server = await createServer({
  root: webRoot,
  configFile: path.join(webRoot, "vite.config.ts"),
  server: { middlewareMode: true },
  appType: "custom",
})

let hasBlockingDiagnostics = false
let errorCount = 0
let warningCount = 0

try {
  const { runScript } = await server.ssrLoadModule("/src/dsl/index.ts")
  for (const file of files) {
    const source = await readFile(file, "utf8")
    const result = runScript(source)
    const diagnostics = result.diagnostics
    const blocking = diagnostics.filter(
      (diagnostic) => !diagnostic.code.startsWith("W_"),
    )
    const warnings = diagnostics.filter((diagnostic) =>
      diagnostic.code.startsWith("W_"),
    )
    errorCount += blocking.length
    warningCount += warnings.length
    if (blocking.length > 0) hasBlockingDiagnostics = true

    console.log(
      `${path.relative(process.cwd(), file)}: ${blocking.length} blocking diagnostics, ${warnings.length} quality warnings`,
    )
    for (const diagnostic of diagnostics) {
      const severity =
        diagnostic.severity === "error" ? "error" : "warning"
      console.log(
        `  ${severity} ${diagnostic.code} ${diagnostic.line}:${diagnostic.col} ${diagnostic.message}`,
      )
    }
  }
} finally {
  await server.close()
}

console.log(
  `Validated ${files.length} file(s): ${errorCount} blocking diagnostics, ${warningCount} quality warnings.`,
)
if (hasBlockingDiagnostics) process.exitCode = 1
