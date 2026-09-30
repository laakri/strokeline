import { describe, expect, it } from "vitest"
import type { SceneDocument, SceneNode, TimelineOp } from "@/ir/types.ts"
import { validate } from "@/validator/validate.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"

function textNode(
  id: string,
  x: number,
  y: number,
  text: string,
  fontSize = 30,
  color = "#222222"
): SceneNode {
  return {
    id,
    type: "text",
    position: { x, y },
    rotation: 0,
    opacity: 1,
    style: { color, strokeWidth: 4, fontSize },
    text,
    layer: 0,
  }
}

function createOp(node: SceneNode, t = 0, duration = 0.5): TimelineOp {
  return {
    kind: "create",
    t,
    node,
    draw: { duration, ease: "linear", style: "draw-on" },
    source: { line: 4, col: 3 },
  }
}

describe("non-blocking measured layout diagnostics", () => {
  it("reports every requested warning with source, suggestion, and only errors below 18px", () => {
    const crowded = Array.from({ length: 13 }, (_, index) =>
      createOp(
        textNode(
          `crowd-${index}`,
          160 + (index % 5) * 300,
          160 + Math.floor(index / 5) * 220,
          `label ${index}`
        )
      )
    )
    const ops: TimelineOp[] = [
      ...crowded,
      createOp(textNode("off-safe", 50, 50, "Safe", 20, "#777777")),
      createOp(textNode("tiny", 1200, 900, "Tiny", 16)),
      createOp(textNode("overlap-a", 500, 350, "First")),
      createOp(textNode("overlap-b", 500, 350, "Second")),
      createOp(textNode("long", 1400, 850, "L".repeat(61))),
      createOp(textNode("crossing-text", 550, 800, "Crossing")),
      createOp({
        id: "shape-under-text",
        type: "rectangle",
        position: { x: 500, y: 350 },
        size: { width: 220, height: 120 },
        rotation: 0,
        opacity: 1,
        style: { color: "#222222", strokeWidth: 4 },
        layer: 0,
      }),
      createOp({
        id: "arrow-start",
        type: "rectangle",
        position: { x: 100, y: 800 },
        size: { width: 20, height: 20 },
        rotation: 0,
        opacity: 1,
        style: { color: "#222222", strokeWidth: 4 },
        layer: 0,
      }),
      createOp({
        id: "arrow-end",
        type: "rectangle",
        position: { x: 1000, y: 800 },
        size: { width: 20, height: 20 },
        rotation: 0,
        opacity: 1,
        style: { color: "#222222", strokeWidth: 4 },
        layer: 0,
      }),
      createOp(textNode("late", 1400, 700, "Late"), 70, 1),
      createOp({
        id: "arrow-1",
        type: "arrow",
        position: { x: 0, y: 0 },
        rotation: 0,
        opacity: 1,
        style: { color: "#222222", strokeWidth: 4 },
        data: { fromId: "arrow-start", toId: "arrow-end" },
        layer: 0,
      }),
      {
        kind: "camera",
        t: 72,
        camera: { verb: "zoom", scale: 1.4, duration: 1, ease: "linear" },
        source: { line: 90, col: 3 },
      },
    ]
    const document: SceneDocument = {
      version: "1.0",
      canvas: { width: 1920, height: 1080 },
      background: "#FFFFFF",
      style: { mode: "handdrawn", strokeWidth: 4, font: "handwritten" },
      scenes: [{ id: "1", index: 1, label: "Warnings", ops }],
    }

    const diagnostics = validate(document)
    const codes = new Set(diagnostics.map((diagnostic) => diagnostic.code))
    for (const code of [
      "W_TEXT_OFF_SAFE",
      "W_TEXT_OVERLAP",
      "W_TEXT_ON_SHAPE",
      "W_TEXT_TOO_SMALL",
      "W_LOW_CONTRAST",
      "W_TOO_CROWDED",
      "W_LONG_TEXT",
      "W_ARROW_CROSSES_TEXT",
      "W_SCENE_LENGTH",
      "W_DEAD_AIR",
      "W_CAMERA_NOT_RESET",
    ]) {
      expect(codes.has(code), code).toBe(true)
    }
    const overlap = diagnostics.find(
      (diagnostic) =>
        diagnostic.code === "W_TEXT_OVERLAP" &&
        diagnostic.message.includes('"overlap-a"') &&
        diagnostic.message.includes('"overlap-b"')
    )
    expect(overlap?.message).toContain('"overlap-a"')
    expect(overlap?.message).toContain('"overlap-b"')
    expect(
      diagnostics
        .filter((diagnostic) => diagnostic.severity === "warning")
        .every((diagnostic) => Boolean(diagnostic.suggestion))
    ).toBe(true)
    expect(
      diagnostics.find(
        (diagnostic) =>
          diagnostic.code === "W_TEXT_TOO_SMALL" &&
          diagnostic.message.includes("tiny")
      )?.severity
    ).toBe("error")
    expect(
      blocksScriptRun(
        diagnostics.find(
          (diagnostic) =>
            diagnostic.code === "W_TEXT_TOO_SMALL" &&
            diagnostic.message.includes('"tiny"')
        )!
      )
    ).toBe(false)
    expect(
      blocksScriptRun({
        code: "E_BAD_RANGE",
        message: "Invalid value.",
        line: 1,
        col: 1,
      })
    ).toBe(true)
  })
})
