export type DocsSearchEntry = {
  title: string
  description: string
  page: string
  anchor: string
  keywords: string[]
  popular?: boolean
}

export const docsSearchEntries: DocsSearchEntry[] = [
  {
    title: "Quick start",
    description: "Open the studio and make your first board animation.",
    page: "getting-started",
    anchor: "quick-start",
    keywords: ["start setup beginner first steps create project"],
    popular: true,
  },
  {
    title: "Your first script",
    description: "Paste a prompt, run the code, and fix diagnostics.",
    page: "getting-started",
    anchor: "first-script",
    keywords: ["AI prompt code run compile validate errors"],
    popular: true,
  },
  {
    title: "Studio tools",
    description: "Editor, preview, object selection, and quick insert.",
    page: "studio",
    anchor: "studio-tools",
    keywords: ["workspace editor drag edit properties insert undo"],
  },
  {
    title: "Script language",
    description: "The Strokeline DSL structure, statements, and syntax.",
    page: "language",
    anchor: "language",
    keywords: ["VERSION CANVAS SCENE CREATE syntax grammar code"],
  },
  {
    title: "Themes and boards",
    description: "Choose a theme, board surface, and readable ink colors.",
    page: "theming",
    anchor: "theming",
    keywords: ["blueprint chalkboard school paper glass cosmic color style"],
    popular: true,
  },
  {
    title: "Objects, text, and math",
    description: "Text, shapes, icons, equations, and object properties.",
    page: "objects",
    anchor: "objects",
    keywords: ["TEXT SHAPE ICON Lucide math symbols font size color"],
    popular: true,
  },
  {
    title: "Drawing and layout",
    description: "Position, safe areas, lines, arrows, and readable layouts.",
    page: "objects",
    anchor: "drawing-layout",
    keywords: ["POSITION LINE ARROW dashed dotted route via head safe area overlap draw ink STACK GRID layout diagram architecture lanes"],
  },
  {
    title: "Images",
    description: "Load an image from a secure URL and animate its reveal.",
    page: "visuals",
    anchor: "images",
    keywords: ["IMAGE URL photo logo picture https fit corners"],
  },
  {
    title: "Comparison tables",
    description: "Build and highlight a compact comparison table.",
    page: "visuals",
    anchor: "tables",
    keywords: ["TABLE COLUMNS ROW HEADERCOLOR HIGHLIGHT cells"],
  },
  {
    title: "Macros, icons, and charts",
    description: "Reuse grouped elements and create data visuals.",
    page: "visuals",
    anchor: "reusable-data",
    keywords: ["DEFINE USE icons Lucide BARCHART LINECHART PIECHART"],
  },
  {
    title: "Timing and motion",
    description: "Animate objects, control scene timing, and add transitions.",
    page: "motion",
    anchor: "motion",
    keywords: ["ANIMATE ENTER EXIT EASE STAGGER LOOP CAMERA WAIT GAP"],
  },
  {
    title: "Subtitles and voice",
    description: "Write SAY narration, follow along, and set reader volume.",
    page: "audio-export",
    anchor: "narration",
    keywords: ["SAY subtitles captions Kokoro voice reader audio Arabic RTL"],
    popular: true,
  },
  {
    title: "Play and export",
    description: "Play scenes together, tune scene gaps, and export video.",
    page: "audio-export",
    anchor: "play-export",
    keywords: ["play all timeline scene delay MP4 WebM GIF PNG export"],
  },
  {
    title: "Fix common errors",
    description: "Understand validator messages and repair syntax safely.",
    page: "troubleshooting",
    anchor: "diagnostics",
    keywords: ["diagnostics validator warning error repair syntax missing END"],
    popular: true,
  },
]

const stopWords = new Set(["a", "an", "and", "for", "how", "i", "in", "is", "of", "the", "to", "with"])

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

function subsequenceMatch(word: string, candidate: string) {
  let index = 0
  for (const character of candidate) {
    if (character === word[index]) index += 1
    if (index === word.length) return true
  }
  return false
}

function scoreWord(word: string, values: string[]) {
  let best = 0
  for (const value of values) {
    const candidate = normalize(value)
    if (candidate === word) best = Math.max(best, 12)
    else if (candidate.startsWith(word)) best = Math.max(best, 10)
    else if (candidate.includes(word)) best = Math.max(best, 8)
    else if (word.length >= 3 && subsequenceMatch(word, candidate)) {
      best = Math.max(best, 3)
    }
  }
  return best
}

export function searchDocs(query: string) {
  const words = normalize(query)
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word))

  if (words.length === 0) {
    return docsSearchEntries.filter((entry) => entry.popular).slice(0, 6)
  }

  return docsSearchEntries
    .map((entry) => {
      const title = [entry.title]
      const keywords = entry.keywords.flatMap((keyword) => keyword.split(" "))
      const description = [entry.description]
      let score = 0
      for (const word of words) {
        const titleScore = scoreWord(word, title)
        const keywordScore = scoreWord(word, keywords)
        const descriptionScore = scoreWord(word, description)
        const wordScore = titleScore
          ? titleScore + 5
          : keywordScore
            ? keywordScore + 2
            : descriptionScore
        if (wordScore === 0) return { entry, score: 0 }
        score += wordScore
      }
      return { entry, score }
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ entry }) => entry)
}
