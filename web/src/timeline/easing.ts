export type EasingFunction = (progress: number) => number

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value))

export const linear: EasingFunction = (progress) => clamp(progress)
export const easeIn: EasingFunction = (progress) => linear(progress) ** 2
export const easeOut: EasingFunction = (progress) => 1 - (1 - linear(progress)) ** 2
export const easeInOut: EasingFunction = (progress) => {
  const value = linear(progress)
  return value < 0.5 ? 2 * value ** 2 : 1 - (-2 * value + 2) ** 2 / 2
}
export const bounce: EasingFunction = (progress) => {
  let value = linear(progress)
  const n1 = 7.5625
  const d1 = 2.75
  if (value < 1 / d1) return n1 * value * value
  if (value < 2 / d1) return n1 * (value -= 1.5 / d1) * value + 0.75
  if (value < 2.5 / d1) return n1 * (value -= 2.25 / d1) * value + 0.9375
  return n1 * (value -= 2.625 / d1) * value + 0.984375
}

export const easeOutBack: EasingFunction = (progress) => {
  const x = linear(progress) - 1
  return 1 + 2.70158 * x ** 3 + 1.70158 * x ** 2
}
export const easeOutElastic: EasingFunction = (progress) => {
  const x = linear(progress)
  if (x === 0 || x === 1) return x
  return 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1
}
export const easeInOutCubic: EasingFunction = (progress) => {
  const x = linear(progress)
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2
}
export const spring: EasingFunction = (progress) => {
  const x = linear(progress)
  if (x === 0 || x === 1) return x
  return 1 - Math.exp(-8 * x) * Math.cos(11 * x)
}

export const easing: Record<string, EasingFunction> = { linear, easeIn, easeOut, easeInOut, bounce, easeOutBack, easeOutElastic, easeInOutCubic, spring }

export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * clamp(progress)
}
