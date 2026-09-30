# Strokeline Project Structure

The repository contains planning documents at the root and one frontend
application inside `web/`. There is no nested app or package workspace.

```text
Strokeline/
├── AI_prompt_kit.MD
├── Idea.MD
├── Project_Structure.MD
└── web/
    ├── src/
    │   ├── app/                    # React entrypoint and application shell
    │   ├── components/             # shared interface components
    │   ├── ui/                     # reusable UI primitives
    │   ├── styles/                 # global Tailwind styles
    │   ├── dsl/                    # lexer, parser, grammar, diagnostics
    │   ├── ir/                     # versioned Scene IR types and schema
    │   ├── validator/              # semantic validation over IR
    │   ├── defaults/               # shared rendering and timeline defaults
    │   ├── timeline/               # stateless resolveAt(time) logic
    │   ├── renderer/               # dependency-clean Canvas renderer
    │   ├── player/                 # play, pause, seek, and canvas lifecycle
    │   ├── storage/                # local IndexedDB persistence, later
    │   └── lib/                    # small shared utilities
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── eslint.config.js
    ├── tsconfig.json
    ├── tsconfig.build.json
    └── tsconfig.node.json
```

## MVP boundaries

This is a single frontend application. Do not add a server, export service,
Turbo, or workspace packages during the MVP.

The dependency direction is one-way:

```text
dsl -> ir -> validator -> timeline -> renderer -> player -> app/ui
```

The core modules (`dsl`, `ir`, `validator`, `timeline`, and `renderer`) must
not import React, Zustand, Tailwind, or other UI code. The UI may call the
core pipeline, but the core pipeline must remain usable without the UI.

The first milestone is a trustworthy local preview: parse a script, show all
diagnostics, resolve the scene at any timestamp, and render the same result
for play, pause, and scrubbing. Persistence and export come later.
