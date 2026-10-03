import type { RenderState, Timeline } from "@/timeline/timeline.ts"
import { features } from "@/defaults/features.ts"

export type RenderCallback = (state: RenderState, elapsed: number) => void

export class Player {
  private animationFrame: number | undefined
  private elapsed = 0
  private startedAt = 0
  private playing = false
  private readonly timeline: Timeline
  private readonly onRender: RenderCallback
  readonly duration: number

  constructor(timeline: Timeline, onRender: RenderCallback) {
    this.timeline = timeline
    this.onRender = onRender
    this.duration = timeline.duration
  }

  get currentTime(): number {
    return this.elapsed
  }
  get isPlaying(): boolean {
    return this.playing
  }

  play(): void {
    if (this.playing) return
    if (this.animationFrame !== undefined)
      cancelAnimationFrame(this.animationFrame)
    this.playing = true
    this.startedAt = performance.now() - this.elapsed * 1000
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  pause(): void {
    this.playing = false
    if (this.animationFrame !== undefined)
      cancelAnimationFrame(this.animationFrame)
    this.animationFrame = undefined
  }

  seek(seconds: number): void {
    this.elapsed = Math.max(0, Math.min(this.timeline.duration, seconds))
    if (this.playing) this.startedAt = performance.now() - this.elapsed * 1000
    this.render()
  }

  dispose(): void {
    this.pause()
  }

  private readonly frame = (now: number): void => {
    if (!this.playing) return
    this.elapsed = Math.max(0, (now - this.startedAt) / 1000)
    if (this.elapsed >= this.timeline.duration) {
      this.elapsed = this.timeline.duration
      this.render()
      this.pause()
      return
    }
    this.render()
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  private render(): void {
    this.onRender(this.timeline.resolveAt(this.elapsed), this.elapsed)
  }
}

export type SequenceRenderCallback = (
  state: RenderState,
  sceneIndex: number,
  elapsed: number,
  transition?: {
    type: "fade" | "wipe" | "slide" | "erase"
    progress: number
    from: RenderState
    to: RenderState
  }
) => void

export class SequencePlayer {
  private animationFrame: number | undefined
  private elapsed = 0
  private startedAt = 0
  private playing = false
  private readonly timelines: Timeline[]
  private readonly offsets: number[]
  private readonly transitions: Array<{
    start: number
    end: number
    type: "fade" | "wipe" | "slide" | "erase"
    fromIndex: number
    toIndex: number
    fromState: RenderState
    toState: RenderState
  }> = []
  private readonly gaps: Array<{ start: number; end: number; sceneIndex: number }> = []
  private readonly onRender: SequenceRenderCallback
  readonly duration: number

  constructor(
    timelines: Timeline[],
    onRender: SequenceRenderCallback,
    sceneTransitions: Array<
      { type: "fade" | "wipe" | "slide" | "erase" | "none"; duration: number } | undefined
    > = [],
    sceneGapSeconds: number | number[] = 0
  ) {
    this.timelines = timelines
    this.onRender = onRender
    this.offsets = []
    let total = 0
    for (const [index, timeline] of timelines.entries()) {
      this.offsets.push(total)
      total += timeline.duration
      const gap = Array.isArray(sceneGapSeconds) ? (sceneGapSeconds[index] ?? 0) : sceneGapSeconds
      if (index < timelines.length - 1 && gap > 0) {
        this.gaps.push({ start: total, end: total + gap, sceneIndex: index })
        total += gap
      }
      const transition = features.sceneTransitions
        ? sceneTransitions[index]
        : undefined
      if (
        index < timelines.length - 1 &&
        transition &&
        transition.type !== "none" &&
        transition.duration > 0
      ) {
        this.transitions.push({
          start: total,
          end: total + transition.duration,
          type: transition.type,
          fromIndex: index,
          toIndex: index + 1,
          fromState: timelines[index]!.resolveAt(timelines[index]!.duration),
          toState: timelines[index + 1]!.resolveAt(0),
        })
        total += transition.duration
      }
    }
    this.duration = total
  }

  get currentTime(): number {
    return this.elapsed
  }
  get sceneStartTimes(): number[] {
    return [...this.offsets]
  }
  get isPlaying(): boolean {
    return this.playing
  }

  play(): void {
    if (this.playing) return
    if (this.elapsed >= this.duration) this.seek(0)
    this.playing = true
    this.startedAt = performance.now() - this.elapsed * 1000
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  pause(): void {
    this.playing = false
    if (this.animationFrame !== undefined)
      cancelAnimationFrame(this.animationFrame)
    this.animationFrame = undefined
  }

  seek(seconds: number): void {
    this.elapsed = Math.max(0, Math.min(this.duration, seconds))
    if (this.playing) this.startedAt = performance.now() - this.elapsed * 1000
    this.render()
  }

  dispose(): void {
    this.pause()
  }

  private frame = (now: number): void => {
    if (!this.playing) return
    this.elapsed = Math.max(0, (now - this.startedAt) / 1000)
    if (this.elapsed >= this.duration) {
      this.elapsed = this.duration
      this.render()
      this.pause()
      return
    }
    this.render()
    this.animationFrame = requestAnimationFrame(this.frame)
  }

  private render(): void {
    if (this.timelines.length === 0) return
    const activeGap = this.gaps.find(
      ({ start, end }) => this.elapsed >= start && this.elapsed < end
    )
    if (activeGap) {
      const timeline = this.timelines[activeGap.sceneIndex]
      if (timeline)
        this.onRender(timeline.resolveAt(timeline.duration), activeGap.sceneIndex, this.elapsed)
      return
    }
    const activeTransition = this.transitions.find(
      ({ start, end }) => this.elapsed >= start && this.elapsed < end
    )
    if (activeTransition) {
      const fromTimeline = this.timelines[activeTransition.fromIndex]
      const toTimeline = this.timelines[activeTransition.toIndex]
      if (!fromTimeline || !toTimeline) return
      const progress =
        (this.elapsed - activeTransition.start) /
        (activeTransition.end - activeTransition.start)
      this.onRender(activeTransition.toState, activeTransition.toIndex, this.elapsed, {
        type: activeTransition.type,
        progress,
        from: activeTransition.fromState,
        to: activeTransition.toState,
      })
      return
    }
    let sceneIndex = this.timelines.length - 1
    for (let index = 0; index < this.timelines.length - 1; index++) {
      const transitionEnd = this.transitions.find(
        (transition) => transition.fromIndex === index
      )?.end
      const end =
        transitionEnd ??
        (this.offsets[index] ?? 0) + (this.timelines[index]?.duration ?? 0)
      if (this.elapsed < end) {
        sceneIndex = index
        break
      }
    }
    const timeline = this.timelines[sceneIndex]
    if (!timeline) return
    const localTime = Math.max(
      0,
      this.elapsed - (this.offsets[sceneIndex] ?? 0)
    )
    this.onRender(timeline.resolveAt(localTime), sceneIndex, this.elapsed)
  }
}
