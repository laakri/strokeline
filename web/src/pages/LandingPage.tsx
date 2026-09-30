import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import rough from "roughjs/bin/rough"
import type { RoughCanvas } from "roughjs/bin/canvas"

import "./landing.css"
import logo from "@/assets/logo.png"
import homepageGif from "@/assets/homepage.gif"

function UnderlineCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return undefined

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let animationFrame = 0
    let kickoffTimer = 0
    let resizeTimer = 0
    let disposed = false
    let started = false

    const tok = (name: string, fallback: string) => {
      const value = getComputedStyle(parent).getPropertyValue(name).trim()
      return value || fallback
    }

    const sizeCanvas = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = rect.width + 8
      const h = 16
      canvas.width = w * dpr
      canvas.height = h * dpr
      return { w, h, dpr }
    }

    const pointsFor = (w: number, h: number): [number, number][] => [
      [2, h * 0.62],
      [w * 0.16, h * 0.14],
      [w * 0.44, h * 0.16],
      [w * 0.72, h * 0.86],
      [w - 2, h * 0.12],
    ]

    const renderTo = (
      target: HTMLCanvasElement,
      w: number,
      h: number,
      dpr: number
    ) => {
      const ctx = target.getContext("2d")
      if (!ctx) return
      ctx.save()
      ctx.scale(dpr, dpr)
      const rc: RoughCanvas = rough.canvas(target, { options: { seed: 11 } })
      rc.curve(pointsFor(w, h), {
        stroke: tok("--yellow", "#FFD966"),
        strokeWidth: 6.5,
        roughness: 1.9,
        bowing: 1.2,
      })
      ctx.restore()
    }

    const drawAnimated = () => {
      const dims = sizeCanvas()
      if (reduceMotion) {
        renderTo(canvas, dims.w, dims.h, dims.dpr)
        return
      }

      const buffer = document.createElement("canvas")
      buffer.width = canvas.width
      buffer.height = canvas.height
      renderTo(buffer, dims.w, dims.h, dims.dpr)

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const start = performance.now()
      const duration = 900
      const ease = (t: number) => 1 - Math.pow(1 - t, 3)

      const frame = (ts: number) => {
        if (disposed) return
        const t = Math.min(1, (ts - start) / duration)
        const revealW = ease(t) * dims.w * dims.dpr
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, revealW, canvas.height)
        ctx.clip()
        ctx.drawImage(buffer, 0, 0)
        ctx.restore()
        if (t < 1) animationFrame = requestAnimationFrame(frame)
      }
      animationFrame = requestAnimationFrame(frame)
    }

    const start = () => {
      if (started || disposed) return
      started = true
      drawAnimated()
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start)
    } else {
      start()
    }
    kickoffTimer = window.setTimeout(() => {
      if (!started) start()
    }, 400)

    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        if (disposed) return
        const dims = sizeCanvas()
        renderTo(canvas, dims.w, dims.h, dims.dpr)
      }, 150)
    }
    window.addEventListener("resize", onResize)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(kickoffTimer)
      window.clearTimeout(resizeTimer)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

const DEMO_CSS = `
.landing .demo {
  display: block;
  width: 100%;
  max-width: 500px;
  max-height: 495px;
  aspect-ratio: 16 / 9;
  margin: 40px auto 56px;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #0a0a0a;
}
.landing .demo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
@media (max-width: 720px) {
  .landing .demo {
    max-height: 260px;
    margin: 32px auto 40px;
    border-radius: 10px;
  }
}
`

