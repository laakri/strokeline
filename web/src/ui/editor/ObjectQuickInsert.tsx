import { useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import {
  objectInsertOptionsForQuery,
  type ObjectInsertContext,
  type InsertOption,
} from "@/ui/editor/objectInsertOptions.ts"

export function ObjectQuickInsert({
  onInsert,
  getSource,
  context,
  onClose,
}: {
  onInsert: (snippet: string, context: ObjectInsertContext) => boolean
  getSource: () => string
  context: ObjectInsertContext | null
  onClose?: () => void
}) {
  const [query, setQuery] = useState("")
  const [notice, setNotice] = useState("")
  const closeMenu = () => onClose?.()
  const menuPosition =
    context && typeof window !== "undefined"
      ? {
          left: Math.max(
            8,
            Math.min(
              context.clientX,
              window.innerWidth - Math.min(360, window.innerWidth - 16)
            )
          ),
          top: Math.max(
            8,
            Math.min(
              context.clientY,
              window.innerHeight - Math.min(480, window.innerHeight - 16)
            )
          ),
        }
      : undefined
  const options = useMemo(() => objectInsertOptionsForQuery(query), [query])

  const choose = (option: InsertOption) => {
    if (
      !context ||
      !onInsert(option.snippet(getSource(), context.position), context)
    ) {
      setNotice("Add a SCENE first, then insert an object.")
      return
    }
    setQuery("")
    closeMenu()
  }

  return (
    <>
      {context && (
        <div
          className="fixed inset-0 z-[120] bg-transparent"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenu()
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Add an object"
            style={menuPosition}
            className="absolute flex max-h-[72svh] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-border/70"
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
                placeholder="Search shapes, diagram parts, icons…"
                aria-label="Search objects"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close insert menu"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
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
                  <span className="flex min-w-0 items-center gap-2.5 truncate text-sm font-medium">
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="size-6 shrink-0 object-contain"
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {option.category}
                  </span>
                </button>
              ))}
              {options.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matching objects.
                </p>
              )}
            </div>
            <div className="border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
              {notice ||
                (query
                  ? options.length +
                    " matching objects · Enter inserts the first"
                  : "Choose a building block to add at " +
                    context.time.toFixed(2) +
                    "s in this scene")}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
