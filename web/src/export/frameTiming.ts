export function frameCountForDuration(duration: number, fps: number): number {
  if (!Number.isFinite(duration) || duration < 0) {
    throw new RangeError("Duration must be a finite non-negative number.")
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError("Frame rate must be a finite positive number.")
  }
  return Math.ceil(duration * fps - 1e-9)
}

export function frameTimestamp(frameIndex: number, fps: number): number {
  return frameIndex / fps
}
