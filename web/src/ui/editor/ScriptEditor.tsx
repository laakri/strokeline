import { useEffect, useRef } from "react"
import {
  autocompletion,
  type CompletionContext,
} from "@codemirror/autocomplete"
import {
  defaultKeymap,
  history,
  historyKeymap,
  isolateHistory,
  indentWithTab,
} from "@codemirror/commands"
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language"
import {
  lintGutter,
  setDiagnostics,
  type Diagnostic as CodeMirrorDiagnostic,
} from "@codemirror/lint"
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state"
import { Decoration, EditorView, keymap, lineNumbers, type DecorationSet } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { ICON_NAMES, PROPERTY_KEYS, STATEMENT_KEYWORDS } from "@/dsl/grammar.ts"
import { useAppStore, type EditorSourceEdit } from "@/app/store.ts"
import { ObjectQuickInsert } from "@/ui/editor/ObjectQuickInsert.tsx"
import { makeSceneInsertEdit } from "@/dsl/insertSnippet.ts"
import { colorSwatches } from "@/ui/editor/colorSwatches.ts"
import { BUILTIN_MACROS } from "@/dsl/builtinMacros.ts"
import { DiagramStarterPicker } from "@/ui/editor/DiagramStarterPicker.tsx"

const keywords = new Set([
  ...STATEMENT_KEYWORDS,
  ...PROPERTY_KEYS,
  "VERSION",
  "CANVAS",
  "BACKGROUND",
  "STYLE",
  "FONT",
  "STROKE",
  "BOARD",
  "HAND",
  "THEME",
  "AS",
  "TO",
  "DURATION",
  "EASE",
])
const languageValues = [
  "chalkboard", "whiteboard", "blueprint", "kraft", "paper", "graph", "dotted", "glass", "plain",
  "celestial", "topographic", "neon-grid", "editorial", "blackboard", "corkboard", "linen", "aurora",
  "circuit", "notebook", "terrazzo",
  "classic", "chalk", "cosmic", "suspense", "parchment", "cream", "deepsea", "fieldnotes", "afterhours", "classroom", "scrapbook", "atelier",
  "left",
  "center",
  "right",
  "top",
  "bottom",
  "topleft",
  "topright",
  "bottomleft",
  "bottomright",
  "vertical",
  "horizontal",
  "cover",
  "contain",
  "circle",
]
const language = StreamLanguage.define({
  startState: () => ({}),
  token(stream) {
    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return "string"
    if (
      stream.match(/^#[0-9a-fA-F]{6}(?![0-9a-fA-F])/) ||
      stream.match(/^#[0-9a-fA-F]{3}(?![0-9a-fA-F])/)
    )
      return "atom"
    if (stream.match(/^\/\/.*$/) || stream.match(/^#/)) return "comment"
    if (stream.match(/^\d+(?:\.\d+)?(?:ms|s)?/)) return "number"
    if (stream.match(/^[A-Za-z_][A-Za-z0-9_.-]*/))
      return keywords.has(stream.current().toUpperCase())
        ? "keyword"
        : "variableName"
    stream.next()
    return null
  },
})

const highlights = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: "var(--primary)" },
    { tag: tags.string, color: "var(--chart-2)" },
    { tag: tags.number, color: "var(--chart-4)" },
    { tag: tags.atom, color: "var(--chart-3)" },
    { tag: tags.comment, color: "var(--muted-foreground)" },
    { tag: tags.variableName, color: "var(--foreground)" },
  ])
)

function completions(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_.-]*/)
  if (!word && !context.explicit) return null
  const ids =
    useAppStore
      .getState()
      .compiledIR?.scenes.flatMap((scene) =>
        scene.ops.filter((op) => op.kind === "create").map((op) => op.node.id)
      ) ?? []
  const options = [
    ...new Set([...keywords, ...languageValues, ...ids, ...ICON_NAMES, ...BUILTIN_MACROS.map((macro) => macro.name)]),
  ].map((label) => ({
    label,
    type: ids.includes(label)
      ? "variable"
      : (ICON_NAMES as readonly string[]).includes(label)
        ? "type"
        : "keyword",
    detail: (ICON_NAMES as readonly string[]).includes(label) ? "Lucide icon" : undefined,
    info: (ICON_NAMES as readonly string[]).includes(label)
      ? "Lucide icon from the full installed library. Type to filter."
      : BUILTIN_MACROS.some((macro) => macro.name === label)
        ? "Built-in compile-time macro. Use AS id AT x y."
        : undefined,
  }))
  return { from: word?.from ?? context.pos, options }
}

const theme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
  },
  ".cm-editor": { height: "100%" },
  ".cm-scroller": {
    minHeight: "0",
    overflowY: "auto",
    overflowX: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  ".cm-content": { padding: "16px 0" },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--primary) 28%, transparent)",
  },
  ".cm-tooltip, .cm-tooltip-lint, .cm-tooltip-autocomplete": {
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
  },
  ".cm-tooltip *": {
    color: "var(--card-foreground)",
  },
  ".cm-diagnostic, .cm-diagnosticMessage": {
    color: "var(--card-foreground)",
  },
  ".cm-diagnosticAction": { color: "var(--primary)" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  ".cm-gutters": {
    display: "flex",
    flexShrink: "0",
    minWidth: "44px",
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers": {
    minWidth: "44px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    display: "block",
    minWidth: "44px",
    padding: "0 8px",
    color: "var(--muted-foreground)",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-lint-marker": {
    width: "14px",
    marginLeft: "3px",
    backgroundPosition: "center",
  },
  ".cm-activeLine": { backgroundColor: "var(--accent)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--accent)" },
  ".cm-line.cm-source-jump-line": {
    backgroundColor: "color-mix(in oklab, var(--primary) 18%, transparent)",
    boxShadow: "inset 3px 0 var(--primary)",
    transition: "background-color 180ms ease-out",
  },
})

