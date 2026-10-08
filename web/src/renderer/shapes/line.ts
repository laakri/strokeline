import type { Point, SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import { strokeOptions, type RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { cachedSampledRoughPath, drawSampledPaths, shouldUseRoughSampledGeometry, sampleRoughDrawable } from "@/renderer/roughPath.ts"

export function lineEndpoints(node: SceneNode): { start: Point; end: Point } | undefined {
  const from = node.data?.from as { x?: number; y?: number } | undefined
  const to = node.data?.to as { x?: number; y?: number } | undefined
  if (from && to && typeof from.x === "number" && typeof from.y === "number" && typeof to.x === "number" && typeof to.y === "number") {
    return { start: { x: from.x, y: from.y }, end: { x: to.x, y: to.y } }
  }
  return undefined
}

export function lineBoundingBox(node: SceneNode): BoundingBox {
  const endpoints = lineEndpoints(node)
  if (endpoints) {
    return {
      x: Math.min(endpoints.start.x, endpoints.end.x),
      y: Math.min(endpoints.start.y, endpoints.end.y),
      width: Math.abs(endpoints.end.x - endpoints.start.x),
      height: Math.abs(endpoints.end.y - endpoints.start.y),
    }
  }
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

export function drawLine(renderContext: RenderContext, node: SceneNode): void {
  const box = lineBoundingBox(node)
  const options = { ...strokeOptions(node, renderContext.cameraScale) } as ReturnType<typeof strokeOptions> & { strokeLineDash?: number[] }
  const dashScale = 1 / renderContext.cameraScale
  if (node.style.lineStyle === "dashed") options.strokeLineDash = [10 * dashScale, 7 * dashScale]
  if (node.style.lineStyle === "dotted") options.strokeLineDash = [2 * dashScale, 6 * dashScale]
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  const endpoints = lineEndpoints(node)
  if (endpoints) {
    const start = endpoints.start
    const end = endpoints.end
    const target = { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress }
    if (shouldUseRoughSampledGeometry(node)) {
      const paths = cachedSampledRoughPath(`line:${node.id}:${start.x}:${start.y}:${end.x}:${end.y}:${node.style.pen}:${node.style.strokeWidth}:${renderContext.cameraScale}`, () =>
        sampleRoughDrawable(renderContext.roughGenerator.line(start.x, start.y, end.x, end.y, options)))
      drawSampledPaths(renderContext.context, paths, progress)
    } else renderContext.roughCanvas.line(start.x, start.y, target.x, target.y, options)
  } else {
    if (shouldUseRoughSampledGeometry(node)) {
      const paths = cachedSampledRoughPath(`line:${node.id}:${box.x}:${box.y}:${box.width}:${box.height}:${node.style.pen}:${node.style.strokeWidth}:${renderContext.cameraScale}`, () =>
        sampleRoughDrawable(renderContext.roughGenerator.line(box.x, box.y, box.x + box.width, box.y + box.height, options)))
      drawSampledPaths(renderContext.context, paths, progress)
    } else renderContext.roughCanvas.line(box.x, box.y, box.x + box.width * progress, box.y + box.height * progress, options)
  }
  drawLabel(renderContext, node.text ?? node.label, node.position, { color: node.style.color, fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE, fontFamily: node.style.fontFamily }, shouldUseRoughSampledGeometry(node) ? (progress >= 1 ? 1 : 0) : progress)
}

export const line: ShapeRenderer = { draw: drawLine, boundingBox: lineBoundingBox }
