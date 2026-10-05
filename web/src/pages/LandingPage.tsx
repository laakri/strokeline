import { useEffect, useLayoutEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Button } from "@/ui/button"
import { PublicHeader } from "@/ui/layout/PublicHeader.tsx"

const script = [
  "VERSION 1.0",
  "CANVAS 1920 1080",
  'SCENE 1 "Docker image flow"',
  "  CREATE dockerBrand AS IMAGE",
  '    URL "/brand-icons/docker.svg"',
  "  CREATE pythonBrand AS IMAGE",
  "  CREATE webContainer AS ICON",
  '    NAME "container"',
  "  CREATE registryMark AS ICON",
  '    NAME "ship-cargo"',
  "  ARROW dockerRunCard -> dockerDaemon",
  "  ARROW registryImagesFrame -> localImagesFrame",
  "END SCENE",
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
      step === 0 ? 500 : 650
    )
    return () => clearTimeout(timer)
  }, [step, total])

  return (
    <div className="grid overflow-hidden rounded-xl border border-[#cbd5e1] bg-[#f8fafc] text-[#17283c] shadow-xl shadow-slate-950/10 lg:grid-cols-[2fr_3fr]">
      <div className="border-b border-[#28394d] bg-[#111d30] p-4 sm:p-5 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#b9c9dc]">
            docker-architecture.wbs
          </span>
          <Button size="sm" variant="outline" className="border-[#42546a] bg-transparent text-[#DFE9F5] hover:bg-[#26354a] hover:text-white" onClick={() => setStep(0)}>
            Replay
          </Button>
        </div>
        <ol className="mt-4 space-y-1 font-mono text-xs sm:text-sm">
          {script.map((line, i) => (
            <li
              key={line}
              className={`rounded-md px-2 py-2 transition-colors duration-300 sm:px-3 ${
                step === i + 1
                  ? "bg-[#20354a] text-[#6BD6FF]"
                  : step > i + 1
                    ? "text-[#DFE9F5]"
                    : "text-[#718199]"
              }`}
            >
              {line}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col justify-center p-3 sm:p-5">
        <svg
          viewBox="0 0 900 506"
          role="img"
          aria-label="Animated Docker architecture diagram showing client commands, a Docker host, container images and a registry"
          className="aspect-video w-full rounded-lg border border-[#d5dee8] bg-[#f4f6f8]"
        >
          <defs>
            <marker id="docker-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 8 4 0 8Z" fill="#3784b3" />
            </marker>
            <marker id="docker-arrow-muted" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 8 4 0 8Z" fill="#d39137" />
            </marker>
            <pattern id="diagram-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#dbe3ea" />
            </pattern>
          </defs>
          <rect width="900" height="506" fill="#f4f6f8" />
          <rect width="900" height="506" fill="url(#diagram-grid)" opacity=".55" />
          <text x="22" y="25" fill="#718096" fontSize="10" letterSpacing="1.8" fontWeight="700">IMAGE LIFECYCLE</text>
          <text x="878" y="25" textAnchor="end" fill={step > 7 ? "#13805b" : "#8795a6"} fontSize="10" letterSpacing="1.3" fontWeight="700">{step > 7 ? "FLOW RUNNING" : "BUILDING DIAGRAM"}</text>

          <g fill="#fff" stroke="#4b84b4" strokeWidth="1.6">
            <rect x="16" y="55" width="178" height="416" rx="5" />
            <rect x="220" y="55" width="462" height="416" rx="5" />
            <rect x="708" y="55" width="176" height="416" rx="5" />
            <rect x="16" y="55" width="178" height="27" fill="#e7f0f7" />
            <rect x="220" y="55" width="462" height="27" fill="#e7f0f7" />
            <rect x="708" y="55" width="176" height="27" fill="#e7f0f7" />
          </g>
          <g fill="#24425e" fontSize="12" fontWeight="700" letterSpacing=".3">
            <text x="27" y="73">CLIENT</text>
            <text x="231" y="73">DOCKER HOST</text>
            <text x="719" y="73">REGISTRY</text>
          </g>

          <g opacity={step > 2 ? 1 : .28} className="transition-opacity duration-500">
            {[
              ["docker run", 104],
              ["docker build", 194],
              ["docker pull", 284],
            ].map(([label, y]) => (
              <g key={label}>
                <rect x="30" y={Number(y)} width="141" height="67" rx="11" fill="#f8fbfd" stroke="#7998af" />
                <rect x="42" y={Number(y) + 15} width="31" height="29" rx="5" fill="#e3f1f9" />
                <path d={`M49 ${Number(y) + 24}l5 5-5 5m9 0h7`} fill="none" stroke="#397da7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <text x="81" y={Number(y) + 37} fill="#21384c" fontSize="11" fontFamily="monospace" fontWeight="700">{label}</text>
              </g>
            ))}
          </g>

          <g opacity={step > 3 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="247" y="104" width="117" height="302" rx="13" fill="#eef3f6" stroke="#7892a3" />
            <rect x="265" y="123" width="81" height="68" rx="12" fill="#fff" stroke="#d6e1e8" />
            <image href="/brand-icons/docker.svg" x="276" y="132" width="59" height="48" preserveAspectRatio="xMidYMid meet" />
            <text x="305" y="225" textAnchor="middle" fill="#25384c" fontSize="14" fontWeight="700">Docker</text>
            <text x="305" y="243" textAnchor="middle" fill="#25384c" fontSize="14">daemon</text>
            <line x1="268" y1="262" x2="343" y2="262" stroke="#d2dce4" />
            <circle cx="277" cy="284" r="3" fill="#48a8d5" />
            <text x="287" y="288" fill="#607387" fontSize="10">API</text>
            <circle cx="277" cy="308" r="3" fill="#48a8d5" />
            <text x="287" y="312" fill="#607387" fontSize="10">Engine</text>
            <circle cx="277" cy="332" r="3" fill="#48a8d5" />
            <text x="287" y="336" fill="#607387" fontSize="10">Runtime</text>
          </g>

          <g opacity={step > 4 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="383" y="104" width="127" height="183" rx="4" fill="#fbfdfe" stroke="#5b8fb6" />
            <rect x="383" y="104" width="127" height="25" fill="#e9f1f6" stroke="#5b8fb6" />
            <text x="394" y="121" fill="#334c61" fontSize="10" fontWeight="700">IMAGES</text>
            <image href="/brand-icons/python.svg" x="393" y="143" width="28" height="28" />
            <text x="429" y="161" fill="#43566a" fontSize="10">python:3.12</text>
            <line x1="393" y1="179" x2="500" y2="179" stroke="#e1e7ec" />
            <image href="/brand-icons/redis.svg" x="393" y="190" width="28" height="28" />
            <text x="429" y="208" fill="#43566a" fontSize="10">redis:7</text>
            <line x1="393" y1="226" x2="500" y2="226" stroke="#e1e7ec" />
            <g transform="translate(395 238)" fill="none" stroke="#5b91b5" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M1 6 12 1l11 5v12l-11 5-11-5Z" />
              <path d="m1 6 11 5 11-5M12 11v12" />
            </g>
            <text x="429" y="256" fill="#43566a" fontSize="10">web:latest</text>
          </g>

          <g opacity={step > 5 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="528" y="104" width="127" height="183" rx="4" fill="#fbfdfe" stroke="#5b8fb6" />
            <rect x="528" y="104" width="127" height="25" fill="#e9f1f6" stroke="#5b8fb6" />
            <text x="539" y="121" fill="#334c61" fontSize="10" fontWeight="700">CONTAINERS</text>
            {[151, 218].map((y, index) => (
              <g key={y}>
                <rect x="546" y={y} width="91" height="53" rx="6" fill="#eef6fb" stroke="#9bb7ca" />
                <g transform={`translate(553 ${y + 10})`} fill="none" stroke={index === 0 ? "#3186b6" : "#5990b1"} strokeWidth="1.6" strokeLinejoin="round">
                  <path d="M1 6 14 1l13 5v21l-13 5L1 27Z" />
                  <path d="m1 6 13 5 13-5M14 11v21" />
                </g>
                <text x="591" y={y + 30} fill="#405a70" fontSize="9">{index === 0 ? "web_01" : "cache_01"}</text>
                <circle cx="624" cy={y + 41} r="3" fill="#29a477" />
              </g>
            ))}
          </g>

          <g opacity={step > 5 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="725" y="104" width="142" height="218" rx="4" fill="#fbfdfe" stroke="#5b8fb6" />
            <rect x="725" y="104" width="142" height="25" fill="#e9f1f6" stroke="#5b8fb6" />
            <text x="736" y="121" fill="#334c61" fontSize="10" fontWeight="700">IMAGE REGISTRY</text>
            <image href="/brand-icons/nginx.svg" x="737" y="141" width="26" height="26" />
            <text x="772" y="159" fill="#43566a" fontSize="10">nginx</text>
            <line x1="736" y1="174" x2="856" y2="174" stroke="#e1e7ec" />
            <image href="/brand-icons/ubuntu.svg" x="737" y="184" width="26" height="26" />
            <text x="772" y="202" fill="#43566a" fontSize="10">ubuntu</text>
            <line x1="736" y1="217" x2="856" y2="217" stroke="#e1e7ec" />
            <image href="/brand-icons/postgresql.svg" x="737" y="227" width="26" height="26" />
            <text x="772" y="245" fill="#43566a" fontSize="10">postgres</text>
            <line x1="736" y1="260" x2="856" y2="260" stroke="#e1e7ec" />
            <g transform="translate(739 269)" fill="none" stroke="#65829b" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M1 5 12 1l11 4v13l-11 4-11-4Z" />
              <path d="m1 5 11 5 11-5M12 10v12" />
            </g>
            <text x="772" y="286" fill="#43566a" fontSize="10">alpine</text>
          </g>

          <g opacity={step > 5 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="725" y="337" width="142" height="57" rx="4" fill="#fbfdfe" stroke="#7d9e84" />
            <rect x="725" y="337" width="142" height="20" fill="#edf4ee" stroke="#7d9e84" />
            <text x="736" y="351" fill="#405a47" fontSize="9" fontWeight="700">EXTENSIONS</text>
            <g transform="translate(750 366)" fill="none" stroke="#60a977" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 8h19M7 3l-5 5 5 5M16 3l5 5-5 5" />
            </g>
            <g transform="translate(800 366)" fill="none" stroke="#60798b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0" y="1" width="20" height="18" rx="4" />
              <path d="M5 6h10M5 11h10M5 16h6" />
            </g>
            <g transform="translate(839 366)" fill="none" stroke="#4b8cbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h16v13H2zM6 20h8M10 16v4" />
            </g>
          </g>
          <g opacity={step > 5 ? 1 : .2} className="transition-opacity duration-500">
            <rect x="725" y="405" width="142" height="50" rx="4" fill="#fbfdfe" stroke="#7d91a5" />
            <rect x="725" y="405" width="142" height="20" fill="#eef1f5" stroke="#7d91a5" />
            <text x="736" y="419" fill="#405469" fontSize="9" fontWeight="700">PLUGINS</text>
            <g transform="translate(750 432)" fill="none" stroke="#4186ae" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M1 5 10 1l9 4v11l-9 4-9-4Z" />
              <path d="m1 5 9 4 9-4M10 9v11" />
            </g>
            <g transform="translate(797 432)" fill="none" stroke="#527998" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M1 5 10 1l9 4v11l-9 4-9-4Z" />
              <path d="m1 5 9 4 9-4M10 9v11" />
            </g>
            <g transform="translate(840 432)" fill="none" stroke="#648f75" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M1 5 10 1l9 4v11l-9 4-9-4Z" />
              <path d="m1 5 9 4 9-4M10 9v11" />
            </g>
          </g>
          <g fill="none" stroke="#3784b3" strokeWidth="2" markerEnd="url(#docker-arrow)" opacity={step > 6 ? 1 : 0} className="docker-flow-line">
            <path d="M171 132H247" />
            <path d="M171 222H247" />
            <path d="M171 312H247" />
            <path d="M364 185H383" />
            <path d="M510 185H528" />
          </g>
          <g fill="none" stroke="#d39137" strokeWidth="2" strokeDasharray="7 5" markerEnd="url(#docker-arrow-muted)" opacity={step > 7 ? 1 : 0} className="docker-flow-line">
            <path d="M510 302C565 335 655 335 723 302" />
            <path d="M723 331C655 361 565 361 520 331" />
          </g>
          <g fill="#976b2f" fontSize="9" fontWeight="700" opacity={step > 7 ? 1 : 0}>
            <text x="620" y="324" textAnchor="middle">PUSH</text>
            <text x="620" y="375" textAnchor="middle">PULL</text>
          </g>
        </svg>
        <p
          className={`mt-3 text-center text-sm text-[#526579] transition-opacity duration-500 ${
            step >= total ? "opacity-100" : "opacity-0"
          }`}
        >
          Commands reach the Docker daemon. Images become containers, while push and pull connect the host to the registry.
        </p>
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

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-12 sm:pb-16 lg:pt-20">
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
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 sm:py-16">
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
