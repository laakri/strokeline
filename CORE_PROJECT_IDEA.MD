# Strokeline: core project idea

Strokeline is a browser-based studio for turning explanations into editable whiteboard animations. People describe a lesson, product, process, or story in a compact text-based scene language; Strokeline compiles that script into a deterministic timeline and renders it as a polished, hand-drawn-style animation.

## The product

The script editor is the source of truth. Authors build scenes from text, shapes, icons, ink strokes, reusable macros, charts, camera moves, and transitions. Diagnostics catch layout and pacing problems while keeping creative iteration quick. A live preview makes every scene scrubbable and repeatable, and exports turn the finished sequence into shareable media.

## What makes it useful

- **Idea to visual explanation:** guide authors toward a clear story arc, not a stack of text slides.
- **Editable and reproducible:** scripts define scenes; `resolveAt(t)` makes any frame deterministic and repeatable.
- **Expressive without asset work:** procedural boards, seeded pen styles, motion, icons, built-in visual macros, and data charts provide a rich visual toolkit.
- **Fast feedback:** preview, timeline controls, source-linked diagnostics, and scene playback keep writing and visual review together.
- **Broad communication:** support multiple visual themes and self-hosted fonts, including Arabic text with right-to-left shaping.

## Core architecture

Text source is parsed into an AST, compiled into scene IR, checked by the validator, resolved at a requested time, and drawn by the Canvas renderer. The same scene data powers preview, playback, and export. Procedural rendering and cached offscreen surfaces keep visuals consistent while enabling many distinct scenes without requiring a library of pre-rendered frames.

## Product principle

Clarity comes first. Every visual element should explain, compare, guide attention, or add useful character. Rich scenes should feel complete and intentional while remaining readable, well-paced, and easy to edit.
