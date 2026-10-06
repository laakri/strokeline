export interface CanvasDimensions {
  width: number
  height: number
}

export function fitCanvasToBounds(
  canvas: CanvasDimensions,
  bounds: CanvasDimensions
): CanvasDimensions {
  if (
    !Number.isFinite(canvas.width) ||
    !Number.isFinite(canvas.height) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    canvas.width <= 0 ||
    canvas.height <= 0 ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(
    bounds.width / canvas.width,
    bounds.height / canvas.height
  )
  return {
    width: Math.floor(canvas.width * scale),
    height: Math.floor(canvas.height * scale),
  }
}
