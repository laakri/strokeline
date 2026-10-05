import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, Navigate, useLocation, useParams } from "react-router-dom"

import { BOARD_BASES, THEMES } from "@/defaults/themes.ts"
import { docsPages, docsSectionPages } from "@/pages/docs/docsStructure.ts"
import { DocsBoardPreview } from "@/pages/docs/DocsBoardPreview.tsx"
import { DocsSearch } from "@/pages/docs/DocsSearch.tsx"
import { Button } from "@/ui/button"
import { PublicHeader } from "@/ui/layout/PublicHeader.tsx"

const themeGallery = Object.entries(THEMES).filter(([, theme], index, entries) =>
  entries.findIndex(([, candidate]) =>
    candidate.board === theme.board &&
    candidate.background === theme.background &&
    candidate.ink === theme.ink &&
    candidate.pen === theme.pen
  ) === index
)

const starterScript = `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FAFAFA
STYLE handdrawn
FONT handwritten
STROKE 4
SUBTITLES on

SCENE 1 "A request and a response"
  CREATE browser AS RECTANGLE
    POSITION 420 480
    WIDTH 320
    HEIGHT 190
    COLOR #2E86AB
    FILL #E8F2F5
    TEXT "Your browser"
    DRAW 0.8s
  END
  CREATE server AS RECTANGLE
    POSITION 1500 480
    WIDTH 320
    HEIGHT 190
    COLOR #E76F51
    FILL #F8E9E3
    TEXT "The server"
    DRAW 0.8s
  END
  ARROW browser -> server
    LABEL "request"
    DRAW 0.8s
  SAY "The server is like a librarian: it finds the page you asked for."
    DURATION 4s
    TONE explain
  WAIT 4s
END SCENE`

const animationScript = `ANIMATE server MOVE TO 1320 480 DURATION 1s EASE easeOutBack
ENTER server pop
LOOP server breathe AMPLITUDE 4 PERIOD 2s

CAMERA ZOOM
  TARGET server
  SCALE 1.5
  DURATION 1s
CAMERA RESET
  DURATION 0.8s

TRANSITION wipe DURATION 0.6s
GAP DURATION 0.4s`

const chartScript = `BARCHART visits
  POSITION 960 540
  SIZE 900 520
  DATA "Week 1" 12
  DATA "Week 2" 22
  DATA "Week 3" 34
END`

const headerScript = `VERSION 1.0
CANVAS 1920 1080
THEME blueprint
BOARD blueprint
BACKGROUND #101827
STYLE marker
FONT neat
STROKE 4
HAND on
SUBTITLES off

SCENE 1 "A clear title"
  CREATE title AS TEXT
    TEXT "One idea at a time"
    POSITION 960 300
    SIZE 64
    COLOR #FFFFFF
    ALIGN center
    MAXWIDTH 1200
  END
END SCENE`

const themeScript = `VERSION 1.0
CANVAS 1920 1080
THEME cosmic
BOARD topographic
BACKGROUND #101F18
STYLE pencil
FONT neat
STROKE 4

SCENE 1 "Field study"
  CREATE title AS TEXT
    TEXT "A changing landscape"
    POSITION 960 250
    SIZE 64
    COLOR #F2E7C9
    PEN marker
    MAXWIDTH 1200
  END
END SCENE`

const drawingScript = `SCENE 1 "Draw and arrange"
  CREATE card AS RECTANGLE
    POSITION 960 540
    WIDTH 560
    HEIGHT 300
    FILL #20334A
    COLOR #8CC8FF
    STROKE 5
    OPACITY 1
    TEXT "A labeled shape"
    SIZE 36
    ALIGN center
    PEN handdrawn
    DRAW 0.8s
  END

  CREATE label AS TEXT
    TEXT "Near the card"
    BELOW card GAP 36
    SIZE 32
    COLOR #FFFFFF
  END

  CREATE connector AS LINE
    FROM 680 540
    TO 400 540
    COLOR #FFD166
    STROKE 6
  END
  ARROW card -> label
    COLOR #FFD166
END SCENE`

const connectorScript = `SCENE 1 "Three ways to connect"
  CREATE client AS RECTANGLE
    POSITION 340 520
    WIDTH 300
    HEIGHT 170
    FILL #E8F2F5
    COLOR #2E86AB
    TEXT "Client"
  END
  CREATE daemon AS RECTANGLE
    POSITION 960 520
    WIDTH 340
    HEIGHT 170
    FILL #EAF1F8
    COLOR #4472A1
    TEXT "Docker daemon"
  END
  CREATE registry AS RECTANGLE
    POSITION 1580 520
    WIDTH 300
    HEIGHT 170
    FILL #F7EFE2
    COLOR #C27A33
    TEXT "Registry"
  END

  PARALLEL
    ARROW client -> daemon
      LABEL "command"
      ROUTE elbow
      STROKE 6
      DRAW 0.7s
    ARROW daemon -> registry
      LABEL "pull or push"
      ROUTE curve
      LINESTYLE dashed
      HEAD both
      COLOR #D79842
      STROKE 5
      DRAW 1s
  END
END SCENE`

const inkScript = `SCENE 1 "Freehand marks"
  CREATE target AS RECTANGLE
    POSITION 1000 500
    WIDTH 300
    HEIGHT 180
  END
  INK underline
    POINTS 420 650, 560 632, 720 646, 860 620
    COLOR #FFD166
    WIDTH 9
    DRAW 0.7s
    REVEAL natural
    PEN chalk
  END

  INK ARROW FROM 900 600 TO 1250 440
    COLOR #72D6C7
    WIDTH 7
    DRAW 0.8s
  END
  INK CIRCLE target
END SCENE`

