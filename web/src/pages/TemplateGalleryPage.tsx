import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { trackProductEvent } from "@/analytics/productAnalytics.ts"
import { useAppStore } from "@/app/store.ts"
import { Button } from "@/ui/button"
import { PublicHeader } from "@/ui/layout/PublicHeader.tsx"
import {
  FEATURED_TEMPLATE_IDS,
  TEMPLATE_LIBRARY,
  type DiagramTemplateCategory,
} from "@/templates/diagramTemplates.ts"
import { TemplatePreviewCanvas } from "@/templates/TemplatePreviewCanvas.tsx"

const categories = [
  "All",
  ...new Set(TEMPLATE_LIBRARY.map((template) => template.category)),
] as Array<"All" | DiagramTemplateCategory>

const featuredTemplates = TEMPLATE_LIBRARY.filter((template) =>
  FEATURED_TEMPLATE_IDS.includes(template.id)
)

function TemplateCarousel({
  templates,
  onPreview,
  isPreviewOpen,
}: {
  templates: typeof featuredTemplates
  onPreview: (template: (typeof TEMPLATE_LIBRARY)[number]) => void
  isPreviewOpen: boolean
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const current = templates[index]!
  const total = templates.length
  const sceneCount = getSceneTitles(current.script).length

  const showNext = () => setIndex((currentIndex) => (currentIndex + 1) % total)
  const showPrevious = () =>
    setIndex((currentIndex) => (currentIndex - 1 + total) % total)

  useEffect(() => {
    if (paused || isPreviewOpen || total < 2) return
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) return
    const interval = window.setInterval(
      () => setIndex((currentIndex) => (currentIndex + 1) % total),
      5200
    )
    return () => window.clearInterval(interval)
  }, [isPreviewOpen, paused, total])

  return (
    <article
      aria-label="Featured templates"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setPaused(false)
      }}
      className="relative ml-auto w-full max-w-lg overflow-hidden rounded-2xl border bg-card/90 shadow-lg shadow-black/[0.06] backdrop-blur-sm"
    >
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <button
          key={current.id}
          type="button"
          onClick={() => onPreview(current)}
          aria-label={`Preview ${current.title}`}
          className="template-carousel-in relative min-h-32 overflow-hidden border-r bg-muted/30 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:min-h-36 sm:p-3"
        >
          <TemplatePreviewCanvas
            script={current.script}
            label={`${current.title} rendered preview`}
            className="h-full min-h-28 w-full sm:min-h-32"
          />
        </button>
        <div
          key={`${current.id}-details`}
          className="template-carousel-in flex min-w-0 flex-col justify-between p-3 sm:p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[10px] font-semibold tracking-wide text-primary uppercase">
              {current.category} · Featured
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 min-w-0">
            <h2 className="line-clamp-2 text-sm leading-5 font-semibold tracking-tight text-balance sm:text-base">
              {current.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-xs">
              {sceneCount} scenes · {getCanvasFormat(current.script)}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onPreview(current)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground hover:text-primary"
            >
              Take a look <ArrowRight aria-hidden="true" className="size-3" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous featured template"
                onClick={showPrevious}
                className="grid size-7 place-items-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next featured template"
                onClick={showNext}
                className="grid size-7 place-items-center rounded-full border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 flex h-0.5"
          >
            {templates.map((item, dotIndex) => (
              <span
                key={item.id}
                className={`h-full flex-1 transition-colors duration-300 ${
                  dotIndex === index ? "bg-primary" : "bg-border/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function getSceneTitles(script: string): string[] {
  return Array.from(
    script.matchAll(/^\s*SCENE\s+\d+(?:\s+"([^"]*)")?/gm),
    (match, index) => match[1] || `Scene ${index + 1}`
  )
}

function getCanvasFormat(script: string): string {
  const canvas = script.match(/^\s*CANVAS\s+(\d+)\s+(\d+)/m)
  if (!canvas) return "Storyboard"
  const width = Number(canvas[1])
  const height = Number(canvas[2])
  return width > height ? "Landscape" : height > width ? "Portrait" : "Square"
}

function downloadTemplate(title: string, script: string) {
  const filename = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.wbs`
  const url = URL.createObjectURL(
    new Blob([script], { type: "text/plain;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function TemplateGalleryPage() {
  const [category, setCategory] = useState<(typeof categories)[number]>("All")
  const [search, setSearch] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof TEMPLATE_LIBRARY)[number] | null
  >(null)
  const [sceneIndex, setSceneIndex] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const loadScript = useAppStore((state) => state.loadScript)
  const navigate = useNavigate()

  useLayoutEffect(() => {
    document.documentElement.classList.add("public-scroll-mode")
    return () => document.documentElement.classList.remove("public-scroll-mode")
  }, [])

  const visibleTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return TEMPLATE_LIBRARY.filter((template) => {
      const matchesCategory =
        category === "All" || template.category === category
      const matchesSearch =
        !query ||
        `${template.title} ${template.description} ${template.category}`
          .toLocaleLowerCase()
          .includes(query)
      return matchesCategory && matchesSearch
    })
  }, [category, search])
  const showFeatured = category === "All" && search.trim() === ""

  useEffect(() => {
    if (!selectedTemplate) return
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTemplate(null)
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [selectedTemplate])

  const openTemplate = (template: (typeof TEMPLATE_LIBRARY)[number]) => {
    setSceneIndex(0)
    setSelectedTemplate(template)
  }

  const useInStudio = () => {
    if (!selectedTemplate) return
    trackProductEvent({
      name: "template_selected",
      properties: { template_id: selectedTemplate.id },
    })
    loadScript(selectedTemplate.script)
    setSelectedTemplate(null)
    navigate("/workspace")
  }

  return (
    <main className="min-h-svh overflow-x-clip bg-background text-foreground">
      <PublicHeader activePage="templates" />
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)] opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(var(--border) 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-14">
          <div
            className={`grid gap-8 lg:items-end lg:gap-12 ${
              showFeatured ? "lg:grid-cols-[1.1fr_0.9fr]" : "lg:grid-cols-1"
            }`}
          >
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-primary uppercase">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Your next idea starts here
              </p>
              <h1 className="mt-4 max-w-xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.5rem]">
                Start small.
                <br className="hidden sm:block" /> Make something memorable.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Ready-to-edit whiteboard stories, lessons, and diagrams. Pick
                one, press play, then shape it into your own.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium">
                  {TEMPLATE_LIBRARY.length} templates
                </span>
                <span className="text-xs text-muted-foreground">
                  No blank canvas required
                </span>
              </div>
            </div>
            {showFeatured && featuredTemplates.length > 0 && (
              <TemplateCarousel
                templates={featuredTemplates}
                onPreview={openTemplate}
                isPreviewOpen={selectedTemplate !== null}
              />
            )}
          </div>
        </div>
      </section>

      <section
        aria-label="Browse templates"
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 border-t pt-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                The whole library
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                Find your next starting point
              </h2>
            </div>
            <label className="flex h-11 w-full items-center gap-2 rounded-lg border bg-card px-3 text-muted-foreground transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 lg:max-w-sm">
              <Search aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">Search templates</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates…"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="rounded p-1 hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </label>
          </div>

          <div
            aria-label="Filter templates by category"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {categories.map((item) => {
              const count =
                item === "All"
                  ? TEMPLATE_LIBRARY.length
                  : TEMPLATE_LIBRARY.filter(
                      (template) => template.category === item
                    ).length
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                    category === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {item}
                  <span className="ml-2 text-xs opacity-70">{count}</span>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing {visibleTemplates.length} of {TEMPLATE_LIBRARY.length}{" "}
            templates
          </p>

          {visibleTemplates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTemplates.map((template) => {
                const Icon = template.icon
                const sceneCount = getSceneTitles(template.script).length
                return (
                  <article
                    key={template.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => openTemplate(template)}
                      aria-label={`Preview ${template.title}`}
                      className={`relative flex w-full justify-center overflow-hidden bg-muted/40 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring ${
                        template.category === "Reels" ? "min-h-[360px]" : ""
                      }`}
                    >
                      <TemplatePreviewCanvas
                        script={template.script}
                        label={`${template.title} rendered preview`}
                        lazy
                        className={
                          template.category === "Reels"
                            ? "aspect-[9/16] h-[min(72vw,440px)] w-auto max-w-full"
                            : "aspect-[16/10] w-full"
                        }
                      />
                      <span className="absolute top-3 left-3 rounded-md border bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur">
                        {template.category}
                      </span>
                      <span className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full border bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </button>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
                          <Icon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="leading-5 font-semibold tracking-tight">
                            {template.title}
                          </h3>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getCanvasFormat(template.script)} · {sceneCount}{" "}
                            {sceneCount === 1 ? "scene" : "scenes"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                        {template.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => openTemplate(template)}
                        className="mt-4 flex items-center justify-between border-t pt-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Preview template
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
              <Search className="mx-auto size-6 text-muted-foreground" />
              <h3 className="mt-4 font-semibold">No templates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another search or choose a different category.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5"
                onClick={() => {
                  setSearch("")
                  setCategory("All")
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {selectedTemplate &&
        createPortal(
          <div
            className="fixed inset-0 z-[240] grid place-items-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setSelectedTemplate(null)
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="template-dialog-title"
              className="flex max-h-[calc(100svh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:max-h-[calc(100svh-3rem)] sm:rounded-3xl"
            >
              <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                    {selectedTemplate.category} template
                  </p>
                  <h2
                    id="template-dialog-title"
                    className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl"
                  >
                    {selectedTemplate.title}
                  </h2>
                </div>
                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Close template preview"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <X className="size-4" />
                </Button>
              </header>
              <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
                <div className="flex min-h-64 items-center justify-center border-b bg-muted/30 p-3 sm:min-h-80 lg:border-r lg:border-b-0 lg:p-6">
                  <TemplatePreviewCanvas
                    script={selectedTemplate.script}
                    sceneIndex={sceneIndex}
                    label={`${selectedTemplate.title}, scene ${sceneIndex + 1}`}
                    className="h-full max-h-[60vh] min-h-64 w-full sm:min-h-80"
                  />
                </div>
                <div className="flex flex-col p-5 sm:p-7">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Canvas</p>
                      <p className="mt-1 text-sm font-medium">
                        {getCanvasFormat(selectedTemplate.script)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Scenes</p>
                      <p className="mt-1 text-sm font-medium">
                        {getSceneTitles(selectedTemplate.script).length}
                      </p>
                    </div>
                  </div>
                  <label className="mt-6 text-xs font-medium text-muted-foreground">
                    Preview scene
                    <select
                      value={sceneIndex}
                      onChange={(event) =>
                        setSceneIndex(Number(event.target.value))
                      }
                      className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground"
                    >
                      {getSceneTitles(selectedTemplate.script).map(
                        (title, index) => (
                          <option key={`${index}-${title}`} value={index}>
                            {index + 1}. {title}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <div className="mt-auto grid gap-2 pt-8">
                    <Button
                      type="button"
                      onClick={useInStudio}
                      className="w-full justify-center gap-2"
                    >
                      Use in Studio
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        downloadTemplate(
                          selectedTemplate.title,
                          selectedTemplate.script
                        )
                      }
                      className="w-full justify-center gap-2"
                    >
                      <ArrowDownToLine className="size-4" />
                      Download .wbs
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}
    </main>
  )
}
