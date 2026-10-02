import { useMemo, useState } from "react"
import { Plus, Search, X } from "lucide-react"
import { ICON_NAMES } from "@/dsl/grammar.ts"

interface InsertOption {
  label: string
  category: string
  keywords: string
  snippet: (source: string, point?: InsertPoint) => string
}

interface InsertPoint {
  x: number
  y: number
}

interface InsertContext {
  clientX: number
  clientY: number
  position: InsertPoint
  sceneIndex: number
}

function coordinates(point?: InsertPoint): InsertPoint {
  return {
    x: Math.round(point?.x ?? 960),
    y: Math.round(point?.y ?? 540),
  }
}

function nextId(source: string, prefix: string): string {
  const used = new Set(source.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [])
  let suffix = 1
  while (used.has(prefix + "_" + suffix)) suffix += 1
  return prefix + "_" + suffix
}

const objectOptions: InsertOption[] = [
  {
    label: "Arrow",
    category: "Arrow",
    keywords: "ink direction connector",
    snippet: (_source, point) => {
      const at = coordinates(point)
      return "INK ARROW FROM " + (at.x - 180) + " " + at.y + " TO " + (at.x + 180) + " " + at.y + "\n" +
        "  COLOR #2E86AB\n  WIDTH 6\n  DRAW 1s\nEND"
    },
  },
  ...(["BARCHART", "LINECHART", "PIECHART"] as const).map((chartType) => ({
    label: chartType === "BARCHART" ? "Bar chart" : chartType === "LINECHART" ? "Line chart" : "Pie chart",
    category: "Chart",
    keywords: "data graph",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return chartType + " " + nextId(source, "chart") + "\n" +
        "  POSITION " + at.x + " " + at.y + "\n  SIZE 900 500\n" +
        "  DATA \"Alpha\" 42\n  DATA \"Beta\" 68\n  DATA \"Gamma\" 35\nEND"
    },
  })),
  {
    label: "Table",
    category: "Table",
    keywords: "comparison rows columns",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return "TABLE " + nextId(source, "table") + "\n" +
        "  POSITION " + at.x + " " + at.y + "\n  SIZE 1000 420\n" +
        "  COLUMNS \"Option\" \"Value\"\n  ROW \"Alpha\" \"42\"\n  ROW \"Beta\" \"68\"\nEND"
    },
  },
  {
    label: "Callout",
    category: "Callout",
    keywords: "note bubble label",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return "USE callout AS " + nextId(source, "callout") +
        " AT " + at.x + " " + at.y + " WITH TEXT \"Key point\""
    },
  },
  ...ICON_NAMES.map((iconName) => ({
    label: iconName,
    category: "Icon",
    keywords: "lucide symbol " + iconName,
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return "CREATE " + nextId(source, "icon") + " AS ICON\n" +
        "  NAME \"" + iconName + "\"\n  POSITION " + at.x + " " + at.y + "\n  SIZE 104\n" +
        "  COLOR #2E86AB\n  DRAW 0.8s\nEND"
    },
  })),
]

export function ObjectQuickInsert({
  onInsert,
  getSource,
  mode = "toolbar",
  context,
  onClose,
}: {
  onInsert: (snippet: string, sceneIndex?: number) => boolean
  getSource: () => string
  mode?: "toolbar" | "context"
  context?: InsertContext | null
  onClose?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("")
  const contextMode = mode === "context"
  const menuOpen = contextMode ? context !== null && context !== undefined : open
  const closeMenu = () => {
    if (contextMode) onClose?.()
    else setOpen(false)
  }
  const menuPosition = contextMode && context && typeof window !== "undefined"
    ? {
        left: Math.max(8, Math.min(context.clientX, window.innerWidth - 360)),
        top: Math.max(8, Math.min(context.clientY, window.innerHeight - 480)),
      }
    : undefined
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = normalized
      ? objectOptions.filter((option) =>
          (option.label + " " + option.category + " " + option.keywords).toLowerCase().includes(normalized)
        )
      : objectOptions.filter((option) =>
          option.category !== "Icon" || ICON_NAMES.indexOf(option.label as typeof ICON_NAMES[number]) < 6
        )
    return filtered
  }, [query])

  const choose = (option: InsertOption) => {
    if (!onInsert(option.snippet(getSource(), context?.position), context?.sceneIndex)) {
      setNotice("Add a SCENE first, then insert an object.")
      return
    }
    setQuery("")
    setNotice("Inserted into the scene. Preview updates when the script is valid.")
  }

  return (
    <>
      {!contextMode && (
        <div className="flex h-10 shrink-0 items-center border-b border-border/70 bg-card px-2">
          <button
            type="button"
            onClick={() => {
              setOpen(true)
              setNotice("")
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Insert an icon, arrow, chart, table, or callout"
          >
            <Plus className="size-3.5" />
            Insert object
          </button>
          <span className="ml-2 hidden text-[11px] text-muted-foreground/70 sm:inline">
            Search icons and add objects without leaving the editor
          </span>
        </div>
      )}
      {menuOpen && (
        <div
          className={contextMode
            ? "fixed inset-0 z-[120] bg-transparent"
            : "fixed inset-0 z-[120] bg-black/35 px-3 pt-[10svh] backdrop-blur-[2px]"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenu()
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Insert object"
            style={menuPosition}
            className={contextMode
              ? "absolute flex max-h-[72svh] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-border/70"
              : "mx-auto flex max-h-[78svh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-border/70"}
          >
            <div className="flex items-center gap-2 border-b border-border/70 px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeMenu()
                  if (event.key === "Enter" && options[0]) choose(options[0])
                }}
                placeholder="Search icons, arrows, charts, tables…"
                aria-label="Search objects"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close insert menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {options.map((option) => (
                <button
                  type="button"
                  key={option.category + ":" + option.label}
                  onClick={() => choose(option)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate text-sm font-medium">{option.label}</span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {option.category}
                  </span>
                </button>
              ))}
              {options.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching objects.</p>
              )}
            </div>
            <div className="border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
              {notice || (query
                ? options.length + " matching objects · Enter inserts the first"
                : "Type to search the full Lucide icon library")}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
