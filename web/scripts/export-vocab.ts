import { writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { BOARD_BASES, THEMES } from "../src/defaults/themes.ts"
import { BUILTIN_MACROS } from "../src/dsl/builtinMacros.ts"
import {
  CAMERA_VERBS,
  EASE_NAMES,
  ENTER_EFFECT_NAMES,
  EXIT_EFFECT_NAMES,
  FONT_NAMES,
  ICON_NAMES,
  LOOP_EFFECT_NAMES,
  PROPERTY_KEYS,
  SAY_TONES,
  SHAPE_TYPES,
  STYLE_NAMES,
  TEXT_EFFECT_NAMES,
  TRANSITION_NAMES,
} from "../src/dsl/grammar.ts"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const target = path.resolve(scriptDirectory, "../../../Strokeline-Skills/skills/strokeline/references/vocabulary.md")
const rows = (values: readonly string[], describe: (value: string) => string) =>
  values.map((value) => `| \`${value}\` | ${describe(value)} |`).join("\n")
const titleCase = (value: string) => value[0]!.toUpperCase() + value.slice(1)
const icons = [...ICON_NAMES].sort((a, b) => a.localeCompare(b))
const properties: Record<string, string> = {
  POSITION: "Object center coordinates.",
  FROM: "Line start point or arrow source operand.",
  TO: "Line end point, animation target, or camera target point.",
  SIZE: "Text/icon size or chart/table dimensions.",
  MAXWIDTH: "Maximum text layout width.",
  PADDING: "Image/text interior padding.",
  BOXOPACITY: "Text plate opacity.",
  WIDTH: "Object width.",
  HEIGHT: "Object height.",
  RADIUS: "Circle radius.",
  COLOR: "Stroke, text, or icon color.",
  MORPH: "Morph target identifier.",
  FILL: "Shape fill color.",
  BACKGROUND: "Text plate background color.",
  STROKE: "Stroke width.",
  BOARD: "Procedural board background name.",
  HAND: "Hand-drawn cursor toggle (`on` or `off`).",
  THEME: "Named theme preset.",
  OPACITY: "Object opacity from 0 to 1.",
  TEXT: "Text content or shape label.",
  ALIGN: "Text alignment.",
  LINEHEIGHT: "Text line-height multiplier.",
  FIT: "Fit text using WIDTH and HEIGHT values.",
  ANCHOR: "Text-box anchor placement.",
  BELOW: "Place relative to another object's lower edge.",
  ABOVE: "Place relative to another object's upper edge.",
  LEFTOF: "Place relative to another object's left edge.",
  RIGHTOF: "Place relative to another object's right edge.",
  ALIGNX: "Align horizontal center to a referenced object.",
  ALIGNY: "Align vertical center to a referenced object.",
  CENTERON: "Center on a referenced object.",
  GAP: "Layout or relative-placement gap.",
  DIRECTION: "Stack direction (`vertical` or `horizontal`).",
  COLUMNS: "Table columns or grid column count.",
  ROW: "Table row data or highlight selector.",
  COLUMN: "Column highlight selector.",
  CELL: "Table cell data or row/column selector.",
  HEADERCOLOR: "Table header fill color.",
  ALTERNATECOLOR: "Alternating table row color.",
  ROWCOLOR: "Table row-specific color.",
  CELLCOLOR: "Table cell-specific color.",
  DIVIDER: "Table divider row index.",
  HIGHLIGHT: "Object or table highlight.",
  LABEL: "Arrow or shape label.",
  LINESTYLE: "Arrow line pattern.",
  ROUTE: "Arrow routing mode.",
  VIA: "Arrow route waypoint coordinates.",
  HEAD: "Arrow head style.",
  SOURCELABEL: "Label at arrow source.",
  TARGETLABEL: "Label at arrow target.",
  TARGET: "Camera target object ID.",
  SCALE: "Object scale or camera zoom scale.",
  DURATION: "Animation/narration/transition duration.",
  EASE: "Animation easing function.",
  AT: "Timeline or macro position.",
  DRAW: "Object reveal duration.",
  REVEAL: "Reveal configuration.",
  POINTS: "Raw INK control points as x/y pairs.",
  FREEHAND: "Variable-width INK stroke toggle.",
  PENFOLLOW: "Draw a pen along a path.",
  ROUGH: "Enable deterministic rough geometry.",
  ROUGHNESS: "Rough-stroke intensity.",
  ROUGHSEED: "Deterministic roughness seed.",
  BOWING: "Rough line bowing.",
  ROUGHFILL: "Patterned rough fill style.",
  INKSIZE: "Freehand INK stroke size.",
  THINNING: "Freehand stroke thinning.",
  SMOOTHING: "Freehand stroke smoothing.",
  STREAMLINE: "Freehand stroke streamline amount.",
  TAPER: "Freehand stroke endpoint tapering.",
  NAME: "Icon registry name.",
  ICON: "Icon name alias.",
  PEN: "Per-object pen style.",
  URL: "Image URL.",
  CORNERS: "Rounded-corner radius.",
  BORDER: "Image border color.",
  MASK: "Image mask style.",
  SHADOW: "Shape shadow amount or image shadow color.",
  GRADIENT: "Two-color shape gradient.",
  WORDS: "Selected words for a marker text entrance.",
  TRAIL: "PATHFOLLOW trail toggle.",
}

let output = `# Strokeline vocabulary\n\n`
output += `Generated from the app DSL registries by \`web/scripts/export-vocab.ts\`. Regenerate with \`npm run export:vocab\` from \`web/\`. The app parser/compiler/renderer are the source of truth.\n\n`
output += `## Shapes and components\n\n| Name | Exact form | Block/action | Meaning |\n|---|---|---|---|\n`
for (const type of SHAPE_TYPES) output += `| \`${type}\` | \`CREATE id AS ${type}\` | block; \`END\` | ${titleCase(type.toLowerCase())} shape/object. |\n`
output += `| \`ARROW\` | \`ARROW [id FROM] source -> target\` | action; no \`END\` | Route connector between existing objects. |\n| \`TABLE\` | \`TABLE id\` | block; \`END\` | Measurable rows/columns table. |\n| \`BARCHART\`, \`LINECHART\`, \`PIECHART\` | \`BARCHART id\`, \`LINECHART id\`, \`PIECHART id\` | block; \`END\` | Data chart with \`POSITION\`, \`SIZE\`, and repeated \`DATA "label" number\`. |\n| \`INK\` raw | \`INK id\` + \`POINTS x y x y ...\` | block; \`END\` | Procedural raw stroke; requires at least two coordinate pairs. |\n| \`INK ARROW\` | \`INK ARROW FROM x y TO x y\` | action; optional properties, optional \`END\` | Hand-drawn annotation arrow. |\n| \`INK UNDERLINE\`, \`INK CIRCLE\` | \`INK UNDERLINE id\`, \`INK CIRCLE id\` | action; optional properties, optional \`END\` | Annotation attached to an existing object. |\n| \`PATHFOLLOW\` | \`PATHFOLLOW object ALONG namedArrow\` | action; no \`END\` | Moves an object along an existing named ARROW route. |\n`
output += `\nCODE, TERMINAL, BROWSER, PHONE, SPLIT, BEFORE-AFTER, and COUNTER are not registered DSL types/statements in the current app and are not valid syntax.\n\n`
output += `## Statements and animation effects\n\n`
output += `| Category | Exact spellings | Form | Meaning |\n|---|---|---|---|\n`
output += `| ENTER | ${ENTER_EFFECT_NAMES.map((value) => `\`${value}\``).join(", ")} | \`ENTER id effect [DURATION time]\`; action | Entrance; text effects target TEXT. \`marker\` additionally takes \`WORDS "word1 word2"\`. |\n`
output += `| EXIT | ${EXIT_EFFECT_NAMES.map((value) => `\`${value}\``).join(", ")} | \`EXIT id effect [DURATION time]\`; action | Exit animation. |\n`
output += `| LOOP | ${LOOP_EFFECT_NAMES.map((value) => `\`${value}\``).join(", ")} | \`LOOP id effect [AMPLITUDE n] [PERIOD time]\`; action | Procedural idle animation. |\n`
output += `| CAMERA | ${CAMERA_VERBS.map((value) => `\`${value}\``).join(", ")} | \`CAMERA verb\` + property lines; action | Camera operations. |\n`
output += `| EASE | ${EASE_NAMES.map((value) => `\`${value}\``).join(", ")} | \`EASE name\` | Animation interpolation curve. |\n`
output += `| TRANSITION | ${TRANSITION_NAMES.map((value) => `\`${value}\``).join(", ")} | \`TRANSITION type DURATION time\` | Scene transition. |\n`
output += `| SAY TONE | ${SAY_TONES.map((value) => `\`${value}\``).join(", ")} | \`TONE name\` | Narration intent metadata. |\n`
output += `| Text effect | ${TEXT_EFFECT_NAMES.map((value) => `\`${value}\``).join(", ")} | \`ENTER textId effect\`; action | Text-only entrance; marker uses \`WORDS\`. |\n`
output += `| PARALLEL | \`STAGGER\` | \`PARALLEL [STAGGER duration]\` ... \`END\`; block | Runs children concurrently; stagger offsets successive child start times. |\n`
output += `| STACK, GRID | \`STACK\`, \`GRID\` | block; \`END\` | Measurable shape/text layout containers. |\n`
output += `\n## Built-in macros\n\n| Macro | Parameters | Form | Meaning |\n|---|---|---|---|\n`
for (const macro of BUILTIN_MACROS) output += `| \`${macro.name}\` | ${macro.params.length ? macro.params.map((param) => `\`${param}\``).join(", ") : "none"} | \`USE ${macro.name} AS id AT x y [WITH key value ...]\` | Reusable procedural macro. |\n`
output += `\n## Procedural icon registry\n\nExact accepted \`NAME\`/\`ICON\` values:\n\n`
output += icons.map((icon) => `- \`${icon}\` — registered procedural Lucide icon.`).join("\n") + "\n"
output += `\n## Boards, themes, style, hand, and font\n\n`
output += `**BOARD names:** ${Object.keys(BOARD_BASES).sort().map((name) => `\`${name}\``).join(", ")}. BOARD selects a procedural background.\n\n`
output += `**THEME names:** ${Object.entries(THEMES).map(([name, theme]) => `\`${name}\` (board \`${theme.board}\`, pen \`${theme.pen}\`)`).join(", ")}. THEME selects coordinated board/background/ink/pen defaults.\n\n`
output += `**STYLE/pen names:** ${STYLE_NAMES.map((name) => `\`${name}\``).join(", ")}. STYLE sets the drawing mode; PEN sets an object's pen style.\n\n`
output += `**HAND:** \`on\`, \`off\` (header property \`HAND on|off\`, hand cursor toggle).\n\n`
output += `**FONT:** recognized aliases ${FONT_NAMES.map((name) => `\`${name}\``).join(", ")}. \`neat\` and \`marker\` map to Inter, \`arabic\` to Amiri, other values fall back to Caveat; the parser accepts a text value.\n\n`
output += `## Shapes and properties\n\n`
output += rows(SHAPE_TYPES, (type) => `${titleCase(type.toLowerCase())} object type.`) + "\n\n"
output += `| Property | Meaning |\n|---|---|\n`
output += rows(PROPERTY_KEYS, (property) => properties[property] ?? "Recognized global DSL property; use only in the statement-specific forms documented in syntax.md.") + "\n"

await writeFile(target, output, "utf8")
console.log(`Wrote ${path.relative(process.cwd(), target)} (${icons.length} icons, ${BUILTIN_MACROS.length} built-in macros).`)