const sourceJumpEffect = StateEffect.define<number | null>()
const sourceJumpLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) => {
    let next = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(sourceJumpEffect)) continue
      next = effect.value === null
        ? Decoration.none
        : Decoration.set([
            Decoration.line({ class: "cm-source-jump-line" }).range(effect.value),
          ])
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function ScriptEditor({ onTemplateSelected }: { onTemplateSelected?: () => void } = {}) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const sourceJumpTimeout = useRef<number | null>(null)
  const script = useAppStore((state) => state.script)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const editorJump = useAppStore((state) => state.editorJump)
  const editorLoad = useAppStore((state) => state.editorLoad)

  useEffect(() => {
    if (!container.current) return
    const extensions: Extension[] = [
      lineNumbers(),
      sourceJumpLine,
      language,
      highlights,
      history(),
      colorSwatches(),
      theme,
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      autocompletion({ override: [completions] }),
      lintGutter(),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return
        const text = update.state.doc.toString()
        useAppStore.getState().setScript(text)
      }),
    ]
    view.current = new EditorView({
      state: EditorState.create({
        doc: useAppStore.getState().script,
        extensions,
      }),
      parent: container.current,
    })
    const readCurrentDocument = () =>
      view.current?.state.doc.toString() ?? useAppStore.getState().script
    const writeSourceEdits = (edits: EditorSourceEdit[]) => {
      view.current?.dispatch({
        changes: edits,
        annotations: isolateHistory.of("full"),
      })
    }
    useAppStore.getState().setEditorSourceReader(readCurrentDocument)
    useAppStore.getState().setEditorSourceWriter(writeSourceEdits)
    return () => {
      if (sourceJumpTimeout.current !== null) window.clearTimeout(sourceJumpTimeout.current)
      view.current?.destroy()
      view.current = null
      if (useAppStore.getState().editorSourceReader === readCurrentDocument) {
        useAppStore.getState().setEditorSourceReader(null)
      }
      if (useAppStore.getState().editorSourceWriter === writeSourceEdits) {
        useAppStore.getState().setEditorSourceWriter(null)
      }
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(
      () => useAppStore.getState().compileScript(),
      300
    )
    return () => window.clearTimeout(timeout)
  }, [script])

  useEffect(() => {
    if (!view.current || !editorLoad) return
    const doc = view.current.state.doc
    view.current.dispatch({
      changes: { from: 0, to: doc.length, insert: editorLoad.text },
    })
    useAppStore.getState().clearEditorLoad()
    view.current.focus()
  }, [editorLoad])

  useEffect(() => {
    if (!view.current || !editorJump) return
    const line = view.current.state.doc.line(
      Math.min(editorJump.line, view.current.state.doc.lines)
    )
    const position = Math.min(
      line.from + Math.max(0, editorJump.col - 1),
      line.to
    )
    if (sourceJumpTimeout.current !== null) window.clearTimeout(sourceJumpTimeout.current)
    view.current.dispatch({
      selection: { anchor: position },
      effects: [
        EditorView.scrollIntoView(position, { y: "center" }),
        sourceJumpEffect.of(line.from),
      ],
    })
    view.current.focus()
    sourceJumpTimeout.current = window.setTimeout(() => {
      view.current?.dispatch({ effects: sourceJumpEffect.of(null) })
      sourceJumpTimeout.current = null
    }, 1800)
    useAppStore.getState().clearEditorJump()
  }, [editorJump])

  useEffect(() => {
    if (!view.current) return
    const mapped: CodeMirrorDiagnostic[] = diagnostics.map((diagnostic) => {
      const line = view.current!.state.doc.line(
        Math.min(diagnostic.line, view.current!.state.doc.lines)
      )
      const from = Math.min(
        line.from + Math.max(0, diagnostic.col - 1),
        line.to
      )
      return {
        from,
        to: Math.min(from + 1, line.to),
        severity: diagnostic.severity,
        message: diagnostic.suggestion
          ? `${diagnostic.message} ${diagnostic.suggestion}`
          : diagnostic.message,
      }
    })
    view.current.dispatch(setDiagnostics(view.current.state, mapped))
  }, [diagnostics])

  const insertObjectSnippet = (snippet: string, sceneIndex?: number): boolean => {
    const editor = view.current
    if (!editor) return false
    const state = editor.state
    const edit = makeSceneInsertEdit(
      state.doc.toString(),
      snippet,
      sceneIndex,
      state.doc.lineAt(state.selection.main.head).number
    )
    if (!edit) return false
    editor.dispatch({
      changes: edit,
      annotations: isolateHistory.of("full"),
      scrollIntoView: true,
    })
    editor.focus()
    useAppStore.getState().compileScript()
    return true
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[40px_minmax(0,1fr)]" aria-label="Script editor">
      <ObjectQuickInsert
        onInsert={insertObjectSnippet}
        getSource={() => view.current?.state.doc.toString() ?? script}
        toolbarContent={<DiagramStarterPicker onSelect={onTemplateSelected} />}
      />
      <div ref={container} className="h-full min-h-0" />
    </div>
  )
}
