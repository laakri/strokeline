import type { SceneNode } from "@/ir/types.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawArrow, arrowBoundingBox } from "@/renderer/shapes/arrow.ts"
import { icon } from "@/renderer/shapes/icon.ts"
import { drawCircle, circleBoundingBox } from "@/renderer/shapes/circle.ts"
import { drawLine, lineBoundingBox } from "@/renderer/shapes/line.ts"
import { drawRectangle, rectangleBoundingBox } from "@/renderer/shapes/rectangle.ts"
import { drawText, textBoundingBox } from "@/renderer/shapes/text.ts"
import { chart } from "@/renderer/shapes/chart.ts"

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ShapeRenderer {
  draw: (renderContext: RenderContext, node: SceneNode) => void
  boundingBox: (node: SceneNode) => BoundingBox
}

export const ShapeRegistry: Record<Exclude<SceneNode["type"], "ink">, ShapeRenderer> = {
  circle: { draw: drawCircle, boundingBox: circleBoundingBox },
  rectangle: { draw: drawRectangle, boundingBox: rectangleBoundingBox },
  text: { draw: drawText, boundingBox: textBoundingBox },
  line: { draw: drawLine, boundingBox: lineBoundingBox },
  arrow: { draw: drawArrow, boundingBox: arrowBoundingBox },
  icon: icon,
  chart,
}
