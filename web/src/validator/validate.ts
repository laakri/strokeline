import { error, warning, type Diagnostic } from "@/dsl/diagnostics.ts"
import { DEFAULT_TEXT_SIZE } from "@/defaults/defaults.ts"
import { overlapsReelsUi } from "@/reels/reels.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { layoutTable, TABLE_CELL_PADDING } from "@/lib/tableLayout.ts"
import { resolveArrowEndpoints } from "@/renderer/geometry.ts"
import { tableBounds } from "@/renderer/shapes/table.ts"
import { ICON_NAMES, PROPERTY_KEYS, SHAPE_TYPES } from "@/dsl/grammar.ts"
import type { Point, Scene, SceneDocument, SceneNode, TimelineOp } from "@/ir/types.ts"
import { plainSubtitleText } from "@/subtitles/subtitles.ts"

const knownProperties = new Set<string>(PROPERTY_KEYS)
const knownTypes = new Set<string>([
  ...SHAPE_TYPES.map((type) => type.toLowerCase()),
  "arrow",
  "ink",
  "chart",
  "image",
  "table",
])
const knownIcons = new Set<string>(ICON_NAMES)

function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function validate(document: SceneDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  if (document.canvas.width <= 0 || document.canvas.height <= 0)
    diagnostics.push(
      error("E_BAD_RANGE", "Canvas dimensions must be positive.", 1, 1)
    )
  if (document.style.strokeWidth <= 0)
    diagnostics.push(
      error("E_BAD_RANGE", "Stroke width must be positive.", 1, 1)
    )
  for (const scene of document.scenes) {
    validateSays(scene, diagnostics)
    if (scene.transition && scene.transition.duration <= 0) {
      diagnostics.push(
        error(
          "E_BAD_RANGE",
          "Transition duration must be positive.",
          scene.transition.source?.line ?? 1,
          scene.transition.source?.col ?? 1
        )
      )
    }
    const created = new Map<string, number>()
    const createdTypes = new Map<string, string>()
    const createdNodes = new Map<string, SceneNode>()
    for (const op of scene.ops) {
      if (op.kind === "create") {
        if (created.has(op.node.id))
          diagnostics.push(
            error(
              "E_DUPLICATE_ID",
              `Object id "${op.node.id}" is already used in this scene.`,
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        created.set(op.node.id, op.t)
        createdTypes.set(op.node.id, op.node.type)
        createdNodes.set(op.node.id, op.node)
        if (op.node.groupId) {
          created.set(op.node.groupId, op.t)
          createdTypes.set(op.node.groupId, "group")
        }
        if (!knownTypes.has(op.node.type))
          diagnostics.push(
            error(
              "E_UNKNOWN_TYPE",
              `Unknown object type "${op.node.type}".`,
              op.source?.line ?? 1,
              op.source?.col ?? 1,
              nearest(op.node.type, [...knownTypes])
            )
          )
        if (op.node.opacity < 0 || op.node.opacity > 1)
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              `Opacity for "${op.node.id}" must be between 0 and 1.`,
              location(op, "OPACITY").line,
              location(op, "OPACITY").col
            )
          )
        const nodeSourceProperties =
          (op.node.data?._sourceProperties as string[] | undefined) ?? []
        const supportsShapePaint = ["circle", "ellipse", "rectangle", "diamond"].includes(op.node.type)
        if (
          nodeSourceProperties.includes("GRADIENT") &&
          (!supportsShapePaint ||
            !op.node.style.gradient ||
            op.node.style.gradient.length !== 2 ||
            op.node.style.gradient.some((color) => !parseHexColor(color)))
        )
          diagnostics.push(error("E_BAD_RANGE", `GRADIENT for "${op.node.id}" needs exactly two #RGB or #RRGGBB colors on a circle, ellipse, rectangle, or diamond.`, location(op, "GRADIENT").line, location(op, "GRADIENT").col))
        if (
          op.node.style.shadow !== undefined &&
          (!supportsShapePaint ||
            !Number.isFinite(op.node.style.shadow) ||
            op.node.style.shadow < 0 ||
            op.node.style.shadow > 100)
        )
          diagnostics.push(error("E_BAD_RANGE", `SHADOW for "${op.node.id}" must be between 0 and 100 on a circle, ellipse, rectangle, or diamond.`, location(op, "SHADOW").line, location(op, "SHADOW").col))
        if (op.node.maxWidth !== undefined && op.node.maxWidth <= 0)
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              `MAXWIDTH for "${op.node.id}" must be positive.`,
              location(op, "MAXWIDTH").line,
              location(op, "MAXWIDTH").col
            )
          )
        if (
          op.node.align !== undefined &&
          !["left", "center", "right"].includes(op.node.align)
        )
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              `ALIGN for "${op.node.id}" must be left, center, or right.`,
              location(op, "ALIGN").line,
              location(op, "ALIGN").col
            )
          )
        if (
          op.node.lineHeight !== undefined &&
          (!Number.isFinite(op.node.lineHeight) || op.node.lineHeight <= 0)
        )
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              `LINEHEIGHT for "${op.node.id}" must be positive.`,
              location(op, "LINEHEIGHT").line,
              location(op, "LINEHEIGHT").col
            )
          )
        if (
          op.node.fit &&
          (op.node.type !== "text" ||
            op.node.fit.width <= 0 ||
            op.node.fit.height <= 0)
        )
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              `FIT for "${op.node.id}" needs positive WIDTH and HEIGHT on TEXT.`,
              location(op, "FIT").line,
              location(op, "FIT").col
            )
          )
        if (op.node.type === "text") {
          const fontSize = op.node.style.fontSize ?? DEFAULT_TEXT_SIZE
          const measured = layoutText(
            op.node.text ?? op.node.label ?? "",
            fontSize,
            op.node.maxWidth,
            (line) => measureTextWidth(line, fontSize, op.node.style.fontFamily),
            op.node.lineHeight
          )
          if (
            !Number.isFinite(measured.width) ||
            !Number.isFinite(measured.height)
          )
            diagnostics.push(
              error(
                "E_BAD_RANGE",
                `Text bounds for "${op.node.id}" could not be measured.`,
                location(op, "TEXT").line,
                location(op, "TEXT").col
              )
            )
          if (op.node.textBox && (
            op.node.textBox.padding < 0 ||
            op.node.textBox.corners < 0 ||
            op.node.textBox.opacity < 0 || op.node.textBox.opacity > 1
          )) diagnostics.push(error("E_BAD_RANGE", `Text plate values for "${op.node.id}" are out of range.`, location(op, "BACKGROUND").line, location(op, "BACKGROUND").col))
        }
        if (
          op.node.type === "circle" &&
          (!op.node.radius || op.node.radius <= 0)
        )
          diagnostics.push(
            error(
              "E_MISSING_REQUIRED_PROP",
              `Circle "${op.node.id}" needs a positive RADIUS.`,
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        if (
          (op.node.type === "rectangle" || op.node.type === "diamond" || op.node.type === "ellipse") &&
          (!op.node.size || op.node.size.width <= 0 || op.node.size.height <= 0)
        )
          diagnostics.push(
            error(
              "E_MISSING_REQUIRED_PROP",
              `${op.node.type === "ellipse" ? "Ellipse" : op.node.type === "diamond" ? "Diamond" : "Rectangle"} "${op.node.id}" needs positive WIDTH and HEIGHT.`,
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        if (op.node.type === "image") {
          const image = op.node.image
          const propertyLocations = op.node.data?._sourcePropertyLocations as
            | Record<string, { line: number; col: number }>
            | undefined
          const imageLocation = propertyLocations?.URL ?? op.source ?? { line: 1, col: 1 }
          if (!image?.url) {
            diagnostics.push(error(
              "E_IMAGE_URL",
              `IMAGE "${op.node.id}" needs an HTTPS URL or a same-origin asset path.`,
              imageLocation.line,
              imageLocation.col,
              "Add an HTTPS URL or a root path such as \"/brand-icons/docker.svg\"."
            ))
          } else if (!isAllowedImageUrl(image.url)) {
            diagnostics.push(error(
              "E_IMAGE_URL",
              `IMAGE URL must use HTTPS or a root-relative asset path: ${image.url}`,
              imageLocation.line,
              imageLocation.col,
              "Use a publicly accessible HTTPS URL or a same-origin root path."
            ))
          }
          if (!op.node.size || !Number.isFinite(op.node.size.width) || !Number.isFinite(op.node.size.height) || op.node.size.width <= 0 || op.node.size.height <= 0)
            diagnostics.push(error(
              "E_MISSING_REQUIRED_PROP",
              `IMAGE "${op.node.id}" needs positive WIDTH and HEIGHT.`,
              op.source?.line ?? 1,
              op.source?.col ?? 1,
              "Set WIDTH and HEIGHT to positive values."
            ))
          const fit = String(image?.fit ?? "cover").toLowerCase()
          if (!(["cover", "contain"] as string[]).includes(fit))
            diagnostics.push(error(
              "E_BAD_RANGE",
              `IMAGE FIT must be cover or contain, received "${fit}".`,
              propertyLocations?.FIT?.line ?? op.source?.line ?? 1,
              propertyLocations?.FIT?.col ?? op.source?.col ?? 1
            ))
          const sourceProps = (op.node.data?._sourceProperties as string[] | undefined) ?? []
          if (sourceProps.includes("BORDER") && !image?.border)
            diagnostics.push(error(
              "E_MISSING_REQUIRED_PROP",
              "IMAGE BORDER needs a color.",
              propertyLocations?.BORDER?.line ?? op.source?.line ?? 1,
              propertyLocations?.BORDER?.col ?? op.source?.col ?? 1
            ))
          if (sourceProps.includes("MASK") && !image?.mask)
            diagnostics.push(error(
              "E_BAD_RANGE",
              "IMAGE MASK supports only circle.",
              propertyLocations?.MASK?.line ?? op.source?.line ?? 1,
              propertyLocations?.MASK?.col ?? op.source?.col ?? 1
            ))
          if (!Number.isFinite(image?.corners) || (image?.corners ?? 0) < 0)
            diagnostics.push(error(
              "E_BAD_RANGE",
              "IMAGE CORNERS must be a finite non-negative number.",
              propertyLocations?.CORNERS?.line ?? op.source?.line ?? 1,
              propertyLocations?.CORNERS?.col ?? op.source?.col ?? 1
            ))
          if (!Number.isFinite(image?.padding) || (image?.padding ?? 0) < 0)
            diagnostics.push(error(
              "E_BAD_RANGE",
              "IMAGE PADDING must be a finite non-negative number.",
              propertyLocations?.PADDING?.line ?? op.source?.line ?? 1,
              propertyLocations?.PADDING?.col ?? op.source?.col ?? 1
            ))
        }
        if (op.node.type === "icon") {
          const iconName = (op.node.data?.iconName ?? op.node.data?.name) as
            string | undefined
          if (!iconName) {
            diagnostics.push(
              error(
                "E_MISSING_REQUIRED_PROP",
                `Icon "${op.node.id}" needs a NAME property.`,
                op.source?.line ?? 1,
                op.source?.col ?? 1
              )
            )
          } else if (!knownIcons.has(iconName)) {
            const loc = (
              op.node.data?._sourcePropertyLocations as
                Record<string, { line: number; col: number }> | undefined
            )?.NAME ??
              (
                op.node.data?._sourcePropertyLocations as
                  Record<string, { line: number; col: number }> | undefined
              )?.ICON ??
              op.source ?? { line: 1, col: 1 }
            diagnostics.push(
              error(
                "E_UNKNOWN_ICON",
                `Unknown icon "${iconName}".`,
                loc.line,
                loc.col,
                nearest(iconName, [...knownIcons])
              )
            )
          }
        }
        const sourceProperties =
          (op.node.data?._sourceProperties as string[] | undefined) ?? []
        for (const property of sourceProperties)
          if (!knownProperties.has(property))
            diagnostics.push(
              error(
                "E_UNKNOWN_PROP",
                `Unknown property "${property}".`,
                location(op, property).line,
                location(op, property).col,
                nearest(property, [...knownProperties])
              )
            )
        if (op.node.type === "arrow") {
          const propertyLocations = op.node.data?._sourcePropertyLocations as
            | Record<string, { line: number; col: number }>
            | undefined
          const lineStyle = op.node.style.lineStyle ?? "solid"
          const route = String(op.node.data?.route ?? "straight")
          const head = String(op.node.data?.head ?? "end")
          if (!("solid dashed dotted".split(" ").includes(lineStyle)))
            diagnostics.push(error("E_BAD_RANGE", `ARROW LINESTYLE must be solid, dashed, or dotted, received "${lineStyle}".`, propertyLocations?.LINESTYLE?.line ?? op.source?.line ?? 1, propertyLocations?.LINESTYLE?.col ?? op.source?.col ?? 1))
          if (!("straight elbow curve".split(" ").includes(route)))
            diagnostics.push(error("E_BAD_RANGE", `ARROW ROUTE must be straight, elbow, or curve, received "${route}".`, propertyLocations?.ROUTE?.line ?? op.source?.line ?? 1, propertyLocations?.ROUTE?.col ?? op.source?.col ?? 1))
          if (!("none end both triangle diamond diamond-filled open".split(" ").includes(head)))
            diagnostics.push(error("E_BAD_RANGE", `ARROW HEAD must be none, end, both, triangle, diamond, diamond-filled, or open; received "${head}".`, propertyLocations?.HEAD?.line ?? op.source?.line ?? 1, propertyLocations?.HEAD?.col ?? op.source?.col ?? 1))
          if (!Number.isFinite(op.node.style.strokeWidth) || op.node.style.strokeWidth <= 0)
            diagnostics.push(error("E_BAD_RANGE", "ARROW STROKE must be positive.", propertyLocations?.STROKE?.line ?? op.source?.line ?? 1, propertyLocations?.STROKE?.col ?? op.source?.col ?? 1))
          const fromId = String(op.node.data?.fromId ?? "")
          const toId = String(op.node.data?.toId ?? "")
          checkReference(fromId, created, op.t, diagnostics, op.source)
          checkReference(toId, created, op.t, diagnostics, op.source)
        }
      } else if (op.kind === "animate") {
        checkReference(op.targetId, created, op.t, diagnostics, op.source)
        if (op.anim.tableTarget) {
          const target = createdNodes.get(op.targetId)
          const selector = op.anim.tableTarget
          const rows = (target?.data?.rows as string[][] | undefined) ?? []
          const columns = (target?.data?.columns as string[] | undefined) ?? []
          const invalid = target?.type !== "table" ||
            (selector.type === "row" && selector.row > rows.length) ||
            (selector.type === "column" && selector.column > columns.length) ||
            (selector.type === "cell" && (selector.row > rows.length || selector.column > columns.length))
          if (invalid)
            diagnostics.push(error("E_BAD_RANGE", `HIGHLIGHT target is outside TABLE "${op.targetId}".`, op.source?.line ?? 1, op.source?.col ?? 1))
        }
        if (op.anim.duration <= 0)
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              "Animation duration must be positive.",
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        if (
          op.anim.verb === "opacity" &&
          (op.anim.to?.opacity === undefined ||
            !Number.isFinite(op.anim.to.opacity) ||
            op.anim.to.opacity < 0 ||
            op.anim.to.opacity > 1)
        )
          diagnostics.push(error("E_BAD_RANGE", "Animated OPACITY must be between 0 and 1.", op.source?.line ?? 1, op.source?.col ?? 1))
        if (
          op.anim.verb === "color" &&
          (!op.anim.color || !parseHexColor(op.anim.color))
        )
          diagnostics.push(error("E_BAD_RANGE", "Animated COLOR must be a #RGB or #RRGGBB hex color.", op.source?.line ?? 1, op.source?.col ?? 1))
        if (
          op.anim.verb === "move" &&
          op.anim.arc !== undefined &&
          (!Number.isFinite(op.anim.arc) || Math.abs(op.anim.arc) > 2000)
        )
          diagnostics.push(error("E_BAD_RANGE", "MOVE ARC must be a finite value between -2000 and 2000.", op.source?.line ?? 1, op.source?.col ?? 1))
        if (
          op.anim.verb === "scale" &&
          (!op.anim.to?.scale || op.anim.to.scale <= 0)
        )
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              "Scale must be positive.",
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        if (
          op.anim.verb === "highlight" &&
          createdTypes.get(op.targetId) === "ink"
        )
          diagnostics.push(
            warning(
              "E_UNSUPPORTED",
              "HIGHLIGHT is not supported on INK objects yet; the highlight will be skipped. Add a HIGHLIGHT to the shape instead.",
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
      } else {
        if (op.camera.targetId)
          checkReference(
            op.camera.targetId,
            created,
            op.t,
            diagnostics,
            op.source
          )
        if (op.camera.duration <= 0)
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              "Camera duration must be positive.",
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
        if (op.camera.scale !== undefined && op.camera.scale <= 0)
          diagnostics.push(
            error(
              "E_BAD_RANGE",
              "Camera scale must be positive.",
              op.source?.line ?? 1,
              op.source?.col ?? 1
            )
          )
      }
    }
    validateSceneWarnings(scene, document, diagnostics)
  }
  return diagnostics
}

function validateSays(scene: Scene, diagnostics: Diagnostic[]): void {
  const says = scene.says ?? []
  for (const say of says) {
    const text = plainSubtitleText(say.text)
    const location = say.source ?? { line: 1, col: 1 }
    const wordCount = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0
    if (say.duration > 0 && wordCount / say.duration > 4)
      diagnostics.push(warning("W_SAY_FAST", "SAY is faster than 4 words per second.", location.line, location.col, "Increase DURATION; playback will also be auto-scheduled to a natural speaking pace."))
  }
  for (let index = 0; index < says.length; index++) {
    const left = says[index]!
    for (const right of says.slice(index + 1)) {
      if (left.start < right.start + right.duration && right.start < left.start + left.duration) {
        const location = right.source ?? { line: 1, col: 1 }
        diagnostics.push(warning("W_SAY_OVERLAP", `SAY lines ${left.source?.line ?? "?"} and ${right.source?.line ?? "?"} overlap.`, location.line, location.col, "Playback auto-schedules SAY lines so they do not overlap."))
      }
    }
  }
  const visibleText = scene.ops.filter(
    (op): op is Extract<TimelineOp, { kind: "create" }> =>
      op.kind === "create" && op.node.type === "text"
  )
  for (const say of says) {
    const sayWords = new Set(plainSubtitleText(say.text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    if (sayWords.size < 3) continue
    for (const op of visibleText) {
      if (op.t >= say.start + say.duration || op.t + op.draw.duration <= say.start) continue
      const textWords = new Set(plainSubtitleText(op.node.text ?? op.node.label ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      if (!textWords.size) continue
      const common = [...sayWords].filter((word) => textWords.has(word)).length
      const similarity = common / Math.max(sayWords.size, textWords.size)
      if (similarity > 0.7) {
        const location = say.source ?? op.source ?? { line: 1, col: 1 }
        diagnostics.push(warning("W_SAY_ECHO", `SAY repeats visible TEXT "${op.node.id}".`, location.line, location.col, "Explain the why, analogy, or consequence instead."))
      }
    }
  }
}

interface MeasuredText {
  op: Extract<TimelineOp, { kind: "create" }>
  text: string
  bounds: { x: number; y: number; width: number; height: number }
  fontSize: number
  end: number
}

function validateSceneWarnings(
  scene: Scene,
  document: SceneDocument,
  diagnostics: Diagnostic[]
): void {
  const safeMarginX = document.canvas.width / 16
  const safeMarginY = document.canvas.height * (100 / 1080)
  const creates = scene.ops.filter(
    (op): op is Extract<TimelineOp, { kind: "create" }> =>
      op.kind === "create" && op.node.data?.layoutContainer !== true
  )
  const createsById = new Map(creates.map((op) => [op.node.id, op.node]))
  const erasures = new Map<string, number>()
  for (const op of scene.ops) {
    if (op.kind === "animate" && op.anim.verb === "erase") {
      const end = op.t + op.anim.duration
      erasures.set(
        op.targetId,
        Math.min(erasures.get(op.targetId) ?? Infinity, end)
      )
    }
  }

  const textEntries: MeasuredText[] = []
  for (const op of creates) {
    if (op.node.type === "table") {
      const columns = (op.node.data?.columns as string[] | undefined) ?? []
      const rows = (op.node.data?.rows as string[][] | undefined) ?? []
      const tableLayout = layoutTable(columns, rows, op.node.size?.width ?? 0, op.node.size?.height ?? 0, op.node.style.fontFamily, op.node.style.fontSize)
      const rowHeight = tableLayout.rowHeight
      const rowLocations = op.node.data?._rowLocations as Array<{ line: number; col: number }> | undefined
      const locations = op.node.data?._sourcePropertyLocations as Record<string, { line: number; col: number }> | undefined
      const headerColor = String(op.node.data?.headerColor ?? (op.node.style.color.toLowerCase() === "#ffffff" || op.node.style.color.toLowerCase() === "#f5f5f5" ? "#334E68" : "#DCECF1"))
      const fill = op.node.style.fill ?? document.background
      const end = erasures.get(op.node.id) ?? Number.POSITIVE_INFINITY
      const cellRows = [columns, ...rows]
      const tableX = op.node.position.x - tableLayout.width / 2
      cellRows.forEach((cells, rowIndex) => cells.forEach((cell, columnIndex) => {
        const text = String(cell)
        const layout = tableLayout.cells[rowIndex]?.[columnIndex]
        if (!layout) return
        const cellWidth = tableLayout.columnWidths[columnIndex]!
        const x = tableX + tableLayout.columnWidths.slice(0, columnIndex).reduce((sum, width) => sum + width, 0)
        const y = op.node.position.y - (op.node.size?.height ?? 0) / 2 + rowIndex * rowHeight
        const cellId = `${op.node.id}[${rowIndex === 0 ? "header" : rowIndex},${columnIndex + 1}]`
        const cellNode: SceneNode = {
          ...op.node,
          id: cellId,
          type: "text",
          position: { x: x + cellWidth / 2, y: y + rowHeight / 2 },
          maxWidth: Math.max(1, cellWidth - TABLE_CELL_PADDING * 2),
          style: { ...op.node.style, fontSize: layout.fontSize },
          text,
        }
        const cellOp = { ...op, node: cellNode }
        const textHeight = Math.min(rowHeight, layout.text.height)
        const bounds = { x: x + TABLE_CELL_PADDING, y: y + (rowHeight - textHeight) / 2, width: Math.min(Math.max(0, cellWidth - TABLE_CELL_PADDING * 2), layout.text.width), height: textHeight }
        textEntries.push({ op: cellOp, text, bounds, fontSize: layout.fontSize, end })
        const source = rowIndex === 0 ? locations?.COLUMNS ?? op.source ?? { line: 1, col: 1 } : rowLocations?.[rowIndex - 1] ?? op.source ?? { line: 1, col: 1 }
        if (overlapsReelsUi(bounds, document.canvas))
          diagnostics.push(
            warning(
              "W_REELS_UI_OVERLAP",
              `Table cell "${cellId}" overlaps a Reels, TikTok, or Shorts UI safe zone.`,
              source.line,
              source.col,
              "Move the table text below 250px, above the bottom 400px, and left of the rightmost 120px."
            )
          )
        if (
          bounds.x < safeMarginX ||
          bounds.x + bounds.width > document.canvas.width - safeMarginX ||
          bounds.y < safeMarginY ||
          bounds.y + bounds.height > document.canvas.height - safeMarginY
        )
          diagnostics.push(warning("W_TEXT_OFF_SAFE", `Table cell "${cellId}" extends outside the safe area.`, source.line, source.col, "Move or resize the table inside x=120..1800 and y=100..980."))
        if (!layout.fits)
          diagnostics.push(warning("W_TEXT_TOO_SMALL", `Table cell "${cellId}" is clipped at the minimum 18px text size.`, source.line, source.col, "Increase SIZE or shorten the cell text."))
        const foreground = rowIndex === 0 ? bestTableForeground(headerColor) : op.node.style.color
        const contrast = contrastRatio(foreground, rowIndex === 0 ? headerColor : fill)
        if (contrast !== undefined && contrast < 4.5)
          diagnostics.push(warning("W_LOW_CONTRAST", `Table cell "${cellId}" has a contrast ratio of ${contrast.toFixed(2)}:1.`, source.line, source.col, "Choose cell and background colors with a WCAG contrast ratio of at least 4.5:1."))
      }))
      continue
    }
    const text = op.node.text ?? op.node.label ?? ""
    if (!text) continue
    let textNode = op.node
    if (op.node.type === "arrow") {
      const from = createsById.get(String(op.node.data?.fromId ?? ""))
      const to = createsById.get(String(op.node.data?.toId ?? ""))
      if (from && to) {
        const endpoints = resolveArrowEndpoints(op.node, createsById, nodeBounds)
        textNode = {
          ...op.node,
          position: {
            x: (endpoints.start.x + endpoints.end.x) / 2,
            y: (endpoints.start.y + endpoints.end.y) / 2,
          },
        }
      }
    }
    const isTextNode = op.node.type === "text"
    const fontSize =
      op.node.style.fontSize ?? (isTextNode ? DEFAULT_TEXT_SIZE : 30)
    const layout = layoutText(
      text,
      fontSize,
      op.node.maxWidth,
      (line) => measureTextWidth(line, fontSize, op.node.style.fontFamily),
      op.node.lineHeight
    )
    const boxWidth = textNode.fit?.width ?? textNode.maxWidth ?? layout.width
    const alignment = textNode.align ?? "center"
    const alignOffset =
      alignment === "left"
        ? 0
        : alignment === "right"
          ? boxWidth - layout.width
          : (boxWidth - layout.width) / 2
    const bounds = {
      x: textNode.position.x - boxWidth / 2 + alignOffset,
      y: textNode.position.y - layout.height / 2,
      width: layout.width,
      height: layout.height,
    }
    const end = erasures.get(op.node.id) ?? Number.POSITIVE_INFINITY
    const entry = { op, text, bounds, fontSize, end }
    textEntries.push(entry)
    const source = location(op, op.node.text ? "TEXT" : "LABEL")

    if (
      bounds.x < safeMarginX ||
      bounds.x + bounds.width > document.canvas.width - safeMarginX ||
      bounds.y < safeMarginY ||
      bounds.y + bounds.height > document.canvas.height - safeMarginY
    ) {
      diagnostics.push(
        warning(
          "W_TEXT_OFF_SAFE",
          `Text "${op.node.id}" extends outside the safe area.`,
          source.line,
          source.col,
          `Keep it inside x=${Math.round(safeMarginX)}..${Math.round(document.canvas.width - safeMarginX)} and y=${Math.round(safeMarginY)}..${Math.round(document.canvas.height - safeMarginY)}.`
        )
      )
    }
    if (overlapsReelsUi(bounds, document.canvas)) {
      diagnostics.push(
        warning(
          "W_REELS_UI_OVERLAP",
          `Text "${op.node.id}" overlaps a Reels, TikTok, or Shorts UI safe zone.`,
          source.line,
          source.col,
          "Move text below 250px, above the bottom 400px, and left of the rightmost 120px."
        )
      )
    }
    if (fontSize < 18) {
      diagnostics.push(
        error(
          "W_TEXT_TOO_SMALL",
          `Text "${op.node.id}" is smaller than 18px.`,
          source.line,
          source.col,
          "Increase SIZE to at least 18px; 28px or larger is recommended."
        )
      )
    } else if (fontSize < 28) {
      diagnostics.push(
        warning(
          "W_TEXT_TOO_SMALL",
          `Text "${op.node.id}" is smaller than the recommended 28px.`,
          source.line,
          source.col,
          "Increase SIZE to 28px or larger."
        )
      )
    }
    if (text.length > 60 && op.node.maxWidth === undefined) {
      diagnostics.push(
        warning(
          "W_LONG_TEXT",
          `Text "${op.node.id}" has ${text.length} characters and no MAXWIDTH.`,
          source.line,
          source.col,
          "Add MAXWIDTH to wrap the text."
        )
      )
    }
    const background = op.node.type === "text" && op.node.textBox?.background
      ? op.node.textBox.background
      : (op.node.type === "rectangle" || op.node.type === "diamond" || op.node.type === "circle" || op.node.type === "ellipse") &&
      op.node.style.fill
        ? op.node.style.fill
        : document.background
    const contrast = contrastRatio(op.node.style.color, background)
    if (contrast !== undefined && contrast < 4.5) {
      diagnostics.push(
        warning(
          "W_LOW_CONTRAST",
          `Text "${op.node.id}" has a contrast ratio of ${contrast.toFixed(2)}:1.`,
          source.line,
          source.col,
          "Choose text and background colors with a WCAG contrast ratio of at least 4.5:1."
        )
      )
    }
  }

  for (let leftIndex = 0; leftIndex < textEntries.length; leftIndex++) {
    const left = textEntries[leftIndex]
    if (!left) continue
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < textEntries.length;
      rightIndex++
    ) {
      const right = textEntries[rightIndex]
      if (!right || left.op.t >= right.end || right.op.t >= left.end) continue
      if (overlapRatio(left.bounds, right.bounds) > 0.08) {
        const source = location(right.op, right.op.node.text ? "TEXT" : "LABEL")
        diagnostics.push(
          warning(
            "W_TEXT_OVERLAP",
            `Text "${left.op.node.id}" overlaps text "${right.op.node.id}" by more than 8%.`,
            source.line,
            source.col,
            `Give the objects more space with a new POSITION for "${right.op.node.id}".`
          )
        )
      }
    }
  }

  const standaloneText = textEntries.filter(
    (entry) => entry.op.node.type === "text"
  )
  const shapes = creates.filter((op) =>
    ["rectangle", "circle", "ellipse", "icon"].includes(op.node.type)
  )
  const opOrder = new Map(scene.ops.map((op, index) => [op, index]))
  for (const entry of standaloneText) {
    if (entry.op.node.textBox?.background) continue
    for (const shape of shapes) {
      const shapeEnd = erasures.get(shape.node.id) ?? Number.POSITIVE_INFINITY
      if (entry.op.t >= shapeEnd || shape.t >= entry.end) continue
      const shapeDrawsAfterText =
        shape.t > entry.op.t ||
        (shape.t === entry.op.t &&
          (opOrder.get(shape) ?? -1) > (opOrder.get(entry.op) ?? -1))
      if (!shapeDrawsAfterText) continue
      const shapeBounds = nodeBounds(shape.node)
      if (overlapRatio(entry.bounds, shapeBounds) <= 0.08) continue
      const source = location(entry.op, entry.op.node.text ? "TEXT" : "LABEL")
      diagnostics.push(
        warning(
          "W_TEXT_ON_SHAPE",
          `Text "${entry.op.node.id}" is covered by later shape "${shape.node.id}".`,
          source.line,
          source.col,
          "Create the background shape before the text, or move text clear of foreground shapes."
        )
      )
    }
  }

  const visibleEntries = textEntries.filter(({ bounds }) =>
    intersects(bounds, {
      x: 0,
      y: 0,
      width: document.canvas.width,
      height: document.canvas.height,
    })
  )
  const concurrencyEvents = visibleEntries
    .flatMap((entry) => [
      { time: entry.op.t, delta: 1, entry },
      ...(Number.isFinite(entry.end)
        ? [{ time: entry.end, delta: -1, entry }]
        : []),
    ])
    .sort((left, right) => left.time - right.time || left.delta - right.delta)
  let concurrentText = 0
  let peakTextCount = 0
  let peakText: MeasuredText | undefined
  for (const event of concurrencyEvents) {
    concurrentText += event.delta
    if (concurrentText > peakTextCount) {
      peakTextCount = concurrentText
      peakText = event.entry
    }
  }
  if (peakTextCount > 12) {
    const source = peakText
    diagnostics.push(
      warning(
        "W_TOO_CROWDED",
        `Scene "${scene.label ?? scene.id}" has ${peakTextCount} text objects in view at once.`,
        source
          ? location(source.op, source.op.node.text ? "TEXT" : "LABEL").line
          : 1,
        source
          ? location(source.op, source.op.node.text ? "TEXT" : "LABEL").col
          : 1,
        "Split the explanation across scenes or remove secondary labels."
      )
    )
  }

  for (const arrowOp of creates.filter((op) => op.node.type === "arrow")) {
    const fromId = String(arrowOp.node.data?.fromId ?? "")
    const toId = String(arrowOp.node.data?.toId ?? "")
    const from = createsById.get(fromId)
    const to = createsById.get(toId)
    if (!from || !to) continue
    const arrowPath = arrowPathForTextCheck(arrowOp.node, createsById)
    for (const entry of standaloneText) {
      if (entry.op.node.textBox?.background) continue
      if (entry.op.node.id === fromId || entry.op.node.id === toId) continue
      if (entry.op.t > arrowOp.t || arrowOp.t >= entry.end) continue
      if (!polylineIntersectsBounds(arrowPath, entry.bounds)) continue
      const source = arrowOp.source ?? { line: 1, col: 1 }
      diagnostics.push(
        warning(
          "W_ARROW_CROSSES_TEXT",
          `Arrow "${arrowOp.node.id}" crosses text "${entry.op.node.id}".`,
          source.line,
          source.col,
          "Move the text or reroute the arrow."
        )
      )
    }
  }

  const durations = scene.ops.map((op) =>
    op.kind === "create"
      ? op.draw.duration
      : op.kind === "animate"
        ? op.anim.duration
        : op.camera.duration
  )
  const sceneDuration = scene.ops.reduce(
    (maximum, op, index) => Math.max(maximum, op.t + (durations[index] ?? 0)),
    scene.transition?.duration ?? 0
  )
  const hasMotion = scene.ops.some(
    (op) =>
      (op.kind === "animate" &&
        ["move", "scale", "rotate"].includes(op.anim.verb)) ||
      (op.kind === "camera" && op.camera.verb !== "reset")
  )
  if (sceneDuration > 60 || (sceneDuration > 20 && !hasMotion)) {
    const source = scene.ops.at(-1)?.source ?? { line: 1, col: 1 }
    diagnostics.push(
      warning(
        "W_SCENE_LENGTH",
        sceneDuration > 60
          ? `Scene "${scene.label ?? scene.id}" is longer than 60 seconds.`
          : `Scene "${scene.label ?? scene.id}" exceeds 20 seconds without motion.`,
        source.line,
        source.col,
        "Shorten the scene or split it into smaller scenes."
      )
    )
  }

  const activity = scene.ops
    .map((op) => ({
      start: op.t,
      end:
        op.t +
        (op.kind === "create"
          ? op.draw.duration
          : op.kind === "animate"
            ? op.anim.duration
            : op.camera.duration),
      source: op.source,
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start)
  let activeEnd = activity[0]?.end ?? 0
  for (const interval of activity.slice(1)) {
    if (interval.start - activeEnd > 4) {
      diagnostics.push(
        warning(
          "W_DEAD_AIR",
          `Scene has ${(interval.start - activeEnd).toFixed(1)} seconds with no visual change.`,
          interval.source?.line ?? 1,
          interval.source?.col ?? 1,
          "Remove the wait or add a visual change during this gap."
        )
      )
    }
    activeEnd = Math.max(activeEnd, interval.end)
  }

  const cameraChanges = scene.ops.filter(
    (op): op is Extract<TimelineOp, { kind: "camera" }> =>
      op.kind === "camera" && op.camera.verb !== "reset"
  )
  const lastCameraChange = cameraChanges.at(-1)
  if (
    lastCameraChange &&
    !scene.ops.some(
      (op) =>
        op.kind === "camera" &&
        op.camera.verb === "reset" &&
        op.t >= lastCameraChange.t
    )
  ) {
    diagnostics.push(
      warning(
        "W_CAMERA_NOT_RESET",
        `Scene "${scene.label ?? scene.id}" leaves the camera changed.`,
        lastCameraChange.source?.line ?? 1,
        lastCameraChange.source?.col ?? 1,
        "Add CAMERA RESET at the end of the scene."
      )
    )
  }
}

function arrowPathForTextCheck(
  arrowNode: SceneNode,
  nodes: Map<string, SceneNode>,
): Point[] {
  const rawWaypoints = arrowNode.data?.waypoints
  const waypoints = Array.isArray(rawWaypoints)
    ? rawWaypoints.filter(
        (point): point is Point =>
          typeof point === "object" &&
          point !== null &&
          "x" in point &&
          "y" in point &&
          typeof point.x === "number" &&
          typeof point.y === "number" &&
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
      )
    : []
  const endpoints = resolveArrowEndpoints(arrowNode, nodes, nodeBounds)
  if (waypoints.length === 0) return [endpoints.start, endpoints.end]

  const start = endpoints.start
  const end = endpoints.end
  const anchors = [start, ...waypoints, end]
  const route = String(arrowNode.data?.route ?? "straight").toLowerCase()
  if (route === "elbow") return elbowRoutePoints(anchors)
  if (route === "curve") return curveRoutePoints(anchors)
  return anchors
}

function elbowRoutePoints(points: Point[]): Point[] {
  const path: Point[] = [points[0]!]
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]!
    const end = points[index]!
    if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
      const middleX = (start.x + end.x) / 2
      path.push({ x: middleX, y: start.y }, { x: middleX, y: end.y }, end)
    } else {
      const middleY = (start.y + end.y) / 2
      path.push({ x: start.x, y: middleY }, { x: end.x, y: middleY }, end)
    }
  }
  return path
}

function curveRoutePoints(points: Point[]): Point[] {
  if (points.length < 3) return [points[0]!, points.at(-1)!]
  const curve: Point[] = []
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!
    const end = points[index + 1]!
    const previous = points[index - 1] ?? start
    const next = points[index + 2] ?? end
    const firstControl = {
      x: start.x + (end.x - previous.x) / 6,
      y: start.y + (end.y - previous.y) / 6,
    }
    const secondControl = {
      x: end.x - (next.x - start.x) / 6,
      y: end.y - (next.y - start.y) / 6,
    }
    for (let step = 0; step < 8; step++) {
      curve.push(cubicPoint(start, firstControl, secondControl, end, step / 8))
    }
  }
  curve.push(points.at(-1)!)
  return curve
}

function cubicPoint(
  start: Point,
  first: Point,
  second: Point,
  end: Point,
  t: number
): Point {
  const inverse = 1 - t
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * first.x +
      3 * inverse * t ** 2 * second.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * first.y +
      3 * inverse * t ** 2 * second.y +
      t ** 3 * end.y,
  }
}

function polylineIntersectsBounds(
  points: Point[],
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  return points.some(
    (point, index) =>
      index > 0 && segmentIntersectsBounds(points[index - 1]!, point, bounds)
  )
}

function nodeBounds(node: SceneNode): {
  x: number
  y: number
  width: number
  height: number
} {
  if (node.type === "table") return tableBounds(node)
  if (node.type === "circle") {
    const diameter = 2 * (node.radius ?? 0)
    return {
      x: node.position.x - diameter / 2,
      y: node.position.y - diameter / 2,
      width: diameter,
      height: diameter,
    }
  }
  if (node.type === "rectangle" || node.type === "diamond" || node.type === "ellipse" || node.type === "image") {
    const width = node.size?.width ?? 0
    const height = node.size?.height ?? 0
    return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
  }
  if (node.type === "ink") {
    const points = node.points ?? []
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
  }
  if (node.type === "line") {
    const from = node.data?.from as { x: number; y: number } | undefined
    const to = node.data?.to as { x: number; y: number } | undefined
    if (from && to) {
      const x = Math.min(from.x, to.x)
      const y = Math.min(from.y, to.y)
      return {
        x,
        y,
        width: Math.abs(to.x - from.x),
        height: Math.abs(to.y - from.y),
      }
    }
  }
  if (node.type === "text" || node.text || node.label) {
    const text = node.text ?? node.label ?? ""
    const fontSize =
      node.style.fontSize ?? (node.type === "text" ? DEFAULT_TEXT_SIZE : 30)
    const layout = layoutText(
      text,
      fontSize,
      node.maxWidth,
      (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
      node.lineHeight
    )
    const containerWidth = node.fit?.width ?? node.maxWidth ?? layout.width
    const alignment = node.align ?? "center"
    const leftOffset =
      alignment === "left"
        ? 0
        : alignment === "right"
          ? containerWidth - layout.width
          : (containerWidth - layout.width) / 2
    return {
      x: node.position.x - containerWidth / 2 + leftOffset,
      y: node.position.y - layout.height / 2,
      width: layout.width,
      height: layout.height,
    }
  }
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return {
    x: node.position.x - width / 2,
    y: node.position.y - height / 2,
    width,
    height,
  }
}

function bestTableForeground(background: string): string {
  const lightContrast = contrastRatio("#FFFFFF", background) ?? 0
  const darkContrast = contrastRatio("#18212B", background) ?? 0
  return lightContrast >= darkContrast ? "#FFFFFF" : "#18212B"
}

function overlapRatio(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
): number {
  const width = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x)
  )
  const height = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y)
  )
  const smallerArea = Math.min(
    left.width * left.height,
    right.width * right.height
  )
  return smallerArea > 0 ? (width * height) / smallerArea : 0
}

