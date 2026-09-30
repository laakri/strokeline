export interface ThemeStyle {
  board: string
  background: string
  ink: string
  pen: "chalk" | "marker" | "pencil" | "brush" | "handdrawn"
}

export const THEMES: Record<string, ThemeStyle> = {
  classic: { board: "chalkboard", background: "#18382F", ink: "#F5F0DB", pen: "chalk" },
  chalk: { board: "chalkboard", background: "#18382F", ink: "#F5F0DB", pen: "chalk" },
  cosmic: { board: "glass", background: "#11172B", ink: "#D7C6FF", pen: "brush" },
  suspense: { board: "chalkboard", background: "#171717", ink: "#F2EDE0", pen: "chalk" },
  parchment: { board: "kraft", background: "#D6B98C", ink: "#493320", pen: "pencil" },
  blueprint: { board: "blueprint", background: "#16436B", ink: "#F3F5E8", pen: "marker" },
  cream: { board: "paper", background: "#F5EBD5", ink: "#342F29", pen: "marker" },
}

export const BOARD_BASES: Record<string, string> = {
  chalkboard: "#18382F", whiteboard: "#F7F7F2", blueprint: "#16436B",
  kraft: "#D6B98C", paper: "#F5EBD5", graph: "#FCFCFA",
  dotted: "#FCFCFA", glass: "#11172B", plain: "#FAFAFA",
}
