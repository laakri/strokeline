import type { SceneDocument } from "@/ir/types.ts"
import { Timeline } from "@/timeline/timeline.ts"

export const REELS_SAFE_ZONES = {
  top: 125,
  bottom: 200,
  right: 60,
} as const

export type ReelsDurationPreset = 7 | 15 | 30 | 60
export type CaptionStyle = "bold" | "minimal" | "coral"

export function exceedsDurationPreset(
  duration: number,
  preset: ReelsDurationPreset
): boolean {
  return duration > preset
}

export function captionActiveWord(progress: number, wordCount: number): number {
  if (wordCount <= 0) return -1
  return Math.min(
    wordCount - 1,
    Math.floor(Math.max(0, Math.min(1, progress)) * wordCount)
  )
}

export function isVerticalCanvas(canvas: { width: number; height: number }): boolean {
  return canvas.height > canvas.width
}

export function overlapsReelsUi(
  bounds: { x: number; y: number; width: number; height: number },
  canvas: { width: number; height: number }
): boolean {
  if (!isVerticalCanvas(canvas)) return false
  const rightStart = canvas.width - REELS_SAFE_ZONES.right
  const bottomStart = canvas.height - REELS_SAFE_ZONES.bottom
  return (
    bounds.y < REELS_SAFE_ZONES.top ||
    bounds.y + bounds.height > bottomStart ||
    bounds.x + bounds.width > rightStart
  )
}

export function estimateDocumentDuration(document: SceneDocument): number {
  return document.scenes.reduce((total, scene, index) => {
    const duration = new Timeline(scene, document.canvas).duration
    const transition =
      index < document.scenes.length - 1 &&
      scene.transition &&
      scene.transition.type !== "none"
        ? scene.transition.duration
        : 0
    return total + duration + transition
  }, 0)
}

export function captionStyleFromStorage(): CaptionStyle {
  try {
    const stored = localStorage.getItem("strokeline.caption-style.v1")
    if (stored === "minimal" || stored === "coral") return stored
  } catch {
    // Use the default style when browser storage is unavailable.
  }
  return "bold"
}
