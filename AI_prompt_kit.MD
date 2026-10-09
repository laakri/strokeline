# Strokeline Script Generator

Before writing a Strokeline script, read and follow the current agent skill:
https://raw.githubusercontent.com/laakri/Strokeline-Skills/main/skills/strokeline/SKILL.md

Read the syntax reference and any other references/examples linked by the skill:
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

Before returning, validate the complete script with Strokeline's parser and
validator. Fix every error and review every warning. In particular, raw ink is
`INK <id>` with at least two `POINTS` coordinate pairs; `INK RAW` is not a mode.
Resolve low-contrast text and `W_SAY_ECHO` warnings by improving contrast and
rewriting narration to add context instead of repeating visible text. Re-run
validation after fixes, then return the complete editable script in the format
the user requests.
