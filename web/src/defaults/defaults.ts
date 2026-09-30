import type { EaseName, NodeStyle, Reveal } from "@/ir/types.ts"

export const DEFAULT_EASE: EaseName = "easeInOut"
export const DEFAULT_STROKE_WIDTH = 4
export const DEFAULT_COLOR = "#222222"
export const DEFAULT_DURATION = 1
export const DEFAULT_TEXT_SIZE = 36
export const DEFAULT_LABEL_SIZE = 30
export const DEFAULT_HIGHLIGHT_COLOR = "#FFD966"
export const DEFAULT_ICON_SIZE = 32

export const defaultStyle: NodeStyle = {
  color: DEFAULT_COLOR,
  strokeWidth: DEFAULT_STROKE_WIDTH,
}

export const defaultReveal: Reveal = {
  duration: DEFAULT_DURATION,
  ease: "easeOut",
  style: "draw-on",
}
