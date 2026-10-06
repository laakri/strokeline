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

export function pingPongFrameTimes(duration: number, fps: number): number[] {
  const frameCount = frameCountForDuration(duration, fps)
  const forward = Array.from(
    { length: frameCount + 1 },
    (_, frame) => Math.min(duration, frameTimestamp(frame, fps))
  )
  const reverse = Array.from(
    { length: Math.max(0, frameCount - 1) },
    (_, index) => frameTimestamp(frameCount - index - 1, fps)
  )
  return [...forward, ...reverse]
}
