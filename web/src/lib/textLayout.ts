import { features } from "@/defaults/features.ts"

export interface TextLayout {
  lines: string[]
  widths: number[]
  width: number
  height: number
}

export function layoutText(
  text: string,
  fontSize: number,
  maxWidth: number | undefined,
  measure: (line: string) => number,
  lineHeight = 1.3
): TextLayout {
  const lines: string[] = []
  const paragraphs = (
    features.multilineText ? text : text.replaceAll("\n", " ")
  ).split("\n")
  const wrapWidth = features.maxWidthWrapping ? maxWidth : undefined
  for (const paragraph of paragraphs) {
    if (wrapWidth === undefined || wrapWidth <= 0) {
      lines.push(paragraph)
      continue
    }
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push("")
      continue
    }
    let line = words[0]
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`
      if (measure(candidate) <= wrapWidth) line = candidate
      else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  const widths = lines.map(measure)
  return {
    lines,
    widths,
    width: Math.max(0, ...widths),
    height:
      lines.length * fontSize * (features.customLineHeight ? lineHeight : 1.3),
  }
}

export function fitTextFontSize(
  text: string,
  maximumFontSize: number,
  width: number,
  height: number,
  maxWidth: number | undefined,
  lineHeight: number,
  measure: (line: string, fontSize: number) => number,
  minimumFontSize = 24
): number {
  const maximum = Math.max(minimumFontSize, maximumFontSize)
  const fits = (fontSize: number) => {
    const layout = layoutText(
      text,
      fontSize,
      maxWidth,
      (line) => measure(line, fontSize),
      lineHeight
    )
    return layout.width <= width && layout.height <= height
  }

  if (fits(maximum)) return Math.min(maximum, maximumFontSize)
  let low = minimumFontSize
  let high = maximum
  for (let iteration = 0; iteration < 18; iteration++) {
    const candidate = (low + high) / 2
    if (fits(candidate)) low = candidate
    else high = candidate
  }
  return low
}
