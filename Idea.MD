# Programmable Whiteboard Animation Platform
### Full Architecture & Design Document (v1)

> Core principle, restated and enforced throughout this doc:
> **The text is the program. The renderer executes the program. Nothing in the system is a generic video editor.**

---

## 0. The One Structural Change to the Original Plan

Your original pipeline:

```
SCRIPT → PARSER → VALIDATOR → SCENE GRAPH → TIMELINE → ENGINE → RENDERER
```

is correct, but it's missing an explicit **compilation boundary**. I'm inserting one:

```
AUTHOR DSL (text)                 ← humans & AI write this
      │  tokenize
      ▼
   TOKENS
      │  parse
      ▼
    AST                            ← DSL-specific, still line/keyword shaped
      │  compile
      ▼
 SCENE IR  (canonical JSON, versioned, schema-published)   ★ SOURCE OF TRUTH
      │  validate (structural + semantic)
      ▼
 VALIDATED IR
      │
      ▼
 SCENE GRAPH (in-memory objects, resolved refs, computed layout)
      │
      ▼
 TIMELINE (flattened list of time-stamped ops, per track)
      │
      ▼
 ANIMATION ENGINE (playhead, interpolation, easing)
      │
      ▼
 RENDERER (Canvas2D + rough.js hand-drawn layer)
      │
      ├──► LIVE PREVIEW (in-browser, requestAnimationFrame)
      └──► EXPORT PIPELINE (headless render → frames → ffmpeg → MP4/WebM/GIF)
```

