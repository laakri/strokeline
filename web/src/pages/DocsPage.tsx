import { useEffect } from "react"
import { Link } from "react-router-dom"
import "./landing.css"
import "./docs.css"
import logo from "@/assets/logo.png"

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

const pageLinks = [
  ["quick-start", "Quick start"],
  ["first-script", "Your first script"],
  ["language", "Script language"],
  ["motion", "Timing and motion"],
  ["narration", "Subtitles and voice"],
  ["play-export", "Play and export"],
  ["diagnostics", "Fix common errors"],
] as const

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="docs-code">
      <div className="docs-code-title">{title}</div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

function DocsSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section className="docs-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function DocsPage() {
  useEffect(() => {
    document.documentElement.classList.add("landing-mode")
    return () => document.documentElement.classList.remove("landing-mode")
  }, [])

  return (
    <div className="landing docs-page">
      <header>
        <div className="docs-topbar">
          <Link to="/" className="logo">
            <img src={logo} alt="" />
            Strokeline <span>Docs</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link to="/">Home</Link>
            <Link to="/workspace" className="btn">Open studio</Link>
          </nav>
        </div>
      </header>

      <main>
        <div className="docs-wrap">
          <section className="docs-hero">
            <span className="eyebrow">THE USER GUIDE</span>
            <h1>Make your ideas move.</h1>
            <p>Write a small, readable script. Strokeline turns it into a hand-drawn animation you can preview and export.</p>
            <Link to="/workspace" className="btn">Open the studio <span aria-hidden="true">→</span></Link>
          </section>

          <div className="docs-grid">
            <nav className="docs-toc" aria-label="On this page">
              <span>ON THIS PAGE</span>
              {pageLinks.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
            </nav>

            <article className="docs-content">
              <DocsSection id="quick-start" title="Quick start">
                <ol className="docs-steps">
                  <li><strong>Open the studio.</strong> Select the script editor and replace its contents with a scene.</li>
                  <li><strong>Run it.</strong> Strokeline checks the script, then renders the preview.</li>
                  <li><strong>Play and refine.</strong> Use the player controls and timeline. Fix red errors; yellow warnings are suggestions.</li>
                  <li><strong>Export.</strong> Save the script as <code>.wbs</code>, export a video or GIF, or download subtitle files.</li>
                </ol>
              </DocsSection>

              <DocsSection id="first-script" title="Your first script">
                <p>A script has optional settings at the top, followed by one or more scenes. Each scene contains drawing and timing instructions.</p>
                <CodeBlock title="first-scene.wbs" code={starterScript} />
                <p><code>POSITION</code> places an object by its center. Text inside a rectangle uses the rectangle’s built-in <code>TEXT</code> property. <code>DRAW</code> sets how long it takes to appear.</p>
              </DocsSection>

              <DocsSection id="language" title="Script language">
                <div className="docs-cards">
                  <div><h3>Scene structure</h3><p>Start with <code>SCENE number "title"</code> and finish with <code>END SCENE</code>. Close each object with <code>END</code>.</p></div>
                  <div><h3>Objects</h3><p>Create <code>TEXT</code>, <code>CIRCLE</code>, <code>RECTANGLE</code>, <code>LINE</code>, or <code>ICON</code>. Connect existing objects with <code>ARROW from -&gt; to</code>.</p></div>
                  <div><h3>Freehand ink</h3><p>Use <code>INK id</code> with comma-separated <code>POINTS</code>, a color, width, and draw time. Use <code>INK ARROW FROM</code> and <code>TO</code> for a hand-drawn arrow.</p></div>
                  <div><h3>Reusable visuals</h3><p><code>DEFINE</code> and <code>USE</code> make reusable macros. Built-in macros include speech bubbles, sticky notes, callouts, timelines, and progress rings.</p></div>
                </div>
                <p>Recognizable objects are often quickest as an <code>ICON</code>. Enter a name after <code>NAME</code> or <code>ICON</code> and use editor autocomplete to search the built-in Lucide set.</p>
                <CodeBlock title="A simple data chart" code={chartScript} />
                <p>Charts build from <code>DATA "label" value</code> rows. Available types are <code>BARCHART</code>, <code>LINECHART</code>, and <code>PIECHART</code>.</p>
              </DocsSection>

              <DocsSection id="motion" title="Timing and motion">
                <p>Statements run in order. <code>WAIT 1s</code> adds a pause; <code>PARALLEL</code> starts several drawing actions together. Durations need a unit, usually seconds (<code>s</code>).</p>
                <CodeBlock title="Motion and camera" code={animationScript} />
                <p><code>ANIMATE</code> moves or changes an object. <code>ENTER</code> and <code>EXIT</code> add entrance and exit effects; <code>LOOP</code> adds subtle repeating motion. Camera zooms and pans should be reset before the scene ends.</p>
                <p>Scene transitions and optional gaps go at the end of a scene, immediately before <code>END SCENE</code>. The Play All control uses them unless you choose different preview settings.</p>
              </DocsSection>

              <DocsSection id="narration" title="Subtitles and voice">
                <p><code>SAY "..."</code> adds spoken narration at the current timeline position. It does not advance the timeline; use a <code>WAIT</code> or ongoing animation to keep the scene alive until the line finishes.</p>
                <p><code>SUBTITLES on</code> sets the initial caption state. Captions can be toggled in the player with <kbd>K</kbd>. SAY lines stay in the script even when captions are off.</p>
                <p>Turn on the reader with the speaker control in the player. The first setup downloads the Kokoro model; its progress and any errors appear in the player. Generated speech is cached in this browser.</p>
              </DocsSection>

              <DocsSection id="play-export" title="Play and export">
                <ul className="docs-list">
                  <li><strong>Play / pause:</strong> preview the current scene or the full sequence.</li>
                  <li><strong>Timeline:</strong> scrub through playback; scene markers show where each scene begins.</li>
                  <li><strong>Save / load:</strong> download a <code>.wbs</code> script or open one from your device.</li>
                  <li><strong>Video:</strong> export MP4 when supported; narrated video exports as WebM with audio.</li>
                  <li><strong>Other formats:</strong> export GIF, a PNG frame, or subtitle files in SRT and VTT.</li>
                </ul>
                <p>The studio’s <strong>Copy AI Prompt</strong> button copies the current AI authoring guide for use with your preferred assistant.</p>
              </DocsSection>

              <DocsSection id="diagnostics" title="Fix common errors">
                <div className="docs-cards docs-error-cards">
                  <div><h3>Expected END SCENE</h3><p>Close every <code>CREATE</code>, <code>INK</code>, and <code>PARALLEL</code> block before closing the scene.</p></div>
                  <div><h3>Unknown reference</h3><p>Check spelling and create the object earlier in the same scene before using it in an arrow or animation.</p></div>
                  <div><h3>Bad duration</h3><p>Include a unit, for example <code>DRAW 0.8s</code> or <code>WAIT 2s</code>.</p></div>
                  <div><h3>Text outside safe area</h3><p>Keep the full text box inside the canvas margins, not just the position point. Use <code>MAXWIDTH</code> for long text.</p></div>
                </div>
                <p>Fix the first red error, then run again; later parser errors can be follow-on errors. Warnings do not block playback, but fixing them improves readability.</p>
              </DocsSection>

              <div className="docs-end">
                <p>Ready to draw?</p>
                <Link to="/workspace" className="btn">Open the studio <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          </div>
        </div>
      </main>

      <footer><div className="footer-inner"><p>© 2026 Strokeline · <Link to="/">Home</Link></p></div></footer>
    </div>
  )
}
