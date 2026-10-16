import { BRAND_ICON_CATALOG } from "@/defaults/brandIcons.generated.ts"
import { ICON_NAMES } from "@/dsl/grammar.ts"

export interface InsertOption {
  label: string
  category: string
  keywords: string
  imageUrl?: string
  snippet: (source: string, point?: InsertPoint) => string
}

interface InsertPoint {
  x: number
  y: number
}

export interface ObjectInsertContext {
  clientX: number
  clientY: number
  position: InsertPoint
  sceneIndex: number
  time: number
  playbackTime: number
  wasPlaying: boolean
}

function coordinates(point?: InsertPoint): InsertPoint {
  return {
    x: Math.round(point?.x ?? 960),
    y: Math.round(point?.y ?? 540),
  }
}

function nextId(source: string, prefix: string): string {
  const used = new Set(source.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [])
  let suffix = 1
  while (used.has(prefix + "_" + suffix)) suffix += 1
  return prefix + "_" + suffix
}

function parallelSnippet(snippet: string): string {
  return "PARALLEL\n" + snippet + "\nEND"
}

const objectOptions: InsertOption[] = [
  {
    label: "Text",
    category: "Text",
    keywords: "label title heading words",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "text") +
        " AS TEXT\n" +
        '  TEXT "Your text"\n  POSITION ' +
        at.x +
        " " +
        at.y +
        "\n" +
        "  SIZE 48\n  COLOR #1F2A44\n  DRAW 0.6s\nEND"
      )
    },
  },
  {
    label: "Rectangle",
    category: "Shape",
    keywords: "box panel square",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "rectangle") +
        " AS RECTANGLE\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  WIDTH 360\n  HEIGHT 240\n" +
        "  COLOR #1F5F82\n  FILL #EAF4FA\n  DRAW 0.6s\nEND"
      )
    },
  },
  {
    label: "Rounded card",
    category: "Shape",
    keywords: "rectangle panel box",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "card") +
        " AS RECTANGLE\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  WIDTH 480\n  HEIGHT 260\n" +
        "  CORNERS 24\n  COLOR #1F5F82\n  FILL #EAF4FA\n" +
        '  TEXT "Your message"\n  SIZE 36\n  DRAW 0.7s\nEND'
      )
    },
  },
  {
    label: "Circle",
    category: "Shape",
    keywords: "round dot node",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "circle") +
        " AS CIRCLE\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  RADIUS 90\n" +
        "  COLOR #1F5F82\n  FILL #DBEAFE\n  DRAW 0.7s\nEND"
      )
    },
  },
  {
    label: "Ellipse",
    category: "Shape",
    keywords: "oval",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "ellipse") +
        " AS ELLIPSE\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  WIDTH 360\n  HEIGHT 220\n" +
        "  COLOR #0F6B5C\n  FILL #D1FAE5\n  DRAW 0.7s\nEND"
      )
    },
  },
  {
    label: "Diamond",
    category: "Shape",
    keywords: "decision rhombus",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "diamond") +
        " AS DIAMOND\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  WIDTH 300\n  HEIGHT 220\n" +
        '  COLOR #B45309\n  FILL #FEF3C7\n  TEXT "Decision"\n' +
        "  SIZE 30\n  DRAW 0.7s\nEND"
      )
    },
  },
  {
    label: "Line",
    category: "Connector",
    keywords: "divider stroke",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "line") +
        " AS LINE\n" +
        "  FROM " +
        (at.x - 180) +
        " " +
        at.y +
        "\n" +
        "  TO " +
        (at.x + 180) +
        " " +
        at.y +
        "\n" +
        "  COLOR #64748B\n  STROKE 5\n  DRAW 0.6s\nEND"
      )
    },
  },
  {
    label: "Sticky note",
    category: "Note",
    keywords: "paper idea",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE sticky AS " +
        nextId(source, "note") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH TEXT "Key idea"'
      )
    },
  },
  {
    label: "Speech bubble",
    category: "Note",
    keywords: "dialogue quote",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE speech AS " +
        nextId(source, "speech") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH TEXT "Say something"'
      )
    },
  },
  {
    label: "Thought bubble",
    category: "Note",
    keywords: "idea cloud thought",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE thought AS " +
        nextId(source, "thought") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH TEXT "An idea"'
      )
    },
  },
  {
    label: "Badge",
    category: "Accent",
    keywords: "medal sticker highlight",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE badge AS " +
        nextId(source, "badge") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH TEXT "NEW"'
      )
    },
  },
  {
    label: "Progress ring",
    category: "Data",
    keywords: "percentage completion",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE progress AS " +
        nextId(source, "progress") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH VALUE "75%"'
      )
    },
  },
  {
    label: "Timeline",
    category: "Diagram",
    keywords: "milestones sequence",
    snippet: (source, point) => {
      const at = coordinates(point)
      const lineId = nextId(source, "timeline")
      const milestoneIds = [
        nextId(source, "milestone_start"),
        nextId(source, "milestone_middle"),
        nextId(source, "milestone_end"),
      ]
      return parallelSnippet(
        "CREATE " +
          lineId +
          " AS LINE\n" +
          "  FROM " +
          (at.x - 260) +
          " " +
          at.y +
          "\n" +
          "  TO " +
          (at.x + 260) +
          " " +
          at.y +
          "\n" +
          "  COLOR #64748B\n  STROKE 5\n  DRAW 0.7s\nEND\n" +
          ["Start", "Milestone", "Finish"]
            .map((label, index) => {
              const x = at.x + (index - 1) * 220
              const id = milestoneIds[index]
              return (
                "CREATE " +
                id +
                " AS CIRCLE\n" +
                "  POSITION " +
                x +
                " " +
                at.y +
                "\n  RADIUS 16\n" +
                "  COLOR #1F5F82\n  FILL #DBEAFE\n  DRAW 0.5s\nEND\n" +
                "CREATE " +
                id +
                "_label AS TEXT\n" +
                '  TEXT "' +
                label +
                '"\n  POSITION ' +
                x +
                " " +
                (at.y + 54) +
                "\n" +
                "  SIZE 28\n  COLOR #1F2A44\n  DRAW 0.4s\nEND"
              )
            })
            .join("\n")
      )
    },
  },
  {
    label: "Checklist",
    category: "Diagram",
    keywords: "todo check task",
    snippet: (source, point) => {
      const at = coordinates(point)
      return (
        "USE checklist AS " +
        nextId(source, "checklist") +
        " AT " +
        at.x +
        " " +
        at.y +
        ' WITH TEXT "Next action"'
      )
    },
  },
  {
    label: "Elbow arrow",
    category: "Connector",
    keywords: "flow direction connector right angle",
    snippet: (source, point) => {
      const at = coordinates(point)
      return parallelSnippet(
        "CREATE " +
          nextId(source, "connector_horizontal") +
          " AS LINE\n" +
          "  FROM " +
          (at.x - 180) +
          " " +
          (at.y + 80) +
          "\n" +
          "  TO " +
          at.x +
          " " +
          (at.y + 80) +
          "\n" +
          "  COLOR #2E86AB\n  STROKE 6\n  DRAW 0.3s\nEND\n" +
          "CREATE " +
          nextId(source, "connector_vertical") +
          " AS LINE\n" +
          "  FROM " +
          at.x +
          " " +
          (at.y + 80) +
          "\n  TO " +
          at.x +
          " " +
          (at.y - 80) +
          "\n  COLOR #2E86AB\n  STROKE 6\n  DRAW 0.3s\nEND\n" +
          "INK ARROW FROM " +
          at.x +
          " " +
          (at.y - 80) +
          " TO " +
          (at.x + 180) +
          " " +
          (at.y - 80) +
          "\n  COLOR #2E86AB\n  WIDTH 6\n  DRAW 0.4s\nEND"
      )
    },
  },
  {
    label: "Arrow",
    category: "Arrow",
    keywords: "ink direction connector",
    snippet: (_source, point) => {
      const at = coordinates(point)
      return (
        "INK ARROW FROM " +
        (at.x - 180) +
        " " +
        at.y +
        " TO " +
        (at.x + 180) +
        " " +
        at.y +
        "\n" +
        "  COLOR #2E86AB\n  WIDTH 6\n  DRAW 1s\nEND"
      )
    },
  },
  ...(["BARCHART", "LINECHART", "PIECHART"] as const).map((chartType) => ({
    label:
      chartType === "BARCHART"
        ? "Bar chart"
        : chartType === "LINECHART"
          ? "Line chart"
          : "Pie chart",
    category: "Chart",
    keywords: "data graph",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return (
        chartType +
        " " +
        nextId(source, "chart") +
        "\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  SIZE 900 500\n" +
        '  DATA "Alpha" 42\n  DATA "Beta" 68\n  DATA "Gamma" 35\nEND'
      )
    },
  })),
  {
    label: "Table",
    category: "Table",
    keywords: "comparison rows columns",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return (
        "TABLE " +
        nextId(source, "table") +
        "\n" +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  SIZE 1000 420\n" +
        '  COLUMNS "Option" "Value"\n  ROW "Alpha" "42"\n  ROW "Beta" "68"\nEND'
      )
    },
  },
  {
    label: "Callout",
    category: "Callout",
    keywords: "note bubble label",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      const boxId = nextId(source, "callout")
      const lineId = nextId(source, "callout_pointer")
      return parallelSnippet(
        "CREATE " +
          lineId +
          " AS LINE\n" +
          "  FROM " +
          (at.x - 70) +
          " " +
          (at.y + 70) +
          "\n" +
          "  TO " +
          (at.x - 110) +
          " " +
          (at.y + 120) +
          "\n" +
          "  COLOR #1F5F82\n  STROKE 5\n  DRAW 0.4s\nEND\n" +
          "CREATE " +
          boxId +
          " AS RECTANGLE\n" +
          "  POSITION " +
          at.x +
          " " +
          at.y +
          "\n  WIDTH 300\n  HEIGHT 140\n" +
          "  CORNERS 20\n  COLOR #1F5F82\n  FILL #EAF4FA\n" +
          '  TEXT "Key point"\n  SIZE 32\n  DRAW 0.6s\nEND'
      )
    },
  },
  ...ICON_NAMES.map((iconName) => ({
    label: iconName,
    category: "Icon",
    keywords: "lucide symbol " + iconName,
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "icon") +
        " AS ICON\n" +
        '  NAME "' +
        iconName +
        '"\n  POSITION ' +
        at.x +
        " " +
        at.y +
        "\n  SIZE 104\n" +
        "  COLOR #2E86AB\n  DRAW 0.8s\nEND"
      )
    },
  })),
  ...BRAND_ICON_CATALOG.map(({ slug, title, category, keywords }) => ({
    label: title,
    category: "Brand · " + category,
    keywords:
      "brand logo " + slug + " " + title + " " + category + " " + keywords,
    imageUrl: "/brand-icons/" + slug + ".svg",
    snippet: (source: string, point?: InsertPoint) => {
      const at = coordinates(point)
      return (
        "CREATE " +
        nextId(source, "brand") +
        " AS IMAGE\n" +
        '  URL "/brand-icons/' +
        slug +
        '.svg"\n' +
        "  POSITION " +
        at.x +
        " " +
        at.y +
        "\n  WIDTH 180\n  HEIGHT 140\n" +
        "  FIT contain\n  DRAW 0.8s\nEND"
      )
    },
  })),
]

export function objectInsertOptionsForQuery(query: string): InsertOption[] {
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? objectOptions.filter((option) =>
        (option.label + " " + option.category + " " + option.keywords)
          .toLowerCase()
          .includes(normalized)
      )
    : objectOptions.filter(
        (option) =>
          option.category !== "Icon" && !option.category.startsWith("Brand · ")
      )
  return filtered.slice(0, 80)
}
