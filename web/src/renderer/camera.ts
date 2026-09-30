import type { Point } from "@/ir/types.ts"

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CameraTransform {
  x: number
  y: number
  scale: number
}

export interface Camera {
  position: Point
  scale: number
}

export const identityCamera = (canvas: { width: number; height: number }): Camera => ({
  position: { x: canvas.width / 2, y: canvas.height / 2 },
  scale: 1,
})

export function computeFitTransform(boundingBox: BoundingBox, canvasSize: { width: number; height: number }, paddingRatio = 0.15): CameraTransform {
  const width = Math.max(1, boundingBox.width)
  const height = Math.max(1, boundingBox.height)
  const paddedWidth = width * (1 + paddingRatio * 2)
  const paddedHeight = height * (1 + paddingRatio * 2)
  return {
    x: boundingBox.x + width / 2,
    y: boundingBox.y + height / 2,
    scale: Math.min(3, canvasSize.width / paddedWidth, canvasSize.height / paddedHeight),
  }
}

export function clampCameraTransform(transform: CameraTransform, canvasSize: { width: number; height: number }): CameraTransform {
  const visibleWidth = canvasSize.width / transform.scale
  const visibleHeight = canvasSize.height / transform.scale
  const x = visibleWidth >= canvasSize.width ? canvasSize.width / 2 : Math.min(canvasSize.width - visibleWidth / 2, Math.max(visibleWidth / 2, transform.x))
  const y = visibleHeight >= canvasSize.height ? canvasSize.height / 2 : Math.min(canvasSize.height - visibleHeight / 2, Math.max(visibleHeight / 2, transform.y))
  return { ...transform, x, y }
}

export function applyCamera(context: CanvasRenderingContext2D, camera: Camera, canvas: { width: number; height: number }, devicePixelRatio = 1): void {
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  context.translate(canvas.width / 2, canvas.height / 2)
  context.scale(camera.scale, camera.scale)
  context.translate(-camera.position.x, -camera.position.y)
}
