import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/ui/button"
import { AccountMenu } from "@/ui/layout/AccountMenu.tsx"
import logo from "@/assets/logo.png"

const script = [
  "CREATE sun AS CIRCLE",
  "CREATE hill AS INK",
  "CREATE stem AS INK",
  "CREATE leaf AS INK",
  'CREATE title AS TEXT "Grow"',
  'SAY "Every big idea starts small."',
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

function Stroke({
  shown,
  delay = 0,
  className,
  children,
}: {
  shown: boolean
  delay?: number
  className: string
  children: React.ReactElement
}) {
  const el = children
  return (
    <el.type
      {...el.props}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={shown ? 0 : 1}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[stroke-dashoffset] duration-700 ease-out ${className}`}
    />
  )
}

function LiveDemo() {
  const total = script.length
  const [step, setStep] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? total
      : 0
  )

  useEffect(() => {
    if (step >= total) return undefined
    const timer = setTimeout(
      () => setStep((s) => s + 1),
      step === 0 ? 600 : 1100
    )
    return () => clearTimeout(timer)
  }, [step, total])

  return (
    <div className="grid overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[2fr_3fr]">
      <div className="border-b bg-muted/50 p-5 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            scene.wbs
          </span>
          <Button size="sm" variant="outline" onClick={() => setStep(0)}>
            Replay
          </Button>
        </div>
        <ol className="mt-4 space-y-1 font-mono text-sm">
          {script.map((line, i) => (
            <li
              key={line}
              className={`rounded-md px-3 py-2 transition-colors duration-300 ${
                step === i + 1
                  ? "bg-primary text-primary-foreground"
                  : step > i + 1
                    ? "text-foreground"
                    : "text-muted-foreground/50"
              }`}
            >
              {line}
            </li>
          ))}
        </ol>
      </div>

      <div className="p-5">
        <svg
          viewBox="0 0 480 270"
          role="img"
          aria-label="A sun, a hill and a sprouting plant drawing themselves"
          className="aspect-video w-full rounded-md border bg-background"
        >
          <Stroke shown={step > 0} className="stroke-primary">
            <circle cx="380" cy="70" r="32" strokeWidth="4" />
          </Stroke>
          <Stroke shown={step > 1} className="stroke-muted-foreground">
            <path d="M0 225 C 120 195, 240 245, 480 205" strokeWidth="4" />
          </Stroke>
          <Stroke shown={step > 2} className="stroke-foreground">
            <path d="M220 222 C 218 190, 224 160, 220 125" strokeWidth="4" />
          </Stroke>
          <Stroke shown={step > 3} className="stroke-foreground">
            <path
              d="M220 140 C 245 105, 285 108, 292 130 C 270 152, 240 152, 220 140"
              strokeWidth="4"
            />
          </Stroke>
          <text
            x="40"
            y="90"
            fontSize="48"
            fontWeight="700"
            className={`fill-foreground transition-opacity duration-500 ${
              step > 4 ? "opacity-100" : "opacity-0"
            }`}
          >
            Grow
          </text>
        </svg>
        <p
          className={`mt-4 text-center text-sm text-muted-foreground transition-opacity duration-500 ${
            step > 5 ? "opacity-100" : "opacity-0"
          }`}
        >
          Every big idea starts small.
        </p>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground no-underline"
        >
          <img src={logo} alt="" className="size-7 object-contain" />
          <span className="text-lg font-semibold">Strokeline</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/docs">Docs</Link>
          </Button>
          <AccountMenu />
          <Button asChild>
            <Link to="/workspace">Open studio</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-12 pb-16 lg:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Write the scene. Watch it draw itself.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Strokeline turns a plain-text script into a hand-drawn video, with
            narration and export built in.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/workspace">Make your first scene</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/docs">Read the docs</Link>
            </Button>
          </div>

          <div className="mt-14">
            <LiveDemo />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title}>
                <h2 className="text-base font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
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
