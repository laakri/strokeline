import { describe, expect, it } from "vitest"
import { features } from "@/defaults/features.ts"
import type { Scene } from "@/ir/types.ts"
import { SequencePlayer } from "@/player/usePlayer.ts"
import { Timeline } from "@/timeline/timeline.ts"

function scene(id: string): Scene {
  return {
    id,
    index: Number(id),
    ops: [
      {
        kind: "create",
        t: 0,
        node: {
          id: `node-${id}`,
          type: "text",
          position: { x: 0, y: 0 },
          text: id,
          rotation: 0,
          opacity: 1,
          style: { color: "#000", strokeWidth: 4, fontSize: 32 },
          layer: 0,
        },
        draw: { duration: 2, ease: "linear", style: "draw-on" },
      },
    ],
  }
}

describe("SequencePlayer", () => {
  it("maps a global seek into the correct scene and local timeline time", () => {
    const frames: Array<{
      sceneIndex: number
      elapsed: number
      reveal: number
    }> = []
    const player = new SequencePlayer(
      [new Timeline(scene("1")), new Timeline(scene("2"))],
      (state, sceneIndex, elapsed) =>
        frames.push({
          sceneIndex,
          elapsed,
          reveal: state.nodes[0]?.revealProgress ?? 0,
        })
    )

    expect(player.duration).toBe(4)
    player.seek(2.5)
    expect(frames.at(-1)).toEqual({ sceneIndex: 1, elapsed: 2.5, reveal: 0.25 })
    player.seek(20)
    expect(frames.at(-1)).toEqual({ sceneIndex: 1, elapsed: 4, reveal: 1 })
  })

  it("renders declared transitions within global duration and keeps none as a cut", () => {
    let transitionFrame:
      | { type: string; progress: number; fromId: string; toId: string }
      | undefined
    const timelines = [new Timeline(scene("1")), new Timeline(scene("2"))]
    const player = new SequencePlayer(
      timelines,
      (state, _sceneIndex, _elapsed, transition) => {
        if (!transition) return
        transitionFrame = {
          type: transition.type,
          progress: transition.progress,
          fromId: transition.from.nodes[0]?.id ?? "",
          toId: transition.to.nodes[0]?.id ?? "",
        }
        expect(state.nodes[0]?.id).toBe("node-2")
      },
      [
        { type: "wipe", duration: 0.5 },
        { type: "none", duration: 2 },
      ]
    )

    expect(player.duration).toBe(4.5)
    player.seek(2.25)
    expect(transitionFrame).toEqual({
      type: "wipe",
      progress: 0.5,
      fromId: "node-1",
      toId: "node-2",
    })
  })

  it("can disable scene transition visuals through the feature flag", () => {
    const previous = features.sceneTransitions
    features.sceneTransitions = false
    try {
      const frames: Array<string | undefined> = []
      const player = new SequencePlayer(
        [new Timeline(scene("1")), new Timeline(scene("2"))],
        (_state, _sceneIndex, _elapsed, transition) => {
          frames.push(transition?.type)
        },
        [{ type: "fade", duration: 0.5 }]
      )
      player.seek(2.25)
      expect(player.duration).toBe(4)
      expect(frames.at(-1)).toBeUndefined()
    } finally {
      features.sceneTransitions = previous
    }
  })
})
