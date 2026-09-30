import type { SceneNode } from "@/ir/types.ts"
import { features } from "@/defaults/features.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import {
  cameraScaledStrokeWidth,
  strokeOptions,
  type RenderContext,
} from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { DEFAULT_ICON_SIZE, DEFAULT_LABEL_SIZE } from "@/defaults/defaults.ts"
import { ICONS } from "@/renderer/shapes/icons.generated.ts"

export function iconBoundingBox(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? DEFAULT_ICON_SIZE
  const height = node.size?.height ?? DEFAULT_ICON_SIZE
  const box = {
    x: node.position.x - width / 2,
    y: node.position.y - height / 2,
    width,
    height,
  }
  return box
}

export function drawIcon(renderContext: RenderContext, node: SceneNode): void {
  const box = iconBoundingBox(node)
  const iconName = String(node.data?.iconName ?? node.data?.name ?? "")
  const primitives = ICONS[iconName] ?? []
  const progress = Math.max(
    0,
    Math.min(
      1,
      (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1
    )
  )
  if (features.iconDrawing && progress > 0 && primitives.length > 0) {
    const options = strokeOptions(node, renderContext.cameraScale)
    const color = options.stroke
    const inner = Math.min(box.width, box.height)
    const scale = (inner * 0.62) / 24
    const offsetX = box.x + (box.width - 24 * scale) / 2
    const offsetY = box.y + (box.height - 24 * scale) / 2
    const ctx = renderContext.context
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(scale, scale)
    ctx.lineWidth = cameraScaledStrokeWidth(
      2.2 / scale,
      renderContext.cameraScale
    )
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color
    const path = new Path2D()
    for (const [tag, attrs] of primitives) {
      const p = new Path2D()
      applyPrimitive(p, tag, attrs)
      path.addPath(p)
    }
    if (progress < 1) {
      const mask = new Path2D()
      const drawProgress = progress * inner * 2
      mask.rect(box.x, box.y, drawProgress, box.height)
      ctx.clip(mask)
    }
    ctx.stroke(path)
    ctx.restore()
  }
  drawLabel(
    renderContext,
    node.text ?? node.label,
    node.position,
    {
      color: node.style.color,
      fontSize: node.style.fontSize ?? DEFAULT_LABEL_SIZE,
    },
    progress
  )
}

function applyPrimitive(
  target: Path2D,
  tag: string,
  attrs: Record<string, string>
): void {
  switch (tag) {
    case "path":
      target.addPath(new Path2D(attrs.d ?? ""))
      break
    case "circle": {
      const r = Number(attrs.r ?? 0)
      target.moveTo(Number(attrs.cx ?? 0) + r, Number(attrs.cy ?? 0))
      target.arc(
        Number(attrs.cx ?? 0),
        Number(attrs.cy ?? 0),
        r,
        0,
        Math.PI * 2
      )
      break
    }
    case "rect": {
      const width = Number(attrs.width ?? 0)
      const height = Number(attrs.height ?? 0)
      const x = Number(attrs.x ?? 0)
      const y = Number(attrs.y ?? 0)
      const rx = Number(attrs.rx ?? 0)
      if (rx > 0) {
        target.moveTo(x + rx, y)
        target.lineTo(x + width - rx, y)
        target.quadraticCurveTo(x + width, y, x + width, y + rx)
        target.lineTo(x + width, y + height - rx)
        target.quadraticCurveTo(
          x + width,
          y + height,
          x + width - rx,
          y + height
        )
        target.lineTo(x + rx, y + height)
        target.quadraticCurveTo(x, y + height, x, y + height - rx)
        target.lineTo(x, y + rx)
        target.quadraticCurveTo(x, y, x + rx, y)
      } else {
        target.rect(x, y, width, height)
      }
      break
    }
    case "ellipse": {
      const rx = Number(attrs.rx ?? 0)
      const ry = Number(attrs.ry ?? 0)
      target.moveTo(Number(attrs.cx ?? 0) + rx, Number(attrs.cy ?? 0))
      target.ellipse(
        Number(attrs.cx ?? 0),
        Number(attrs.cy ?? 0),
        rx,
        ry,
        0,
        0,
        Math.PI * 2
      )
      break
    }
    case "line": {
      target.moveTo(Number(attrs.x1 ?? 0), Number(attrs.y1 ?? 0))
      target.lineTo(Number(attrs.x2 ?? 0), Number(attrs.y2 ?? 0))
      break
    }
    case "polyline":
    case "polygon": {
      const points = (attrs.points ?? "").trim().split(/\s+|,/).map(Number)
      if (points.length >= 2) {
        target.moveTo(points[0], points[1])
        for (let i = 2; i < points.length; i += 2) {
          target.lineTo(points[i], points[i + 1])
        }
        if (tag === "polygon") {
          target.closePath()
        }
      }
      break
    }
    default:
      break
  }
}

export const icon: ShapeRenderer = {
  draw: drawIcon,
  boundingBox: iconBoundingBox,
}