**Why this matters concretely:** an external AI can *either* emit the DSL text *or* emit Scene IR JSON directly (structured-output mode). Both converge on the same validated IR. You only need to keep **one** contract stable long-term — the IR schema — while the DSL syntax itself is free to evolve, gain shorthand, gain sugar, even fork into "DSL v2" later, without ever touching the engine. This directly solves your extensibility goal (#16) and de-risks the "AI must generate perfect syntax" bet (#15) at the same time.

Treat the DSL as a *front-end language* and the IR as *bytecode*. This is exactly the LLVM/compiler pattern, applied to an animation authoring tool.

---

## 1. Technology Stack

| Layer | Recommendation | Why |
|---|---|---|
| Editor UI | React + TypeScript, Zustand (state), CodeMirror 6 (script editor, custom language mode) | CodeMirror 6 supports building a real tokenizer-based language mode with live diagnostics gutter — ideal for showing parser/validator errors inline as the user types. |
| Rendering (preview) | HTML5 Canvas2D via a custom lightweight scene renderer, **not** a game engine | You don't need WebGL for 2D whiteboard shapes. Canvas2D is simpler, fast enough at 1080p/60fps for this content type, and trivially frame-capturable for export. |
| Hand-drawn stroke rendering | **rough.js** | Purpose-built library for sketchy/hand-drawn SVG & Canvas primitives (circles, rects, lines, paths, arcs) with a `roughness`/`bowing` parameter. This is the single highest-leverage library choice in the whole stack — don't build hand-drawn rendering from scratch. |
| Path/reveal animation | Custom: stroke-length-based dash animation (`getTotalLength` / manual point-sampling for Canvas) | "Drawing on" effect = animate a dash-offset or progressively reveal path samples over time. Standard SVG trick, portable to Canvas by sampling the path. |
| Handwritten font | Self-hosted variable font (e.g., "Caveat", "Gochi Hand", "Architects Daughter") loaded via `FontFace` API before render starts | Must guarantee font is loaded before first frame — a common source of broken exports. |
| Tweening / easing | Small custom easing module (cubic-bezier presets) — do **not** pull in GSAP for the MVP | Your timeline model already needs custom scheduling (parallel/sequential blocks, camera sync). A general tweening library fights your own timeline abstraction. Write ~150 lines of easing functions instead. |
| Icons | Bundle a curated hand-drawn-friendly icon set (SVG) referenced by name (`ICON "server"`) | Avoid arbitrary icon-library sprawl in v1 — curate ~100 common tech/business icons. |
| Charts | Thin wrapper that draws simple bar/line/pie primitives using the same rough.js hand-drawn style — **not** a full charting library | A real charting lib (Chart.js/Recharts) renders in a "corporate BI" style that clashes visually with hand-drawn whiteboard aesthetics. Build minimal native chart primitives instead. |
| Code blocks | Render via a tokenizer (e.g., Shiki or Prism, headless — extract tokens only) and draw glyphs yourself in the hand-drawn font/monospace mix | Keeps visual consistency; don't inject a raw `<pre>` HTML block into an otherwise Canvas-rendered animation. |
| Math equations | KaTeX for layout metrics → rasterize/extract path outlines, or simpler: render KaTeX to an off-screen SVG, rasterize to bitmap, composite as an image node | LaTeX layout is genuinely hard; don't reimplement it. Treat it as a specialized "image-producing" node type. |
| Export (MVP) | **Server-side headless rendering**: Node + Puppeteer/Playwright drives the same Canvas renderer in a headless browser, screenshots each frame at fixed fps, pipes frames to `ffmpeg` (MP4/WebM) or `gifski`/`ffmpeg` (GIF) | Client-side MP4 encoding (ffmpeg.wasm) is slow, memory-heavy, and blocks the tab. Server-side is dramatically more reliable and lets you scale export as a queued job later. Client-side ffmpeg.wasm can be a *later* "quick low-res export" option, not the primary path. |
| Backend | Node.js (TypeScript) API, PostgreSQL for projects/metadata, S3-compatible object storage for exported videos & uploaded images | Standard, unglamorous, correct. |
| Project persistence (MVP-local) | IndexedDB (browser) for solo/offline mode before you build a backend | Lets you ship a fully working MVP with zero server before investing in accounts/storage. |
| Monorepo tooling | pnpm workspaces + Turborepo (or Nx) | You have ~6 clearly separable packages (see §13) — a monorepo keeps IR types shared and versioned in one place. |

---

## 2. Design Principles for the DSL

These principles resolve most of your open questions (#4, #6, #15, #16) at once.

1. **Every visible/referenceable object must have an explicit ID.** No implicit anonymous objects. If the user omits one, the parser auto-generates a stable one (`shape_1`, `shape_2`...) — but the *IR* always has an explicit id. This removes an entire class of ambiguity when later commands say `ANIMATE server MOVE ...`.
2. **One canonical creation form.** Every object, regardless of type, is created the same way:
   ```
   CREATE <id> AS <TYPE>
     <prop> <value>
     <prop> <value>
   END
   ```
   Shorthand forms (like your original `CIRCLE browser` / `RECTANGLE server`) are **sugar that the parser desugars into `CREATE ... AS ...` before compiling to IR.** This means adding a new shape type later (CYLINDER, CLOUD, DATABASE-ICON, etc.) requires **zero grammar changes** — it's just a new value for `<TYPE>`, resolved by a renderer-side shape registry (§10).
3. **Time is a cursor, not a coordinate, by default — but absolute timing is always available as an escape hatch.** `WAIT 1s` advances a global playhead. Commands inside a `PARALLEL` block share a start time. Every command *may* also take an explicit `AT 3.5s` to override the cursor. This matches how humans and AIs both think ("first this, then wait, then that") while still allowing precise control.
4. **Properties are keyword-value pairs, not positional.** Never `CIRCLE 300 500 100` (position/position/radius — ambiguous, error-prone for an LLM). Always `POSITION 300 500` / `RADIUS 100`. This is the single biggest reliability lever for AI generation — keyworded args are far more robust to partial/malformed generation than positional args, and are easy to validate with clear per-field errors.
5. **Blocks are explicit and closed.** `SCENE ... END SCENE`, `PARALLEL ... END`, `GROUP ... END`. No indentation-sensitivity (indentation-sensitive grammars are a surprisingly common LLM failure mode — stray spaces break everything silently). Explicit `END` tokens make the grammar regular and trivially recoverable by the parser after an error.
6. **Every command is independently skippable on error.** If line 42 is malformed, the parser should record a structured diagnostic, skip that one command, and keep parsing — not abort the whole script. Scripts from AI are often *95% right*; a validator that fails closed on the first error is much less useful than one that reports everything wrong in one pass (critical for #14 and for a future AI self-correction loop).
7. **The grammar is versioned from day one.** First line of every script: `VERSION 1.0`. The parser dispatches on this. You will change your mind about syntax; a version tag means old scripts (and old AI system-prompts telling AIs how to write scripts) never silently break.

---

## 3. The DSL Grammar (v1)

EBNF-style, informal but precise enough to implement directly.

```ebnf
script          ::= header scene+
header          ::= "VERSION" number NEWLINE
                     "CANVAS" number number NEWLINE
                     ("BACKGROUND" color NEWLINE)?
                     ("STYLE" ident NEWLINE)?
                     ("FONT" ident NEWLINE)?
                     ("STROKE" number NEWLINE)?

scene           ::= "SCENE" number ("\"" string "\"")? NEWLINE
                     statement*
                     "END" "SCENE" NEWLINE

statement       ::= create_stmt
                   | shorthand_stmt
                   | animate_stmt
                   | connector_stmt
                   | camera_stmt
                   | wait_stmt
                   | group_stmt
                   | parallel_stmt
                   | sequence_stmt
                   | transition_stmt

create_stmt     ::= "CREATE" ident "AS" type_name NEWLINE
                     prop_line*
                     "END" NEWLINE

shorthand_stmt  ::= shape_kw ident? NEWLINE prop_line* NEWLINE
                     // desugars to create_stmt with auto-generated id if omitted

shape_kw        ::= "TEXT" | "HEADING" | "PARAGRAPH" | "CIRCLE" | "RECTANGLE"
                   | "ROUNDRECT" | "LINE" | "PATH" | "FREEHAND" | "ICON"
                   | "IMAGE" | "CODEBLOCK" | "EQUATION" | "CHART" | "CYLINDER"

prop_line       ::= prop_key value+ NEWLINE
prop_key        ::= "POSITION" | "SIZE" | "WIDTH" | "HEIGHT" | "RADIUS"
                   | "COLOR" | "FILL" | "STROKE" | "ROTATION" | "OPACITY"
                   | "TEXT" | "FONT" | "FONTSTYLE" | "LABEL" | "ICON"
                   | "SRC" | "LANG" | "DATA" | "DRAW" | "AT" | "LAYER" | ...

animate_stmt    ::= "ANIMATE" ident anim_verb value+ ("DURATION" duration)?
                     ("EASE" ease_name)? ("AT" duration)? NEWLINE
anim_verb       ::= "MOVE" "TO" | "SCALE" "TO" | "ROTATE" "TO" | "FADE"
                   | "HIGHLIGHT" | "SHAKE" | "PULSE" | "MORPH" "INTO"
                   | "COLOR" "TO"

connector_stmt  ::= "ARROW" ident "->" ident NEWLINE
                     prop_line*
                   | "LINE" ident "->" ident NEWLINE prop_line*

camera_stmt     ::= "CAMERA" camera_verb NEWLINE prop_line*
camera_verb     ::= "ZOOM" | "PAN" | "FOLLOW" | "RESET"

wait_stmt       ::= "WAIT" duration NEWLINE

group_stmt      ::= "GROUP" ident NEWLINE statement* "END" NEWLINE

parallel_stmt   ::= "PARALLEL" NEWLINE statement* "END" NEWLINE
sequence_stmt   ::= "SEQUENCE" NEWLINE statement* "END" NEWLINE

transition_stmt ::= "TRANSITION" transition_name ("DURATION" duration)? NEWLINE

duration        ::= number "s" | number "ms"
color           ::= "#" hex | ident            // ident resolves via named palette
value           ::= number | string | ident | color
```

### Worked example (your original intent, rewritten under these rules)

```
VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FAFAFA
STYLE handdrawn
FONT handwritten
STROKE 4

SCENE 1 "Intro"

  CREATE title AS TEXT
    TEXT "How does a website work?"
    POSITION 960 150
    SIZE 64
    DRAW 1s
  END

  PARALLEL
    CREATE browser AS CIRCLE
      POSITION 300 500
      RADIUS 100
      LABEL "Browser"
      DRAW 1s
    END
    CREATE server AS RECTANGLE
      POSITION 1400 500
      WIDTH 300
      HEIGHT 220
      TEXT "SERVER"
      DRAW 1s
    END
  END

  WAIT 0.5s

  ARROW browser -> server
    LABEL "HTTP Request"
    DRAW 1.5s

  WAIT 1s

  CAMERA ZOOM
    TARGET server
    SCALE 1.8
    DURATION 1s

END SCENE
```

Note the changes from your draft and why:
- `CREATE ... AS ...` used for anything that needs later reference clarity; shorthand (`CIRCLE browser`) still legal and desugars identically.
- `PARALLEL ... END` makes simultaneous creation of browser+server explicit instead of implied by adjacency — removes a whole category of "did the AI mean these to happen together or in sequence?" ambiguity.
- `CAMERA ZOOM TARGET server` instead of bare `ZOOM server` — keeps all camera ops under one keyword family, easier for both grammar and an AI's mental model ("camera commands all start with CAMERA").

---

## 4. Scene IR (the canonical JSON — this is the real contract)

This is what the parser compiles the AST *into*, what gets saved to disk/DB, and what an AI could also emit directly.

```typescript
// packages/scene-ir/types.ts

interface SceneDocument {
  version: "1.0";
  canvas: { width: number; height: number };
  background: string;
  style: { mode: "handdrawn" | "clean"; strokeWidth: number; font: string };
  scenes: Scene[];
}

interface Scene {
  id: string;
  index: number;
  label?: string;
  ops: TimelineOp[];          // flattened, time-resolved operations (see §6)
}

// A node is ANY drawable object — shape, text, icon, image, chart, etc.
interface SceneNode {
  id: string;
  type: NodeType;             // "circle" | "rectangle" | "text" | "icon" | ...
  position: { x: number; y: number };
  size?: { width: number; height: number };
  radius?: number;
  rotation: number;           // degrees
  opacity: number;            // 0..1
  style: {
    color: string;
    fill?: string;
    strokeWidth: number;
    fontSize?: number;
    fontStyle?: "normal" | "bold" | "italic";
  };
  text?: string;
  data?: Record<string, unknown>;  // type-specific payload (chart data, code lang, etc.)
  layer: number;
  groupId?: string;
}

type NodeType =
  | "text" | "heading" | "paragraph"
  | "circle" | "rectangle" | "roundrect" | "cylinder"
  | "line" | "arrow" | "path" | "freehand"
  | "icon" | "image" | "codeblock" | "equation" | "chart"
  | "group";

// Timeline operations — everything that HAPPENS is an op with a start time.
type TimelineOp =
  | { kind: "create"; t: number; node: SceneNode; draw: Reveal }
  | { kind: "animate"; t: number; targetId: string; anim: AnimationSpec }
  | { kind: "camera"; t: number; camera: CameraOp }
  | { kind: "transition"; t: number; transition: TransitionSpec };

interface Reveal { duration: number; ease: EaseName; style: "draw-on" | "fade-in" | "pop"; }

interface AnimationSpec {
  verb: "move" | "scale" | "rotate" | "fade" | "highlight" | "shake" | "pulse" | "morph" | "color";
  to?: Partial<Pick<SceneNode, "position" | "rotation" | "opacity" | "size">>;
  morphIntoId?: string;
  duration: number;
  ease: EaseName;
}

interface CameraOp {
  verb: "zoom" | "pan" | "follow" | "reset";
  targetId?: string;
  scale?: number;
  position?: { x: number; y: number };
  duration: number;
  ease: EaseName;
}

type EaseName = "linear" | "easeInOut" | "easeOut" | "easeIn" | "bounce";
```

This schema is what you'd publish (as JSON Schema) for the "AI generates IR directly" fallback path. It's also small enough that a future AI-correction loop can diff "what the validator rejected" against "what field it expected" and re-prompt automatically.

---

## 5. Parser Design

Three clean stages, each independently testable:

1. **Lexer** — turns raw text into a token stream: `KEYWORD`, `IDENT`, `NUMBER`, `STRING`, `COLOR`, `DURATION`, `ARROW_OP ("->")`, `NEWLINE`. Line-based, so the lexer tracks `line`/`col` on every token for diagnostics.
2. **Parser** — recursive-descent, one function per grammar rule (`parseScene`, `parseCreateStmt`, `parseAnimateStmt`...). On malformed input, it **doesn't throw** — it pushes a `Diagnostic` and performs *error recovery* by skipping tokens until the next recognizable statement boundary (a keyword at line start), then continues. This is what lets you report "you have 4 errors" instead of dying on the first one.
3. **Compiler (AST → IR)** — resolves shorthand into `CREATE...AS...`, resolves the time cursor into absolute `t` values for every op, resolves `PARALLEL`/`SEQUENCE` into concrete start times, assigns auto-IDs, and expands `GROUP` membership.

```typescript
// packages/dsl-parser/parser.ts (sketch)

interface Diagnostic {
  severity: "error" | "warning";
  code: string;            // e.g. "E_UNKNOWN_REF", "E_MISSING_PROP"
  message: string;
  line: number;
  col: number;
  suggestion?: string;     // "did you mean 'server'?" — Levenshtein against known ids
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private diagnostics: Diagnostic[] = [];
  private knownIds = new Set<string>();

  parseScript(): { ast: ScriptAST; diagnostics: Diagnostic[] } {
    const header = this.parseHeader();
    const scenes: SceneAST[] = [];
    while (!this.atEnd()) {
      try {
        scenes.push(this.parseScene());
      } catch (e) {
        this.recoverToNextScene();
      }
    }
    return { ast: { header, scenes }, diagnostics: this.diagnostics };
  }

  private parseCreateStmt(): CreateStmtAST {
    this.expect("CREATE");
    const id = this.expectIdent();
    if (this.knownIds.has(id)) {
      this.error("E_DUPLICATE_ID", `Object id "${id}" already exists in this scene.`);
    }
    this.knownIds.add(id);
    this.expect("AS");
    const type = this.expectTypeName();
    const props = this.parsePropLines();
    this.expect("END");
    return { id, type, props };
  }

  private recoverToNextScene() {
    while (!this.atEnd() && this.peek().value !== "SCENE") this.pos++;
  }
}
```

**Validator** runs *after* the AST→IR compile step, as a separate pass over IR (semantic checks are easier on the flattened, resolved structure than on the tree):
- Every `targetId` referenced by an `animate`/`arrow`/`camera` op exists and was created *before* that time `t`.
- No two `create` ops reuse the same id.
- Numeric ranges sane (`opacity` in `[0,1]`, `scale > 0`, canvas dims positive).
- Durations non-negative; total scene duration under a configurable sanity cap (catch AI hallucinating `DURATION 500s`).
- Unknown `TYPE`/`prop_key` → error with nearest-match suggestion (helps both humans and a future AI-repair loop).

---

## 6. Objects, References, and the Timeline

- **Identity**: every `SceneNode.id` is unique *within a scene*. Cross-scene references are disallowed in v1 (an object created in Scene 1 does not automatically exist in Scene 2 — each scene is a fresh canvas state, optionally seeded by a `CARRY_OVER` directive later; not in MVP).
- **The playhead model**: the compiler walks statements top-to-bottom maintaining a `cursor: number` (seconds). A bare statement advances `cursor += duration`. Inside `PARALLEL`, all child statements get the *same* start `t = cursor`, and the block as a whole advances the cursor by the **max** child duration. Inside `SEQUENCE` (identical to default top-level behavior, provided mainly for explicitness inside a `GROUP`), children stack.
- **Timeline = flat array of `TimelineOp`, sorted by `t`.** This is the structure the Animation Engine actually consumes — no tree-walking at playback time, which keeps scrubbing/seeking (`preview.seekTo(12.4)`) O(log n) via binary search on `t`.

```typescript
// packages/timeline-engine/timeline.ts

class Timeline {
  private ops: TimelineOp[]; // pre-sorted by t
  private activeAnimations: ActiveAnim[] = [];

  seekTo(timeSec: number, sceneState: SceneState) {
    // Rebuild deterministic state at time T:
    // 1. Reset to empty scene state
    // 2. Apply every `create` op with t <= T (respecting reveal progress)
    // 3. Apply every `animate` op with t <= T, computing interpolated value at T
    // 4. Apply camera ops the same way
    // This makes scrubbing and export-frame-rendering trivially correct —
    // rendering frame N never depends on "what happened last frame", only on T.
  }

  opsInWindow(fromT: number, toT: number): TimelineOp[] {
    // binary search + slice — used by the realtime player to know what
    // newly starts between this frame and the last
  }
}
```

That last point — **stateless-at-T seeking** — is the single most important engine property. It's what makes scrubbing the preview scrubber, resuming after pause, and rendering export frames out-of-order (parallelizable export workers) all trivially correct, instead of a source of subtle animation bugs.

---

## 7. Camera System

Model the camera as just another animatable object with `position (x,y)` = viewport center and `scale` = zoom factor. The renderer applies a single `ctx.setTransform` derived from camera state before drawing the scene each frame.

```typescript
interface CameraState { x: number; y: number; scale: number; }

function applyCamera(ctx: CanvasRenderingContext2D, cam: CameraState, canvas: {w:number;h:number}) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(canvas.w / 2, canvas.h / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);
}
```

- `CAMERA ZOOM TARGET server SCALE 1.8` → resolves `TARGET`'s bounding box center as the new `(x,y)`, tweens `scale` from current to `1.8` over `DURATION`.
- `CAMERA PAN TO x y` → tweens `(x,y)` only, `scale` held.
- `CAMERA FOLLOW target` → each frame, re-centers on the *current* interpolated position of a moving target (useful once `ANIMATE ... MOVE` is running concurrently) — this is the one camera op that isn't a simple start→end tween; it re-samples the target's position every frame during its active window.
- `CAMERA RESET` → tween back to `{x: canvasW/2, y: canvasH/2, scale: 1}`.

Easing matters enormously here — camera moves with `linear` easing look robotic; default camera ops to `easeInOut` regardless of what other objects use, unless overridden.

---

## 8. Convincing Hand-Drawn Rendering

This is where "looks professional" vs. "looks like a slideshow" is actually won or lost. Concretely:

1. **Use rough.js for every shape outline**, with a *fixed random seed per object* (derived from the object's id, e.g. hash the string), so the same object looks identical on every re-render/scrub/export frame — otherwise "hand-drawn jitter" flickers on scrub, which reads as broken rather than charming.
2. **Draw-on reveal**: sample each shape's outline path into N points at authoring time (rough.js exposes path data). Animate a `progress: 0→1` value; each frame draw only the polyline up through `progress * N` points, with a small "moving pen tip" dot at the current draw point for the first ~200ms of the reveal (a subtle but very effective touch — it's what makes it read as "being drawn" versus "wiping in").
3. **Handwriting for text**: don't literally simulate handwriting stroke-by-stroke (very high effort, marginal payoff for v1). Use a genuine handwritten webfont + a per-character stagger fade/pop-in (each character appears ~40ms after the previous) synced to the `DRAW` duration. Reads as "being written" convincingly at a fraction of the engineering cost.
4. **Micro-imperfection consistency**: pick one `roughness` (e.g. 1.4) and one `bowing` value platform-wide per `STYLE handdrawn`, don't randomize per-object — visual consistency across a whole animation is what makes it feel like "one person's" drawing rather than a noisy pile of different sketch styles.
5. **Arrows**: never straight-line by default between two shape edges — offset the control point slightly perpendicular to the direct line (a gentle curve) and compute the actual anchor point as the nearest point on the *target shape's boundary*, not its center, so arrows visually terminate at the shape edge, not floating in its middle or clipping through it. This single rule fixes 90% of "looks like a diagramming tool, not a whiteboard" complaints.
6. **Layout collision avoidance (v1-lite)**: full auto-layout is a v2+ problem, but even a simple rule set removes most bad AI-generated layouts: (a) warn (validator) if two nodes' bounding boxes overlap by more than some threshold at any point in time, (b) provide a `PADDING` default around text inside shapes, (c) clamp all positions to stay within `CANVAS` bounds with a margin, flagging violations rather than silently clipping.

---

## 9. Rendering Efficiently in the Browser

- Single `<canvas>`, 2D context, **not** one DOM node per shape (avoids reflow costs and scales to complex scenes).
- Render loop: `requestAnimationFrame` → compute `elapsed` → `timeline.seekTo(elapsed, state)` → draw pass. Because seeking is stateless (§6), pausing/scrubbing/resizing are all free correctness-wise.
- **Two-canvas layering** is worth it: a static/background canvas (redrawn only when the background changes — rarely) + an active canvas (redrawn every frame). Minor optimization, meaningful at 60fps on longer scenes.
- **Offscreen pre-rasterization** for expensive nodes (equations, complex charts, code blocks with syntax highlighting): render once to an offscreen `<canvas>`/`ImageBitmap`, then just `drawImage` it into the main canvas every frame with the current transform — don't re-run KaTeX/tokenizer/chart-path-generation every frame.
- Cap devicePixelRatio scaling sensibly (render at `min(dpr, 2)`) to avoid melting perf on 3x-DPR laptops for a 1920x1080 logical canvas.

---

## 10. Export Pipeline (MP4 / WebM / GIF)

Recommended v1 approach — **server-side, deterministic frame capture**:

```
1. Client sends: { sceneDocument (IR), fps: 30, format: "mp4" } to /export
2. Server spins up headless Chromium (Playwright), loads a minimal render-only
   page that takes the SAME renderer code (shared package!) and the IR.
3. For each frame i in [0, totalDurationSec * fps]:
     timeline.seekTo(i / fps, state)
     draw()
     screenshot canvas → PNG buffer → write frame_00001.png ...
   (This is why stateless seekTo matters: frames can even be rendered
    out of order / in parallel workers, since each is fully independent.)
4. Pipe frame sequence into ffmpeg:
     ffmpeg -framerate 30 -i frame_%05d.png -c:v libx264 -pix_fmt yuv420p out.mp4
     ffmpeg -framerate 30 -i frame_%05d.png -c:v libvpx-vp9 out.webm
     ffmpeg -framerate 30 -i frame_%05d.png -vf "fps=15,scale=960:-1" out.gif
5. Upload result to object storage, return signed URL, job status via polling
   or websocket.
```

Why server-side over ffmpeg.wasm in-browser: deterministic frame timing (no dropped-frame drift from a wall-clock rAF loop), no tab-memory ceiling for longer videos, and it lets you later add a **render queue** so exports don't block the editor. Ship a "quick low-res preview GIF, client-side" as a nice-to-have later if you want an instant/free option — but it should not be your primary export path.

Critical shared-code point: **the export renderer and the live-preview renderer must be the literal same rendering package**, imported by both the browser bundle and the headless-Chromium page. Any divergence between them is exactly how you get "preview looked right, exported video looked different" bugs.

---

## 11. Project Storage Format

A project on disk/DB is a JSON envelope wrapping both the authored source and the compiled IR (store both — source is what the user edits, IR is what you'd need to re-render without re-parsing, and diffing between them is useful for debugging validator issues):

```typescript
interface ProjectFile {
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  dslVersion: "1.0";
  source: string;              // the raw author DSL text, always the source of truth for editing
  compiledIR?: SceneDocument;  // cached compile output; recomputed on save, optional to persist
  assets: { id: string; type: "image" | "icon" | "font"; url: string }[];
  thumbnailUrl?: string;
}
```

MVP: store as a single JSON blob in IndexedDB keyed by `projectId`, with a simple "My Projects" list view. Backend version: Postgres row (`source` as `text`, `compiledIR` as `jsonb` for fast querying/search later) + S3 for `assets`/exported videos/thumbnails.

---

## 12. Editor UI

Two-pane layout, exactly as you described, plus the pieces that make error-driven iteration actually usable:

```
┌─────────────────────────────┬───────────────────────────────┐
│  SCRIPT EDITOR (CodeMirror)  │      LIVE PREVIEW CANVAS       │
│  - syntax highlighting        │      - Run / Pause / Scrub bar │
│  - inline error squiggles     │      - Scene selector tabs     │
│  - autocomplete (keywords,    │      - current time / duration │
│    known object ids)          │                                 │
├─────────────────────────────┴───────────────────────────────┤
│  DIAGNOSTICS PANEL (list of errors/warnings, click→jump to line)│
├───────────────────────────────────────────────────────────────┤
│  [Run ▶] [Export ⬇] [Save] [Load] [Projects]                   │
└───────────────────────────────────────────────────────────────┘
```

- **Run/Preview** = parse → compile → validate → if zero blocking errors, feed IR to a fresh `Timeline` + `Player`, autoplay. If there are errors, don't silently run a partial animation — show the diagnostics panel and let the user choose "run anyway up to the error" vs fix first.
- **Live re-parse on change (debounced ~300ms)**, so the editor shows squiggles as the user (or a pasted AI-generated block) types, before they even hit Run.
- **Autocomplete** sourced from two lists: the static keyword table (from the grammar) and *dynamically*, the set of ids already `CREATE`d earlier in the script (so typing `ANIMATE ser` suggests `server`).
- **"Copy prompt for AI" button** (small but high-value): a button that copies a pre-written system-prompt block (containing a condensed grammar summary + 2-3 example scripts) to the clipboard, so the user's round-trip to ChatGPT/Gemini/Claude is one click, not "hope they remember the syntax." This is cheap to build and directly serves your stated long-term goal.

---

## 13. Validation & Error Reporting (designed for AI-in-the-loop)

Diagnostics should be structured, not just human strings — because the same JSON that renders as a red squiggle in the editor is exactly what you'd hand back to an AI later for auto-repair:

```json
{
  "severity": "error",
  "code": "E_UNKNOWN_REF",
  "message": "ARROW references unknown object \"servr\".",
  "line": 14,
  "col": 9,
  "suggestion": "Did you mean \"server\"?"
}
```

Design rules:
- **Never abort on first error** (§5) — always return the full diagnostic list for one Run.
- **Every error code is documented** (a table you maintain, e.g. `E_UNKNOWN_REF`, `E_DUPLICATE_ID`, `E_MISSING_REQUIRED_PROP`, `E_BAD_RANGE`, `E_UNCLOSED_BLOCK`) — this becomes the contract for a future "AI, here's what you got wrong, please fix" auto-repair loop (explicitly out of scope for MVP, but free to build later if diagnostics are structured now).
- **Warnings vs errors**: things like bounding-box overlap or a very long `WAIT` are warnings (animation still runs); missing required props or unresolved references are hard errors (blocks Run).
- **Graceful partial render option**: offer "Preview up to last valid frame" so a script with one bad line late in Scene 4 doesn't block the user from seeing Scenes 1-3 work.

---

## 14. Extensibility Without Breaking Syntax

Because of the `CREATE id AS TYPE` + keyword-value-props uniform grammar (§3 principle #2), you get most extensibility for free:

- **New shape type** → register a renderer function `{ draw(ctx, node, progress), boundingBox(node) }` in a `ShapeRegistry` map keyed by `type`. Grammar unchanged.
- **New animation verb** → register an interpolator function in an `AnimationRegistry` map keyed by verb name. Grammar unchanged (just a new accepted token after `ANIMATE id`).
- **New property** → add to the IR's `data: Record<string, unknown>` bag for type-specific properties (don't keep widening the core `SceneNode` interface for every niche property — only truly universal props like position/opacity/rotation live on the base type).
- **Breaking grammar changes** → bump `VERSION`, keep the old parser around keyed by version string indefinitely (cheap — parsers are pure functions over text), so old scripts (and old pasted-from-ChatGPT scripts using stale syntax you shared months ago) never silently misparse.
- **The IR is your real stability contract** — as argued in §0, most future feature growth should land as new `NodeType`s / `AnimationSpec.verb`s / registry entries, not grammar changes, keeping the DSL small and memorizable (good for humans *and* keeps an AI's effective "prompt budget" for the grammar small).

---

## 15. MVP Scope (explicit cut line)

**In MVP:**
- Shapes: `text`, `circle`, `rectangle`, `line`, `arrow`
- Grouping (`GROUP`)
- Animations: draw-on reveal, fade in/out, move
- Camera: zoom, pan (follow deferred)
- Scenes + linear timeline, `WAIT`, `PARALLEL`
- Hand-drawn rendering via rough.js + handwritten font
- Live preview with play/pause/scrub
- Save/load via IndexedDB (no backend yet)
- Export: MP4 + WebM via the server-side pipeline (stand up a minimal single-endpoint export service even in MVP — it's the true proof of "this pipeline works end to end," and GIF/other formats are trivial additions once ffmpeg is wired up)
- Parser + structured diagnostics, inline editor error display

**Explicitly deferred:**
- Rounded rects, cylinders, paths, freehand drawing, icons, images, code blocks, equations, charts
- Rotate/scale/highlight/shake/pulse/morph animations
- Camera follow
- Scene transitions (crossfade/wipe between scenes)
- Layers as an explicit user-facing concept (internally, keep the `layer: number` field from day one even if unused — trivial now, painful to retrofit)
- Backend/accounts/cloud project storage
- Any AI generation inside the product itself

This scope is deliberately chosen so that by the end of MVP you've touched *every* pipeline stage at least once (parser, IR, timeline, camera, hand-drawn render, export) — de-risking the whole architecture rather than perfecting one slice of it.

---

## 16. Development Roadmap

**Phase 0 — Language & IR (no UI, no rendering)**
Grammar finalized, lexer + parser + AST→IR compiler + validator, all unit-tested against a corpus of ~30 hand-written and ~30 deliberately-broken sample scripts. Output: a CLI that takes a `.wbs` file and prints either valid IR JSON or a diagnostics list. This phase is pure logic — get it right before touching Canvas.

**Phase 1 — Static Scene Graph Renderer**
Given IR, render the *final* state of a scene (no animation yet) to Canvas — shapes, text, positions, colors, hand-drawn style via rough.js. Proves the renderer half independent of timing.

**Phase 2 — Timeline & Animation Engine**
`Timeline.seekTo`, draw-on reveal, fade, move, easing. Play/pause/scrub UI. This is where it starts looking like the product.

**Phase 3 — Camera**
Zoom/pan, transform stack, easing tuned specifically for camera (feels very different from object easing at the same numeric params — expect to hand-tune).

**Phase 4 — Editor UX**
CodeMirror integration, inline diagnostics, autocomplete, debounced live-reparse, the "copy AI prompt" button.

**Phase 5 — Persistence**
IndexedDB save/load, project list view, basic thumbnailing (render frame 0 of scene 1 to a PNG).

**Phase 6 — Export Pipeline**
Headless-Chromium frame capture service + ffmpeg, MP4/WebM, job status polling, download.

**Phase 7 — Hardening & polish**
Arrow-to-boundary geometry, collision/overlap warnings, timing "feel" pass (default eases, default durations if omitted), a documented + versioned "AI prompt kit" (system prompt + examples) published alongside the product.

**Phase 8+ (post-MVP)**
Remaining shape/animation types, scene transitions, backend + accounts, then — only once the manual DSL path is proven and stable — the in-product AI generation loop (`prompt → AI → IR → validator → auto-repair-if-invalid → render`), using the same structured diagnostics designed in §13 to close that loop.

---

## 17. Folder / Monorepo Architecture

```
whiteboard-platform/
├── packages/
│   ├── dsl-parser/            # lexer, parser, AST, AST→IR compiler
│   │   ├── src/lexer.ts
│   │   ├── src/parser.ts
│   │   ├── src/compiler.ts
│   │   ├── src/diagnostics.ts
│   │   └── test/fixtures/*.wbs        (valid + intentionally-broken samples)
│   │
│   ├── scene-ir/               # the canonical types + JSON Schema (SOURCE OF TRUTH)
│   │   ├── src/types.ts
│   │   └── schema/scene-ir.schema.json
│   │
│   ├── validator/              # semantic validation over IR
│   │   └── src/validate.ts
│   │
│   ├── timeline-engine/        # Timeline, seekTo, easing, interpolation
│   │   ├── src/timeline.ts
│   │   └── src/easing.ts
│   │
│   ├── renderer/                # Canvas2D renderer — SHARED between browser & headless export
│   │   ├── src/draw.ts
│   │   ├── src/shapeRegistry.ts
│   │   ├── src/animationRegistry.ts
│   │   ├── src/camera.ts
│   │   └── src/handdrawn.ts    (rough.js integration, seeded jitter, draw-on sampling)
│   │
│   └── shared-types/            # cross-package small shared utils
│
├── apps/
│   ├── editor-web/              # React app: CodeMirror + preview canvas + UI (§12)
│   │   └── src/...
│   │
│   └── export-service/          # Node service: Playwright + ffmpeg export worker
│       └── src/exportJob.ts
│
├── docs/
│   ├── dsl-grammar.md           # published grammar (also the AI prompt-kit source)
│   └── ai-prompt-kit.md         # the exact system prompt + examples for ChatGPT/Gemini/Claude
│
└── turbo.json / pnpm-workspace.yaml
```

The critical architectural rule enforced by this layout: **`renderer/` has exactly one consumer-facing API and is imported unmodified by both `apps/editor-web` (browser) and `apps/export-service` (headless Chromium)** — this is what guarantees preview and export never diverge (§10).

---

## 18. Core Engine Code Sketches

### Easing (small, own it rather than importing a library)

```typescript
// packages/timeline-engine/easing.ts
export const Easing = {
  linear: (t: number) => t,
  easeInOut: (t: number) => (t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t),
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => t * t * t,
  bounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1/d1) return n1*t*t;
    if (t < 2/d1) return n1*(t -= 1.5/d1)*t + 0.75;
    if (t < 2.5/d1) return n1*(t -= 2.25/d1)*t + 0.9375;
    return n1*(t -= 2.625/d1)*t + 0.984375;
  },
} as const;

export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
```

### Stateless timeline resolution at time T

```typescript
// packages/timeline-engine/timeline.ts
export class Timeline {
  constructor(private ops: TimelineOp[]) {
    this.ops.sort((a, b) => a.t - b.t);
  }

  resolveAt(T: number): RenderState {
    const nodes = new Map<string, ResolvedNode>();
    let camera: CameraState = { x: 0, y: 0, scale: 1 };

    for (const op of this.ops) {
      if (op.t > T) break; // ops are sorted; safe to stop early

      if (op.kind === "create") {
        const elapsed = T - op.t;
        const progress = clamp01(elapsed / op.draw.duration);
        nodes.set(op.node.id, {
          ...op.node,
          revealProgress: Easing[op.draw.ease](progress),
        });
      }

      if (op.kind === "animate") {
        const node = nodes.get(op.targetId);
        if (!node) continue;
        const elapsed = T - op.t;
        const progress = clamp01(elapsed / op.anim.duration);
        const eased = Easing[op.anim.ease](progress);
        applyAnimationAtProgress(node, op.anim, eased); // mutates node's live position/opacity/etc
      }

      if (op.kind === "camera") {
        const elapsed = T - op.t;
        const progress = clamp01(elapsed / op.camera.duration);
        const eased = Easing[op.camera.ease](progress);
        camera = interpolateCamera(camera, op.camera, eased);
      }
    }

    return { nodes: [...nodes.values()], camera };
  }
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
```

Notice: this rebuilds the whole visible state from scratch given only `T` and the static op list. No mutable "current animation" bookkeeping across frames — pause, scrub backward, jump to export frame 4000, all just call `resolveAt(T)` again. This is the property that makes the export pipeline reliable and the preview scrubber trivial.

### Hand-drawn draw-on reveal (Canvas + rough.js sketch)

```typescript
// packages/renderer/handdrawn.ts
import rc from "roughjs";
import seedrandom from "seedrandom";

export function drawCircleReveal(
  ctx: CanvasRenderingContext2D,
  node: ResolvedNode,
  progress: number // 0..1, eased
) {
  const rng = seedrandom(node.id); // stable per-object "hand" — no re-jitter on scrub
  const roughCanvas = rc.canvas(ctx.canvas, { options: { roughness: 1.4, seed: hashSeed(node.id) } });

  if (progress >= 1) {
    roughCanvas.circle(node.position.x, node.position.y, node.radius! * 2, {
      stroke: node.style.color,
      strokeWidth: node.style.strokeWidth,
    });
    return;
  }

  // Partial reveal: draw an arc from 0 to progress*2π, sampled as a rough path
  const points: [number, number][] = [];
  const N = 64;
  const maxAngle = progress * Math.PI * 2;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * maxAngle;
    if (a > maxAngle) break;
    points.push([
      node.position.x + node.radius! * Math.cos(a - Math.PI / 2),
      node.position.y + node.radius! * Math.sin(a - Math.PI / 2),
    ]);
  }
  if (points.length > 1) {
    roughCanvas.linearPath(points, { stroke: node.style.color, strokeWidth: node.style.strokeWidth });
    // draw a small pen-tip dot at the current tip for the first portion of the reveal
    const [tx, ty] = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(tx, ty, node.style.strokeWidth * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = node.style.color;
    ctx.fill();
  }
}
```

### Arrow anchored to shape boundary, not center

```typescript
// packages/renderer/geometry.ts
export function boundaryAnchor(from: ResolvedNode, to: ResolvedNode): { x: number; y: number } {
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  const angle = Math.atan2(dy, dx);
  const r = boundaryRadiusAt(to, angle + Math.PI); // radius of `to`'s shape toward `from`
  return { x: to.position.x - r * Math.cos(angle), y: to.position.y - r * Math.sin(angle) };
}
```

---

## 19. Summary of the Strongest Changes vs. Your Original Plan

1. **Split DSL (author syntax) from Scene IR (canonical JSON contract).** This is the biggest structural upgrade — it de-risks AI-generation reliability and gives you a stable long-term contract independent of DSL syntax evolution.
2. **Uniform `CREATE id AS TYPE` + keyword-value props for everything**, with shape-specific shorthand as pure sugar. Keeps the grammar small, regular, and forgiving to parse/recover from — and makes new node/animation types a registry addition, not a grammar change.
3. **Explicit `END`-delimited blocks, not indentation.** Removes a common and silent LLM-generation failure mode.
4. **Stateless `resolveAt(T)` timeline model.** This single design decision is what makes scrubbing, pausing, and out-of-order/parallel export-frame-rendering all correct by construction instead of a source of animation bugs.
5. **Server-side headless-render export from day one**, sharing the literal renderer code with the live preview — avoids the classic "preview and export don't match" bug class entirely.
6. **rough.js for hand-drawn rendering with a seeded-per-object RNG**, not ad hoc jitter — visual consistency across scrubbing/re-render/export.
7. **Structured, non-fatal, multi-error diagnostics from the validator**, designed from day one to double as the contract for a future AI-repair loop, even though that loop isn't built until later.

---

## 20. Naming

A name should signal three things at once: hand-drawn/whiteboard visuals, that text is the program, and that it's a serious tool (not a toy).

**Literal / instantly understandable**
- **Scripted** — leans into "the text is the program"
- **Sketchflow** — hand-drawn + timeline/flow
- **DrawScript**
- **WBScript** / **WBS** — matches a `.wbs` file extension, reads as a dev-tool

**Evokes the AI-writes-it / platform-renders-it pipeline**
- **Storyboard** — very on-the-nose, likely already used elsewhere
- **Promptboard** — signals "AI writes it, this renders it" without being an AI tool itself
- **Scenecraft** — implies scenes, camera, construction

**Short, brandable, more abstract**
- **Strokeline** — stroke (hand-drawn) + timeline
- **Inkframe** / **Inkline**
- **Vellum** — old word for a drawing/writing surface; premium, distinct, ownable as a brand
- **Chalkline**

**Recommendation:** for a serious dev-tool feel (Figma/Linear/Mermaid-adjacent), go with **Vellum** or **Strokeline** — both are ownable as a brand name, not generic English words that collide with other products. For something more instantly self-explanatory to a first-time visitor (Canva/Loom-adjacent), **Sketchflow** communicates the product in one glance.

File extension suggestion either way: **`.wbs`** (WhiteBoard Script).