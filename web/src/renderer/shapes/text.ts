import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { DEFAULT_TEXT_SIZE } from "@/defaults/defaults.ts"

export function textBoundingBox(node: SceneNode): BoundingBox {
  const fontSize = node.style.fontSize ?? DEFAULT_TEXT_SIZE
  const text = node.text ?? node.label ?? ""
  const layout = layoutText(
    text,
    fontSize,
    node.maxWidth,
    (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
    node.lineHeight
  )
  return {
    x: node.position.x - layout.width / 2,
    y: node.position.y - layout.height / 2,
    width: layout.width,
    height: layout.height,
  }
}

export function drawText(renderContext: RenderContext, node: SceneNode): void {
  drawLabel(
    renderContext,
    node.text ?? node.label,
    node.position,
    {
      color: node.style.color,
      fontSize: node.style.fontSize ?? DEFAULT_TEXT_SIZE,
      maxWidth: node.maxWidth,
      align: node.align,
      lineHeight: node.lineHeight,
      fontFamily: node.style.fontFamily,
    },
    (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1,
    (node as SceneNode & { revealStyle?: string }).revealStyle === "text-wipe",
    node.id
  )
}

export const text: ShapeRenderer = {
  draw: drawText,
  boundingBox: textBoundingBox,
}
