import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, LayoutTemplate, X } from "lucide-react"
import { useAppStore } from "@/app/store.ts"
import { DIAGRAM_TEMPLATES, type DiagramPreviewKind, type DiagramTemplateCategory } from "@/templates/diagramTemplates.ts"

const categories: Array<"All" | DiagramTemplateCategory> = ["All", "UML", "Agile", "Process"]

function DiagramThumbnail({ kind }: { kind: DiagramPreviewKind }) {
  const ink = "#334155"
  const blue = "#3B82F6"
  const teal = "#14B8A6"
  const amber = "#F59E0B"
  return (
    <svg viewBox="0 0 320 160" className="aspect-[2/1] w-full" aria-hidden="true" fill="none">
      <rect width="320" height="160" fill="#F8FAFC" />
      {kind === "use-case" && <>
        <rect x="72" y="17" width="222" height="126" rx="7" stroke="#CBD5E1" strokeDasharray="4 4" />
        <circle cx="34" cy="71" r="10" stroke={ink} strokeWidth="2" />
        <path d="M34 82v28m-13-18h26m-26 27 13-9 13 9" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="145" cy="52" rx="47" ry="17" fill="#EFF6FF" stroke={blue} strokeWidth="2" />
        <ellipse cx="228" cy="104" rx="47" ry="17" fill="#F0FDFA" stroke={teal} strokeWidth="2" />
        <path d="M48 74 98 56m-48 19 83 27" stroke="#94A3B8" strokeWidth="1.5" />
      </>}
      {kind === "class" && <>
        {[20, 119, 218].map((x, i) => <g key={x}>
          <rect x={x} y="30" width="82" height="100" rx="5" fill="white" stroke={i === 1 ? teal : blue} strokeWidth="2" />
          <path d={`M${x} 52h82M${x} 82h82`} stroke="#CBD5E1" />
          <path d={`M${x + 10} 65h37m-37 9h52m-52 17h49m-49 9h41`} stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        </g>)}
        <path d="M102 79h17m82 0h17" stroke={ink} strokeWidth="2" />
      </>}
      {kind === "sequence" && <>
        {[50, 160, 270].map((x, i) => <g key={x}>
          <rect x={x - 30} y="13" width="60" height="24" rx="5" fill={i === 1 ? "#F0FDFA" : "#EFF6FF"} stroke={i === 1 ? teal : blue} />
          <path d={`M${x} 37v111`} stroke="#94A3B8" strokeDasharray="4 4" />
        </g>)}
        <path d="M54 58h91m-4-4 4 4-4 4M164 84h91m-4-4 4 4-4 4M254 110h-91m4-4-4 4 4 4" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      {kind === "scrum" && <>
        {[12, 91, 170, 249].map((x, i) => <g key={x}>
          <rect x={x} y="16" width="64" height="128" rx="6" fill="white" stroke="#CBD5E1" />
          <rect x={x} y="16" width="64" height="21" rx="6" fill={["#E2E8F0", "#DBEAFE", "#FEF3C7", "#DCFCE7"][i]} />
          <rect x={x + 7} y="47" width="50" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" />
          <rect x={x + 7} y="78" width="50" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" />
          {i % 2 === 0 && <rect x={x + 7} y="109" width="50" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" />}
        </g>)}
      </>}
      {kind === "flowchart" && <>
        <ellipse cx="40" cy="80" rx="25" ry="16" fill="#EFF6FF" stroke={blue} strokeWidth="2" />
        <rect x="92" y="62" width="68" height="36" rx="5" fill="white" stroke={blue} strokeWidth="2" />
        <ellipse cx="211" cy="80" rx="31" ry="20" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="2" />
        <rect x="266" y="37" width="45" height="30" rx="5" fill="#F0FDFA" stroke={teal} strokeWidth="2" />
        <rect x="266" y="93" width="45" height="30" rx="5" fill="#FFFBEB" stroke={amber} strokeWidth="2" />
        <path d="M65 80h27m68 0h20m31-1 28-23m-28 24 28 28" stroke={ink} strokeWidth="2" />
      </>}
      {kind === "erd" && <>
        {[18, 119, 220].map((x, i) => <g key={x}>
          <rect x={x} y="24" width="82" height="112" rx="5" fill="white" stroke={[blue, teal, amber][i]} strokeWidth="2" />
          <rect x={x} y="24" width="82" height="25" rx="5" fill={["#DBEAFE", "#CCFBF1", "#FEF3C7"][i]} />
          <path d={`M${x + 10} 65h48m-48 18h56m-56 18h42`} stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
        </g>)}
        <path d="M100 80h19m82 0h19" stroke={ink} strokeWidth="2" />
        <circle cx="108" cy="80" r="3" fill={ink} /><circle cx="210" cy="80" r="3" fill={ink} />
      </>}
    </svg>
  )
}

export function DiagramStarterPicker({ onSelect }: { onSelect?: () => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<"All" | DiagramTemplateCategory>("All")
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusRef = useRef(false)
  const loadScript = useAppStore((state) => state.loadScript)
  const visibleTemplates = category === "All"
    ? DIAGRAM_TEMPLATES
    : DIAGRAM_TEMPLATES.filter((template) => template.category === category)

  useEffect(() => {
    if (!open) {
      if (restoreFocusRef.current) openerRef.current?.focus()
      restoreFocusRef.current = false
      return
    }
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        restoreFocusRef.current = true
        setOpen(false)
      }
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [open])

  const chooseTemplate = (script: string) => {
    loadScript(script)
    setOpen(false)
    onSelect?.()
  }

  const closePicker = () => {
    restoreFocusRef.current = true
    setOpen(false)
  }

  return <>
    <button
      type="button"
      data-workspace-guide-target="diagram-templates"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event) => {
        openerRef.current = event.currentTarget
        setOpen(true)
      }}
      title="Start with an editable diagram"
      className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <LayoutTemplate className="size-3.5" />
      <span>Templates</span>
    </button>
    {open && createPortal(
      <div
        className="fixed inset-0 z-[240] grid place-items-center bg-black/45 p-3 backdrop-blur-sm sm:p-6"
        style={{ zIndex: 240 }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) closePicker() }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="diagram-starters-title"
          aria-describedby="diagram-starters-description"
          style={{ maxHeight: "calc(100svh - 2rem)", minHeight: 0 }}
          className="diagram-picker-panel flex max-h-[92svh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Diagram studio</p>
              <h2 id="diagram-starters-title" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Start with a diagram</h2>
              <p id="diagram-starters-description" className="mt-1 max-w-2xl text-sm text-muted-foreground">Choose a structure, then make it yours. Every starter opens editable on the canvas.</p>
            </div>
            <button ref={closeButtonRef} type="button" aria-label="Close diagram templates" onClick={closePicker} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="size-4" />
            </button>
          </header>
          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-5 py-3 sm:px-7">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"}`}
              >
                {item}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{visibleTemplates.length} starters</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTemplates.map((template, index) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => chooseTemplate(template.script)}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className="diagram-template-card group overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="overflow-hidden border-b border-border/70 bg-slate-50 transition-transform duration-300 group-hover:scale-[1.015]">
                      <DiagramThumbnail kind={template.preview} />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{template.title}</span>
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{template.category}</span>
                          </span>
                        </span>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                      <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">{template.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Use this starter <ArrowRight className="size-3" /></span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground sm:px-7">
            <span>Move and edit objects directly on the canvas.</span>
            <span>Press Play to watch the diagram draw itself.</span>
          </footer>
        </section>
      </div>,
      document.body
    )}
  </>
}
