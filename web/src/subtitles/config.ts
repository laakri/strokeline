export const CAPTION_STYLES = ["bold", "minimal", "coral"] as const
export type CaptionStyle = (typeof CAPTION_STYLES)[number]

export const CAPTION_POSITIONS = ["bottom", "top", "center"] as const
export type CaptionPosition = (typeof CAPTION_POSITIONS)[number]

export interface CaptionConfig {
  style: CaptionStyle
  position: CaptionPosition
}

export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  style: "bold",
  position: "bottom",
}

export const CAPTION_STYLE_STORAGE_KEY = "strokeline.caption-style.v1"
export const CAPTION_POSITION_STORAGE_KEY = "strokeline.caption-position.v1"

export function isCaptionStyle(value: string | undefined | null): value is CaptionStyle {
  return CAPTION_STYLES.includes(value as CaptionStyle)
}

export function isCaptionPosition(value: string | undefined | null): value is CaptionPosition {
  return CAPTION_POSITIONS.includes(value as CaptionPosition)
}

export function captionStyleFromStorage(): CaptionStyle {
  try {
    const stored = localStorage.getItem(CAPTION_STYLE_STORAGE_KEY)
    if (isCaptionStyle(stored)) return stored
  } catch {
    // Fall through to default.
  }
  return DEFAULT_CAPTION_CONFIG.style
}

export function captionPositionFromStorage(): CaptionPosition {
  try {
    const stored = localStorage.getItem(CAPTION_POSITION_STORAGE_KEY)
    if (isCaptionPosition(stored)) return stored
  } catch {
    // Fall through to default.
  }
  return DEFAULT_CAPTION_CONFIG.position
}

export function captionConfigFromStorage(): CaptionConfig {
  return {
    style: captionStyleFromStorage(),
    position: captionPositionFromStorage(),
  }
}

/** Prefer UI/storage override, then script defaults, then bottom/bold. */
export function resolveCaptionConfig(options: {
  styleOverride?: CaptionStyle | null
  positionOverride?: CaptionPosition | null
  documentStyle?: CaptionStyle
  documentPosition?: CaptionPosition
}): CaptionConfig {
  return {
    style:
      options.styleOverride ??
      options.documentStyle ??
      DEFAULT_CAPTION_CONFIG.style,
    position:
      options.positionOverride ??
      options.documentPosition ??
      DEFAULT_CAPTION_CONFIG.position,
  }
}
