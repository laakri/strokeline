import { describe, expect, it } from "vitest"
import { narrationPlaybackTiming } from "@/player/subtitleNarration.ts"

describe("narration playback timing", () => {
  it("keeps generated narration at its natural pitch and maps progress to audio offset", () => {
    expect(narrationPlaybackTiming(6, 0.5)).toEqual({
      playbackRate: 1,
      offset: 3,
    })
  })

  it("clamps progress without changing narration pitch", () => {
    expect(narrationPlaybackTiming(2, 2)).toEqual({
      playbackRate: 1,
      offset: 2,
    })
    expect(narrationPlaybackTiming(2, -1)).toEqual({
      playbackRate: 1,
      offset: 0,
    })
  })
})
