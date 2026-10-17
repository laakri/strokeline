import type { SceneNode } from "@/ir/types.ts"
import type { BoundingBox, ShapeRenderer } from "@/renderer/shapes/registry.ts"
import type { RenderContext } from "@/renderer/handdrawn.ts"
import { drawLabel } from "@/renderer/shapes/label.ts"
import { layoutText } from "@/lib/textLayout.ts"
import { measureTextWidth } from "@/lib/textMetrics.ts"
import { DEFAULT_TEXT_SIZE } from "@/defaults/defaults.ts"
import { formatMathText } from "@/lib/mathText.ts"

export function textBoundingBox(node: SceneNode): BoundingBox {
  const fontSize = node.style.fontSize ?? DEFAULT_TEXT_SIZE
  const text = formatMathText(node.text ?? node.label ?? "")
  const layout = layoutText(
    text,
    fontSize,
    node.maxWidth,
    (line) => measureTextWidth(line, fontSize, node.style.fontFamily),
    node.lineHeight
  )
  return {
    x: node.position.x - layout.width / 2 - (node.textBox?.padding ?? 0),
    y: node.position.y - layout.height / 2 - (node.textBox?.padding ?? 0),
    width: layout.width + (node.textBox?.padding ?? 0) * 2,
    height: layout.height + (node.textBox?.padding ?? 0) * 2,
  }
}

export function drawText(renderContext: RenderContext, node: SceneNode): void {
  const effect = String(node.data?.textEffect ?? "")
  const progress = Number(node.data?.textEffectProgress ?? 1)
  const source = node.text ?? node.label
  const text = source === undefined ? undefined : textForEffect(source, effect, progress, node.id)
  drawLabel(
    renderContext,
    text,
    node.position,
    {
      color: node.style.color,
      fontSize: node.style.fontSize ?? DEFAULT_TEXT_SIZE,
      maxWidth: node.maxWidth,
      align: node.align,
      lineHeight: node.lineHeight,
      fontFamily: node.style.fontFamily,
      background: node.textBox?.background,
      backgroundOpacity: node.textBox?.opacity,
      backgroundPadding: node.textBox?.padding,
      backgroundCorners: node.textBox?.corners,
      ...(effect === "marker" ? {
        markerWords: (node.data?.textEffectWords as string[] | undefined) ?? [],
        markerProgress: progress,
      } : {}),
    },
    effect === "typewriter" ? progress : effect === "marker" || effect === "scramble" || effect === "word-by-word"
      ? 1
      : (node as SceneNode & { revealProgress?: number }).revealProgress ?? 1,
    (node as SceneNode & { revealStyle?: string }).revealStyle === "text-wipe",
    node.id
  )
}

function textForEffect(text: string, effect: string, progress: number, seed: string): string {
  const amount = Math.max(0, Math.min(1, progress))
  if (effect === "word-by-word") {
    const words = [...text.matchAll(/\S+/gu)]
    if (!words.length) return text
    const visibleCount = Math.ceil(words.length * amount)
    if (visibleCount >= words.length) return text
    const last = words[Math.max(0, visibleCount - 1)]
    return visibleCount === 0 ? "" : text.slice(0, (last?.index ?? 0) + (last?.[0].length ?? 0))
  }
  if (effect !== "scramble" || amount >= 1) return text
  const chars = Array.from(text)
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return chars.map((char, index) => {
    if (!/[\p{L}\p{N}]/u.test(char) || index / Math.max(1, chars.length) < amount) return char
    let hash = 2166136261
    for (const value of `${seed}:${index}`)
      hash = Math.imul(hash ^ value.charCodeAt(0), 16777619)
    return alphabet[(hash >>> 0) % alphabet.length]!
  }).join("")
}

export const text: ShapeRenderer = {
  draw: drawText,
  boundingBox: textBoundingBox,
}
