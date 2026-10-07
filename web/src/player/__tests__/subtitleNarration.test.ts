import { describe, expect, it } from "vitest"
import { narrationPlaybackTiming } from "@/player/subtitleNarration.ts"

describe("narration playback timing", () => {
  it("maps timeline progress onto the generated audio duration", () => {
    expect(narrationPlaybackTiming(6, 4, 0.5)).toEqual({
      playbackRate: 1.5,
      offset: 3,
    })
  })

  it("clamps progress and handles a zero-length timeline line", () => {
    expect(narrationPlaybackTiming(2, 0, 2)).toEqual({
      playbackRate: 1,
      offset: 2,
    })
    expect(narrationPlaybackTiming(2, 4, -1)).toEqual({
      playbackRate: 0.5,
      offset: 0,
    })
  })
})
