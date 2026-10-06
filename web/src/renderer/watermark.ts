import {
  FREE_BRANDING_ENTITLEMENTS,
  shouldShowWatermark,
  type BrandingEntitlements,
} from "@/branding/entitlements.ts"

export function drawWatermark(
  context: CanvasRenderingContext2D,
  entitlements: BrandingEntitlements = FREE_BRANDING_ENTITLEMENTS,
  logicalCanvas = { width: context.canvas.width, height: context.canvas.height },
  devicePixelRatio = context.canvas.width / logicalCanvas.width
): void {
  if (!shouldShowWatermark(entitlements)) return

  const isVertical = logicalCanvas.height > logicalCanvas.width
  const fontSize = isVertical
    ? Math.max(20, Math.min(28, logicalCanvas.width * 0.026))
    : Math.max(12, Math.min(18, logicalCanvas.width * 0.009))
  const iconSize = fontSize * 0.95
  const paddingX = fontSize * 0.65
  const badgeHeight = fontSize * 2
  const margin = Math.max(12, fontSize * 0.85)

  context.save()
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.globalAlpha = 1
  context.font = `600 ${fontSize}px Inter, Arial, sans-serif`
  context.textAlign = "left"
  context.textBaseline = "middle"

  const label = "Made with Strokeline"
  const labelWidth = context.measureText(label).width
  const badgeWidth = paddingX * 2 + iconSize + fontSize * 0.55 + labelWidth
  const x = logicalCanvas.width - badgeWidth - margin
  const y = logicalCanvas.height - badgeHeight - margin
  const radius = badgeHeight / 2

  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + badgeWidth - radius, y)
  context.quadraticCurveTo(x + badgeWidth, y, x + badgeWidth, y + radius)
  context.lineTo(x + badgeWidth, y + badgeHeight - radius)
  context.quadraticCurveTo(x + badgeWidth, y + badgeHeight, x + badgeWidth - radius, y + badgeHeight)
  context.lineTo(x + radius, y + badgeHeight)
  context.quadraticCurveTo(x, y + badgeHeight, x, y + badgeHeight - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
  context.fillStyle = "rgba(15, 23, 42, 0.76)"
  context.fill()
  context.strokeStyle = "rgba(255, 255, 255, 0.22)"
  context.lineWidth = Math.max(1, fontSize / 18)
  context.stroke()

  const centerY = y + badgeHeight / 2
  const iconX = x + paddingX + iconSize / 2
  context.beginPath()
  context.arc(iconX, centerY, iconSize / 2, 0, Math.PI * 2)
  context.fillStyle = "#60A5FA"
  context.fill()
  context.beginPath()
  context.moveTo(iconX - iconSize * 0.13, centerY - iconSize * 0.23)
  context.lineTo(iconX + iconSize * 0.25, centerY)
  context.lineTo(iconX - iconSize * 0.13, centerY + iconSize * 0.23)
  context.closePath()
  context.fillStyle = "#FFFFFF"
  context.fill()

  context.fillStyle = "#FFFFFF"
  context.fillText(label, x + paddingX + iconSize + fontSize * 0.55, centerY)
  context.restore()
}
