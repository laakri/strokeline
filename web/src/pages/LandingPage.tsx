import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  AudioLines,
  Clapperboard,
  Download,
  Layers3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react"

import { Button } from "@/ui/button"
import { PublicHeader } from "@/ui/layout/PublicHeader.tsx"

const script = [
  "VERSION 1.0",
  "CANVAS 1920 1080",
  'SCENE 1 "Docker image flow"',
  "  CREATE client AS FRAME",
  "  CREATE daemon AS IMAGE",
  '    URL "/brand-icons/docker.svg"',
  "  CREATE registry AS FRAME",
  "  ARROW client -> daemon",
  "  ARROW daemon -> registry",
  "  ARROW registry -> daemon",
  '  NARRATE "Commands reach the daemon."',
  "END SCENE",
]

const features = [
  {
    icon: Clapperboard,
    title: "A canvas that tells a story",
    text: "Shapes, icons, diagrams and charts, all with a hand-drawn finish.",
    tag: "Draw",
  },
  {
    icon: AudioLines,
    title: "Narration in rhythm",
    text: "Voice-over and reveals sit on one editable timeline.",
    tag: "Narrate",
  },
  {
    icon: Layers3,
    title: "Every scene, in sync",
    text: "Refine timing, transitions and camera moves without losing the flow.",
    tag: "Time",
  },
  {
    icon: Download,
    title: "Ready to share",
    text: "Export the finished animation as video, GIF or captions.",
    tag: "Export",
  },
]

const steps = [
  {
    title: "Write the script",
    text: "Place text, shapes, icons and charts with plain-text commands.",
  },
  {
    title: "Set the timing",
    text: "Draw, move, narrate and transition on a single timeline.",
  },
  {
    title: "Export",
    text: "Preview each scene, then export video, GIF or captions.",
  },
]

const INK = "#1f2a44"
const BLUE = "#2f6fed"
const AMBER = "#d98b0b"
const GREEN = "#1e9e6a"

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Stroke-draw: pathLength=1 lets any shape "write itself" in. */
const draw = (on: boolean) => ({
  strokeDasharray: 1,
  strokeDashoffset: on ? 0 : 1,
})
const drawCls =
  "transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
const fadeCls = "transition-opacity duration-500 motion-reduce:transition-none"

