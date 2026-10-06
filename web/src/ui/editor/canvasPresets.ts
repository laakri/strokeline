export const CANVAS_PRESETS = [
  { label: "Landscape · 16:9", width: 1920, height: 1080 },
  { label: "Reels · 9:16", width: 1080, height: 1920 },
  { label: "Portrait · 4:5", width: 1080, height: 1350 },
  { label: "Square · 1:1", width: 1080, height: 1080 },
] as const

export function replaceCanvasSize(
  source: string,
  width: number,
  height: number
): string {
  const canvasLine =
    /^([ \t]*CANVAS[ \t]+)\d+(?:\.\d+)?[ \t]+\d+(?:\.\d+)?(.*)$/m
  return source.replace(canvasLine, (_line, prefix: string, suffix: string) =>
    `${prefix}${width} ${height}${suffix}`
  )
}

export function canvasPresetValue(source: string): string {
  const match = source.match(
    /^[ \t]*CANVAS[ \t]+(\d+(?:\.\d+)?)[ \t]+(\d+(?:\.\d+)?)/m
  )
  if (!match) return ""
  const preset = CANVAS_PRESETS.find(
    ({ width, height }) =>
      Number(match[1]) === width && Number(match[2]) === height
  )
  return preset ? `${preset.width}x${preset.height}` : ""
}
