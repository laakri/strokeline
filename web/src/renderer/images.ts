import type { Diagnostic, SceneDocument } from "@/ir/types.ts"

export const IMAGE_EMBED_ERROR = "This site blocks embedding. Try another URL."

interface ImageAsset {
  image?: HTMLImageElement
  error?: string
  promise: Promise<void>
}
const imageCache = new Map<string, ImageAsset>()

function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && Boolean(url.hostname)
  } catch {
    return false
  }
}

function loadElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(IMAGE_EMBED_ERROR))
    image.src = src
  })
}

function requestImage(url: string, asset: ImageAsset): Promise<void> {
  return (async () => {
    try {
      asset.image = await loadElement(url)
      return
    } catch {
      try {
        const response = await fetch(url, { mode: "cors", credentials: "omit" })
        if (!response.ok) throw new Error(IMAGE_EMBED_ERROR)
        const blob = await response.blob()
        if (!blob.type.startsWith("image/")) throw new Error(IMAGE_EMBED_ERROR)
        const blobUrl = URL.createObjectURL(blob)
        try {
          asset.image = await loadElement(blobUrl)
        } finally {
          URL.revokeObjectURL(blobUrl)
        }
      } catch {
        asset.error = IMAGE_EMBED_ERROR
      }
    }
  })()
}

function ensureImage(url: string): ImageAsset {
  const cached = imageCache.get(url)
  if (cached) return cached
  const asset: ImageAsset = { promise: Promise.resolve() }
  imageCache.set(url, asset)
  asset.promise = isAllowedImageUrl(url)
    ? requestImage(url, asset)
    : Promise.resolve().then(() => { asset.error = IMAGE_EMBED_ERROR })
  return asset
}

export function getImage(url: string | undefined): HTMLImageElement | undefined {
  return url ? ensureImage(url).image : undefined
}

export function getImageError(url: string | undefined): string | undefined {
  return url ? ensureImage(url).error : undefined
}

export function getImageStatus(url: string | undefined): "missing" | "loading" | "ready" | "error" {
  if (!url) return "missing"
  const asset = ensureImage(url)
  return asset.image ? "ready" : asset.error ? "error" : "loading"
}

export async function preloadImages(document: SceneDocument): Promise<Diagnostic[]> {
  const images = document.scenes.flatMap((scene) =>
    scene.ops.flatMap((op) =>
      op.kind === "create" && op.node.type === "image"
        ? [{ node: op.node, line: op.source?.line ?? 1, col: op.source?.col ?? 1 }]
        : []
    )
  )
  await Promise.all(images.map(({ node }) => {
    const url = node.image?.url
    return url ? ensureImage(url).promise : Promise.resolve()
  }))
  return images.flatMap(({ node, line, col }) => {
    const url = node.image?.url
    if (!url || !getImageError(url)) return []
    const locations = node.data?._sourcePropertyLocations as
      | Record<string, { line: number; col: number }>
      | undefined
    return [{
      severity: "error" as const,
      code: "E_IMAGE_LOAD",
      message: `IMAGE "${node.id}" could not load ${url}. ${IMAGE_EMBED_ERROR}`,
      line: locations?.URL?.line ?? line,
      col: locations?.URL?.col ?? col,
      suggestion: "Use an HTTPS image URL that allows embedding, or a same-origin root asset path.",
    }]
  })
}
