import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { getImage, getImageError, IMAGE_EMBED_ERROR } from "@/renderer/images.ts"

export function imageBoundingBox(node: SceneNode): BoundingBox {
  const width = node.size?.width ?? 0
  const height = node.size?.height ?? 0
  return { x: node.position.x - width / 2, y: node.position.y - height / 2, width, height }
}

function imagePath(context: CanvasRenderingContext2D, node: SceneNode, box: BoundingBox): void {
  context.beginPath()
  if (node.image?.mask === "circle") {
    context.arc(node.position.x, node.position.y, Math.min(box.width, box.height) / 2, 0, Math.PI * 2)
    return
  }
  const radius = Math.max(0, Math.min(node.image?.corners ?? 0, box.width / 2, box.height / 2))
  if (radius === 0) {
    context.rect(box.x, box.y, box.width, box.height)
    return
  }
  context.moveTo(box.x + radius, box.y)
  context.arcTo(box.x + box.width, box.y, box.x + box.width, box.y + box.height, radius)
  context.arcTo(box.x + box.width, box.y + box.height, box.x, box.y + box.height, radius)
  context.arcTo(box.x, box.y + box.height, box.x, box.y, radius)
  context.arcTo(box.x, box.y, box.x + box.width, box.y, radius)
  context.closePath()
}

function drawFittedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  box: BoundingBox,
  fit: "cover" | "contain"
): void {
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) return
  if (fit === "cover") {
    const scale = Math.max(box.width / sourceWidth, box.height / sourceHeight)
    const cropWidth = box.width / scale
    const cropHeight = box.height / scale
    context.drawImage(
      image,
      (sourceWidth - cropWidth) / 2,
      (sourceHeight - cropHeight) / 2,
      cropWidth,
      cropHeight,
      box.x,
      box.y,
      box.width,
      box.height
    )
    return
  }
  const scale = Math.min(box.width / sourceWidth, box.height / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  context.drawImage(image, box.x + (box.width - width) / 2, box.y + (box.height - height) / 2, width, height)
}

function drawPlaceholder(context: CanvasRenderingContext2D, node: SceneNode, box: BoundingBox): void {
  context.fillStyle = "#F2EEE5"
  context.fillRect(box.x, box.y, box.width, box.height)
  context.strokeStyle = "#C5BBA8"
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(box.x + 14, box.y + 14)
  context.lineTo(box.x + box.width - 14, box.y + box.height - 14)
  context.moveTo(box.x + box.width - 14, box.y + 14)
  context.lineTo(box.x + 14, box.y + box.height - 14)
  context.stroke()
  context.fillStyle = "#554D42"
  context.textAlign = "center"
  context.textBaseline = "middle"
  context.font = "600 20px sans-serif"
  const message = getImageError(node.image?.url) ?? (node.image?.url ? "Loading image…" : "IMAGE URL required")
  const lines = message === IMAGE_EMBED_ERROR
    ? ["This site blocks embedding.", "Try another URL."]
    : [message]
  lines.forEach((line, index) => context.fillText(line, node.position.x, node.position.y + (index - (lines.length - 1) / 2) * 28, Math.max(1, box.width - 28)))
}

export function drawImage(render: RenderContext, node: SceneNode): void {
  const context = render.context
  const box = imageBoundingBox(node)
  const progress = Math.max(0, Math.min(1, (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1))
  if (progress <= 0 || box.width <= 0 || box.height <= 0) return
  const image = getImage(node.image?.url)
  context.save()
  imagePath(context, node, box)
  context.shadowColor = node.image?.shadow ?? "transparent"
  context.shadowBlur = node.image?.shadow ? 18 : 0
  context.shadowOffsetY = node.image?.shadow ? 6 : 0
  context.fillStyle = image ? "#FFFFFF" : "#F2EEE5"
  context.fill()
  context.shadowColor = "transparent"
  context.shadowBlur = 0
  context.shadowOffsetY = 0
  imagePath(context, node, box)
  context.clip()
  context.beginPath()
  context.rect(box.x, box.y, box.width * progress, box.height)
  context.clip()
  if (image) drawFittedImage(context, image, box, node.image?.fit ?? "cover")
  else drawPlaceholder(context, node, box)
  if (node.image?.border) {
    imagePath(context, node, box)
    context.strokeStyle = node.image.border
    context.lineWidth = 3
    context.stroke()
  }
  context.restore()
}

export const image: ShapeRenderer = { draw: drawImage, boundingBox: imageBoundingBox }
