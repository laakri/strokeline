import { RangeSetBuilder } from "@codemirror/state"
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from "@codemirror/view"

const COLOR_RE = /#[0-9a-fA-F]{6}(?![0-9a-fA-F])|#[0-9a-fA-F]{3}(?![0-9a-fA-F])/g

export class SwatchWidget extends WidgetType {
  readonly color: string

  constructor(color: string) {
    super()
    this.color = color
  }

  eq(other: SwatchWidget) {
    return other.color === this.color
  }

  toDOM() {
    const span = document.createElement("span")
    span.className = "cm-color-swatch"
    span.style.backgroundColor = this.color
    span.title = this.color
    return span
  }

  ignoreEvent() {
    return true
  }
}

function buildSwatches(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc
  for (const range of view.visibleRanges) {
    const text = doc.sliceString(range.from, range.to)
    let match: RegExpExecArray | null
    COLOR_RE.lastIndex = 0
    while ((match = COLOR_RE.exec(text)) !== null) {
      const from = range.from + match.index
      builder.add(from, from, Decoration.widget({ widget: new SwatchWidget(match[0]), side: 1, block: false }))
      if (match[0].length === 0) COLOR_RE.lastIndex++
    }
  }
  return builder.finish()
}

const swatchPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildSwatches(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildSwatches(update.view)
      }
    }
  },
  { decorations: (view) => view.decorations },
)

const swatchStyles = EditorView.theme({
  ".cm-color-swatch": {
    display: "inline-block",
    width: "9px",
    height: "9px",
    borderRadius: "999px",
    margin: "0 5px 0 2px",
    verticalAlign: "middle",
    border: "1px solid rgba(0, 0, 0, 0.3)",
    boxShadow: "0 0 0 1px var(--border)",
  },
})

export function colorSwatches() {
  return [swatchPlugin, swatchStyles]
}