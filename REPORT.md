# Demos Complete Verification Report

## Baseline
- Branch: demos-complete
- Started: 2026-10-08
- Existing worktree changes were preserved; no unrelated files were reverted.
- Phase status: Phase 0 complete; later phases pending.

## Phase 0 - pen alignment
- Fixed the pen/render path mismatch for:
  - plain PENFOLLOW rectangles (perimeter reveal);
  - Rough circles (shared sampled Rough paths);
  - FREEHAND (same smoothed/wobbled path);
  - lines (position/size-derived endpoint path);
  - routed arrows (shared route helper);
  - all paths now use eased `revealProgress`.
- Added [penAlignment.test.ts](./web/src/renderer/__tests__/penAlignment.test.ts) with world-space diagnostics and a canvas-pixel nib alignment assertion.
- Diagnostic output: plain rectangle, Rough rectangle, Rough circle, diamond, FREEHAND, line, and routed arrow all reported `dx=0, dy=0` at 25%, 50%, and 75%.
- `npm run typecheck`: passed.
- `npm test`: passed, 28 files / 112 tests.
- `npm run test:snapshots`: passed.
- `npm run build`: passed; only existing `import.meta` and chunk-size warnings.
- Legacy IR regression against `d72f664`: not rerun in this phase because no reusable regression command exists in the repository; this remains an explicit verification item.
- Camera-moved pixel coverage: not added yet; camera transform code applies to both scene and pen and remains a Phase 0 follow-up risk.

## Phase 1 - pen polish
- Pen rotation now follows the active path tangent with the requested bounded tilt formula.
- Overlapping PENFOLLOW create operations resolve deterministically to the first declared candidate.
- Validator emits `W_PENFOLLOW_OVERLAP` with a suggestion describing the single-pen rule.
- Targeted validation: 2 files / 4 tests passed.
- Full-suite, build, and golden reruns are required before the Phase 1 commit.

## Phase 2/3 - opt-in rough and ink controls
- Added DSL parsing/compiler data for `ROUGHNESS`, `ROUGHSEED`, `BOWING`, `ROUGHFILL`, `INKSIZE`, `THINNING`, `SMOOTHING`, `STREAMLINE`, and `TAPER`.
- Rough sampled geometry cache keys include all explicit rough controls; explicit seeds and roughness are deterministic and tested.
- Freehand rendering now consumes the explicit size/thinning/smoothing/streamline/taper controls, with existing defaults preserved.
- `ROUGHFILL` is parsed and retained in scene data, but patterned Rough.js fill-set rendering is not yet wired into shape renderers.

## Docs, Skills, and verification
- Updated app docs and `AI_prompt_kit.MD` with the new rough/freehand controls and the supported MORPH set: any pair of CIRCLE, ELLIPSE, RECTANGLE, or DIAMOND, including CIRCLE -> DIAMOND.
- Changed the runtime Rough.js import to the bundled browser-safe module. This fixed the validator's SSR module-resolution failure.
- Skills branch: `demos-complete`, commit `0b06b78`; added `advanced-render-controls.wbs` and syntax reference entries.
- Skills validation: 18 files, 0 blocking diagnostics, 0 quality warnings.
- Final app typecheck: passed.
- Final app test suite: 28 files, 113 tests passed.
- Final production build: passed; existing import.meta and chunk-size warnings remain.

## Blocked or incomplete
- ELK layout was not started; no `elkjs` dependency was added.
- Patterned Rough fill-set rendering is parsed/documented but not implemented.
- Legacy IR comparison against `d72f664` was not rerun because the repository has no reusable comparison command.
- Showcase PNG/GIF export, camera-moved pixel alignment coverage, and browser-authenticated verification were not run in this autonomous pass.
