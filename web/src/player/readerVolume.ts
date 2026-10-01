const READER_VOLUME_KEY = "strokeline.readerVolume.v1"
export const MAX_READER_VOLUME = 1.5

export function clampReaderVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1
  return Math.max(0, Math.min(MAX_READER_VOLUME, volume))
}

export function readReaderVolume(): number {
  try {
    const saved = localStorage.getItem(READER_VOLUME_KEY)
    return saved === null ? 1 : clampReaderVolume(Number(saved))
  } catch {
    return 1
  }
}

export function saveReaderVolume(volume: number): number {
  const clamped = clampReaderVolume(volume)
  try {
    localStorage.setItem(READER_VOLUME_KEY, String(clamped))
  } catch {
    /* storage unavailable */
  }
  return clamped
}
