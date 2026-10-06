import { describe, expect, it } from "vitest"
import type { Scene } from "@/ir/types.ts"
import { Timeline } from "@/timeline/timeline.ts"

const scene: Scene = {
  id: "1",
  index: 1,
  ops: [
    {
      kind: "create",
      t: 1,
      node: {
        id: "box",
        type: "rectangle",
        position: { x: 0, y: 0 },
        size: { width: 100, height: 50 },
        rotation: 0,
        opacity: 1,
        style: { color: "#000", strokeWidth: 4 },
        layer: 0,
      },
      draw: { duration: 2, ease: "linear", style: "draw-on" },
    },
    {
      kind: "animate",
      t: 3,
      targetId: "box",
      anim: {
        verb: "move",
        to: { position: { x: 100, y: 50 } },
        duration: 2,
        ease: "linear",
      },
    },
    {
      kind: "animate",
      t: 5,
      targetId: "box",
      anim: { verb: "fade", to: { opacity: 0 }, duration: 1, ease: "linear" },
    },
  ],
}

describe("stateless timeline resolution", () => {
  const timeline = new Timeline(scene, { width: 1920, height: 1080 })

  it("does not expose a create operation before its start time", () => {
    expect(timeline.resolveAt(0).nodes).toHaveLength(0)
  })

  it("produces a partial eased reveal during creation", () => {
    const node = timeline.resolveAt(2).nodes[0]
    expect(node?.revealProgress).toBeGreaterThan(0)
    expect(node?.revealProgress).toBeLessThan(1)
  })

  it("reaches exact target values after animation ends", () => {
    const state = timeline.resolveAt(6)
    expect(state.nodes[0]?.position).toEqual({ x: 100, y: 50 })
    expect(state.nodes[0]?.opacity).toBe(0)
  })

  it("composes overlapping animation properties deterministically", () => {
    const regressionScene: Scene = {
      id: "regression",
      index: 1,
      ops: [
        {
          kind: "create",
          t: 0,
          node: {
            id: "shape",
            type: "text",
            position: { x: 10, y: 20 },
            text: "stable",
            rotation: 0,
            opacity: 1,
            style: { color: "#000", strokeWidth: 4, fontSize: 32 },
            layer: 0,
          },
          draw: { duration: 1, ease: "linear", style: "draw-on" },
        },
        {
          kind: "animate",
          t: 1,
          targetId: "shape",
          anim: {
            verb: "move",
            to: { position: { x: 100, y: 80 } },
            duration: 3,
            ease: "easeInOut",
          },
        },
        {
          kind: "animate",
          t: 2,
          targetId: "shape",
          anim: {
            verb: "fade",
            to: { opacity: 0.2 },
            duration: 2,
            ease: "linear",
          },
        },
        {
          kind: "animate",
          t: 2.1,
          targetId: "shape",
          anim: {
            verb: "rotate",
            to: { rotation: 90 },
            duration: 1,
            ease: "linear",
          },
        },
        {
          kind: "animate",
          t: 3.5,
          targetId: "shape",
          anim: { verb: "erase", duration: 2, ease: "linear" },
        },
      ],
    }
    const timeline = new Timeline(regressionScene)
    const midAnimation = timeline.resolveAt(2.25).nodes[0]
    expect(midAnimation?.opacity).toBeCloseTo(0.9)
    expect(midAnimation?.rotation).toBeCloseTo(13.5)
    expect(midAnimation?.position.x).toBeGreaterThan(10)
    expect(midAnimation?.position.x).toBeLessThan(100)
    expect(timeline.resolveAt(4).nodes[0]?.revealProgress).toBeCloseTo(0.75)
    expect(timeline.resolveAt(2.25)).toEqual(timeline.resolveAt(2.25))
  })

  it("is byte-identical for repeated and out-of-order timestamps", () => {
    const atFive = timeline.resolveAt(5)
    expect(timeline.resolveAt(5)).toEqual(atFive)
    expect(timeline.resolveAt(2).nodes[0]?.revealProgress).toBe(0.5)
    expect(timeline.resolveAt(8)).toEqual({
      ...timeline.resolveAt(6),
      nodes: timeline.resolveAt(6).nodes,
    })
  })

  it("fits a camera zoom to the target node's resolved bounds", () => {
    const zoomTimeline = new Timeline(
      {
        id: "camera",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "camera",
            t: 1,
            camera: {
              verb: "zoom",
              targetId: "box",
              duration: 1,
              ease: "linear",
            },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    const camera = zoomTimeline.resolveAt(2).camera
    expect(camera.position).toEqual({ x: 320, y: 180 })
    expect(camera.scale).toBe(3)
  })

  it("fits camera targets to multiline text height", () => {
    const cameraScaleFor = (text: string) =>
      new Timeline(
        {
          id: "text-camera",
          index: 1,
          ops: [
            {
              kind: "create",
              t: 0,
              node: {
                id: "text",
                type: "text",
                position: { x: 150, y: 50 },
                text,
                rotation: 0,
                opacity: 1,
                style: { color: "#000", strokeWidth: 4, fontSize: 40 },
                layer: 0,
              },
              draw: { duration: 0, ease: "linear", style: "draw-on" },
            },
            {
              kind: "camera",
              t: 0,
              camera: {
                verb: "zoom",
                targetId: "text",
                duration: 1,
                ease: "linear",
              },
            },
          ],
        },
        { width: 300, height: 100 }
      ).resolveAt(1).camera.scale

    expect(cameraScaleFor("first line")).toBeGreaterThan(
      cameraScaleFor("first line\nsecond line")
    )
  })

  it("rotates to the exact target degrees after the animation ends", () => {
    const rotateTimeline = new Timeline(
      {
        id: "rotate",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "animate",
            t: 4,
            targetId: "box",
            anim: {
              verb: "rotate",
              to: { rotation: 90 },
              duration: 2,
              ease: "linear",
            },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    expect(rotateTimeline.resolveAt(5).nodes[0]?.rotation).toBe(45)
    expect(rotateTimeline.resolveAt(6).nodes[0]?.rotation).toBe(90)
  })

  it("erases a node back toward zero reveal at the eased progress", () => {
    const eraseTimeline = new Timeline(
      {
        id: "erase",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "animate",
            t: 3,
            targetId: "box",
            anim: { verb: "erase", duration: 2, ease: "linear" },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    expect(eraseTimeline.resolveAt(3).nodes[0]?.revealProgress).toBe(1)
    expect(eraseTimeline.resolveAt(4).nodes[0]?.revealProgress).toBe(0.5)
    expect(eraseTimeline.resolveAt(5).nodes[0]?.revealProgress).toBe(0)
  })

  it("exposes a highlight only while its animate op is active", () => {
    const highlightTimeline = new Timeline(
      {
        id: "highlight",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "animate",
            t: 3,
            targetId: "box",
            anim: {
              verb: "highlight",
              color: "#FFD966",
              duration: 2,
              ease: "linear",
            },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    expect(highlightTimeline.resolveAt(3).highlights).toEqual([])
    const mid = highlightTimeline.resolveAt(4)
    expect(mid.highlights).toHaveLength(1)
    expect(mid.highlights[0]).toMatchObject({
      targetId: "box",
      color: "#FFD966",
      drawProgress: 1,
      opacity: 1,
    })
    expect(highlightTimeline.resolveAt(5).highlights).toEqual([])
  })

  it("defaults the highlight color when not specified", () => {
    const highlightTimeline = new Timeline(
      {
        id: "highlight-default",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "animate",
            t: 3,
            targetId: "box",
            anim: { verb: "highlight", duration: 2, ease: "linear" },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    expect(highlightTimeline.resolveAt(4).highlights[0]?.color).toBe("#FFD966")
  })

  it("fades a highlight in over the first third and back out over the last third", () => {
    const highlightTimeline = new Timeline(
      {
        id: "highlight-envelope",
        index: 1,
        ops: [
          scene.ops[0],
          {
            kind: "animate",
            t: 3,
            targetId: "box",
            anim: { verb: "highlight", duration: 20, ease: "linear" },
          },
        ],
      },
      { width: 1920, height: 1080 }
    )
    const early = highlightTimeline.resolveAt(3 + 2)
    expect(early.highlights[0]?.drawProgress).toBeCloseTo(2 / 7)
    const late = highlightTimeline.resolveAt(3 + 18)
    expect(late.highlights[0]?.opacity).toBeCloseTo(2 / 7)
  })
})
