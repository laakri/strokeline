import type { Point, TextAnchor } from "@/ir/types.ts"

export function normalizeTextAnchor(value: string): TextAnchor | undefined {
  const normalized = value.toLowerCase().replaceAll(/[-_\s]/g, "")
  if (
    [
      "center",
      "left",
      "right",
      "top",
      "bottom",
      "topleft",
      "topright",
      "bottomleft",
      "bottomright",
    ].includes(normalized)
  ) {
    return normalized as TextAnchor
  }
  return undefined
}

export function positionFromAnchor(
  anchorPoint: Point,
  width: number,
  height: number,
  anchor: TextAnchor
): Point {
  const left = anchor.includes("left")
  const right = anchor.includes("right")
  const top = anchor.includes("top")
  const bottom = anchor.includes("bottom")
  return {
    x: anchorPoint.x + (left ? width / 2 : right ? -width / 2 : 0),
    y: anchorPoint.y + (top ? height / 2 : bottom ? -height / 2 : 0),
  }
}
