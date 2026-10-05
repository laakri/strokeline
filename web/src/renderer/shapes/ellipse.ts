import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"

export function ellipseBoundingBox(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return {
    x: node.position.x - width / 2,
    y: node.position.y - height / 2,
    width,
    height,
  }
}

export function drawEllipse(render: RenderContext, node: SceneNode): void {
  const box = ellipseBoundingBox(node)
  const progress = Math.max(
    0,
    Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1)
  )
  const text = node.text ?? node.label
  const maxWidth = node.maxWidth ?? box.width * 0.7
  const fontSize = text ? fitTextFontSize(text, node.style.fontSize ?? DEFAULT_LABEL_SIZE, maxWidth, box.height * 0.55, maxWidth,
    node.lineHeight ?? 1.3, (line, size) => measureTextWidth(line, size, node.style.fontFamily), 18) : node.style.fontSize ?? DEFAULT_LABEL_SIZE
  if (progress > 0) {
    const context = render.context
    context.save()
    context.beginPath()
    context.rect(box.x, box.y, box.width * progress, box.height)
    context.clip()
    render.roughCanvas.ellipse(
      node.position.x,
      node.position.y,
      box.width,
      box.height,
      strokeOptions(node, render.cameraScale)
    )
    context.restore()
  }
  drawLabel(
    render,
    text,
    node.position,
    {
      color: node.style.color,
      fontSize,
      fontFamily: node.style.fontFamily,
      maxWidth,
      align: node.align ?? "center",
      lineHeight: node.lineHeight,
    },
    progress
  )
}

export const ellipse: ShapeRenderer = { draw: drawEllipse, boundingBox: ellipseBoundingBox }