export function LandingPage() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add("landing-mode")
    return () => {
      document.documentElement.classList.remove("landing-mode")
    }
  }, [])

  return (
    <div className="landing">
      <header>
        <Link to="/" className="logo">
          <img src={logo} alt="Strokeline Logo" />
          Strokeline
        </Link>
      </header>

      <main>
        <div className="wrap hero">
          <span className="eyebrow">it actually draws it</span>
          <h1>
            A script that draws
            <br />
            <span className="ink-underline">
              itself
              <UnderlineCanvas />
            </span>
            .
          </h1>
          <p className="lede">
            Write plain text. Watch it render as a hand-drawn explanation,
            stroke by stroke.
          </p>
          <Link to="/workspace" className="btn">
            Get started
          </Link>

          {/* Homepage demo: loops forever, comes from src/assets/homepage.gif */}
          <style>{DEMO_CSS}</style>
          <figure className="demo">
            <img
              src={homepageGif}
              alt="Strokeline turning a plain-text script into a hand-drawn explanation"
              width={1920}
              height={1080}
              loading="eager"
              decoding="async"
            />
          </figure>

          <div className="reveal">
            <button
              type="button"
              className="reveal-toggle"
              aria-expanded={open}
              aria-controls="revealPanel"
              onClick={() => setOpen((value) => !value)}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              view the script that drew this
            </button>
            <div
              className={`reveal-panel${open ? "open" : ""}`}
              id="revealPanel"
            >
              <div className="reveal-panel-head">hero.wbs</div>
              <pre>
                <span className="tok-kw">CREATE</span> headline{" "}
                <span className="tok-kw">AS</span> TEXT
                {"\n  "}
                <span className="tok-kw">TEXT</span>{" "}
                <span className="tok-str">"A script that draws itself."</span>
                {"\n  "}
                <span className="tok-kw">DRAW</span>{" "}
                <span className="tok-val">0.6s</span>
                {"\n"}
                <span className="tok-kw">END</span>
                {"\n\n\n"}
                <span className="tok-kw">INK UNDERLINE</span> headline
                {"\n  "}
                <span className="tok-kw">COLOR</span>{" "}
                <span className="tok-val">#FFD966</span>
                {"\n  "}
                <span className="tok-kw">DRAW</span>{" "}
                <span className="tok-val">0.9s</span>
              </pre>
            </div>
          </div>

          <div className="strip">
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="6"
                  width="12"
                  height="10"
                  rx="1"
                  stroke="var(--blue)"
                  strokeWidth="1.8"
                />
              </svg>
              <div>
                <strong>Shapes &amp; lines</strong>
                <span>Rectangles, circles, lines with real direction</span>
              </div>
            </div>
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 18c3-9 6-12 9-10s1 8-3 9 8 1 10-6"
                  stroke="var(--terracotta)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div>
                <strong>Freehand ink</strong>
                <span>Arrows and circles drawn as an actual path</span>
              </div>
            </div>
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="7"
                  stroke="var(--yellow)"
                  strokeWidth="2.4"
                  fill="none"
                  strokeDasharray="1.5 3"
                />
              </svg>
              <div>
                <strong>Highlight &amp; rotate</strong>
                <span>Draw attention without touching the style</span>
              </div>
            </div>
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="9"
                  width="9"
                  height="9"
                  rx="1"
                  stroke="var(--blue)"
                  strokeWidth="1.8"
                />
                <rect
                  x="12"
                  y="5"
                  width="9"
                  height="9"
                  rx="1"
                  stroke="var(--blue)"
                  strokeWidth="1.8"
                  strokeDasharray="2.5 2.5"
                />
              </svg>
              <div>
                <strong>Duplicate &amp; delete</strong>
                <span>Clone an object, or erase it like a wipe</span>
              </div>
            </div>
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h13M4 11h9M4 16h6"
                  stroke="var(--foreground)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <strong>Plain text scripts</strong>
                <span>Diffable, versionable, no timeline editor</span>
              </div>
            </div>
            <div className="strip-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 12c1.5-4 4-6 8-6s6.5 2 8 6c-1.5 4-4 6-8 6s-6.5-2-8-6z"
                  stroke="var(--terracotta)"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="2.2" fill="var(--yellow)" />
              </svg>
              <div>
                <strong>Live preview</strong>
                <span>See exactly how each scene will render</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p>
            © 2026 Strokeline ·{" "}
            <a
              href="#"
              style={{ color: "var(--muted-foreground)" }}
              onClick={(event) => event.preventDefault()}
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