function Code({ line }: { line: string }) {
  const m = line.match(/^(\s*)(\w+)(.*)$/)
  if (!m) return <>{line}</>
  return (
    <>
      <span className="whitespace-pre">{m[1]}</span>
      <span className="font-semibold text-primary">{m[2]}</span>
      {m[3].split(/("[^"]*")/).map((part, i) =>
        part.startsWith('"') ? (
          <span key={i} className="text-amber-600 dark:text-amber-400">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function Canvas({ step, total }: { step: number; total: number }) {
  const done = step >= total
  const flow = done && !reducedMotion()
  const font = '"Caveat", "Segoe Print", "Bradley Hand", cursive'

  return (
    <svg
      viewBox="0 0 640 400"
      role="img"
      aria-label="Animated Docker diagram: a client sends commands to the Docker daemon, which pulls images from a registry"
      className="aspect-[8/5] w-full"
    >
      <defs>
        <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".035"
            numOctaves="2"
            seed="4"
          />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
        <marker
          id="hd-blue"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0 0 8 4 0 8Z" fill={BLUE} />
        </marker>
        <marker
          id="hd-amber"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0 0 8 4 0 8Z" fill={AMBER} />
        </marker>
      </defs>

      <g
        filter="url(#rough)"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* client */}
        <rect
          x="20"
          y="40"
          width="170"
          height="320"
          rx="14"
          pathLength={1}
          stroke={INK}
          style={draw(step >= 4)}
          className={drawCls}
        />
        {[80, 150, 220].map((y, i) => (
          <rect
            key={y}
            x="36"
            y={y}
            width="138"
            height="52"
            rx="10"
            pathLength={1}
            stroke="#6b7a99"
            strokeWidth="1.8"
            style={{
              ...draw(step >= 4),
              transitionDelay: `${(i + 1) * 120}ms`,
            }}
            className={drawCls}
          />
        ))}
        {/* daemon */}
        <rect
          x="240"
          y="40"
          width="160"
          height="320"
          rx="14"
          pathLength={1}
          stroke={INK}
          style={draw(step >= 5)}
          className={drawCls}
        />
        {[205, 275].map((y, i) => (
          <rect
            key={y}
            x="262"
            y={y}
            width="116"
            height="52"
            rx="10"
            pathLength={1}
            stroke={BLUE}
            strokeWidth="1.8"
            style={{ ...draw(step >= 6), transitionDelay: `${i * 150}ms` }}
            className={drawCls}
          />
        ))}
        {/* registry */}
        <rect
          x="450"
          y="40"
          width="170"
          height="320"
          rx="14"
          pathLength={1}
          stroke={INK}
          style={draw(step >= 7)}
          className={drawCls}
        />
        {[80, 150, 220].map((y, i) => (
          <rect
            key={y}
            x="466"
            y={y}
            width="138"
            height="52"
            rx="10"
            pathLength={1}
            stroke="#6b7a99"
            strokeWidth="1.8"
            style={{
              ...draw(step >= 7),
              transitionDelay: `${(i + 1) * 120}ms`,
            }}
            className={drawCls}
          />
        ))}
        {/* arrows */}
        <path
          id="a1"
          d="M190 106H240"
          pathLength={1}
          stroke={BLUE}
          strokeWidth="3"
          markerEnd={step >= 8 ? "url(#hd-blue)" : undefined}
          style={draw(step >= 8)}
          className={drawCls}
        />
        <path
          id="a2"
          d="M400 176H450"
          pathLength={1}
          stroke={AMBER}
          strokeWidth="3"
          markerEnd={step >= 9 ? "url(#hd-amber)" : undefined}
          style={draw(step >= 9)}
          className={drawCls}
        />
        <path
          id="a3"
          d="M450 246H400"
          pathLength={1}
          stroke={AMBER}
          strokeWidth="3"
          markerEnd={step >= 10 ? "url(#hd-amber)" : undefined}
          style={draw(step >= 10)}
          className={drawCls}
        />
      </g>

      {/* labels */}
      <g fontFamily={font} fill={INK} fontSize="21" textAnchor="middle">
        <g className={fadeCls} style={{ opacity: step >= 4 ? 1 : 0 }}>
          <text x="105" y="30" fontSize="24" fontWeight="700">
            Client
          </text>
          {["docker run", "docker build", "docker pull"].map((t, i) => (
            <text key={t} x="105" y={112 + i * 70}>
              {t}
            </text>
          ))}
        </g>
        <g className={fadeCls} style={{ opacity: step >= 5 ? 1 : 0 }}>
          <text x="320" y="30" fontSize="24" fontWeight="700">
            Docker host
          </text>
          <text x="320" y="152">
            Docker daemon
          </text>
        </g>
        <g className={fadeCls} style={{ opacity: step >= 6 ? 1 : 0 }}>
          <text x="330" y="238">
            web_01
          </text>
          <text x="330" y="308">
            cache_01
          </text>
          <circle cx="366" cy="231" r="4" fill={GREEN} />
          <circle cx="368" cy="301" r="4" fill={GREEN} />
        </g>
        <g className={fadeCls} style={{ opacity: step >= 7 ? 1 : 0 }}>
          <text x="535" y="30" fontSize="24" fontWeight="700">
            Registry
          </text>
          {["nginx", "ubuntu", "postgres"].map((t, i) => (
            <text key={t} x="545" y={112 + i * 70}>
              {t}
            </text>
          ))}
        </g>
        <g
          className={fadeCls}
          style={{ opacity: step >= 9 ? 1 : 0 }}
          fill={AMBER}
          fontSize="17"
        >
          <text x="425" y="166">
            pull
          </text>
          <text x="425" y="272" style={{ opacity: step >= 10 ? 1 : 0 }}>
            image
          </text>
        </g>
      </g>

      {/* brand icons */}
      <image
        href="/brand-icons/docker.svg"
        x="290"
        y="66"
        width="60"
        height="50"
        preserveAspectRatio="xMidYMid meet"
        className={fadeCls}
        style={{ opacity: step >= 6 ? 1 : 0 }}
      />
      <g className={fadeCls} style={{ opacity: step >= 7 ? 1 : 0 }}>
        <image
          href="/brand-icons/nginx.svg"
          x="480"
          y="92"
          width="28"
          height="28"
        />
        <image
          href="/brand-icons/ubuntu.svg"
          x="480"
          y="162"
          width="28"
          height="28"
        />
        <image
          href="/brand-icons/postgresql.svg"
          x="480"
          y="232"
          width="28"
          height="28"
        />
      </g>

      {/* traveling packets once the scene is complete */}
      {flow && (
        <g>
          <circle r="5" fill={BLUE}>
            <animateMotion
              dur="1.6s"
              repeatCount="indefinite"
              path="M190 106H240"
            />
          </circle>
          <circle r="5" fill={AMBER}>
            <animateMotion
              dur="1.6s"
              begin=".5s"
              repeatCount="indefinite"
              path="M400 176H450"
            />
          </circle>
          <circle r="5" fill={AMBER}>
            <animateMotion
              dur="1.6s"
              begin=".9s"
              repeatCount="indefinite"
              path="M450 246H400"
            />
          </circle>
        </g>
      )}
    </svg>
  )
}

function LiveDemo() {
  const total = script.length
  const [step, setStep] = useState(() => (reducedMotion() ? total : 0))
  const [playing, setPlaying] = useState(() => !reducedMotion())
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!playing) return undefined
    if (step >= total) {
      setPlaying(false)
      return undefined
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : 600)
    return () => clearTimeout(t)
  }, [playing, step, total])

  // keep the active line in view inside the script panel only (never scroll the page)
  useEffect(() => {
    const list = listRef.current
    const el = list?.children[Math.max(step - 1, 0)] as HTMLElement | undefined
    if (list && el)
      list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2)
  }, [step])

  const toggle = () => {
    if (step >= total) {
      setStep(0)
      setPlaying(true)
    } else setPlaying((p) => !p)
  }

  const done = step >= total
  const Icon = done ? RotateCcw : playing ? Pause : Play

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-2xl shadow-foreground/10">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* script */}
        <div className="flex min-h-0 flex-col border-b bg-muted/40 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground sm:text-sm">
              docker-architecture.wbs
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.min(step, total)}/{total} lines
            </span>
          </div>
          <ol
            ref={listRef}
            className="relative max-h-52 flex-1 overflow-y-auto py-2 font-mono text-[13px] leading-7 sm:max-h-64 lg:max-h-none lg:min-h-[360px]"
          >
            {script.map((line, i) => (
              <li
                key={i}
                className={`flex gap-3 border-l-2 px-3 transition-colors duration-300 sm:px-4 ${
                  step === i + 1
                    ? "border-primary bg-primary/10"
                    : "border-transparent"
                } ${step > i ? "opacity-100" : "opacity-25"}`}
              >
                <span className="w-5 shrink-0 text-right text-muted-foreground/60 select-none">
                  {i + 1}
                </span>
                <code className="min-w-0 break-words whitespace-pre-wrap">
                  <Code line={line} />
                </code>
              </li>
            ))}
          </ol>
        </div>

        {/* canvas */}
        <div className="flex flex-col">
          <div
            className="flex-1 p-3 sm:p-6"
            style={{
              backgroundColor: "#fbfaf6",
              backgroundImage: "radial-gradient(#d9dde5 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <Canvas step={step} total={total} />
            <p
              className={`mx-auto mt-2 max-w-md text-center text-sm text-slate-600 transition-opacity duration-500 ${
                step >= 11 ? "opacity-100" : "opacity-0"
              }`}
              aria-live="polite"
            >
              Commands reach the daemon. It pulls images from the registry and
              starts containers from them.
            </p>
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="flex items-center gap-3 border-t bg-background px-3 py-3 sm:gap-4 sm:px-5">
        <Button
          size="icon"
          variant="outline"
          className="size-9 shrink-0 rounded-full"
          onClick={toggle}
          aria-label={done ? "Replay" : playing ? "Pause" : "Play"}
        >
          <Icon className="size-4" />
        </Button>
        <input
          type="range"
          min={0}
          max={total}
          value={step}
          onChange={(e) => {
            setPlaying(false)
            setStep(Number(e.target.value))
          }}
          aria-label="Scrub the timeline"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[var(--primary)]"
        />
        <span className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {(step * 0.6).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}

export function LandingPage() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("landing-mode")
    return () => document.documentElement.classList.remove("landing-mode")
  }, [])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader activePage="home" />

      <main className="overflow-x-clip">
        {/* hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 [mask-image:linear-gradient(to_bottom,black,transparent_75%)] opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(var(--border) 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
            <div className="landing-enter grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-14">
              <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.035em] text-balance">
                Type a script.
                <br />
                Press play on your idea.
              </h1>
              <div className="max-w-md">
                <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                  Turn plain-text scripts into hand-drawn animated explainers,
                  with drawing, narration and export in one workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="h-10 px-4">
                    <Link
                      to="/workspace"
                      className="inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      Open the studio <ArrowRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-10 px-4"
                  >
                    <Link
                      to="/docs"
                      className="inline-flex items-center whitespace-nowrap"
                    >
                      Read the docs
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-10 sm:mt-14">
              <LiveDemo />
            </div>
          </div>
        </section>

        {/* features */}
        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:sticky lg:top-24 lg:self-start">
              Everything a scene needs, in one script.
            </h2>
            <ul className="divide-y border-y">
              {features.map(({ icon: Icon, title, text, tag }) => (
                <li
                  key={title}
                  className="group grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1 px-1 py-6 transition-colors hover:bg-muted/40 sm:grid-cols-[auto_1fr_auto] sm:px-3"
                >
                  <span className="row-span-2 flex size-10 items-center justify-center rounded-full border bg-background text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:row-span-1">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                      {text}
                    </p>
                  </div>
                  <span className="col-start-2 mt-2 w-fit rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground sm:col-start-3 sm:mt-0">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* steps */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <h2 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
              From first line to finished video
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {steps.map((s, i) => (
                <li
                  key={s.title}
                  className="relative border-t border-dashed border-foreground/30 pt-6"
                >
                  <span className="absolute -top-4 left-0 flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-foreground p-8 text-background sm:flex-row sm:items-center sm:p-12">
            <h2 className="max-w-md text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Start with one scene.
            </h2>
            <Button asChild size="lg" variant="secondary" className="h-10 px-4">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-2 whitespace-nowrap"
              >
                Open the studio <ArrowRight className="size-4 shrink-0" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 Strokeline</span>
          <div className="flex gap-5">
            <Link to="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link to="/workspace" className="hover:text-foreground">
              Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
