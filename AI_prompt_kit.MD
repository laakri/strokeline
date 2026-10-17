# Strokeline Script Generator

FIRST, read and follow the complete Strokeline AI skill bundle:
https://raw.githubusercontent.com/laakri/Strokeline-Skills/main/llms-full.txt

The bundle contains the skill, references, vocabulary, diagnostics, and example
index. Do not rely on remembered syntax or invent unsupported features. If the
bundle is unavailable, read the current skill and the references/examples it
links to:
https://raw.githubusercontent.com/laakri/Strokeline-Skills/main/skills/strokeline/SKILL.md
https://raw.githubusercontent.com/laakri/Strokeline-Skills/main/skills/strokeline/references/syntax.md
https://github.com/laakri/Strokeline-Skills/tree/main/skills/strokeline

If GitHub's folder page cannot be opened, fetch the individual files from their
raw.githubusercontent.com URLs or use the GitHub API to list the directory;
do not guess filenames or conclude the files are unavailable based only on a
blocked folder page. Use the skill's linked references and examples. Do not
reproduce the skill here or rely on memory for syntax and supported features.
If the repository cannot be accessed, use Strokeline's in-app documentation.
Ask the user to paste or upload documentation only if both sources are
unavailable.

When the script needs external images, use Pexels as the only image source.
Use direct image URLs that Strokeline can load, not Pexels page URLs, and do
not substitute images from other sites. If a usable Pexels image URL cannot be
confirmed, omit the image or ask the user.

Before returning, validate the complete script with the studio's parser and
validator. Fix every error and review every warning. In particular, raw ink is
`INK <id>` with at least two `POINTS` coordinate pairs; `INK RAW` is not a mode.
Resolve low-contrast text and `W_SAY_ECHO` warnings by improving contrast and
rewriting narration to add context instead of repeating visible text. Re-run
validation after fixes, then return the complete editable script in the format
the user requests. For narration, use `DURATION auto` or omit `DURATION` when
estimated cue timing is appropriate; use explicit `s`/`ms` timing when the
scene requires a fixed duration. Prepared Kokoro narration uses the decoded
audio duration to rescale the estimated word timings, while preserving any
longer declared duration. Captions follow each cue in short word-timed groups.
Text-only `ENTER` effects are `typewriter`, `scramble`,
`word-by-word`, and `marker`; use `WORDS "..."` with `marker` to name its
highlighted words. For route motion, use a named `ARROW route FROM source ->
target`, then `PATHFOLLOW object ALONG route` with explicit timing and optional
`TRAIL on`, which draws a tapered, fading wake over the last quarter of the
travelled route. Following circles get a subtle shadow and lighter ring;
`GLOW on` on a `CIRCLE` adds a soft halo in its color. MP4 export writes fragmented output incrementally and may retry a
1080p memory-pressure failure at 720p. Procedural `CODE`, `TERMINAL`,
`BROWSER`, `PHONE`, `COUNTER`, `SPLIT`, and `BEFORE-AFTER` are available as
measurable `CREATE id AS TYPE` blocks; use the exact component properties in
the vocabulary and syntax references. Browser/phone children use `PARENT id`
and must fit inside the component content bounds. Code lines use repeated
`CODELINE "..."`; timed row highlights use `ANIMATE id HIGHLIGHT ROW n`.
Keep rendered text at least 24px at 1080p equivalent, scaled to other canvas
heights; the validator reports `W_TEXT_TOO_SMALL` with the affected object ID
and measured size. Component text has enforced minimum sizes of 26px for
CODE/TERMINAL content, 24px for BROWSER/PHONE title/address, 32px for
SPLIT/BEFORE-AFTER labels, and 48px for COUNTER values (all scaled by canvas
height). Increase component bounds or shorten content rather than shrinking
below those component minimums.