const layoutScript = `SCENE 1 "Aligned content"
  STACK flow DIRECTION vertical GAP 28 AT 960 360
    CREATE heading AS TEXT
      TEXT "First"
      SIZE 38
    END
    CREATE detail AS TEXT
      TEXT "Then the supporting idea"
      SIZE 28
    END
  END

  GRID cards
    COLUMNS 3
    GAP 24
    AT 960 700
    CREATE tile AS RECTANGLE
      WIDTH 220
      HEIGHT 140
    END
  END
END SCENE`

const macroScript = `DEFINE note PARAMS title body
  CREATE card AS RECTANGLE
    WIDTH 420
    HEIGHT 240
    TEXT title
  END
  CREATE copy AS TEXT
    TEXT body
    BELOW card GAP 24
  END
END

SCENE 1 "Reusable pieces"
  USE note AS idea AT 960 540 WITH title "The key idea" body "One reusable visual"
  DUPLICATE ideaCopy FROM idea
    POSITION 1400 540
  DELETE ideaCopy
END SCENE`

const cameraScript = `SCENE 1 "Camera and motion"
  CREATE dot AS CIRCLE
    POSITION 700 540
    RADIUS 48
    FILL #FFD166
  END
  ENTER dot pop DURATION 0.5s
  ANIMATE dot MOVE TO 1200 540 DURATION 1.2s EASE spring
  LOOP dot breathe AMPLITUDE 8 PERIOD 2s

  CAMERA ZOOM
    TARGET dot
    SCALE 1.4
    DURATION 0.8s
    EASE easeInOutCubic
  CAMERA RESET
    DURATION 0.6s
  EXIT dot fade DURATION 0.3s
  TRANSITION wipe DURATION 0.6s
  GAP DURATION 0.5s
END SCENE`

const scriptSkeleton = `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #F6F1E7

DEFINE reusable PARAMS LABEL
  CREATE part AS TEXT
    TEXT LABEL
  END
END

SCENE 1 "Scene title"
  PARALLEL STAGGER 0.15s
    CREATE title AS TEXT
      TEXT "One clear point"
      POSITION 960 300
      SIZE 56
      MAXWIDTH 1100
    END
    SAY "Here is why this idea matters."
      DURATION 2s
      TONE hook
  END
  TRANSITION fade DURATION 0.6s
  GAP DURATION 0.5s
END SCENE`

const iconScript = `CREATE brain AS ICON
  NAME brain
  POSITION 960 540
  SIZE 160
  COLOR #8CC8FF
END`

const sayScript = `SAY "The cache keeps frequently used data close."
  DURATION 3s
  WHO "Narrator"
  TONE explain
  LANG en
  DETAIL "A cache is like keeping your most-used tools on the desk."`

const prose =
  "mt-4 space-y-4 text-[15px] leading-7 text-muted-foreground " +
  "[&_p]:break-words [&_li]:break-words [&_p_code]:break-all [&_li_code]:break-all " +
  "[&_h3]:mt-8 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground " +
  "[&_strong]:font-semibold [&_strong]:text-foreground " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-foreground " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] " +
  "[&_kbd]:rounded [&_kbd]:border [&_kbd]:bg-muted [&_kbd]:px-1.5 [&_kbd]:font-mono [&_kbd]:text-xs"

const listCls = "list-disc space-y-2 pl-5 marker:text-muted-foreground/50"

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/50 py-1 pr-2 pl-4">
        <span className="font-mono text-xs text-muted-foreground">{title}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={copy}
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 font-mono leading-6 text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="rounded-lg border border-l-4 border-l-primary bg-muted/40 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6">{children}</p>
    </aside>
  )
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-sm leading-6">{children}</p>
    </div>
  )
}

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>
}

function DocsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  const { page = "overview" } = useParams()
  if (docsSectionPages[id] !== page) return null

  return (
    <section
      id={id}
      className="group scroll-mt-32 border-t pt-10 first:border-t-0 first:pt-0"
    >
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        {title}
        <a
          href={`#${id}`}
          aria-label={`Link to ${title}`}
          className="text-lg font-normal text-muted-foreground/0 no-underline transition-colors group-hover:text-muted-foreground/60 hover:text-primary focus-visible:text-primary"
        >
          #
        </a>
      </h2>
      <div className={prose}>{children}</div>
    </section>
  )
}

