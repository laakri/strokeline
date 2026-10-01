import { layoutText, type TextLayout } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"

export interface TableCellLayout {
  fontSize: number
  text: TextLayout
  fits: boolean
}

export function layoutTableCell(
  text: string,
  width: number,
  height: number,
  fontFamily?: string
): TableCellLayout {
  const maxWidth = Math.max(1, width - 24)
  const maxHeight = Math.max(1, height - 10)
  let smallest = layoutText(text, 28, maxWidth, (line) => measureTextWidth(line, 28, fontFamily), 1.15)
  for (let fontSize = 40; fontSize >= 28; fontSize--) {
    const layout = layoutText(text, fontSize, maxWidth, (line) => measureTextWidth(line, fontSize, fontFamily), 1.15)
    if (layout.width <= maxWidth && layout.height <= maxHeight)
      return { fontSize, text: layout, fits: true }
    if (fontSize === 28) smallest = layout
  }
  return { fontSize: 28, text: smallest, fits: false }
}
