export const MAX_PNG_EXPORT_PIXELS = 16_000_000
export const MAX_PNG_EXPORT_DIMENSION = 8192
export const PNG_EXPORT_SCALE = 2

export interface PixelSize {
  width: number
  height: number
}

export function pngExportSize(canvas: PixelSize): PixelSize {
  if (
    !Number.isFinite(canvas.width) ||
    !Number.isFinite(canvas.height) ||
    canvas.width <= 0 ||
    canvas.height <= 0
  ) {
    throw new RangeError(
      "PNG export requires positive finite canvas dimensions."
    )
  }

  const scale = Math.min(
    PNG_EXPORT_SCALE,
    Math.sqrt(MAX_PNG_EXPORT_PIXELS / (canvas.width * canvas.height)),
    MAX_PNG_EXPORT_DIMENSION / canvas.width,
    MAX_PNG_EXPORT_DIMENSION / canvas.height
  )
  return {
    width: Math.max(1, Math.floor(canvas.width * scale)),
    height: Math.max(1, Math.floor(canvas.height * scale)),
  }
}