export function DocsPage() {
  const { page = "overview" } = useParams()
  const location = useLocation()
  const currentPage = docsPages.find((item) => item.slug === page) ?? docsPages[0]
  const pageIndex = docsPages.findIndex((item) => item.slug === page)
  const previousPage = docsPages[pageIndex - 1]
  const nextPage = docsPages[pageIndex + 1]
  const [pin, setPin] = useState<{
    left: number
    top: number
    width: number
  } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const columnRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.documentElement.classList.add("landing-mode")
    return () => document.documentElement.classList.remove("landing-mode")
  }, [])

  // Pins the sidebar with position: fixed so it keeps working even when an
  // ancestor has overflow set (which breaks position: sticky).
  useEffect(() => {
    const TOP = 96
    const update = () => {
      const grid = gridRef.current
      const column = columnRef.current
      const panel = panelRef.current
      if (
        !grid ||
        !column ||
        !panel ||
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
        setPin(null)
        return
      }
      const g = grid.getBoundingClientRect()
      const c = column.getBoundingClientRect()
      if (g.top > TOP) {
        setPin(null)
        return
      }
      const next = {
        left: Math.round(c.left),
        top: Math.round(Math.min(TOP, g.bottom - panel.offsetHeight)),
        width: Math.round(c.width),
      }
      setPin((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width
          ? prev
          : next
      )
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    update()
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [])

  useEffect(() => {
    const hash = location.hash.slice(1)
    if (hash) {
      window.setTimeout(
        () => document.getElementById(hash)?.scrollIntoView(),
        0
      )
    } else {
      window.scrollTo({ top: 0, behavior: "auto" })
    }
  }, [page, location.hash])

  useEffect(() => {
    document
      .querySelector(`[data-pill="${page}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [page])

  if (pageIndex < 0) return <Navigate to="/docs" replace />

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader activePage="docs">
        <nav
          aria-label="On this page"
          className="flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden"
        >
          {docsPages.map(({ slug, label }) => (
            <Link
              key={slug}
              to={slug === "overview" ? "/docs" : `/docs/${slug}`}
              data-pill={slug}
              aria-current={page === slug ? "page" : undefined}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm no-underline ${
                page === slug
                  ? "bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </PublicHeader>

      <main className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-24">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {currentPage.title}
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            {currentPage.description}
          </p>
        </div>
        <DocsSearch />

        <div
          ref={gridRef}
          className="mt-8 grid min-w-0 gap-8 lg:mt-12 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12"
        >
          <nav
            ref={columnRef}
            aria-label="On this page"
            className="hidden lg:block"
          >
            <div
              ref={panelRef}
              style={
                pin
                  ? {
                      position: "fixed",
                      left: pin.left,
                      top: pin.top,
                      width: pin.width,
                    }
                  : undefined
              }
              className="max-h-[calc(100dvh-8rem)] overflow-y-auto"
            >
              <p className="mb-3 text-sm font-semibold">On this page</p>
              <ul className="m-0 list-none space-y-0.5 border-l p-0">
                {docsPages.map(({ slug, label }) => (
                  <li key={slug}>
                    <Link
                      to={slug === "overview" ? "/docs" : `/docs/${slug}`}
                      aria-current={page === slug ? "page" : undefined}
                      className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm no-underline transition-colors ${
                        page === slug
                          ? "border-primary font-medium text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <article className="max-w-3xl min-w-0 space-y-12">
            {page === "overview" && (
              <div className="grid gap-3 sm:grid-cols-2">
                {docsPages.filter((item) => item.slug !== "overview").map((item) => (
                  <Link
                    key={item.slug}
                    to={`/docs/${item.slug}`}
                    className="group rounded-xl border bg-card p-5 no-underline transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary">{item.label}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                    <span className="mt-4 inline-block text-sm font-medium text-primary">Open guide →</span>
                  </Link>
                ))}
              </div>
            )}
            <DocsSection id="quick-start" title="Quick start">
              <ol className="list-decimal space-y-3 pl-5 marker:font-semibold marker:text-foreground">
                <li>
                  <strong>Open the studio.</strong> Select the script editor and
                  replace its contents with a scene.
                </li>
                <li>
                  <strong>Run it.</strong> Strokeline checks the script, then
                  renders the preview. Run also applies safe syntax fixes when
                  possible; it does not guess new object positions.
                </li>
                <li>
                  <strong>Play and refine.</strong> Use the player controls and
                  timeline. Fix red errors; yellow warnings are suggestions.
                </li>
                <li>
                  <strong>Export.</strong> Save the script as <code>.wbs</code>,
                  export a video or GIF, or download subtitle files.
                </li>
              </ol>
              <Button asChild>
                <Link to="/workspace">Open the studio</Link>
              </Button>
            </DocsSection>

            <DocsSection id="first-script" title="Your first script">
              <p>
                A script has optional settings at the top, followed by one or
                more scenes. Each scene contains drawing and timing
                instructions.
              </p>
              <CodeBlock title="first-scene.wbs" code={starterScript} />
              <p>
                <code>POSITION</code> places an object by its center. Text
                inside a rectangle uses the rectangle’s built-in{" "}
                <code>TEXT</code> property. <code>DRAW</code> sets how long it
                takes to appear.
              </p>
            </DocsSection>

            <DocsSection id="studio-tools" title="Studio tools">
              <p>
                Use <strong>Copy AI Prompt</strong> to give an assistant the
                current Strokeline syntax guide. Paste its script into the
                editor, press <strong>Run</strong>, and send it the first error
                or Copy all diagnostics if something still needs attention.
              </p>
              <p>
                The editor’s <strong>Insert object</strong> menu searches icons
                and inserts arrows, charts, tables, and callouts into the
                current script and scene.
                Canvas selection is another editing path: click an object to
                open its action menu, jump to its code, edit supported
                properties, connect an arrow, or delete it. If objects overlap,
                cycle through the hits from that menu.
              </p>
              <p>
                Drag an editable preview object to reposition it. Strokeline
                changes only its <code>POSITION</code> values and adds an undo
                step; it never auto-moves other objects. Selecting an object
                also selects its source in the editor. The first-use workspace
                guide points out the editor, Run, diagnostics, and preview.
              </p>
            </DocsSection>

            <DocsSection id="language" title="Script language">
              <p>
                Think of a script as global settings, reusable definitions, then
                timed scenes. Coordinates use the canvas pixel grid; on a
                1920×1080 canvas, (0, 0) is the top-left. IDs name things you
                can connect, animate, copy, or remove.
              </p>
              <CodeBlock title="Complete script shape" code={scriptSkeleton} />
              <CardGrid>
                <InfoCard title="Blocks">
                  <code>CREATE</code>, <code>INK</code>, <code>DEFINE</code>,{" "}
                  <code>PARALLEL</code>, <code>GROUP</code>, <code>STACK</code>,{" "}
                  <code>GRID</code>, <code>TABLE</code>, and charts open blocks that close with{" "}
                  <code>END</code>. Scenes close with <code>END SCENE</code>.
                </InfoCard>
                <InfoCard title="No-END statements">
                  <code>ARROW</code>, <code>ANIMATE</code>, <code>ENTER</code>,{" "}
                  <code>EXIT</code>, <code>CAMERA</code>, <code>WAIT</code>,{" "}
                  <code>LOOP</code>, <code>SAY</code>, <code>TRANSITION</code>,{" "}
                  <code>GAP</code>, <code>USE</code>, <code>DUPLICATE</code>,{" "}
                  and <code>DELETE</code> do not take an <code>END</code>. Some
                  accept following property lines.
                </InfoCard>
                <InfoCard title="Time">
                  Write durations with units: <code>1s</code> or{" "}
                  <code>400ms</code>. Sequential actions advance the timeline;{" "}
                  <code>PARALLEL</code> overlaps them, and <code>SAY</code>{" "}
                  never advances it.
                </InfoCard>
                <InfoCard title="Object identity">
                  Give each created object a unique, readable ID. Create it
                  before referencing it from an arrow, layout relation, camera
                  target, or animation.
                </InfoCard>
              </CardGrid>
              <p>
                Use the links in the sidebar as a reference: headers and object
                properties, drawing/layout, macros/icons/charts, motion,
                narration, then playback and diagnostics.
              </p>
              <CodeBlock
                title="Duplicate and delete"
                code={`DUPLICATE titleCopy FROM title\n  POSITION 960 720\nDELETE titleCopy`}
              />
            </DocsSection>

            <DocsSection id="theming" title="Themes and boards">
              <p>
                Put <code>VERSION</code> and <code>CANVAS</code> first. Optional
                settings follow them and apply to the whole script; each scene
                begins with <code>SCENE number</code> and closes with{" "}
                <code>END SCENE</code>. Use one property per line inside a
                block.
              </p>
              <Callout title="Coordinate tip">
                <code>POSITION</code> is the object’s center. Measure the full
                rendered text box, not just its anchor; <code>MAXWIDTH</code>{" "}
                helps keep long copy on screen.
              </Callout>
              <CodeBlock title="Headers and text" code={headerScript} />
              <h3>Header settings</h3>
              <ul className={listCls}>
                <li>
                  <code>BACKGROUND #hex</code> sets a solid base color and
                  overrides the board or theme base.
                </li>
                <li>
                  <code>THEME</code> presets: {Object.keys(THEMES).join(", ")}.
                </li>
                <li>
                  <code>BOARD</code> surfaces: {Object.keys(BOARD_BASES).join(", ")}.
                  Celestial adds a star map; topographic adds
                  terrain contours; neon-grid adds perspective rays; editorial adds
                  ruled columns and registration marks; blackboard adds chalk dust,
                  a wood frame, tray, chalk, and eraser; corkboard adds natural flecks; linen adds a woven
                  grain; aurora adds soft light bands; circuit adds routed traces,
                  notebook adds ruled paper, and terrazzo adds colored stone flecks.
                  Board textures are procedural and cached.
                </li>
                <li>
                  <code>STYLE</code>: handdrawn, chalk, marker, pencil, brush,
                  or clean. <code>PEN</code> overrides the style on one object.
                </li>
                <li>
                  <code>FONT</code>: handwritten, marker, neat, messy, or
                  arabic. Arabic text keeps its script and uses right-to-left
                  shaping.
                </li>
                <li>
                  <code>STROKE number</code> sets the default line weight;{" "}
                  <code>HAND on|off</code> toggles the small reveal hand.
                </li>
                <li>
                  <code>SUBTITLES on|off</code> sets the initial caption state.
                  Missing means off.
                </li>
              </ul>
              <p>
                Board surfaces are procedural and cached offscreen. Depending on
                the board and style, rendering can add grain, vignette, smudges,
                a frame, light gradients, or subtle dust. Hand-drawn variation
                is seeded by object ID, so seeking remains deterministic.
              </p>

              <h3>How visual settings combine</h3>
              <ol className="list-decimal space-y-2 pl-5">
                <li><code>THEME</code> selects a coordinated board, base color, ink, and pen defaults.</li>
                <li><code>BOARD</code> replaces the theme’s surface and uses that board’s base color.</li>
                <li><code>BACKGROUND</code> replaces the surface’s base color.</li>
                <li><code>STYLE</code> selects the global pen; object <code>PEN</code> overrides it.</li>
                <li>Object <code>COLOR</code> and <code>FILL</code> override individual ink and fill colors.</li>
              </ol>
              <h3>Theme example</h3>
              <p>
                This keeps Cosmic’s coordinated defaults, swaps in the terrain-map
                surface, and then sets a custom base color and pencil style.
              </p>
              <CodeBlock title="Combine a theme with overrides" code={themeScript} />
              <h3>Themes</h3>
              <p>
                Featured presentation boards: <code>spotlight</code> gives a cinematic warm glow,
                <code> atlas</code> frames content with cartographic contours, and <code>prism</code>
                adds restrained violet and teal light. Use each as <code>THEME name</code> or <code>BOARD name</code>.
              </p>
              <p>
                A theme combines a board, its base and ink colors, and a default pen.
                These previews show each preset as a complete starting style, using
                the same procedural renderer as the studio.
              </p>
              <div className="not-prose grid grid-cols-2 gap-3 sm:grid-cols-3">
                {themeGallery.map(([name, theme]) => (
                  <figure key={name} className="min-w-0">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-black/10">
                      <DocsBoardPreview board={theme.board} color={theme.background} />
                      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8 text-white">
                        <strong className="block text-sm capitalize">{name}</strong>
                        <span className="text-xs capitalize text-white/80">
                          {theme.board} · {theme.pen} pen · ink {theme.ink}
                        </span>
                      </figcaption>
                    </div>
                  </figure>
                ))}
              </div>
            </DocsSection>

            <DocsSection id="objects" title="Objects, text, and math">
              <h3>Object types and common properties</h3>
              <p>
                Use <code>CREATE id AS TYPE</code> and close it with{" "}
                <code>END</code>. Types are <code>TEXT</code>,{" "}
                <code>CIRCLE</code>, <code>RECTANGLE</code>, <code>LINE</code>,
                <code>ICON</code>, and <code>IMAGE</code>.
              </p>
              <ul className={listCls}>
                <li>
                  Placement and geometry: <code>POSITION x y</code>,{" "}
                  <code>FROM x y</code>, <code>TO x y</code>,{" "}
                  <code>SIZE n</code>, <code>WIDTH n</code>,{" "}
                  <code>HEIGHT n</code>, <code>RADIUS n</code>.
                </li>
                <li>
                  Appearance: <code>COLOR #hex</code>, <code>FILL #hex</code>,{" "}
                  <code>STROKE n</code>, <code>OPACITY 0..1</code>,{" "}
                  <code>PEN style</code>.
                </li>
                <li>
                  Text: <code>TEXT "..."</code>, <code>LABEL "..."</code>,{" "}
                  <code>MAXWIDTH n</code>, <code>ALIGN left|center|right</code>,{" "}
                  <code>LINEHEIGHT n</code>, <code>FIT WIDTH n HEIGHT n</code>.{" "}
                  Add a smooth text plate with <code>BACKGROUND #hex</code>,{" "}
                  <code>PADDING n</code>, <code>CORNERS n</code>, and{" "}
                  <code>BOXOPACITY 0..1</code>; math can use Unicode or inline{" "}
                  <code>$...$</code> notation such as <code>$E = mc^2$</code>,{" "}
                  <code>$\frac&#123;a&#125;&#123;b&#125;$</code>, or{" "}
                  <code>$\alpha + \beta$</code>.
                </li>
                <li>
                  Text anchors:{" "}
                  <code>
                    ANCHOR
                    center|left|right|top|bottom|topleft|topright|bottomleft|bottomright
                  </code>
                  .
                </li>
                <li>
                  Relative placement: <code>BELOW id GAP n</code>,{" "}
                  <code>ABOVE</code>, <code>LEFTOF</code>, <code>RIGHTOF</code>,{" "}
                  <code>ALIGNX id</code>, <code>ALIGNY id</code>, or{" "}
                  <code>CENTERON id</code>. Place referenced objects first.
                </li>
                <li>
                  Reveal: <code>DRAW duration</code>.{" "}
                  <code>REVEAL easeOut|linear|natural</code> controls the
                  reveal; default is easeOut. Text wipes in softly from left to
                  right; hand-drawn ink tapers at both ends.
                </li>
              </ul>
              <h3>Text plates and math</h3>
              <p>
                A text plate draws a rounded, translucent background behind the
                text, so labels stay legible over busy diagrams. Set{" "}
                <code>BACKGROUND</code> to enable it; padding, corner radius,
                and opacity default to 12, 12, and 0.92. The plate is included
                in measured bounds and can cover an intentional arrow or shape
                overlap.
              </p>
              <p>
                Use literal Unicode math symbols or inline <code>$...$</code>
                notation. Common Greek letters, operators, relations, sets,
                fractions, roots, and simple superscripts/subscripts are
                rendered with math-font fallbacks. This is inline math, not a
                full LaTeX layout engine.
              </p>
              <CodeBlock
                title="Legible label and equation"
                code={[
                  'SCENE 1 "Math on the board"',
                  "  CREATE formula AS TEXT",
                  '    TEXT "Gravitational force: $F = G \\frac{m_1m_2}{r^2}$; $\\alpha + \\beta \\leq \\gamma$"',
                  "    POSITION 960 540",
                  "    SIZE 42",
                  "    COLOR #FFFFFF",
                  "    BACKGROUND #243A58",
                  "    PADDING 18",
                  "    CORNERS 20",
                  "    BOXOPACITY 0.94",
                  "    MAXWIDTH 1200",
                  "    DRAW 0.8s",
                  "  END",
                  "END SCENE",
                ].join("\n")}
              />
              <CodeBlock
                title="Shapes, text, and arrows"
                code={drawingScript}
              />
            </DocsSection>

            <DocsSection id="drawing-layout" title="Drawing and layout">
              <p>
                Use <code>ARROW fromId -&gt; toId</code> to attach a connector
                to two created objects. Choose <code>ROUTE straight</code>,{" "}
                <code>ROUTE elbow</code>, or <code>ROUTE curve</code>. Set{" "}
                <code>LINESTYLE solid|dashed|dotted</code>,{" "}
                <code>HEAD none|end|both</code>, <code>STROKE</code>,{" "}
                <code>VIA x1 y1 x2 y2 ...</code>, <code>COLOR</code>,{" "}
                <code>LABEL</code>, and <code>DRAW</code> on following lines.
                Dashed lines work well for remote, optional, or return flows;
                use waypoints to route connectors around crowded parts of a
                diagram.
              </p>
              <CodeBlock title="Styled diagram connectors" code={connectorScript} />
              <p>
                Raw <code>INK</code> is a freehand path with at least two
                coordinate pairs. <code>INK ARROW</code> draws between
                coordinates; <code>INK UNDERLINE id</code> and{" "}
                <code>INK CIRCLE id</code> mark an existing object.
              </p>
              <CodeBlock title="Freehand ink" code={inkScript} />
              <p>
                <code>
                  STACK id DIRECTION vertical|horizontal GAP n [AT x y]
                </code>{" "}
                and <code>GRID [id] COLUMNS n GAP n [AT x y]</code> arrange
                measurable child shapes. Both are blocks closed by{" "}
                <code>END</code>.
              </p>
              <p>
                Put <code>DIRECTION</code>, <code>COLUMNS</code>,{" "}
                <code>GAP</code>, and <code>AT</code> on the layout header or
                on separate lines directly below it. Stack related cards in a
                lane, use a grid for repeated items, and connect the finished
                layout afterward so connectors animate clearly over it.
              </p>
              <CodeBlock title="Stack and grid" code={layoutScript} />
            </DocsSection>

            <DocsSection id="images" title="Images">
              <p>
                Use a publicly accessible HTTPS URL. Images preload for preview
                and export, and the source must allow cross-origin embedding.
                Failed URLs show a placeholder and diagnostic. Images support
                timeline reveals, camera movement, enter, exit, animate,
                duplicate, and delete.
              </p>
              <CodeBlock
                title="Rounded image with a border"
                code={[
                  'SCENE 1 "Image"',
                  "  CREATE logo AS IMAGE",
                  '    URL "https://example.com/logo.png"',
                  "    POSITION 960 540",
                  "    WIDTH 400",
                  "    HEIGHT 300",
                  "    CORNERS 32",
                  "    FIT cover",
                  "    BORDER #FFFFFF",
                  "    OPACITY 1",
                  "    SHADOW",
                  "    DRAW 0.8s",
                  "  END",
                  "END SCENE",
                ].join("\n")}
              />
              <ul className={listCls}>
                <li>
                  FIT cover crops to fill; FIT contain letterboxes inside the
                  frame.
                </li>
                <li>
                  Use CORNERS n for rounded corners or MASK circle for a
                  circular crop. BORDER #hex and optional SHADOW add a frame
                  and depth.
                </li>
                <li>
                  Missing, non-HTTPS, blocked, or failed URLs produce{" "}
                  <code>E_IMAGE_LOAD</code> and a placeholder. For blocked
                  hosts, Strokeline shows “This site blocks embedding. Try
                  another URL.”
                </li>
              </ul>
            </DocsSection>

            <DocsSection id="tables" title="Comparison tables">
              <p>
                Use <code>TABLE id</code> for comparisons. COLUMNS sets the
                header; each ROW must provide one value for every column. Keep
                tables to four columns and five rows or fewer for comfortable
                reading. Text stays at least 28px and fits inside the safe area.
              </p>
              <p>
                Optional properties are <code>POSITION</code>, <code>SIZE</code>,{" "}
                <code>COLOR</code>, <code>FILL</code>, <code>HEADERCOLOR</code>,{" "}
                <code>ALIGN left|center|right</code>, <code>STROKE</code>,{" "}
                <code>PEN</code>, <code>OPACITY</code>, <code>DRAW</code>, and{" "}
                <code>REVEAL</code>.
              </p>
              <CodeBlock
                title="Animated plan comparison"
                code={[
                  'SCENE 1 "Compare plans"',
                  "  TABLE plans",
                  "    POSITION 960 540",
                  "    SIZE 1200 400",
                  '    COLUMNS "Plan" "Price" "Export"',
                  '    ROW "Free" "0" "GIF"',
                  '    ROW "Pro" "12" "MP4"',
                  '    ROW "Team" "30" "MP4 + WebM"',
                  "    HEADERCOLOR #2E86AB",
                  "    HIGHLIGHT ROW 2",
                  "    DRAW 1.5s",
                  "  END",
                  "  ANIMATE plans HIGHLIGHT COLUMN 3 DURATION 1s",
                  "END SCENE",
                ].join("\n")}
              />
              <p>
                HIGHLIGHT ROW n selects a body row; COLUMN n includes its
                header; CELL r c selects a body cell. Animate the same targets
                with <code>ANIMATE id HIGHLIGHT ROW|COLUMN|CELL ...</code>.
                The header and rows reveal in order. Tables support camera,
                enter/exit, move, duplicate, and delete operations.
              </p>
            </DocsSection>

            <DocsSection id="reusable-data" title="Macros, icons, and charts">
              <h3>Reusable macros</h3>
              <p>
                Define a macro before using it. Parameters are names listed
                after <code>PARAMS</code>; substitute them in the body and pass
                values with <code>WITH</code>.{" "}
                <code>USE name AS id AT x y</code> expands its parts with
                prefixed IDs. Animate the instance ID to move the complete
                group.
              </p>
              <CodeBlock title="A parameterized macro" code={macroScript} />
              <p>
                Built-ins: <code>stick(MOOD)</code>, <code>speech(TEXT)</code>,{" "}
                <code>thought(TEXT)</code>, <code>sticky(TEXT)</code>,{" "}
                <code>badge(TEXT)</code>, <code>tick</code>,{" "}
                <code>checklist(TEXT)</code>, <code>brackets</code>,{" "}
                <code>callout(TEXT)</code>, <code>curvedarrow</code>,{" "}
                <code>timeline</code>, and <code>progress(VALUE)</code>.
              </p>
              <h3>Icons</h3>
              <p>
                Create <code>ICON</code> and set <code>NAME icon-name</code> (or{" "}
                <code>ICON icon-name</code>). All icons included in the installed
                Lucide package are supported; search them in editor autocomplete
                or the Insert object menu.
              </p>
              <p>
                Use the lowercase names shown in search, for example{" "}
                <code>brain</code> or <code>arrow-up-right</code>. Run
                normalizes capitalization when the name matches an installed
                icon exactly; misspellings still need correction.
              </p>
              <CodeBlock title="Lucide icon" code={iconScript} />
              <h3>Charts</h3>
              <p>
                <code>BARCHART</code>, <code>LINECHART</code>, and{" "}
                <code>PIECHART</code> take an ID, optional <code>POSITION</code>{" "}
                and <code>SIZE</code>, then one or more{" "}
                <code>DATA "label" number</code> rows. Close each chart with{" "}
                <code>END</code>. Axes and build animation are generated from
                the data.
              </p>
              <CodeBlock title="Bar chart" code={chartScript} />
            </DocsSection>

            <DocsSection id="motion" title="Timing and motion">
              <p>
                Statements run in order; durations use units such as{" "}
                <code>0.8s</code> or <code>400ms</code>.{" "}
                <code>WAIT duration</code> pauses the scene.{" "}
                <code>PARALLEL</code> runs children together;{" "}
                <code>STAGGER 0.15s</code> offsets each child.{" "}
                <code>GROUP</code> organizes statements without changing their
                timing. Close either block with <code>END</code>.
              </p>
              <CodeBlock title="Motion and camera" code={animationScript} />
              <h3>Animation and effects</h3>
              <ul className={listCls}>
                <li>
                  <code>ANIMATE id MOVE TO x y</code>, <code>SCALE TO n</code>,{" "}
                  <code>ROTATE TO degrees</code>, <code>FADE</code>,{" "}
                  <code>HIGHLIGHT</code>; add <code>DURATION</code> and{" "}
                  <code>EASE</code>.
                </li>
                <li>
                  <code>ENTER id effect</code>: pop, slide-left/right/up/down,
                  fade, write, drop, or zoom.
                </li>
                <li>
                  <code>EXIT id effect</code>: fade, shrink,
                  slide-left/right/up/down, or erase.
                </li>
                <li>
                  <code>LOOP id float|pulse|wobble|breathe|blink</code>{" "}
                  optionally takes <code>AMPLITUDE n PERIOD 2s</code>.
                </li>
                <li>
                  <code>ANIMATE id HIGHLIGHT ROW n</code>,{" "}
                  <code>COLUMN n</code>, or <code>CELL r c</code> animates a
                  table target; other <code>HIGHLIGHT</code> animations mark an
                  object.
                </li>
                <li>
                  Eases: linear, easeIn, easeOut, easeInOut, bounce,
                  easeOutBack, easeOutElastic, easeInOutCubic, spring, natural.
                  Reveal eases are only easeOut, linear, and natural.
                </li>
              </ul>
              <h3>Camera and scene changes</h3>
              <p>
                Camera statements take property lines and do not use{" "}
                <code>END</code>: <code>CAMERA ZOOM</code> with{" "}
                <code>TARGET id</code>/<code>SCALE n</code>;{" "}
                <code>CAMERA PAN</code> with <code>TO x y</code>;{" "}
                <code>CAMERA FOLLOW id</code>; <code>CAMERA DRIFT</code>,{" "}
                <code>CAMERA SHAKE</code>, or <code>CAMERA RESET</code>. Add
                property lines such as <code>DURATION</code>, <code>EASE</code>,
                or <code>SCALE</code> where applicable. Reset the camera before
                the scene ends.
              </p>
              <p>
                At the end of a scene, optionally write{" "}
                <code>TRANSITION fade|wipe|slide|erase|none DURATION 0.6s</code>{" "}
                and then <code>GAP DURATION 0.5s</code>, directly before{" "}
                <code>END SCENE</code>. Erase is a sweeping wipe. Play All uses
                these settings unless overridden in the player.
              </p>
              <CodeBlock
                title="Camera, effects, and transition"
                code={cameraScript}
              />
            </DocsSection>

            <DocsSection id="narration" title="Subtitles and voice">
              <p>
                <code>SAY</code> adds a caption/narration cue at the current
                timeline position without advancing it. It is valid only inside
                a scene, may be placed inside <code>PARALLEL</code>, and ends
                with the scene. Keep cues sequential; playback can schedule them
                so narration finishes before the next cue.
              </p>
              <CodeBlock title="Narration cue" code={sayScript} />
              <p>
                Optional fields are <code>DURATION</code>, <code>WHO</code>,{" "}
                <code>TONE</code> (explain, hook, warning, punchline, recap),{" "}
                <code>LANG</code>, and <code>DETAIL</code>. Mark one to three
                emphasis words with <code>*stars*</code>. Keep each cue short,
                spoken, and distinct from on-screen labels.
              </p>
              <p>
                There is no hard character limit for <code>SAY</code>.{" "}
                <code>W_SAY_FAST</code> warns above 20 characters per second;
                playback schedules cues in order and gives each at least 1.8
                seconds or about 15 characters per second, whichever is longer.
                Overlaps and close repetition of visible text are also warned.
              </p>
              <p>
                <code>SUBTITLES on|off</code> sets the initial caption state;
                missing means off. Use
                the CC control or <kbd>K</kbd> to toggle captions; the choice is
                saved in this browser and overrides the script default. Captions stay in a screen-space layer
                when the camera moves. SAY lines remain in the script when
                captions are off.
              </p>
              <p>
                Optional read-along smoothly tints the already-read caption
                text as narration progresses, rather than switching color a
                word at a time. Captions use balanced wrapping, remain fixed
                while the camera moves, and preserve Arabic text with RTL
                shaping. <code>DETAIL</code> is kept with the cue; the current
                player displays and reads <code>SAY</code>.
              </p>
              <p>
                The reader uses the local Kokoro voice model. First setup
                downloads about 92 MB and shows progress; the model and
                generated clips are cached in this browser. Choose a voice and
                adjust volume from 0 to 150% in Voice settings; those choices
                are saved for this browser. Kokoro does not speak Arabic, but
                Arabic SAY text remains available for captions and subtitle
                exports. SRT and VTT exports use the scheduled SAY cues.
              </p>
            </DocsSection>

            <DocsSection id="play-export" title="Play and export">
              <ul className={listCls}>
                <li>
                  <strong>Play All</strong> is the default and plays every
                  scene. Scene mode previews only the selected scene. Use
                  play/pause, replay, next scene, or scrub the timeline.
                </li>
                <li>
                  <strong>Scene markers</strong> divide the full timeline by
                  scene. The scene strip adapts to narrow screens.
                </li>
                <li>
                  <strong>Playback options</strong> control the gap between
                  scenes and whether to use each scene’s transition or override
                  it.
                </li>
                <li>
                  <strong>Save / load:</strong> download a <code>.wbs</code>{" "}
                  script or open one from your device.
                </li>
                <li>
                  <strong>Video:</strong> export MP4 when the browser supports
                  it. Narrated video exports as WebM with audio.
                </li>
                <li>
                  <strong>Other formats:</strong> export GIF, a PNG frame, or
                  subtitles in SRT and VTT.
                </li>
                <li>
                  <strong>Resolution and frame rate:</strong> choose 720p or
                  1080p and 30 or 60 fps in the export controls.
                </li>
              </ul>
              <p>
                The studio’s <strong>Copy AI Prompt</strong> button copies the
                current AI authoring guide for use with your preferred
                assistant. Preview resolution follows the display pixel ratio,
                capped at 2, with an offscreen cache for procedural rendering.
              </p>
            </DocsSection>

            <DocsSection id="diagnostics" title="Fix common errors">
              <CardGrid>
                <InfoCard title="Expected END SCENE">
                  Close every <code>CREATE</code>, <code>INK</code>, and{" "}
                  <code>PARALLEL</code> block before closing the scene.
                </InfoCard>
                <InfoCard title="Unknown reference">
                  Check spelling and create the object earlier in the same scene
                  before using it in an arrow or animation.
                </InfoCard>
                <InfoCard title="Bad duration">
                  Include a unit, for example <code>DRAW 0.8s</code> or{" "}
                  <code>WAIT 2s</code>.
                </InfoCard>
                <InfoCard title="Text outside safe area">
                  Keep the full text box inside the canvas margins, not just the
                  position point. Use <code>MAXWIDTH</code> for long text.
                </InfoCard>
              </CardGrid>
              <p>
                Fix the first red error, then run again; later parser errors can
                be follow-on errors. Warnings do not block playback, but fixing
                them improves readability.
              </p>
              <h3>Warnings and what they mean</h3>
              <ul className={listCls}>
                <li>
                  <code>W_TEXT_OFF_SAFE</code>, <code>W_TEXT_TOO_SMALL</code>,{" "}
                  <code>W_LONG_TEXT</code>: text bounds should stay in
                  x=120..1800 and y=100..980; below 28px is warned and below
                  18px is an error; over 60 characters needs{" "}
                  <code>MAXWIDTH</code>.
                </li>
                <li>
                  <code>W_TEXT_OVERLAP</code>, <code>W_TEXT_ON_SHAPE</code>,{" "}
                  <code>W_TOO_CROWDED</code>: separate simultaneous labels (over
                  8% overlap is warned and both IDs are listed), avoid obscuring
                  text with shapes, and keep visible text to 12 objects or
                  fewer.
                </li>
                <li>
                  <code>W_LOW_CONTRAST</code>: keep text/background contrast at
                  WCAG 4.5:1 or higher.
                </li>
                <li>
                  <code>W_ARROW_CROSSES_TEXT</code>: reroute the connector
                  around labels.
                </li>
                <li>
                  <code>W_SAY_FAST</code>, <code>W_SAY_OVERLAP</code>,{" "}
                  <code>W_SAY_ECHO</code>: above 20 characters/second is fast;
                  avoid overlapping cues and repeating more than 70% of visible
                  text.
                </li>
                <li>
                  <code>W_SCENE_LENGTH</code>, <code>W_DEAD_AIR</code>,{" "}
                  <code>W_CAMERA_NOT_RESET</code>: scenes over 60 seconds (or
                  over 20 seconds without motion), unchanged periods over 4
                  seconds, and unreset camera moves are flagged.
                </li>
              </ul>
              <p>
                Text safety is measured from its rendered bounds (safe region
                x=120..1800, y=100..980). Diagnostics show a fix suggestion;
                click one to jump to its source line, or use Copy all to share
                errors and warnings. Warnings never block Run.
              </p>
            </DocsSection>

            {page !== "overview" && (
              <nav aria-label="Guide navigation" className="flex items-stretch justify-between gap-3 border-t pt-6">
                {previousPage && previousPage.slug !== "overview" ? (
                  <Link to={`/docs/${previousPage.slug}`} className="rounded-lg border px-4 py-3 text-sm no-underline hover:bg-muted/50">
                    <span className="block text-xs text-muted-foreground">Previous</span>
                    <span className="font-medium text-foreground">← {previousPage.label}</span>
                  </Link>
                ) : <span />}
                {nextPage ? (
                  <Link to={`/docs/${nextPage.slug}`} className="ml-auto rounded-lg border px-4 py-3 text-right text-sm no-underline hover:bg-muted/50">
                    <span className="block text-xs text-muted-foreground">Next</span>
                    <span className="font-medium text-foreground">{nextPage.label} →</span>
                  </Link>
                ) : <Link to="/docs" className="ml-auto rounded-lg border px-4 py-3 text-right text-sm no-underline hover:bg-muted/50"><span className="block text-xs text-muted-foreground">Back to</span><span className="font-medium text-foreground">Overview →</span></Link>}
              </nav>
            )}

            <div className="flex flex-col items-start justify-between gap-4 rounded-lg border bg-card p-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-lg font-semibold">Ready to draw?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste a script into the studio and press Run.
                </p>
              </div>
              <Button asChild>
                <Link to="/workspace">Open the studio</Link>
              </Button>
            </div>
          </article>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© 2026 Strokeline</span>
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
        </div>
      </footer>
    </div>
  )
}
