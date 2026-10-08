import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { applyShapeShadow, clearShapeShadow, drawShapeShadow, fillShape } from "@/renderer/shapes/shapePaint.ts"
import { drawRoughFill, drawSampledPathGroups, groupSampledPaths, sampledRoughPathsForNode, shouldUseRoughSampledGeometry, usesPatternedRoughFill } from "@/renderer/roughPath.ts"

export function circleBoundingBox(node: SceneNode): BoundingBox {
  const diameter = (node.radius ?? 0) * 2
  return {
    x: node.position.x - diameter / 2,
    y: node.position.y - diameter / 2,
    width: diameter,
    height: diameter,
  }
}

export function drawCircle(
  renderContext: RenderContext,
  node: SceneNode
): void {
  const radius = node.radius ?? 0
  const progress = Math.max(
    0,
    Math.min(
      1,
      (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1
    )
  )
  const text = node.text ?? node.label
  const maxWidth = node.maxWidth ?? radius * 1.25
  const fontSize = text ? fitTextFontSize(text, node.style.fontSize ?? DEFAULT_LABEL_SIZE, maxWidth, radius * 1.2, maxWidth,
    node.lineHeight ?? 1.3, (line, size) => measureTextWidth(line, size, node.style.fontFamily), 18) : node.style.fontSize ?? DEFAULT_LABEL_SIZE
  const bounds = circleBoundingBox(node)
  const roughReveal = shouldUseRoughSampledGeometry(node)
  const patternedFill = roughReveal && usesPatternedRoughFill(node)
  if (!patternedFill) {
    drawShapeShadow(renderContext.context, node, bounds, renderContext.cameraScale, () =>
      renderContext.context.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2)
    , progress)
  }
  if (progress > 0) {
    const context = renderContext.context
    context.save()
    if (!shouldUseRoughSampledGeometry(node)) {
      context.beginPath()
      context.rect(bounds.x, bounds.y, bounds.width * progress, bounds.height)
      context.clip()
    }
    if (!patternedFill) {
      fillShape(context, node, bounds, renderContext.cameraScale, () =>
        context.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2),
        false
      )
    }
    applyShapeShadow(context, node, renderContext.cameraScale)
    if (roughReveal) {
      if (progress >= 1) drawRoughFill(renderContext.roughCanvas, renderContext.roughGenerator, node, renderContext.cameraScale)
      drawSampledPathGroups(context, groupSampledPaths(sampledRoughPathsForNode(node, renderContext.cameraScale)), progress)
    } else {
      renderContext.roughCanvas.arc(
        node.position.x,
        node.position.y,
        radius * 2,
        radius * 2,
        -Math.PI / 2,
        -Math.PI / 2 + progress * Math.PI * 2,
        false,
        strokeOptions(node, renderContext.cameraScale)
      )
    }
    clearShapeShadow(context)
    context.restore()
  }
  drawLabel(
    renderContext,
    text,
    node.position,
    {
      color: node.style.color,
      fontSize,
      fontFamily: node.style.fontFamily,
      maxWidth: node.maxWidth,
      align: node.align,
      lineHeight: node.lineHeight,
    },
    progress
  )
}

export const circle: ShapeRenderer = {
  draw: drawCircle,
  boundingBox: circleBoundingBox,
}
