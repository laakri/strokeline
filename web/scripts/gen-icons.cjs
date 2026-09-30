// Regenerates src/renderer/shapes/icons.generated.ts from the real lucide-react
// icon modules (dynamic imports of their __iconData), for the curated icon set.
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")

const WEB_ROOT = process.cwd()
const ICONS_DIR = path.join(WEB_ROOT, "node_modules", "lucide-react", "dist", "esm", "icons")
const OUT = path.join(WEB_ROOT, "src", "renderer", "shapes", "icons.generated.ts")

// Curated names -> actual .mjs file (canonical lucide file; old aliases mapped).
const CURATED = {
  user: "user",
  users: "users",
  search: "search",
  settings: "settings",
  database: "database",
  server: "server",
  cloud: "cloud",
  lock: "lock",
  "alert-triangle": "triangle-alert",
  "check-square": "square-check",
  home: "home",
  camera: "camera",
  shield: "shield",
  "shield-check": "shield-check",
  key: "key",
  mail: "mail",
  phone: "phone",
  printer: "printer",
  monitor: "monitor",
  tv: "tv",
  smartphone: "smartphone",
  tablet: "tablet",
  globe: "globe",
  map: "map",
  "map-pin": "map-pin",
  compass: "compass",
  "bar-chart": "chart-column",
  "pie-chart": "chart-pie",
  "line-chart": "chart-line",
  trending: "trending-up",
  star: "star",
  heart: "heart",
  bookmark: "bookmark",
  bell: "bell",
  calendar: "calendar",
  clock: "clock",
  "alarm-clock": "alarm-clock",
  timer: "timer",
  play: "play",
  pause: "pause",
  stop: "square",
  music: "music",
  film: "film",
  podcast: "podcast",
  wifi: "wifi",
  bluetooth: "bluetooth",
  radio: "radio",
  signal: "signal",
  "check-circle": "circle-check",
  "info": "info",
  "x-circle": "circle-x",
  help: "help-circle"
}

async function loadIcon(file) {
  const mod = await import(pathToFileURL(path.join(ICONS_DIR, file + ".mjs")).href)
  const data = mod && mod.__iconData
  const node = data && data.node
  if (!node) throw new Error("No __iconData/node for " + file)
  return node.map(([tag, attrs]) => [
    tag,
    Object.fromEntries(Object.entries(attrs || {}).filter(([k]) => k !== "key")),
  ])
}

async function main() {
  const entries = {}
  const missing = []
  for (const [name, file] of Object.entries(CURATED)) {
    try {
      entries[name] = await loadIcon(file)
    } catch (e) {
      missing.push(name)
    }
  }
  const body = Object.entries(entries)
    .map(([name, prims]) => `  "${name}": ${JSON.stringify(prims)},`)
    .join("\n")
  const src =
    '// AUTO-GENERATED from lucide-react geometry (24x24 viewBox). Do not edit.\n' +
    "// Curated icon set; regen with: node scripts/gen-icons.cjs\n\n" +
    "export type IconPrimitive = " +
    '["path", { d: string }] | ["circle", { cx: string; cy: string; r: string }] | ' +
    '["rect", { width: string; height: string; x: string; y: string; rx?: string; ry?: string }] | ' +
    '["ellipse", { cx: string; cy: string; rx: string; ry: string }] | ' +
    '["line", { x1: string; y1: string; x2: string; y2: string }] | ' +
    '["polyline", { points: string }] | ["polygon", { points: string }]\n\n' +
    "export const ICONS: Record<string, IconPrimitive[][]> = {\n" +
    body +
    "\n}\n\n" +
    "export const ICON_NAMES: readonly string[] = Object.keys(ICONS)\n"
  fs.writeFileSync(OUT, src, "utf8")
  const real = Object.keys(entries).length
  console.log("WROTE " + OUT)
  console.log("icons=" + real + "/" + Object.keys(CURATED).length + "  missing=" + (missing.length ? missing.join(",") : "none"))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
