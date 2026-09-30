import {
  DEFAULT_COLOR,
  DEFAULT_DURATION,
  DEFAULT_EASE,
  DEFAULT_HIGHLIGHT_COLOR,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_TEXT_SIZE,
  DEFAULT_ICON_SIZE,
  defaultReveal,
} from "@/defaults/defaults.ts"
import { features } from "@/defaults/features.ts"
import { BOARD_BASES, THEMES } from "@/defaults/themes.ts"
import { BUILTIN_MACROS } from "@/dsl/builtinMacros.ts"
import { normalizeTextAnchor, positionFromAnchor } from "@/lib/anchors.ts"
import { error, type Diagnostic } from "@/dsl/diagnostics.ts"
import { fitTextFontSize, layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import {
  arrowPoints,
  circleAnnotationPoints,
  hashString,
  samePoint,
  underlinePoints,
} from "@/dsl/ink.ts"
import type {
  ASTCamera,
  ASTCreate,
  ASTInk,
  ASTMacro,
  ASTProperty,
  ASTScene,
  ASTSay,
  ASTScript,
  ASTShape,
  ASTStatement,
} from "@/dsl/parser.ts"
import type {
  AnimationSpec,
  CameraOp,
  EaseName,
  Point,
  SceneDocument,
  SceneNode,
  SayLine,
  TextAnchor,
  TextAlign,
  TimelineOp,
} from "@/ir/types.ts"

export interface CompileResult {
  document: SceneDocument
  diagnostics: Diagnostic[]
}

export function compile(ast: ASTScript): CompileResult {
  const diagnostics: Diagnostic[] = []
  const theme = ast.theme ? THEMES[ast.theme.toLowerCase()] ?? THEMES.classic! : undefined
  const mode = ast.style?.toLowerCase() ?? theme?.pen ?? "handdrawn"
  const board = ast.board?.toLowerCase() ?? theme?.board ?? "plain"
  const scenes = ast.scenes.map((scene) =>
    compileScene(scene, ast, diagnostics)
  )
  return {
    document: {
      version: "1.0",
      canvas: ast.canvas,
      background: ast.background ?? (ast.board ? BOARD_BASES[board] ?? theme?.background ?? "#FAFAFA" : theme?.background ?? "#FAFAFA"),
      ...(ast.subtitles ? { subtitles: true } : {}),
      style: {
        mode: ["handdrawn", "chalk", "marker", "pencil", "brush", "clean"].includes(mode) ? mode as SceneDocument["style"]["mode"] : theme?.pen ?? "handdrawn",
        strokeWidth: ast.stroke ?? DEFAULT_STROKE_WIDTH,
        font: ast.font ?? "handwritten",
        ...(ast.board || ast.theme ? { board } : {}),
        ...(ast.hand !== undefined ? { hand: ast.hand } : {}),
        ...(ast.theme ? { theme: ast.theme } : {}),
      },
      scenes,
    },
    diagnostics,
  }
}

function compileScene(
  scene: ASTScene,
  ast: ASTScript,
  diagnostics: Diagnostic[]
) {
  let cursor = 0
  let autoId = 1
  const autoLayoutGroups = new Set<string>()
  const ops: TimelineOp[] = []
  const says: SayLine[] = []
  const sceneNodes = new Map<string, SceneNode>()
  const compileStatements = (
    statements: ASTStatement[],
    start: number,
    groupId?: string
  ): number => {
    let localCursor = start
    for (const statement of statements) {
      const result = compileStatement(statement, localCursor, groupId)
      ops.push(...result.ops)
      localCursor = result.end
    }
    return localCursor
  }
  const compileStatement = (
    statement: ASTStatement,
    start: number,
    groupId?: string
  ): { ops: TimelineOp[]; end: number } => {
    if (statement.kind === "parallel") {
      const childEnds: number[] = []
      const before = ops.length
      const stagger = statement.stagger === undefined ? 0 : durationSeconds(statement.stagger, statement.token.line, statement.token.col, diagnostics)
      statement.statements.forEach((child, index) =>
        childEnds.push(compileStatements([child], start + index * stagger, groupId))
      )
      const end = childEnds.length ? Math.max(...childEnds) : start
      return { ops: ops.splice(before), end }
    }
    if (statement.kind === "say") {
      const say = compileSay(statement, start, diagnostics)
      if (say) says.push(say)
      return { ops: [], end: start }
    }
    if (statement.kind === "use") {
      const macro = [...ast.macros, ...BUILTIN_MACROS].find((item) => item.name.toLowerCase() === statement.name.toLowerCase())
      if (!macro) {
        diagnostics.push(error("E_UNKNOWN_MACRO", `Unknown macro "${statement.name}".`, statement.token.line, statement.token.col))
        return { ops: [], end: start }
      }
      const before = ops.length
      const end = compileStatements(expandMacro(macro, statement.id, statement.at, statement.args), start, groupId ?? statement.id)
      return { ops: ops.splice(before), end }
    }
    if (statement.kind === "group") {
      const group = statement.id ?? `group_${autoId++}`
      const end = compileStatements(statement.statements, start, group)
      return { ops: [], end }
    }
    if (statement.kind === "stack" || statement.kind === "grid") {
      if (!features.layoutContainers) {
        const end = compileStatements(statement.statements, start, groupId)
        return { ops: [], end }
      }
      const layoutId = statement.id ?? `grid_${autoId++}`
      const before = ops.length
      autoLayoutGroups.add(layoutId)
      const end = compileStatements(statement.statements, start, layoutId)
      autoLayoutGroups.delete(layoutId)
      const childOps = ops.slice(before)
      const createOps = childOps.filter(
        (op): op is Extract<TimelineOp, { kind: "create" }> =>
          op.kind === "create"
      )
      if (
        statement.statements.some(
          (child) => child.kind !== "create" && child.kind !== "shape"
        ) ||
        createOps.length !== statement.statements.length
      ) {
        diagnostics.push(
          error(
            "E_UNSUPPORTED",
            `${statement.kind.toUpperCase()} children must be TEXT or shapes.`,
            statement.token.line,
            statement.token.col
          )
        )
      }
      const boxes = createOps.map((op) => compileTimeBox(op.node))
      if (boxes.some((box) => !box) || createOps.length === 0) {
        diagnostics.push(
          error(
            "E_MISSING_REQUIRED_PROP",
            `${statement.kind.toUpperCase()} needs children with measurable bounds.`,
            statement.token.line,
            statement.token.col
          )
        )
        return { ops: [], end }
      }
      const measured = boxes as Array<NonNullable<(typeof boxes)[number]>>
      const gap = statement.gap ?? 0
      const at = statement.at ?? { x: 0, y: 0 }
      let containerWidth: number
      let containerHeight: number
      const positions: Point[] = []

      if (statement.kind === "stack" && statement.direction === "vertical") {
        containerWidth = Math.max(...measured.map((box) => box.width))
        containerHeight =
          measured.reduce((sum, box) => sum + box.height, 0) +
          gap * (measured.length - 1)
        let y = at.y
        for (const box of measured) {
          positions.push({
            x: at.x + containerWidth / 2,
            y: y + box.height / 2,
          })
          y += box.height + gap
        }
      } else if (statement.kind === "stack") {
        containerHeight = Math.max(...measured.map((box) => box.height))
        containerWidth =
          measured.reduce((sum, box) => sum + box.width, 0) +
          gap * (measured.length - 1)
        let x = at.x
        for (const box of measured) {
          positions.push({
            x: x + box.width / 2,
            y: at.y + containerHeight / 2,
          })
          x += box.width + gap
        }
      } else {
        const columns = statement.columns ?? 1
        const rows = Math.ceil(measured.length / columns)
        const cellWidth = Math.max(...measured.map((box) => box.width))
        const cellHeight = Math.max(...measured.map((box) => box.height))
        containerWidth = columns * cellWidth + gap * (columns - 1)
        containerHeight = rows * cellHeight + gap * (rows - 1)
        measured.forEach((box, index) => {
          const column = index % columns
          const row = Math.floor(index / columns)
          positions.push({
            x: at.x + column * (cellWidth + gap) + cellWidth / 2,
            y: at.y + row * (cellHeight + gap) + cellHeight / 2,
          })
        })
      }

      createOps.forEach((op, index) => {
        const position = positions[index]
        if (!position) return
        op.node = { ...op.node, position }
        sceneNodes.set(op.node.id, op.node)
      })

      const containerNode: SceneNode = {
        id: layoutId,
        type: "rectangle",
        position: {
          x: at.x + containerWidth / 2,
          y: at.y + containerHeight / 2,
        },
        size: { width: containerWidth, height: containerHeight },
        rotation: 0,
        opacity: 0,
        style: { color: "#000000", strokeWidth: 0 },
        layer: -1,
        data: { layoutContainer: true },
      }
      sceneNodes.set(layoutId, containerNode)
      ops.splice(before, 0, {
        kind: "create",
        t: start,
        node: containerNode,
        draw: { duration: 0, ease: DEFAULT_EASE, style: "draw-on" },
        source: { line: statement.token.line, col: statement.token.col },
      })
      return { ops: [], end }
    }
    if (statement.kind === "wait") {
      const duration = durationSeconds(
        statement.duration,
        statement.token.line,
        statement.token.col,
        diagnostics
      )
      return { ops: [], end: start + duration }
    }
    if (statement.kind === "create" || statement.kind === "shape") {
      const normalized =
        statement.kind === "create"
          ? statement
          : { ...statement, id: statement.id ?? `shape_${autoId++}` }
      const node = nodeFromCreate(
        normalized,
        groupId,
        sceneNodes,
        ast,
        diagnostics,
        groupId !== undefined && autoLayoutGroups.has(groupId)
      )
      sceneNodes.set(node.id, node)
      const draw = revealFromProps(
        normalized.props,
        diagnostics,
        normalized.token.line,
        normalized.token.col
      )
      return {
        ops: [
          {
            kind: "create",
            t: start,
            node,
            draw,
            source: { line: normalized.token.line, col: normalized.token.col },
          },
        ],
        end: start + draw.duration,
      }
    }
    if (statement.kind === "chart") {
      const node: SceneNode = {
        id: statement.id,
        type: "chart",
        position: statement.position,
        size: statement.size,
        rotation: 0,
        opacity: 1,
        style: { color: themeInk(ast), strokeWidth: ast.stroke ?? DEFAULT_STROKE_WIDTH,
          ...(ast.font && ast.font.toLowerCase() !== "handwritten" ? { fontFamily: fontFamilyName(ast.font) } : {}) },
        layer: 0,
        groupId,
        data: { chartType: statement.chartType, rows: statement.rows },
      }
      sceneNodes.set(node.id, node)
      const draw = { ...defaultReveal }
      return { ops: [{ kind: "create", t: start, node, draw,
        source: { line: statement.token.line, col: statement.token.col } }], end: start + draw.duration }
    }
    if (statement.kind === "duplicate") {
      const source = sceneNodes.get(statement.sourceId)
      if (!source) {
        diagnostics.push(
          error(
            "E_UNKNOWN_REF",
            `DUPLICATE references unknown object "${statement.sourceId}".`,
            statement.token.line,
            statement.token.col
          )
        )
        return { ops: [], end: start }
      }
      if (sceneNodes.has(statement.id)) {
        diagnostics.push(
          error(
            "E_DUPLICATE_ID",
            `Object id "${statement.id}" is already used in this scene.`,
            statement.token.line,
            statement.token.col
          )
        )
        return { ops: [], end: start }
      }
      const node = cloneWithOverrides(source, statement.id, statement.props)
      sceneNodes.set(node.id, node)
      const draw = revealFromProps(
        statement.props,
        diagnostics,
        statement.token.line,
        statement.token.col
      )
      return {
        ops: [
          {
            kind: "create",
            t: start,
            node,
            draw,
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + draw.duration,
      }
    }
    if (statement.kind === "delete") {
      const durationValue = propValue(statement.props, "DURATION")
      const duration =
        durationValue === undefined
          ? DEFAULT_DURATION
          : durationSeconds(
              durationValue,
              statement.token.line,
              statement.token.col,
              diagnostics
            )
      return {
        ops: [
          {
            kind: "animate",
            t: start,
            targetId: statement.targetId,
            anim: { verb: "erase", duration, ease: DEFAULT_EASE },
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + duration,
      }
    }
    if (statement.kind === "ink") {
      const id = statement.id ?? `ink_${autoId++}`
      const result = inkNodeFrom(
        statement,
        id,
        sceneNodes,
        groupId,
        ast,
        diagnostics
      )
      if (!result) return { ops: [], end: start }
      const { node } = result
      sceneNodes.set(node.id, node)
      const draw = revealFromProps(
        statement.props,
        diagnostics,
        statement.token.line,
        statement.token.col
      )
      return {
        ops: [
          {
            kind: "create",
            t: start,
            node,
            draw,
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + draw.duration,
      }
    }
    if (statement.kind === "arrow") {
      const draw = revealFromProps(
        statement.props,
        diagnostics,
        statement.token.line,
        statement.token.col
      )
      const label = propString(statement.props, "LABEL")
      const node: SceneNode = {
        id: `arrow_${autoId++}`,
        type: "arrow",
        position: { x: 0, y: 0 },
        rotation: 0,
        opacity: 1,
        style: {
          color: propString(statement.props, "COLOR") ?? themeInk(ast),
          ...(propString(statement.props, "PEN") ? { pen: propString(statement.props, "PEN") as SceneNode["style"]["pen"] } : {}),
          strokeWidth: ast.stroke ?? DEFAULT_STROKE_WIDTH,
          ...(ast.font && ast.font.toLowerCase() !== "handwritten" ? { fontFamily: fontFamilyName(ast.font) } : {}),
        },
        label,
        layer: 0,
        groupId,
        data: {
          fromId: statement.from,
          toId: statement.to,
          _sourceProperties: statement.props.map((prop) => prop.key),
        },
      }
      return {
        ops: [
          {
            kind: "create",
            t: start,
            node,
            draw,
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + draw.duration,
      }
    }
    if (statement.kind === "animate") {
      const duration =
        statement.duration === undefined
          ? DEFAULT_DURATION
          : durationSeconds(
              statement.duration,
              statement.token.line,
              statement.token.col,
              diagnostics
            )
      const anim = animationFrom(
        statement.verb,
        statement.values,
        duration,
        statement.ease,
        statement.color,
        statement.token.line,
        statement.token.col,
        diagnostics
      )
      return {
        ops: [
          {
            kind: "animate",
            t: start,
            targetId: statement.targetId,
            anim,
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + duration,
      }
    }
    if (statement.kind === "loop") {
      const period = durationSeconds(statement.period, statement.token.line, statement.token.col, diagnostics)
      const allowed = ["float", "pulse", "wobble", "breathe", "blink"] as const
      if (!(allowed as readonly string[]).includes(statement.effect))
        diagnostics.push(error("E_UNKNOWN_ANIMATION", `Unknown loop effect "${statement.effect}".`, statement.token.line, statement.token.col))
      return {
        ops: [{ kind: "animate", t: start, targetId: statement.targetId,
          anim: { verb: "loop", loopName: allowed.includes(statement.effect as typeof allowed[number]) ? statement.effect as typeof allowed[number] : "float", amplitude: statement.amplitude, period, duration: period, ease: "linear" },
          source: { line: statement.token.line, col: statement.token.col } }],
        end: start + period,
      }
    }
    if (statement.kind === "effect") {
      const duration = statement.duration === undefined ? DEFAULT_DURATION : durationSeconds(statement.duration, statement.token.line, statement.token.col, diagnostics)
      const allowed = statement.phase === "enter"
        ? ["pop", "slide-left", "slide-right", "slide-up", "slide-down", "fade", "write", "drop", "zoom"]
        : ["fade", "shrink", "slide-left", "slide-right", "slide-up", "slide-down", "erase"]
      if (!allowed.includes(statement.effect))
        diagnostics.push(error("E_UNKNOWN_ANIMATION", `Unknown ${statement.phase} effect "${statement.effect}".`, statement.token.line, statement.token.col))
      return { ops: [{ kind: "animate", t: start, targetId: statement.targetId,
        anim: { verb: statement.phase, effectName: statement.effect, duration, ease: DEFAULT_EASE },
        source: { line: statement.token.line, col: statement.token.col } }], end: start + duration }
    }
    if (statement.kind === "camera") {
      const camera = cameraFrom(statement, diagnostics)
      return {
        ops: [
          {
            kind: "camera",
            t: start,
            camera,
            source: { line: statement.token.line, col: statement.token.col },
          },
        ],
        end: start + camera.duration,
      }
    }
    return { ops: [], end: start }
  }
  cursor = compileStatements(scene.statements, cursor)
  void cursor
  if (ast.font && ast.font.toLowerCase() !== "handwritten")
    for (const op of ops)
      if (op.kind === "create") op.node.style.fontFamily = fontFamilyName(ast.font)
  const transitionDuration = scene.transition
    ? durationSeconds(
        scene.transition.duration,
        scene.token.line,
        scene.token.col,
        diagnostics
      )
    : undefined
  const opsDuration = ops.reduce((end, op) => {
    if (op.kind === "create") return Math.max(end, op.t + op.draw.duration)
    if (op.kind === "animate") return Math.max(end, op.t + op.anim.duration)
    return Math.max(end, op.t + op.camera.duration)
  }, 0)
  return {
    id: scene.id,
    index: scene.index,
    label: scene.label,
    ...(scene.transition && transitionDuration !== undefined
      ? {
          transition: {
            type: scene.transition.type,
            duration: transitionDuration,
            source: {
              line: scene.transition.token.line,
              col: scene.transition.token.col,
            },
          },
        }
      : {}),
    ...(cursor > opsDuration ? { duration: cursor } : {}),
    ops: ops.sort((left, right) => left.t - right.t),
    ...(says.length ? { says } : {}),
  }
}

function compileSay(
  statement: ASTSay,
  start: number,
  diagnostics: Diagnostic[]
): SayLine | undefined {
  const source = { line: statement.token.line, col: statement.token.col }
  if (statement.duration === undefined) {
    diagnostics.push(error("E_BAD_DURATION", "SAY needs a DURATION with s or ms.", source.line, source.col))
    return undefined
  }
  const duration = durationSeconds(statement.duration, source.line, source.col, diagnostics)
  const tones = ["explain", "hook", "warning", "punchline", "recap"]
  if (statement.tone && !tones.includes(statement.tone))
    diagnostics.push(error("E_BAD_TONE", `Unknown SAY tone "${statement.tone}".`, source.line, source.col))
  return {
    text: statement.text,
    start,
    duration,
    ...(statement.who ? { who: statement.who } : {}),
    ...(statement.tone && tones.includes(statement.tone) ? { tone: statement.tone as SayLine["tone"] } : {}),
    ...(statement.lang ? { lang: statement.lang } : {}),
    ...(statement.detail ? { detail: statement.detail } : {}),
    source,
  }
}

function fontFamilyName(name = "handwritten"): string {
  if (name.toLowerCase() === "arabic") return "Amiri"
  if (["neat", "marker"].includes(name.toLowerCase())) return "Inter Variable"
  return "Caveat Variable"
}

function themeInk(ast: ASTScript): string {
  if (ast.theme) return (THEMES[ast.theme.toLowerCase()] ?? THEMES.classic!).ink
  if (["chalkboard", "blueprint", "glass"].includes(ast.board?.toLowerCase() ?? "")) return "#F5F0DB"
  return DEFAULT_COLOR
}

function expandMacro(
  macro: ASTMacro,
  prefix: string,
  at: Point,
  args: Record<string, string | number>
): ASTStatement[] {
  const resolvedArgs = { ...args }
  if (macro.name.toLowerCase() === "speech") {
    const text = String(args.TEXT ?? "")
    const lines = Math.max(1, Math.ceil(text.length / 30))
    resolvedArgs.WIDTH = Math.max(220, Math.min(560, Math.min(30, text.length) * 13 + 48))
    resolvedArgs.HEIGHT = 64 + lines * 34
    resolvedArgs.MAXWIDTH = Number(resolvedArgs.WIDTH) - 40
  }
  const ids = new Set<string>()
  const collect = (statements: ASTStatement[]) => {
    for (const statement of statements) {
      if ((statement.kind === "create" || statement.kind === "duplicate") && statement.id) ids.add(statement.id)
      if (statement.kind === "shape" && statement.id) ids.add(statement.id)
      if ("statements" in statement) collect(statement.statements)
    }
  }
  collect(macro.statements)
  const id = (value: string) => ids.has(value) ? `${prefix}_${value}` : value
  const value = (entry: string | number): string | number =>
    typeof entry === "string"
      ? (Object.keys(resolvedArgs).find((key) => key.toLowerCase() === entry.toLowerCase()) ? resolvedArgs[Object.keys(resolvedArgs).find((key) => key.toLowerCase() === entry.toLowerCase())!]! : entry)
      : entry
  const props = (items: ASTProperty[]) => items.map((prop) => ({
    ...prop,
    values: prop.values.map((raw, index) => {
      const resolved = value(raw)
      return typeof resolved === "number" && ["POSITION", "FROM", "TO", "AT"].includes(prop.key.toUpperCase())
        ? resolved + (index % 2 === 0 ? at.x : at.y)
        : resolved
    }),
  }))
  const mapStatement = (statement: ASTStatement): ASTStatement => {
    switch (statement.kind) {
      case "create": return { ...statement, id: id(statement.id), props: props(statement.props) }
      case "shape": return { ...statement, id: statement.id ? id(statement.id) : undefined, props: props(statement.props) }
      case "arrow": return { ...statement, from: id(statement.from), to: id(statement.to), props: props(statement.props) }
      case "animate": return { ...statement, targetId: id(statement.targetId), values: statement.values.map(value) }
      case "effect": case "loop": return { ...statement, targetId: id(statement.targetId) }
      case "camera": return { ...statement, props: props(statement.props) }
      case "wait": return statement
      case "duplicate": return { ...statement, id: id(statement.id), sourceId: id(statement.sourceId), props: props(statement.props) }
      case "delete": return { ...statement, targetId: id(statement.targetId), props: props(statement.props) }
      case "ink": return {
        ...statement,
        id: statement.id ? id(statement.id) : undefined,
        targetId: statement.targetId ? id(statement.targetId) : undefined,
        from: statement.from ? { x: statement.from.x + at.x, y: statement.from.y + at.y } : undefined,
        to: statement.to ? { x: statement.to.x + at.x, y: statement.to.y + at.y } : undefined,
        props: props(statement.props),
      }
      case "chart": return { ...statement, id: id(statement.id), position: { x: statement.position.x + at.x, y: statement.position.y + at.y } }
      case "parallel": case "group": case "stack": case "grid":
        return { ...statement, id: statement.id ? id(statement.id) : undefined, statements: statement.statements.map(mapStatement) }
      case "use": return { ...statement, id: `${prefix}_${statement.id}`, at: { x: statement.at.x + at.x, y: statement.at.y + at.y }, args: Object.fromEntries(Object.entries(statement.args).map(([key, item]) => [key, value(item)])) }
    }
  }
  return macro.statements.map(mapStatement)
}

function nodeFromCreate(
  statement: ASTCreate | (ASTShape & { id: string }),
  groupId: string | undefined,
  sceneNodes: Map<string, SceneNode>,
  ast: ASTScript,
  diagnostics: Diagnostic[],
  allowMissingPosition = false
): SceneNode {
  const props = statement.props
  const position = propNumbers(props, "POSITION")
  const relativeProperties = props.filter((prop) =>
    [
      "BELOW",
      "ABOVE",
      "LEFTOF",
      "RIGHTOF",
      "ALIGNX",
      "ALIGNY",
      "CENTERON",
    ].includes(prop.key)
  )
  const relativeProperty = features.relativePlacement
    ? relativeProperties[0]
    : undefined
  if (relativeProperties.length > 1) {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        `Object "${statement.id}" can have only one relative placement.`,
        relativeProperties[1].token.line,
        relativeProperties[1].token.col
      )
    )
  }
  const relativeTargetId = relativeProperty?.values[0]
  const relativeTarget =
    typeof relativeTargetId === "string"
      ? sceneNodes.get(relativeTargetId)
      : undefined
  if (relativeProperty && !relativeTarget) {
    diagnostics.push(
      error(
        "E_UNKNOWN_REF",
        `${relativeProperty.key} references unknown or later object "${String(relativeTargetId ?? "")}".`,
        relativeProperty.token.line,
        relativeProperty.token.col
      )
    )
  }
  const gapIndex =
    relativeProperty?.values.findIndex(
      (value) => String(value).toUpperCase() === "GAP"
    ) ?? -1
  const gapValue =
    gapIndex >= 0 ? relativeProperty?.values[gapIndex + 1] : undefined
  const needsGap = ["BELOW", "ABOVE", "LEFTOF", "RIGHTOF"].includes(
    relativeProperty?.key ?? ""
  )
  const gap = typeof gapValue === "number" ? gapValue : 0
  if (relativeProperty && needsGap && typeof gapValue !== "number") {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        `${relativeProperty.key} needs GAP n.`,
        relativeProperty.token.line,
        relativeProperty.token.col
      )
    )
  }
  if (gap < 0) {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        "Relative placement GAP cannot be negative.",
        relativeProperty?.token.line ?? statement.token.line,
        relativeProperty?.token.col ?? statement.token.col
      )
    )
  }
  const from = propNumbers(props, "FROM")
  const to = propNumbers(props, "TO")
  const hasLineEndpoints =
    statement.type.toLowerCase() === "line" &&
    from.length === 2 &&
    to.length === 2
  const isIcon = statement.type.toLowerCase() === "icon"
  const sizeNum = propNumber(props, "SIZE")
  const maxWidth = propNumber(props, "MAXWIDTH")
  const lineHeight = propNumber(props, "LINEHEIGHT")
  const align = propString(props, "ALIGN")?.toLowerCase()
  const anchorValue = propString(props, "ANCHOR")
  const anchor = anchorValue ? normalizeTextAnchor(anchorValue) : "center"
  const fitProperty = fitSizeProperty(props)
  const nodeText = propString(props, "TEXT")
  const isText = statement.type.toLowerCase() === "text"
  const effectiveLineHeight = features.customLineHeight
    ? (lineHeight ?? 1.3)
    : 1.3
  let effectiveMaxWidth = maxWidth
  let resolvedFontSize = sizeNum
  if (fitProperty.present && !fitProperty.size) {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        `FIT for "${statement.id}" needs WIDTH and HEIGHT values.`,
        statement.token.line,
        statement.token.col
      )
    )
  }
  if (fitProperty.size && sizeNum !== undefined && sizeNum < 24) {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        `SIZE for fitted text "${statement.id}" cannot be less than 24.`,
        statement.token.line,
        statement.token.col
      )
    )
  }
  if (isText && fitProperty.size && features.fitText) {
    const fit = fitProperty.size
    const maximumFontSize = sizeNum ?? DEFAULT_TEXT_SIZE
    effectiveMaxWidth = Math.min(maxWidth ?? fit.width, fit.width)
    resolvedFontSize = fitTextFontSize(
      nodeText ?? "",
      maximumFontSize,
      fit.width,
      fit.height,
      effectiveMaxWidth,
      effectiveLineHeight,
      (line, fontSize) => measureTextWidth(line, fontSize, fontFamilyName(ast.font))
    )
  }
  const width = propNumber(props, "WIDTH")
  const height = propNumber(props, "HEIGHT")
  const radius = propNumber(props, "RADIUS")
  const opacity = propNumber(props, "OPACITY") ?? 1
  const iconName = propString(props, "NAME") ?? propString(props, "ICON")
  if (anchorValue && !anchor) {
    diagnostics.push(
      error(
        "E_BAD_RANGE",
        `Unknown ANCHOR "${anchorValue}".`,
        props.find((prop) => prop.key === "ANCHOR")?.token.line ??
          statement.token.line,
        props.find((prop) => prop.key === "ANCHOR")?.token.col ??
          statement.token.col
      )
    )
  }
  const positionAnchorPoint = hasLineEndpoints
    ? { x: (from[0] + to[0]) / 2, y: (from[1] + to[1]) / 2 }
    : { x: position[0] ?? 0, y: position[1] ?? 0 }
  const anchorSize = nodeAnchorSize(
    statement.type.toLowerCase(),
    nodeText,
    resolvedFontSize,
    width,
    height,
    radius,
    isIcon,
    effectiveMaxWidth,
    effectiveLineHeight
  )
  let resolvedPosition =
    anchor && features.positionAnchors
      ? positionFromAnchor(
          positionAnchorPoint,
          anchorSize.width,
          anchorSize.height,
          anchor ?? "center"
        )
      : positionAnchorPoint
  const relativeTargetBox = relativeTarget
    ? compileTimeBox(relativeTarget)
    : undefined
  if (relativeProperty && relativeTarget && !relativeTargetBox) {
    diagnostics.push(
      error(
        "E_MISSING_REQUIRED_PROP",
        `Relative placement target "${relativeTarget.id}" has no measurable bounds.`,
        relativeProperty.token.line,
        relativeProperty.token.col
      )
    )
  }
  if (relativeProperty && relativeTargetBox) {
    resolvedPosition = resolveRelativePosition(
      relativeProperty.key,
      resolvedPosition,
      anchorSize,
      relativeTargetBox,
      gap
    )
  }
  const style = {
    color: propString(props, "COLOR") ?? themeInk(ast),
    fill: propString(props, "FILL"),
    strokeWidth:
      propNumber(props, "STROKE") ?? ast.stroke ?? DEFAULT_STROKE_WIDTH,
    fontSize: resolvedFontSize,
    ...(propString(props, "PEN") ? { pen: propString(props, "PEN") as SceneNode["style"]["pen"] } : {}),
    ...(ast.font && ast.font.toLowerCase() !== "handwritten" ? { fontFamily: fontFamilyName(ast.font) } : {}),
  }
  const positionIsDerived = [
    "BELOW",
    "ABOVE",
    "LEFTOF",
    "RIGHTOF",
    "CENTERON",
  ].includes(relativeProperty?.key ?? "")
  if (
    position.length !== 2 &&
    !hasLineEndpoints &&
    !positionIsDerived &&
    !allowMissingPosition
  )
    diagnostics.push(
      error(
        "E_MISSING_REQUIRED_PROP",
        `${statement.type} "${statement.id}" needs POSITION x y.`,
        statement.token.line,
        statement.token.col
      )
    )
  return {
    id: statement.id,
    type: statement.type.toLowerCase() as SceneNode["type"],
    position: resolvedPosition,
    size:
      width !== undefined || height !== undefined
        ? { width: width ?? sizeNum ?? 0, height: height ?? sizeNum ?? 0 }
        : isIcon
          ? {
              width: sizeNum ?? DEFAULT_ICON_SIZE,
              height: sizeNum ?? DEFAULT_ICON_SIZE,
            }
          : undefined,
    ...(effectiveMaxWidth !== undefined ? { maxWidth: effectiveMaxWidth } : {}),
    ...(align ? { align: align as TextAlign } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(fitProperty.size ? { fit: fitProperty.size } : {}),
    ...(anchorValue && anchor ? { anchor: anchor as TextAnchor } : {}),
    radius,
    rotation: 0,
    opacity,
    style,
    text: nodeText,
    label: propString(props, "LABEL"),
    layer: 0,
    groupId,
    data: {
      _sourceProperties: props.map((prop) => prop.key),
      _sourcePropertyLocations: Object.fromEntries(
        props.map((prop) => [
          prop.key,
          { line: prop.token.line, col: prop.token.col },
        ])
      ),
      ...(hasLineEndpoints
        ? {
            from: {
              x: from[0] + resolvedPosition.x - positionAnchorPoint.x,
              y: from[1] + resolvedPosition.y - positionAnchorPoint.y,
            },
            to: {
              x: to[0] + resolvedPosition.x - positionAnchorPoint.x,
              y: to[1] + resolvedPosition.y - positionAnchorPoint.y,
            },
          }
        : {}),
      ...(isIcon || iconName ? { iconName, name: iconName } : {}),
    },
  }
}

function nodeAnchorSize(
  type: string,
  text: string | undefined,
  size: number | undefined,
  width: number | undefined,
  height: number | undefined,
  radius: number | undefined,
  isIcon: boolean,
  maxWidth: number | undefined,
  lineHeight: number
): { width: number; height: number } {
  if (type === "text") {
    const fontSize = size ?? DEFAULT_TEXT_SIZE
    const layout = layoutText(
      text ?? "",
      fontSize,
      maxWidth,
      (line) => measureTextWidth(line, fontSize),
      lineHeight
    )
    return { width: layout.width, height: layout.height }
  }
  if (type === "circle") {
    const diameter = (radius ?? 0) * 2
    return { width: diameter, height: diameter }
  }
  if (isIcon) {
    const diameter = size ?? DEFAULT_ICON_SIZE
    return { width: diameter, height: diameter }
  }
  return {
    width: width ?? size ?? 0,
    height: height ?? size ?? 0,
  }
}

function resolveRelativePosition(
  relation: string,
  current: Point,
  own: { width: number; height: number },
  target: { x: number; y: number; width: number; height: number },
  gap: number
): Point {
  const targetCenterX = target.x + target.width / 2
  const targetCenterY = target.y + target.height / 2
  if (relation === "BELOW") {
    return {
      x: targetCenterX,
      y: target.y + target.height + gap + own.height / 2,
    }
  }
  if (relation === "ABOVE") {
    return { x: targetCenterX, y: target.y - gap - own.height / 2 }
  }
  if (relation === "LEFTOF") {
    return { x: target.x - gap - own.width / 2, y: targetCenterY }
  }
  if (relation === "RIGHTOF") {
    return {
      x: target.x + target.width + gap + own.width / 2,
      y: targetCenterY,
    }
  }
  if (relation === "ALIGNX") return { ...current, x: targetCenterX }
  if (relation === "ALIGNY") return { ...current, y: targetCenterY }
  if (relation === "CENTERON") {
    return { x: targetCenterX, y: targetCenterY }
  }
  return current
}

function inkNodeFrom(
  statement: ASTInk,
  id: string,
  sceneNodes: Map<string, SceneNode>,
  groupId: string | undefined,
  ast: ASTScript,
  diagnostics: Diagnostic[]
): { node: SceneNode } | undefined {
  const props = statement.props
  const color = propString(props, "COLOR") ?? themeInk(ast)
  const strokeWidth =
    propNumber(props, "WIDTH") ?? ast.stroke ?? DEFAULT_STROKE_WIDTH
  const points = inkModePoints(statement, props, sceneNodes, diagnostics)
  if (!points) return undefined
  const node: SceneNode = {
    id,
    type: "ink",
    position: centroid(points),
    points,
    rotation: 0,
    opacity: 1,
    style: { color, strokeWidth, ...(propString(props, "PEN") ? { pen: propString(props, "PEN") as SceneNode["style"]["pen"] } : {}) },
    layer: 0,
    groupId,
    data: {
      _sourceProperties: props.map((prop) => prop.key),
      _sourcePropertyLocations: Object.fromEntries(
        props.map((prop) => [
          prop.key,
          { line: prop.token.line, col: prop.token.col },
        ])
      ),
      ...(statement.targetId ? { targetId: statement.targetId } : {}),
    },
  }
  return { node }
}

function inkModePoints(
  statement: ASTInk,
  props: ASTProperty[],
  sceneNodes: Map<string, SceneNode>,
  diagnostics: Diagnostic[]
): Point[] | undefined {
  const flat = propNumbers(props, "POINTS")

  let points: Point[]

  // 1. Freehand points mode
  if (flat.length > 0) {
    if (flat.length % 2 !== 0 || flat.length < 4) {
      diagnostics.push(
        error(
          "E_INVALID_POINTS",
          `INK needs at least 2 complete POINTS (x y pairs).`,
          statement.token.line,
          statement.token.col
        )
      )
      return undefined
    }

    points = pairPoints(flat)
  }
  // 2. Arrow mode
  else if (statement.mode === "arrow") {
    const from = statement.from ?? { x: 0, y: 0 }
    const to = statement.to ?? { x: 0, y: 0 }

    if (samePoint(from, to)) {
      diagnostics.push(
        error(
          "E_INVALID_POINTS",
          "INK ARROW FROM and TO must be different points.",
          statement.token.line,
          statement.token.col
        )
      )
      return undefined
    }

    points = arrowPoints(
      from,
      to,
      hashString(`arrow:${from.x},${from.y}-${to.x},${to.y}`)
    )
  }
  // 3. Annotation mode (underline / circle)
  else {
    const targetId = statement.targetId ?? ""
    const target = sceneNodes.get(targetId)

    if (!target) {
      diagnostics.push(
        error(
          "E_UNKNOWN_REF",
          `INK ${statement.mode.toUpperCase()} references unknown object "${targetId}".`,
          statement.token.line,
          statement.token.col
        )
      )
      return undefined
    }

    const box = compileTimeBox(target)

    if (!box) {
      diagnostics.push(
        error(
          "E_MISSING_REQUIRED_PROP",
          `INK ${statement.mode.toUpperCase()} target "${targetId}" has no resolvable bounding box yet.`,
          statement.token.line,
          statement.token.col
        )
      )
      return undefined
    }

    points =
      statement.mode === "underline"
        ? underlinePoints(box, hashString(`underline:${targetId}`))
        : circleAnnotationPoints(box, hashString(`circle:${targetId}`))
  }

  return points
}

function pairPoints(flat: number[]): Point[] {
  const points: Point[] = []
  for (let index = 0; index < flat.length; index += 2)
    points.push({ x: flat[index], y: flat[index + 1] })
  return points
}

function centroid(points: Point[]): Point {
  const total = points.reduce(
    (sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
    { x: 0, y: 0 }
  )
  return { x: total.x / points.length, y: total.y / points.length }
}

function compileTimeBox(
  node: SceneNode
): { x: number; y: number; width: number; height: number } | undefined {
  if (node.type === "circle") {
    const radius = node.radius ?? 0
    if (radius <= 0) return undefined
    return {
      x: node.position.x - radius,
      y: node.position.y - radius,
      width: radius * 2,
      height: radius * 2,
    }
  }
  if (node.type === "rectangle" || node.type === "line") {
    const width = node.size?.width ?? 0
    const height = node.size?.height ?? 0
    if (width <= 0 || height <= 0) return undefined
    return {
      x: node.position.x - width / 2,
      y: node.position.y - height / 2,
      width,
      height,
    }
  }
  if (node.type === "text") {
    const text = node.text ?? node.label ?? ""
    const fontSize = node.style.fontSize ?? DEFAULT_TEXT_SIZE
    if (!text) return undefined
    const layout = layoutText(
      text,
      fontSize,
      node.maxWidth,
      (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
      node.lineHeight
    )
    return {
      x: node.position.x - layout.width / 2,
      y: node.position.y - layout.height / 2,
      width: layout.width,
      height: layout.height,
    }
  }
  if (node.type === "ink") {
    const points = node.points ?? []
    if (points.length < 2) return undefined
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }
  return undefined
}

function cloneWithOverrides(
  source: SceneNode,
  id: string,
  props: ASTProperty[]
): SceneNode {
  const data: Record<string, unknown> = {
    _sourceProperties: props.map((prop) => prop.key),
    _sourcePropertyLocations: Object.fromEntries(
      props.map((prop) => [
        prop.key,
        { line: prop.token.line, col: prop.token.col },
      ])
    ),
  }
  if (source.data?.fromId !== undefined) {
    data.fromId = source.data.fromId
    data.toId = source.data.toId
  }
  let clone: SceneNode = {
    ...source,
    id,
    position: { ...source.position },
    style: { ...source.style },
    data,
  }
  const position = propNumbers(props, "POSITION")
  if (position.length === 2)
    clone = { ...clone, position: { x: position[0], y: position[1] } }
  const width = propNumber(props, "WIDTH")
  const height = propNumber(props, "HEIGHT")
  if (width !== undefined || height !== undefined)
    clone = {
      ...clone,
      size: {
        width: width ?? source.size?.width ?? 0,
        height: height ?? source.size?.height ?? 0,
      },
    }
  const radius = propNumber(props, "RADIUS")
  if (radius !== undefined) clone = { ...clone, radius }
  const color = propString(props, "COLOR")
  const fill = propString(props, "FILL")
  const stroke = propNumber(props, "STROKE")
  const fontSize = propNumber(props, "SIZE")
  if (color || fill || stroke !== undefined || fontSize !== undefined) {
    clone = {
      ...clone,
      style: {
        ...clone.style,
        color: color ?? clone.style.color,
        fill: fill ?? clone.style.fill,
        strokeWidth: stroke ?? clone.style.strokeWidth,
        fontSize: fontSize ?? clone.style.fontSize,
      },
    }
  }
  const text = propString(props, "TEXT")
  const label = propString(props, "LABEL")
  if (text !== undefined) clone = { ...clone, text }
  if (label !== undefined) clone = { ...clone, label }
  if (clone.type === "line") {
    const from = propNumbers(props, "FROM")
    const to = propNumbers(props, "TO")
    if (from.length === 2 && to.length === 2) {
      clone = {
        ...clone,
        data: {
          ...clone.data,
          from: { x: from[0], y: from[1] },
          to: { x: to[0], y: to[1] },
        },
        position: { x: (from[0] + to[0]) / 2, y: (from[1] + to[1]) / 2 },
      }
    }
  }
  return clone
}

function revealFromProps(
  props: ASTProperty[],
  diagnostics: Diagnostic[],
  line: number,
  col: number
) {
  const value = propValue(props, "DRAW")
  const easeValue = propValue(props, "REVEAL")
  const ease = String(easeValue ?? defaultReveal.ease) as EaseName
  const validEases = ["easeOut", "linear", "natural"]
  if (!validEases.includes(ease))
    diagnostics.push(error("E_BAD_EASE", `Unknown reveal ease "${ease}".`, line, col))
  const revealEase: EaseName = ease === "natural" ? "spring" : ease
  const style = propValue(props, "REVEAL") === undefined ? defaultReveal.style : "text-wipe"
  if (value === undefined) return { ...defaultReveal, ease: revealEase, style }
  return {
    ...defaultReveal,
    duration: durationSeconds(value, line, col, diagnostics),
    ease: revealEase,
    style,
  }
}

function animationFrom(
  verb: string,
  values: (string | number)[],
  duration: number,
  easeValue: string | undefined,
  colorValue: string | number | undefined,
  line: number,
  col: number,
  diagnostics: Diagnostic[]
): AnimationSpec {
  const ease = (easeValue ?? DEFAULT_EASE) as EaseName
  if (verb === "MOVE")
    return {
      verb: "move",
      to: {
        position: { x: Number(values[0]) || 0, y: Number(values[1]) || 0 },
      },
      duration,
      ease,
    }
  if (verb === "SCALE")
    return {
      verb: "scale",
      to: { scale: Number(values[0]) || 0 },
      duration,
      ease,
    }
  if (verb === "FADE")
    return {
      verb: "fade",
      to: { opacity: Number(values[0]) || 0 },
      duration,
      ease,
    }
  if (verb === "ROTATE")
    return {
      verb: "rotate",
      to: { rotation: Number(values[0]) || 0 },
      duration,
      ease,
    }
  if (verb === "HIGHLIGHT")
    return {
      verb: "highlight",
      color: String(colorValue ?? DEFAULT_HIGHLIGHT_COLOR),
      duration,
      ease,
    }
  diagnostics.push(
    error("E_UNKNOWN_ANIMATION", `Unknown animation verb "${verb}".`, line, col)
  )
  return { verb: "fade", duration, ease }
}

function cameraFrom(statement: ASTCamera, diagnostics: Diagnostic[]): CameraOp {
  const durationValue = propValue(statement.props, "DURATION")
  const duration =
    durationValue === undefined
      ? DEFAULT_DURATION
      : durationSeconds(
          durationValue,
          statement.token.line,
          statement.token.col,
          diagnostics
        )
  const targetId = propString(statement.props, "TARGET")
  const scale = propNumber(statement.props, "SCALE")
  const ease = (propString(statement.props, "EASE") ?? "spring") as EaseName
  const to = propNumbers(statement.props, "TO")
  return {
    verb: statement.verb.toLowerCase() as CameraOp["verb"],
    targetId,
    scale,
    position: to.length === 2 ? { x: to[0], y: to[1] } : undefined,
    duration,
    ease,
  }
}

function durationSeconds(
  value: string | number,
  line: number,
  col: number,
  diagnostics: Diagnostic[]
): number {
  if (typeof value === "number") {
    diagnostics.push(
      error("E_BAD_DURATION", "Duration must include s or ms.", line, col)
    )
    return 0
  }
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value)
  if (!match) {
    diagnostics.push(
      error(
        "E_BAD_DURATION",
        `Invalid duration "${value}". Use values such as 1s or 500ms.`,
        line,
        col
      )
    )
    return 0
  }
  return Number(match[1]) * (match[2] === "ms" ? 0.001 : 1)
}

function propValue(
  props: ASTProperty[],
  key: string
): string | number | undefined {
  return props.find((prop) => prop.key === key)?.values[0]
}
function propString(props: ASTProperty[], key: string): string | undefined {
  const value = propValue(props, key)
  return value === undefined ? undefined : String(value)
}
function propNumber(props: ASTProperty[], key: string): number | undefined {
  const value = propValue(props, key)
  return typeof value === "number"
    ? value
    : value === undefined
      ? undefined
      : Number(value)
}
function propNumbers(props: ASTProperty[], key: string): number[] {
  return (
    props
      .find((prop) => prop.key === key)
      ?.values.filter((value): value is number => typeof value === "number") ??
    []
  )
}

function fitSizeProperty(props: ASTProperty[]): {
  present: boolean
  size?: { width: number; height: number }
} {
  const property = props.find((prop) => prop.key === "FIT")
  if (!property) return { present: false }
  const widthIndex = property.values.findIndex(
    (value) => String(value).toUpperCase() === "WIDTH"
  )
  const heightIndex = property.values.findIndex(
    (value) => String(value).toUpperCase() === "HEIGHT"
  )
  const width = property.values[widthIndex + 1]
  const height = property.values[heightIndex + 1]
  if (
    widthIndex < 0 ||
    heightIndex < 0 ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return { present: true }
  }
  return { present: true, size: { width, height } }
}
