// Generator: emits src/renderer/shapes/icons.generated.ts
// by dynamic-importing lucide-react icons and serializing each
// icon's __iconData.node array (JSON-safe: [tag, {attrs}][]).

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.resolve(here, "..")
const lucideDir = path.join(webRoot, "node_modules", "lucide-react")
const iconsDir = path.join(lucideDir, "dist", "esm", "icons")
const outFile = path.join(webRoot, "src", "renderer", "shapes", "icons.generated.ts")

// Curated icon name -> lucide file candidate list
const ICON_MAP = {
  brain: ["brain"],
  user: ["user"],
  users: ["users"],
  database: ["database"],
  settings: ["settings"],
  search: ["search"],
  mail: ["mail"],
  camera: ["camera"],
  globe: ["globe"],
  lock: ["lock"],
  server: ["server"],
  plus: ["plus"],
  x: ["x"],
  check: ["check"],
  send: ["send"],
  printer: ["printer"],
  monitor: ["monitor"],
  tv: ["tv"],
  tablet: ["tablet"],
  smartphone: ["smartphone"],
  "git-branch": ["git-branch"],
  "git-merge": ["git-merge"],
  "git-pull-request": ["git-pull-request"],
  workflow: ["workflow"],
  box: ["box"],
  package: ["package"],
  clock: ["clock"],
  "book-open": ["book-open"],
  star: ["star"],
  heart: ["heart"],
  home: ["home", "house"],
  house: ["house"],
  folder: ["folder"],
  "file-text": ["file-text"],
  briefcase: ["briefcase"],
  cloud: ["cloud"],
  link: ["link"],
  "credit-card": ["credit-card"],
  key: ["key", "key-round"],
  "key-round": ["key-round"],
  archive: ["archive"],
  shield: ["shield"],
  "shield-check": ["shield-check"],
  bell: ["bell"],
  wifi: ["wifi"],
  "alert-triangle": ["alert-triangle", "triangle-alert"],
  "triangle-alert": ["triangle-alert"],
  "circle-help": ["circle-help", "help-circle", "circle-question-mark"],
  help: ["help", "circle-help", "help-circle", "circle-question-mark"],
  "users-round": ["users-round"],
  "database-zap": ["database-zap"],
  "git-fork": ["git-fork"],
  layers: ["layers"],
  "log-in": ["log-in"],
  "log-out": ["log-out"],
  "trash-2": ["trash-2", "trash"],
  trash: ["trash", "trash-2"],
  "edit-3": ["edit-3", "pen-tool", "pencil"],
  bookmark: ["bookmark"],
  download: ["download"],
  upload: ["upload"],
  "check-square": ["check-square", "square-check"],
  phone: ["phone"],
  map: ["map"],
  "map-pin": ["map-pin"],
  compass: ["compass"],
  "bar-chart": ["chart-column", "bar-chart-2", "bar-chart"],
  "pie-chart": ["chart-pie", "pie-chart"],
  "line-chart": ["chart-line", "line-chart"],
  trending: ["trending-up"],
  calendar: ["calendar"],
  "alarm-clock": ["alarm-clock"],
  timer: ["timer"],
  play: ["play"],
  pause: ["pause"],
  stop: ["square"],
  music: ["music"],
  film: ["film"],
  podcast: ["podcast", "audio-lines", "mic"],
  bluetooth: ["bluetooth"],
  radio: ["radio"],
  signal: ["signal"],
  "check-circle": ["circle-check", "check-circle"],
  info: ["info"],
  "x-circle": ["circle-x", "x-circle"],
}

for (const filename of fs.readdirSync(iconsDir).sort()) {
  if (!filename.endsWith(".mjs")) continue
  const name = filename.slice(0, -4)
  if (!Object.prototype.hasOwnProperty.call(ICON_MAP, name)) {
    ICON_MAP[name] = [name]
  }
}

function resolveIconFile(candidates) {
  for (const candidate of candidates) {
    const filePath = path.join(iconsDir, `${candidate}.mjs`)
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  return null
}

async function loadIconPrimitives(filePath) {
  let curPath = filePath
  let mod = await import(pathToFileURL(curPath).href)
  let data = mod.__iconData ?? mod.default?.__iconData

  if (!data?.node) {
    const content = fs.readFileSync(curPath, "utf8")
    const match = content.match(/from\s+['"]\.\/([^'"]+)['"]/)
    if (match) {
      const rel = match[1].endsWith(".mjs") ? match[1] : `${match[1]}.mjs`
      curPath = path.join(path.dirname(curPath), rel)
      mod = await import(pathToFileURL(curPath).href)
      data = mod.__iconData ?? mod.default?.__iconData
    }
  }

  if (!data?.node || !Array.isArray(data.node)) {
    throw new Error(`Invalid icon data in ${filePath}`)
  }
  return data.node.map(([tag, attrs]) => [
    tag,
    Object.fromEntries(Object.entries(attrs || {}).filter(([k]) => k !== "key")),
  ])
}

async function main() {
  const entries = {}
  const missing = []

  for (const [name, candidates] of Object.entries(ICON_MAP)) {
    const filePath = resolveIconFile(candidates)
    if (!filePath) {
      missing.push(name)
      continue
    }
    try {
      entries[name] = await loadIconPrimitives(filePath)
    } catch {
      missing.push(name)
    }
  }

  const body = Object.entries(entries)
    .map(([name, prims]) => `  "${name}": ${JSON.stringify(prims)},`)
    .join("\n")

  const out = `// AUTO-GENERATED from lucide-react geometry (24x24 viewBox). Do not edit.
// Full installed Lucide icon set; regen with: node scripts/gen-icons.mjs

export type IconPrimitive = [tag: string, attrs: Record<string, string>]

export const ICONS: Record<string, IconPrimitive[]> = {
${body}
}

export const ICON_NAMES: readonly string[] = Object.keys(ICONS)
`

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, out, "utf8")
  console.log(
    `WROTE ${path.relative(webRoot, outFile)} — ${Object.keys(entries).length}/${Object.keys(ICON_MAP).length} icons; missing: ${missing.join(", ") || "none"}`
  )

  const defaultsIconFile = path.join(webRoot, "src", "defaults", "icons.ts")
  const defaultsOut = `// AUTO-GENERATED from lucide-react geometry. Do not edit.
// Full installed Lucide icon set; regen with: node scripts/gen-icons.mjs

export const ICON_NAMES = ${JSON.stringify(Object.keys(entries), null, 2)} as const

export type IconName = (typeof ICON_NAMES)[number]
`
  fs.mkdirSync(path.dirname(defaultsIconFile), { recursive: true })
  fs.writeFileSync(defaultsIconFile, defaultsOut, "utf8")
  console.log(`WROTE ${path.relative(webRoot, defaultsIconFile)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
