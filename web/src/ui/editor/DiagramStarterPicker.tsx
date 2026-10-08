import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowRight, LayoutTemplate, Sparkles, X } from "lucide-react"
import { useAppStore } from "@/app/store.ts"
import { trackProductEvent } from "@/analytics/productAnalytics.ts"
import {
  DIAGRAM_TEMPLATES,
  type DiagramPreviewKind,
  type DiagramTemplateCategory,
} from "@/templates/diagramTemplates.ts"
import { Button } from "@/ui/button"

const categories: Array<"All" | DiagramTemplateCategory> = [
  "All",
  "Reels",
  "UML",
  "Agile",
  "Process",
]

function DiagramThumbnail({ kind }: { kind: DiagramPreviewKind }) {
  const ink = "var(--foreground)"
  const blue = "var(--primary)"
  const blueFill = "color-mix(in oklab, var(--primary) 9%, var(--card))"
  const teal = "#14B8A6"
  const tealFill = "color-mix(in oklab, #14B8A6 10%, var(--card))"
  const amber = "#F59E0B"
  const amberFill = "color-mix(in oklab, #F59E0B 12%, var(--card))"
  return (
    <svg
      viewBox="0 0 320 160"
      className="aspect-[2/1] w-full"
      aria-hidden="true"
      fill="none"
    >
      <rect width="320" height="160" fill="var(--card)" />
      <path
        d="M0 40h320M0 80h320M0 120h320M40 0v160M80 0v160M120 0v160M160 0v160M200 0v160M240 0v160M280 0v160"
        stroke="var(--border)"
        strokeOpacity=".28"
      />
      {kind === "use-case" && (
        <>
          <rect
            x="72"
            y="17"
            width="222"
            height="126"
            rx="7"
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <circle cx="34" cy="71" r="10" stroke={ink} strokeWidth="2" />
          <path
            d="M34 82v28m-13-18h26m-26 27 13-9 13 9"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="145"
            cy="52"
            rx="47"
            ry="17"
            fill={blueFill}
            stroke={blue}
            strokeWidth="2"
          />
          <ellipse
            cx="228"
            cy="104"
            rx="47"
            ry="17"
            fill={tealFill}
            stroke={teal}
            strokeWidth="2"
          />
          <path
            d="M48 74 98 56m-48 19 83 27"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
          />
        </>
      )}
      {kind === "class" && (
        <>
          {[20, 119, 218].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="30"
                width="82"
                height="100"
                rx="5"
                fill="var(--card)"
                stroke={i === 1 ? teal : blue}
                strokeWidth="2"
              />
              <path d={`M${x} 52h82M${x} 82h82`} stroke="var(--border)" />
              <path
                d={`M${x + 10} 65h37m-37 9h52m-52 17h49m-49 9h41`}
                stroke="var(--muted-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}
          <path d="M102 79h17m82 0h17" stroke={ink} strokeWidth="2" />
        </>
      )}
      {kind === "sequence" && (
        <>
          {[50, 160, 270].map((x, i) => (
            <g key={x}>
              <rect
                x={x - 30}
                y="13"
                width="60"
                height="24"
                rx="5"
                fill={i === 1 ? tealFill : blueFill}
                stroke={i === 1 ? teal : blue}
              />
              <path
                d={`M${x} 37v111`}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
              />
            </g>
          ))}
          <path
            d="M54 58h91m-4-4 4 4-4 4M164 84h91m-4-4 4 4-4 4M254 110h-91m4-4-4 4 4 4"
            stroke={ink}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === "scrum" && (
        <>
          {[12, 91, 170, 249].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="16"
                width="64"
                height="128"
                rx="6"
                fill="var(--card)"
                stroke="var(--border)"
              />
              <rect
                x={x}
                y="16"
                width="64"
                height="21"
                rx="6"
                fill={
                  [
                    blueFill,
                    tealFill,
                    amberFill,
                    "color-mix(in oklab, #22C55E 10%, var(--card))",
                  ][i]
                }
              />
              <rect
                x={x + 7}
                y="47"
                width="50"
                height="24"
                rx="4"
                fill="var(--background)"
                stroke="var(--border)"
              />
              <rect
                x={x + 7}
                y="78"
                width="50"
                height="24"
                rx="4"
                fill="var(--background)"
                stroke="var(--border)"
              />
              {i % 2 === 0 && (
                <rect
                  x={x + 7}
                  y="109"
                  width="50"
                  height="24"
                  rx="4"
                  fill="var(--background)"
                  stroke="var(--border)"
                />
              )}
            </g>
          ))}
        </>
      )}
      {kind === "sailboat" && (
        <>
          <rect
            x="10"
            y="18"
            width="76"
            height="124"
            rx="8"
            fill={blueFill}
            stroke={blue}
            strokeWidth="2"
          />
          <rect
            x="234"
            y="18"
            width="76"
            height="124"
            rx="8"
            fill={amberFill}
            stroke={amber}
            strokeWidth="2"
          />
          <rect
            x="105"
            y="16"
            width="110"
            height="20"
            rx="10"
            fill={tealFill}
            stroke={teal}
          />
          <path
            d="M151 47v42m5-38 39 35h-39m-9-25-25 25h25m-60 20h128m-112 12h94"
            fill="none"
            stroke={ink}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M119 89h84l-14 13h-57z"
            fill={amberFill}
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M86 108q10-7 20 0t20 0m72 0q10-7 20 0t20 0" fill="none" stroke={teal} strokeWidth="2" />
          <circle cx="66" cy="43" r="4" fill={amber} />
          <circle cx="258" cy="43" r="4" fill={amber} />
          <path d="M88 63h50m-50 10h42m114-10h42m-42 10h35" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {kind === "flowchart" && (
        <>
          <ellipse
            cx="40"
            cy="80"
            rx="25"
            ry="16"
            fill={blueFill}
            stroke={blue}
            strokeWidth="2"
          />
          <rect
            x="92"
            y="62"
            width="68"
            height="36"
            rx="5"
            fill="var(--card)"
            stroke={blue}
            strokeWidth="2"
          />
          <ellipse
            cx="211"
            cy="80"
            rx="31"
            ry="20"
            fill="color-mix(in oklab, #8B5CF6 10%, var(--card))"
            stroke="#8B5CF6"
            strokeWidth="2"
          />
          <rect
            x="266"
            y="37"
            width="45"
            height="30"
            rx="5"
            fill={tealFill}
            stroke={teal}
            strokeWidth="2"
          />
          <rect
            x="266"
            y="93"
            width="45"
            height="30"
            rx="5"
            fill={amberFill}
            stroke={amber}
            strokeWidth="2"
          />
          <path
            d="M65 80h27m68 0h20m31-1 28-23m-28 24 28 28"
            stroke={ink}
            strokeWidth="2"
          />
        </>
      )}
      {kind === "erd" && (
        <>
          {[18, 119, 220].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="24"
                width="82"
                height="112"
                rx="5"
                fill="var(--card)"
                stroke={[blue, teal, amber][i]}
                strokeWidth="2"
              />
              <rect
                x={x}
                y="24"
                width="82"
                height="25"
                rx="5"
                fill={[blueFill, tealFill, amberFill][i]}
              />
              <path
                d={`M${x + 10} 65h48m-48 18h56m-56 18h42`}
                stroke="var(--muted-foreground)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}
          <path d="M100 80h19m82 0h19" stroke={ink} strokeWidth="2" />
          <circle cx="108" cy="80" r="3" fill={ink} />
          <circle cx="210" cy="80" r="3" fill={ink} />
        </>
      )}
      {kind === "reels" && (
        <>
          <rect
            x="119"
            y="5"
            width="82"
            height="150"
            rx="15"
            fill="#101827"
            stroke="#475569"
            strokeWidth="3"
          />
          <rect x="126" y="17" width="68" height="126" rx="9" fill="#172554" />
          <rect
            x="126"
            y="17"
            width="68"
            height="22"
            rx="8"
            fill="#F43F5E"
            fillOpacity="0.35"
          />
          <rect
            x="126"
            y="113"
            width="68"
            height="30"
            rx="5"
            fill="#F43F5E"
            fillOpacity="0.35"
          />
          <rect x="139" y="53" width="42" height="8" rx="4" fill="#F8FAFC" />
          <rect x="134" y="69" width="52" height="7" rx="3" fill="#34D399" />
          <rect x="137" y="83" width="46" height="7" rx="3" fill="#BFDBFE" />
          <rect x="132" y="97" width="56" height="7" rx="3" fill="#FDE68A" />
          <circle cx="160" cy="11" r="2" fill="#94A3B8" />
        </>
      )}
    </svg>
  )
}

export function DiagramStarterPicker({ onSelect }: { onSelect?: () => void }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<"All" | DiagramTemplateCategory>(
    "All"
  )
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocusRef = useRef(false)
  const loadScript = useAppStore((state) => state.loadScript)
  const visibleTemplates =
    category === "All"
      ? DIAGRAM_TEMPLATES
      : DIAGRAM_TEMPLATES.filter((template) => template.category === category)
  const categoryCounts = categories.map((item) => ({
    name: item,
    count:
      item === "All"
        ? DIAGRAM_TEMPLATES.length
        : DIAGRAM_TEMPLATES.filter((template) => template.category === item)
            .length,
  }))

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

  const chooseTemplate = (templateId: string, script: string) => {
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: templateId },
    })
    loadScript(script)
    setOpen(false)
    onSelect?.()
  }

  const closePicker = () => {
    restoreFocusRef.current = true
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        data-workspace-guide-target="diagram-templates"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          openerRef.current = event.currentTarget
          setOpen(true)
        }}
        title="Start with an editable diagram"
        size="sm"
        className="shrink-0"
      >
        <LayoutTemplate className="size-3.5" />
        <span>Templates</span>
      </Button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[240] grid place-items-center bg-black/50 p-2 backdrop-blur-md sm:p-5"
            style={{ zIndex: 240 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePicker()
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="diagram-starters-title"
              aria-describedby="diagram-starters-description"
              style={{ maxHeight: "calc(100svh - 1rem)", minHeight: 0 }}
              className="diagram-picker-panel flex max-h-[94svh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-background text-foreground shadow-2xl sm:rounded-3xl"
            >
              <header className="flex items-start justify-between gap-4 px-5 py-4 sm:px-7 sm:py-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Strokeline studio</span>
                    <span aria-hidden="true">/</span>
                    <span>Starter library</span>
                  </div>
                  <h2
                    id="diagram-starters-title"
                    className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
                  >
                    What are you making?
                  </h2>
                  <p
                    id="diagram-starters-description"
                    className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground"
                  >
                    Pick a starting point. Every template is editable and ready
                    to animate.
                  </p>
                </div>
                <Button
                  ref={closeButtonRef}
                  variant="outline"
                  size="icon-sm"
                  type="button"
                  aria-label="Close diagram templates"
                  onClick={closePicker}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              </header>
              <div className="flex min-h-0 flex-1 flex-col border-t border-border/70 bg-muted/20 sm:flex-row">
                <nav
                  aria-label="Template categories"
                  className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/70 px-4 py-3 sm:w-52 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:px-3 sm:py-5"
                >
                  <p className="hidden px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:block">
                    Browse by type
                  </p>
                  {categoryCounts.map(({ name, count }) => (
                    <Button
                      key={name}
                      type="button"
                      aria-pressed={category === name}
                      onClick={() => setCategory(name)}
                      variant={category === name ? "secondary" : "ghost"}
                      size="sm"
                      className={`justify-between rounded-lg px-3 sm:w-full ${category === name ? "font-semibold text-foreground shadow-sm ring-1 ring-border/70" : "text-muted-foreground"}`}
                    >
                      <span>{name}</span>
                      <span className="text-[11px] tabular-nums opacity-70">
                        {count}
                      </span>
                    </Button>
                  ))}
                </nav>
                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {category === "All"
                          ? "All starters"
                          : `${category} starters`}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Choose one to open it in your workspace
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                      aria-live="polite"
                    >
                      {visibleTemplates.length}{" "}
                      {visibleTemplates.length === 1 ? "template" : "templates"}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleTemplates.map((template, index) => {
                      const Icon = template.icon
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() =>
                            chooseTemplate(template.id, template.script)
                          }
                          style={{ animationDelay: `${index * 40}ms` }}
                          className="diagram-template-card group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <div
                            className={`relative overflow-hidden border-b border-border/70 p-2 ${template.category === "Reels" ? "bg-slate-950" : "bg-muted/40"}`}
                          >
                            <DiagramThumbnail kind={template.preview} />
                            <span className="absolute top-4 left-4 rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
                              {template.category}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col p-4">
                            <div className="flex items-center gap-2.5">
                              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="size-4" />
                              </span>
                              <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
                                {template.title}
                              </span>
                            </div>
                            <p className="mt-3 min-h-10 text-xs leading-5 text-muted-foreground">
                              {template.description}
                            </p>
                            <span className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                              <span>Open template</span>
                              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <footer className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-2.5 text-[11px] text-muted-foreground sm:px-7">
                <span>Editable on canvas · animated on playback</span>
                <span>
                  Press{" "}
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    Esc
                  </kbd>{" "}
                  to close
                </span>
              </footer>
            </section>
          </div>,
          document.body
        )}
    </>
  )
}
