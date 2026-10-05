export interface ThemeStyle {
  board: string
  background: string
  ink: string
  pen: "chalk" | "marker" | "pencil" | "brush" | "handdrawn"
}

export const THEMES: Record<string, ThemeStyle> = {
  classic: { board: "chalkboard", background: "#18382F", ink: "#F5F0DB", pen: "chalk" },
  spotlight: { board: "spotlight", background: "#111820", ink: "#F7F1E6", pen: "marker" },
  atlas: { board: "atlas", background: "#F3EFE4", ink: "#243C46", pen: "pencil" },
  prism: { board: "prism", background: "#15162B", ink: "#F1F0FF", pen: "brush" },
  chalk: { board: "chalkboard", background: "#18382F", ink: "#F5F0DB", pen: "chalk" },
  cosmic: { board: "glass", background: "#11172B", ink: "#D7C6FF", pen: "brush" },
  foggywindow: { board: "foggywindow", background: "#0D1626", ink: "#DFE9F5", pen: "marker" },
  suspense: { board: "chalkboard", background: "#171717", ink: "#F2EDE0", pen: "chalk" },
  parchment: { board: "kraft", background: "#D6B98C", ink: "#493320", pen: "pencil" },
  blueprint: { board: "blueprint", background: "#16436B", ink: "#F3F5E8", pen: "marker" },
  cream: { board: "paper", background: "#F5EBD5", ink: "#342F29", pen: "marker" },
  deepsea: { board: "celestial", background: "#081629", ink: "#EAF6F3", pen: "brush" },
  fieldnotes: { board: "topographic", background: "#17261F", ink: "#F1E7C9", pen: "pencil" },
  afterhours: { board: "neon-grid", background: "#100F21", ink: "#F5F0FF", pen: "brush" },
  editorial: { board: "editorial", background: "#F6F1E7", ink: "#2F3340", pen: "marker" },
  classroom: { board: "blackboard", background: "#292C2D", ink: "#F5F1E5", pen: "chalk" },
  scrapbook: { board: "corkboard", background: "#C18C56", ink: "#35251B", pen: "pencil" },
  aurora: { board: "aurora", background: "#071927", ink: "#EDFCFF", pen: "brush" },
  atelier: { board: "linen", background: "#F4EFE5", ink: "#3C3634", pen: "pencil" },
  circuit: { board: "circuit", background: "#0D1B2A", ink: "#D9F9EE", pen: "marker" },
  notebook: { board: "notebook", background: "#FCF8EC", ink: "#27384A", pen: "pencil" },
  terrazzo: { board: "terrazzo", background: "#F2E7D5", ink: "#342D3A", pen: "marker" },
  nightwatch: { board: "sonar", background: "#06231D", ink: "#C7FFE0", pen: "marker" },
  pulp: { board: "halftone", background: "#F8E9B0", ink: "#1F2A5C", pen: "marker" },
  kyoto: { board: "zengarden", background: "#E6D8B8", ink: "#2A2723", pen: "brush" },
  gilded: { board: "marble", background: "#14161B", ink: "#F4E9CC", pen: "pencil" },
}

export const BOARD_BASES: Record<string, string> = {
  chalkboard: "#18382F", whiteboard: "#F7F7F2", blueprint: "#16436B",
  foggywindow: "#0D1626",
  kraft: "#D6B98C", paper: "#F5EBD5", graph: "#FCFCFA",
  dotted: "#FCFCFA", glass: "#11172B", plain: "#FAFAFA",
  celestial: "#081629", topographic: "#17261F", "neon-grid": "#100F21",
  editorial: "#F6F1E7",
  blackboard: "#292C2D", corkboard: "#C18C56", linen: "#F4EFE5", aurora: "#071927",
  circuit: "#0D1B2A", notebook: "#FCF8EC", terrazzo: "#F2E7D5",
  sonar: "#06231D", halftone: "#F8E9B0", zengarden: "#E6D8B8", marble: "#14161B",
  spotlight: "#111820", atlas: "#F3EFE4", prism: "#15162B",
}
