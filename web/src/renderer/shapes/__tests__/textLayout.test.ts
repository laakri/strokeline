import { afterEach, describe, expect, it } from "vitest"
import { features } from "@/defaults/features.ts"
import { layoutText } from "@/renderer/shapes/textLayout.ts"

const defaultFeatures = { ...features }
const measure = (value: string) => value.length * 10

afterEach(() => Object.assign(features, defaultFeatures))

describe("text layout feature flags", () => {
  it("keeps explicit line breaks behind the multiline-text flag", () => {
    const text = "first\nsecond"
    expect(layoutText(text, 20, undefined, measure).lines).toEqual([
      "first",
      "second",
    ])

    features.multilineText = false
    expect(layoutText(text, 20, undefined, measure).lines).toEqual([
      "first second",
    ])
  })

  it("keeps MAXWIDTH wrapping behind its feature flag", () => {
    const text = "one two three"
    expect(layoutText(text, 20, 70, measure).lines).toEqual([
      "one two",
      "three",
    ])

    features.maxWidthWrapping = false
    expect(layoutText(text, 20, 70, measure).lines).toEqual([text])
  })
})
