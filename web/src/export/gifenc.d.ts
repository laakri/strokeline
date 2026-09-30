declare module "gifenc" {
  export type RgbColor = [number, number, number]

  export interface GifFrameOptions {
    palette?: RgbColor[]
    delay?: number
    repeat?: number
    transparent?: boolean
    transparentIndex?: number
    colorDepth?: number
    dispose?: number
    first?: boolean
  }

  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifFrameOptions): void
    finish(): void
    bytes(): Uint8Array<ArrayBuffer>
  }

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GifEncoderInstance
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string; clearAlpha?: boolean; clearAlphaColor?: number; clearAlphaThreshold?: number; oneBitAlpha?: boolean; useSqrt?: boolean },
  ): RgbColor[]
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: RgbColor[],
    format?: string,
  ): Uint8Array
}