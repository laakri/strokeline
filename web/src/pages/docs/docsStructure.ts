export const docsPages = [
  { slug: "overview", label: "Overview", title: "Strokeline docs", description: "A practical guide to writing, styling, animating, and exporting whiteboard scenes." },
  { slug: "getting-started", label: "Get started", title: "Start with one scene", description: "Set up the canvas, write a first script, and get a clean preview." },
  { slug: "studio", label: "Studio tools", title: "Work directly in the studio", description: "Use the editor, searchable insert menu, diagnostics, and canvas actions together." },
  { slug: "language", label: "Language", title: "Learn the script language", description: "Understand scene structure, statements, properties, and reusable code." },
  { slug: "theming", label: "Themes and boards", title: "Set the visual world", description: "Choose a coordinated theme or combine a board, pen, font, and colors yourself." },
  { slug: "objects", label: "Objects and layout", title: "Build clear compositions", description: "Place, size, style, and connect text and drawn objects safely." },
  { slug: "visuals", label: "Images, tables, charts", title: "Add visual evidence", description: "Use icons, images, tables, macros, and charts to make ideas concrete." },
  { slug: "motion", label: "Timing and motion", title: "Control the movement", description: "Set reveals, entrances, loops, camera movement, and scene transitions." },
  { slug: "audio-export", label: "Voice and export", title: "Play it and take it with you", description: "Add narration, control playback, and export a finished video." },
  { slug: "troubleshooting", label: "Diagnostics", title: "Fix issues with confidence", description: "Read diagnostics, correct scripts, and keep your scene inside the frame." },
] as const

export const docsSectionPages: Record<string, string> = {
  "quick-start": "getting-started",
  "first-script": "getting-started",
  "studio-tools": "studio",
  language: "language",
  theming: "theming",
  objects: "objects",
  "drawing-layout": "objects",
  images: "visuals",
  tables: "visuals",
  "reusable-data": "visuals",
  motion: "motion",
  narration: "audio-export",
  "play-export": "audio-export",
  diagnostics: "troubleshooting",
}
