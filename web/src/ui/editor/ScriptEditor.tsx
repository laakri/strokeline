import { useEffect, useRef } from "react"
import {
  autocompletion,
  type CompletionContext,
} from "@codemirror/autocomplete"
import {
  defaultKeymap,
  history,
  historyKeymap,
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
import { EditorState, type Extension } from "@codemirror/state"
import { EditorView, keymap, lineNumbers } from "@codemirror/view"
import { tags } from "@lezer/highlight"
import { ICON_NAMES, PROPERTY_KEYS, STATEMENT_KEYWORDS } from "@/dsl/grammar.ts"
import { useAppStore } from "@/app/store.ts"
import { colorSwatches } from "@/ui/editor/colorSwatches.ts"
import { BUILTIN_MACROS } from "@/dsl/builtinMacros.ts"

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
      ? "54 built-in Lucide icons. Type to filter the icon list."
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
})

export function ScriptEditor() {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const script = useAppStore((state) => state.script)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const editorJump = useAppStore((state) => state.editorJump)
  const editorLoad = useAppStore((state) => state.editorLoad)

  useEffect(() => {
    if (!container.current) return
    const extensions: Extension[] = [
      lineNumbers(),
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
    return () => {
      view.current?.destroy()
      view.current = null
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
    view.current.dispatch({
      selection: { anchor: position },
      effects: EditorView.scrollIntoView(position, { y: "center" }),
    })
    view.current.focus()
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

  return (
    <div
      ref={container}
      className="h-full min-h-0"
      aria-label="Script editor"
    />
  )
}
