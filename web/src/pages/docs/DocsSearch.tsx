import { ArrowRight, Search } from "lucide-react"
import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"

import { searchDocs } from "@/pages/docs/docsSearch.ts"

export function DocsSearch() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const results = searchDocs(query)

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", focusSearch)
    document.addEventListener("pointerdown", closeOutside)
    return () => {
      document.removeEventListener("keydown", focusSearch)
      document.removeEventListener("pointerdown", closeOutside)
    }
  }, [])

  useEffect(() => setActiveIndex(0), [query])

  const selectResult = (index: number) => {
    const result = results[index]
    if (!result) return
    navigate(`/docs/${result.page}#${result.anchor}`)
    setQuery("")
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === "Enter" && results.length) {
      event.preventDefault()
      selectResult(activeIndex)
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative mt-6 max-w-xl">
      <label className="sr-only" htmlFor="docs-search">
        Search the documentation
      </label>
      <div className="group flex h-12 items-center gap-3 rounded-xl bg-secondary/55 px-4 transition focus-within:bg-secondary focus-within:ring-2 focus-within:ring-ring/50">
        <Search aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          id="docs-search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="docs-search-results"
          aria-activedescendant={open && results[activeIndex] ? `docs-search-result-${activeIndex}` : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Find a feature, command, or fix…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="hidden shrink-0 rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground sm:inline-flex">
          Ctrl K
        </kbd>
      </div>

      {open && (
        <div
          id="docs-search-results"
          role="listbox"
          aria-label="Documentation suggestions"
          className="absolute z-50 mt-2 max-h-[min(24rem,65vh)] w-full overflow-y-auto rounded-xl bg-popover p-2 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
        >
          <div className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {query.trim() ? "Jump to" : "Popular in the docs"}
          </div>
          {results.length ? (
            results.map((result, index) => (
              <button
                key={`${result.page}#${result.anchor}`}
                id={`docs-search-result-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(index)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{result.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {result.description}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 opacity-50" />
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matching section. Try “icons”, “voice”, or “diagnostics”.
            </p>
          )}
          <div className="mt-1 border-t border-border/60 px-3 pt-2 text-[11px] text-muted-foreground">
            ↑↓ to browse <span className="px-1">·</span> Enter to open <span className="px-1">·</span> Esc to close
          </div>
        </div>
      )}
    </div>
  )
}
