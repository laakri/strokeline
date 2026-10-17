import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { fitTextFontSize } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import {
  applyShapeShadow,
  clearShapeShadow,
  drawShapeShadow,
  fillShape,
} from "@/renderer/shapes/shapePaint.ts"
import {
  drawRoughFill,
  drawSampledPathGroups,
  groupSampledPaths,
  sampledRoughPathsForNode,
  shouldUseRoughSampledGeometry,
  usesPatternedRoughFill,
} from "@/renderer/roughPath.ts"

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
  const fontSize = text
    ? fitTextFontSize(
        text,
        node.style.fontSize ?? DEFAULT_LABEL_SIZE,
        maxWidth,
        radius * 1.2,
        maxWidth,
        node.lineHeight ?? 1.3,
        (line, size) => measureTextWidth(line, size, node.style.fontFamily),
        18
      )
    : (node.style.fontSize ?? DEFAULT_LABEL_SIZE)
  const bounds = circleBoundingBox(node)
  const roughReveal = shouldUseRoughSampledGeometry(node)
  const patternedFill = roughReveal && usesPatternedRoughFill(node)
  const pathFollowing = node.data?.pathFollowing === true
  const paintNode = pathFollowing && node.style.shadow === undefined
    ? { ...node, style: { ...node.style, shadow: 10 } }
    : node
  if (node.data?.glow === true && progress > 0) {
    const context = renderContext.context
    context.save()
    context.globalAlpha *= 0.32 * progress
    context.fillStyle = node.style.fill ?? node.style.color
    context.shadowColor = node.style.fill ?? node.style.color
    context.shadowBlur = Math.max(8, radius * 0.7 / renderContext.cameraScale)
    context.beginPath()
    context.arc(node.position.x, node.position.y, radius * 0.72, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }
  if (!patternedFill) {
    drawShapeShadow(
      renderContext.context,
      paintNode,
      bounds,
      renderContext.cameraScale,
      () =>
        renderContext.context.arc(
          node.position.x,
          node.position.y,
          radius,
          0,
          Math.PI * 2
        ),
      progress
    )
  }
  if (progress > 0) {
    const context = renderContext.context
    context.save()
    if (!shouldUseRoughSampledGeometry(node)) {
      const revealPadding = Math.max(2, node.style.strokeWidth * 2)
      context.beginPath()
      context.rect(
        bounds.x - revealPadding,
        bounds.y - revealPadding,
        (bounds.width + revealPadding * 2) * progress,
        bounds.height + revealPadding * 2
      )
      context.clip()
    }
    if (!patternedFill) {
      fillShape(
        context,
        paintNode,
        bounds,
        renderContext.cameraScale,
        () =>
          context.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2),
        false
      )
    }
    applyShapeShadow(context, paintNode, renderContext.cameraScale)
    if (roughReveal) {
      if (progress >= 1)
        drawRoughFill(
          renderContext.roughCanvas,
          renderContext.roughGenerator,
          node,
          renderContext.cameraScale
        )
      drawSampledPathGroups(
        context,
        groupSampledPaths(
          sampledRoughPathsForNode(node, renderContext.cameraScale)
        ),
        progress
      )
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
  if (pathFollowing && progress > 0) {
    const context = renderContext.context
    context.save()
    context.globalAlpha *= progress * 0.72
    context.strokeStyle = lightenColor(node.style.fill ?? node.style.color)
    context.lineWidth = Math.max(1, 1.5 / renderContext.cameraScale)
    context.beginPath()
    context.arc(
      node.position.x,
      node.position.y,
      Math.max(0, radius - context.lineWidth * 1.5),
      0,
      Math.PI * 2
    )
    context.stroke()
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

function lightenColor(color: string): string {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color)
  if (!match) return "#FFFFFF"
  const hex = match[1]!.length === 3
    ? [...match[1]!].map((part) => part + part).join("")
    : match[1]!
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16))
  return `#${channels.map((channel) => Math.round(channel + (255 - channel) * 0.58).toString(16).padStart(2, "0")).join("")}`
}

export const circle: ShapeRenderer = {
  draw: drawCircle,
  boundingBox: circleBoundingBox,
}
