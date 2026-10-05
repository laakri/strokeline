import { measureTextWidth } from "@/lib/textMetrics.ts"

export const TABLE_CELL_PADDING = 18
export const TABLE_MIN_FONT_SIZE = 18
export const TABLE_DEFAULT_FONT_SIZE = 40

export interface TableCellLayout {
  fontSize: number
  text: { lines: string[]; widths: number[]; width: number; height: number }
  fits: boolean
}

export interface TableLayout {
  columnWidths: number[]
  cells: TableCellLayout[][]
  width: number
  height: number
  rowHeight: number
}

/**
 * Tables use a content-first layout, capped by their declared SIZE width.
 * Columns grow to their widest cell at the preferred size, then share the
 * remaining width proportionally when the declared width is exhausted.
 */
export function layoutTable(
  columns: string[],
  rows: string[][],
  maxWidth: number,
  height: number,
  fontFamily?: string,
  preferredFontSize = TABLE_DEFAULT_FONT_SIZE,
): TableLayout {
  if (columns.length === 0) {
    return { columnWidths: [], cells: [], width: 0, height: Math.max(0, height), rowHeight: Math.max(0, height) / (rows.length + 1) }
  }
  const columnCount = Math.max(1, columns.length)
  const cap = Math.max(0, maxWidth)
  const rowCells = [columns, ...rows]
  const preferred = Math.max(TABLE_MIN_FONT_SIZE, preferredFontSize)
  const desiredWidths = Array.from({ length: columnCount }, (_, column) => {
    const textWidth = Math.max(0, ...rowCells.map((cells, row) =>
      measureTextWidth(singleLine(cells[column] ?? ""), preferred, fontFamily, row === 0 ? 600 : 400)
    ))
    return Math.max(56, textWidth + TABLE_CELL_PADDING * 2)
  })
  const minimumWidths = Array.from({ length: columnCount }, (_, column) => {
    const textWidth = Math.max(0, ...rowCells.map((cells, row) =>
      measureTextWidth(singleLine(cells[column] ?? ""), TABLE_MIN_FONT_SIZE, fontFamily, row === 0 ? 600 : 400)
    ))
    return Math.max(56, textWidth + TABLE_CELL_PADDING * 2)
  })
  const desiredTotal = desiredWidths.reduce((sum, width) => sum + width, 0)
  const minimumTotal = minimumWidths.reduce((sum, width) => sum + width, 0)
  const columnWidths = desiredTotal <= cap
    ? desiredWidths
    : minimumTotal > cap
      ? minimumWidths
      : distributeColumnWidths(desiredWidths, cap)
  const rowHeight = Math.max(0, height) / Math.max(1, rowCells.length)
  const cells = rowCells.map((values, row) => Array.from({ length: columnCount }, (_, column) =>
    layoutTableCell(values[column] ?? "", columnWidths[column]!, rowHeight, fontFamily, preferred, row === 0 ? 600 : 400)
  ))
  return {
    columnWidths,
    cells,
    width: columnWidths.reduce((sum, width) => sum + width, 0),
    height: Math.max(0, height),
    rowHeight,
  }
}

export function layoutTableCell(
  text: string,
  width: number,
  _height: number,
  fontFamily?: string,
  preferredFontSize = TABLE_DEFAULT_FONT_SIZE,
  fontWeight = 400,
): TableCellLayout {
  const line = singleLine(text)
  const maxWidth = Math.max(0, width - TABLE_CELL_PADDING * 2)
  const maximum = Math.max(TABLE_MIN_FONT_SIZE, preferredFontSize)
  const measure = (fontSize: number) => measureTextWidth(line, fontSize, fontFamily, fontWeight)
  let fontSize = maximum
  if (measure(fontSize) > maxWidth) {
    let low = TABLE_MIN_FONT_SIZE
    let high = maximum
    if (measure(low) > maxWidth) fontSize = low
    else {
      for (let iteration = 0; iteration < 16; iteration++) {
        const candidate = (low + high) / 2
        if (measure(candidate) <= maxWidth) low = candidate
        else high = candidate
      }
      fontSize = low
    }
  }
  const measuredWidth = measure(fontSize)
  const lineHeight = fontSize * 1.15
  return {
    fontSize,
    text: { lines: [line], widths: [measuredWidth], width: measuredWidth, height: lineHeight },
    fits: measuredWidth <= maxWidth,
  }
}

function distributeColumnWidths(desired: number[], maxWidth: number): number[] {
  const count = desired.length
  if (count === 0) return []
  const minimum = Math.min(56, maxWidth / count)
  const widths = Array<number>(count).fill(minimum)
  let remaining = Math.max(0, maxWidth - minimum * count)
  const active = new Set(desired.map((_, index) => index))

  while (remaining > 0.01 && active.size > 0) {
    const needTotal = [...active].reduce((sum, index) => sum + Math.max(0, desired[index]! - widths[index]!), 0)
    if (needTotal <= 0) break
    let assigned = 0
    for (const index of [...active]) {
      const need = desired[index]! - widths[index]!
      const share = remaining * need / needTotal
      const amount = Math.min(need, share)
      widths[index]! += amount
      assigned += amount
      if (desired[index]! - widths[index]! <= 0.01) active.delete(index)
    }
    if (assigned <= 0.01) break
    remaining -= assigned
  }
  return widths
}

function singleLine(text: string): string {
  return text.replace(/[\r\n]+/g, " ")
}
