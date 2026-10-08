import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { applyShapeShadow, clearShapeShadow, drawShapeShadow, fillShape } from "@/renderer/shapes/shapePaint.ts"
import { drawRoughFill, drawSampledPathGroups, groupSampledPaths, sampledRoughPathsForNode, shouldUseRoughSampledGeometry, usesPatternedRoughFill } from "@/renderer/roughPath.ts"

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
  const roughReveal = shouldUseRoughSampledGeometry(node)
  const patternedFill = roughReveal && usesPatternedRoughFill(node)
  if (!patternedFill) {
    drawShapeShadow(render.context, node, box, render.cameraScale, () =>
      render.context.ellipse(node.position.x, node.position.y, box.width / 2, box.height / 2, 0, 0, Math.PI * 2)
    , progress)
  }
  if (progress > 0) {
    const context = render.context
    context.save()
    if (!roughReveal) {
      context.beginPath()
      context.rect(box.x, box.y, box.width * progress, box.height)
      context.clip()
    }
    if (!patternedFill) {
      fillShape(context, node, box, render.cameraScale, () =>
        context.ellipse(node.position.x, node.position.y, box.width / 2, box.height / 2, 0, 0, Math.PI * 2),
        roughReveal ? progress >= 1 : false
      )
    }
    applyShapeShadow(context, node, render.cameraScale)
    if (roughReveal) {
      const paths = sampledRoughPathsForNode(node, render.cameraScale)
      if (progress >= 1) drawRoughFill(render.roughCanvas, render.roughGenerator, node, render.cameraScale)
      drawSampledPathGroups(context, groupSampledPaths(paths), progress)
    } else render.roughCanvas.ellipse(
        node.position.x, node.position.y, box.width, box.height, strokeOptions(node, render.cameraScale))
    clearShapeShadow(context)
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
    roughReveal ? (progress >= 1 ? 1 : 0) : progress
  )
}

export const ellipse: ShapeRenderer = { draw: drawEllipse, boundingBox: ellipseBoundingBox }