function intersects(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number }
): boolean {
  return overlapRatio(left, right) > 0
}

function segmentIntersectsBounds(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number }
): boolean {
  let minimum = 0
  let maximum = 1
  const dx = end.x - start.x
  const dy = end.y - start.y
  const tests: Array<[number, number]> = [
    [-dx, start.x - bounds.x],
    [dx, bounds.x + bounds.width - start.x],
    [-dy, start.y - bounds.y],
    [dy, bounds.y + bounds.height - start.y],
  ]
  for (const [direction, distance] of tests) {
    if (direction === 0) {
      if (distance < 0) return false
      continue
    }
    const ratio = distance / direction
    if (direction < 0) minimum = Math.max(minimum, ratio)
    else maximum = Math.min(maximum, ratio)
    if (minimum > maximum) return false
  }
  return true
}

function contrastRatio(
  foreground: string,
  background: string
): number | undefined {
  const fg = parseHexColor(foreground)
  const bg = parseHexColor(background)
  if (!fg || !bg) return undefined
  const luminance = (rgb: [number, number, number]) => {
    const channels = rgb.map((value) => {
      const channel = value / 255
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
  }
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function parseHexColor(value: string): [number, number, number] | undefined {
  if (/^#[\da-f]{3}$/i.test(value)) {
    return [...value.slice(1)].map((digit) => parseInt(digit + digit, 16)) as [
      number,
      number,
      number,
    ]
  }
  if (/^#[\da-f]{6}$/i.test(value)) {
    return [0, 2, 4].map((offset) =>
      parseInt(value.slice(offset + 1, offset + 3), 16)
    ) as [number, number, number]
  }
  return undefined
}

function checkReference(
  id: string,
  created: Map<string, number>,
  time: number,
  diagnostics: Diagnostic[],
  source?: { line: number; col: number }
): void {
  if (!created.has(id))
    diagnostics.push(
      error(
        "E_UNKNOWN_REF",
        `Unknown object reference "${id}".`,
        source?.line ?? 1,
        source?.col ?? 1,
        nearest(id, [...created.keys()])
      )
    )
  else if ((created.get(id) ?? 0) > time)
    diagnostics.push(
      error(
        "E_UNKNOWN_REF",
        `Object "${id}" is referenced before it is created.`,
        source?.line ?? 1,
        source?.col ?? 1
      )
    )
}

function location(
  op: Extract<TimelineOp, { kind: "create" }>,
  property: string
): { line: number; col: number } {
  return (
    (
      op.node.data?._sourcePropertyLocations as
        Record<string, { line: number; col: number }> | undefined
    )?.[property] ??
    op.source ?? { line: 1, col: 1 }
  )
}

function nearest(value: string, options: string[]): string | undefined {
  let best: string | undefined
  let score = Number.POSITIVE_INFINITY
  for (const option of options) {
    const distance = levenshtein(value.toLowerCase(), option.toLowerCase())
    if (distance < score) {
      score = distance
      best = option
    }
  }
  return best && score <= Math.max(2, Math.floor(value.length / 2))
    ? `Did you mean "${best}"?`
    : undefined
}

function levenshtein(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j++) {
      const current = row[j]
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (left[i - 1] === right[j - 1] ? 0 : 1)
      )
      previous = current
    }
  }
  return row[right.length]
}
