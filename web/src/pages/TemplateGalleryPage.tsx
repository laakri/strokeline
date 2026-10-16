import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Search,
  X,
} from "lucide-react"
import { trackProductEvent } from "@/analytics/productAnalytics.ts"
import { useAppStore } from "@/app/store.ts"
import { Button } from "@/ui/button"
import { PublicHeader } from "@/ui/layout/PublicHeader.tsx"
import {
  TEMPLATE_LIBRARY,
  type DiagramTemplateCategory,
} from "@/templates/diagramTemplates.ts"
import { TemplatePreviewCanvas } from "@/templates/TemplatePreviewCanvas.tsx"

const categories = [
  "All",
  ...new Set(TEMPLATE_LIBRARY.map((template) => template.category)),
] as Array<"All" | DiagramTemplateCategory>

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
    <main className="min-h-screen bg-background text-foreground">
      <PublicHeader activePage="templates" />
      <section className="relative isolate overflow-hidden border-b bg-muted/20">
        <div
          aria-hidden="true"
          className="bg-[radial-gradient(ellipse_at_top, color-mix(in_oklab,var(--primary)_13%,transparent),transparent_62%)] pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
          <p className="text-sm font-semibold tracking-wide text-primary">
            STROKELINE TEMPLATE LIBRARY
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Start with a story worth drawing.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Explore editable whiteboard lessons, diagrams, explainers, and
            storyboards. Preview every scene, then open it in Studio or download
            the WBS source.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border bg-background/80 px-3 py-1.5">
              {TEMPLATE_LIBRARY.length} ready-to-edit templates
            </span>
            <span className="rounded-full border bg-background/80 px-3 py-1.5">
              Original scenes rendered live
            </span>
          </div>
        </div>
      </section>

      <section
        aria-label="Browse templates"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Find your starting point
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse the original Strokeline starters and community-ready
                projects.
              </p>
            </div>
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border bg-card px-3 text-muted-foreground shadow-sm lg:max-w-sm">
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
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTemplates.map((template) => {
                const Icon = template.icon
                const sceneCount = getSceneTitles(template.script).length
                return (
                  <article
                    key={template.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                  >
                    <button
                      type="button"
                      onClick={() => openTemplate(template)}
                      aria-label={`Preview ${template.title}`}
                      className="relative block w-full overflow-hidden bg-muted/50 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring"
                    >
                      <TemplatePreviewCanvas
                        script={template.script}
                        label={`${template.title} rendered preview`}
                        lazy
                        className="aspect-[16/10] w-full"
                      />
                      <span className="absolute top-3 left-3 rounded-full border bg-background/90 px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur">
                        {template.category}
                      </span>
                      <span className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full border bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </button>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
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
                      <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">
                        {template.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => openTemplate(template)}
                        className="mt-5 flex items-center justify-between border-t pt-4 text-sm font-medium transition-colors hover:text-primary"
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
