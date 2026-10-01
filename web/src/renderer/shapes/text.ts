import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { DEFAULT_TEXT_SIZE } from "@/defaults/defaults.ts"
import { formatMathText } from "@/lib/mathText.ts"

export function textBoundingBox(node: SceneNode): BoundingBox {
  const fontSize = node.style.fontSize ?? DEFAULT_TEXT_SIZE
  const text = formatMathText(node.text ?? node.label ?? "")
  const layout = layoutText(
    text,
    fontSize,
    node.maxWidth,
    (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
    node.lineHeight
  )
  return {
    x: node.position.x - layout.width / 2 - (node.textBox?.padding ?? 0),
    y: node.position.y - layout.height / 2 - (node.textBox?.padding ?? 0),
    width: layout.width + (node.textBox?.padding ?? 0) * 2,
    height: layout.height + (node.textBox?.padding ?? 0) * 2,
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
      background: node.textBox?.background,
      backgroundOpacity: node.textBox?.opacity,
      backgroundPadding: node.textBox?.padding,
      backgroundCorners: node.textBox?.corners,
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
