export type EaseName = "linear" | "easeInOut" | "easeOut" | "easeIn" | "bounce" | "easeOutBack" | "easeOutElastic" | "easeInOutCubic" | "spring" | "natural"

export type NodeType =
  "text" | "circle" | "rectangle" | "line" | "arrow" | "ink" | "icon" | "chart" | "image"

export type TextAlign = "left" | "center" | "right"
export type TextAnchor =
  | "center"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "topleft"
  | "topright"
  | "bottomleft"
  | "bottomright"

export interface Point {
  x: number
  y: number
}

export interface NodeStyle {
  color: string
  fill?: string
  strokeWidth: number
  fontSize?: number
  fontStyle?: "normal" | "bold" | "italic"
  pen?: "handdrawn" | "chalk" | "marker" | "pencil" | "brush"
  fontFamily?: string
}

export interface SceneNode {
  id: string
  type: NodeType
  position: Point
  size?: { width: number; height: number }
  maxWidth?: number
  align?: TextAlign
  lineHeight?: number
  fit?: { width: number; height: number }
  image?: {
    url?: string
    fit: "cover" | "contain"
    corners: number
    mask?: "circle"
    border?: string
    shadow?: string
  }
  anchor?: TextAnchor
  radius?: number
  rotation: number
  opacity: number
  style: NodeStyle
  text?: string
  label?: string
  points?: Point[]
  data?: Record<string, unknown>
  layer: number
  groupId?: string
}

export interface Reveal {
  duration: number
  ease: EaseName
  style: "draw-on" | "fade-in" | "pop" | "text-wipe"
}

export interface AnimationSpec {
  verb: "move" | "scale" | "fade" | "rotate" | "erase" | "highlight" | "loop" | "enter" | "exit"
  effectName?: string
  loopName?: "float" | "pulse" | "wobble" | "breathe" | "blink"
  amplitude?: number
  period?: number
  to?: Partial<
    Pick<SceneNode, "position" | "rotation" | "opacity" | "size">
  > & { scale?: number }
  color?: string
  duration: number
  ease: EaseName
}

export interface CameraOp {
  verb: "zoom" | "pan" | "reset" | "drift" | "shake" | "follow"
  targetId?: string
  scale?: number
  position?: Point
  duration: number
  ease: EaseName
}

export interface SourceLocation {
  line: number
  col: number
}

export type SayTone = "explain" | "hook" | "warning" | "punchline" | "recap"

export interface SayLine {
  text: string
  start: number
  duration: number
  who?: string
  tone?: SayTone
  lang?: string
  detail?: string
  source?: SourceLocation
}

export type TimelineOp =
  | {
      kind: "create"
      t: number
      node: SceneNode
      draw: Reveal
      source?: SourceLocation
    }
  | {
      kind: "animate"
      t: number
      targetId: string
      anim: AnimationSpec
      source?: SourceLocation
    }
  | { kind: "camera"; t: number; camera: CameraOp; source?: SourceLocation }

export interface Scene {
  id: string
  index: number
  label?: string
  transition?: {
    type: "fade" | "wipe" | "slide" | "erase" | "none"
    duration: number
    source?: SourceLocation
  }
  gapAfter?: number
  duration?: number
  says?: SayLine[]
  ops: TimelineOp[]
}

export interface SceneDocument {
  version: "1.0"
  canvas: { width: number; height: number }
  background: string
  subtitles?: boolean
  style: { mode: "handdrawn" | "chalk" | "marker" | "pencil" | "brush" | "clean"; strokeWidth: number; font: string; board?: string; hand?: boolean; theme?: string }
  scenes: Scene[]
}

export interface Diagnostic {
  severity: "error" | "warning"
  code: string
  message: string
  line: number
  col: number
  suggestion?: string
}
