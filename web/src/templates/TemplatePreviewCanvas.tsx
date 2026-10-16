import { useEffect, useRef, useState } from "react"
import { LoaderCircle, Sparkles } from "lucide-react"
import { drawScene } from "@/renderer/draw.ts"
import { preloadImages } from "@/renderer/images.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { compileTemplate } from "@/templates/templatePreview.ts"

type PreviewStatus = "pending" | "ready" | "error"

export function TemplatePreviewCanvas({
  script,
  sceneIndex = 0,
  label,
  lazy = false,
  className = "",
}: {
  script: string
  sceneIndex?: number
  label: string
  lazy?: boolean
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(!lazy)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("pending")
  const [imageWarning, setImageWarning] = useState(false)
  const result = isVisible ? compileTemplate(script) : null
  const document = result?.document
  const scene = document?.scenes[sceneIndex]
  const error = !isVisible
    ? null
    : !document
      ? "This template could not be previewed."
      : !scene
        ? "This scene is unavailable."
        : null

  useEffect(() => {
    if (!lazy || isVisible || !containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "160px" }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [isVisible, lazy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !document || !scene || !isVisible) return
    let cancelled = false
    setPreviewStatus("pending")
    setImageWarning(false)

    const renderPreview = async () => {
      let timeoutId: number | undefined
      try {
        const context = canvas.getContext("2d")
        if (!context) {
          throw new Error("The browser could not create a preview canvas.")
        }

        const { width, height } = document.canvas
        const renderScale = Math.min(640 / width, 640 / height, 1)
        canvas.width = Math.max(1, Math.round(width * renderScale))
        canvas.height = Math.max(1, Math.round(height * renderScale))
        const timeline = new Timeline(scene, document.canvas)
        const state = timeline.resolveAt(timeline.duration + 0.1)
        const render = () => {
          drawScene(
            context,
            state,
            undefined,
            document.canvas,
            document.background,
            document.style.mode,
            document.style.board,
            document.style.hand
          )
        }
        const imageLoad = preloadImages(document)
        const imageDiagnostics = await Promise.race([
          imageLoad,
          new Promise<undefined>((resolve) => {
            timeoutId = window.setTimeout(() => resolve(undefined), 2500)
          }),
        ])
        if (cancelled) return
        render()
        setImageWarning(
          imageDiagnostics === undefined || imageDiagnostics.length > 0
        )
        setPreviewStatus("ready")
        if (imageDiagnostics === undefined) {
          void imageLoad
            .then((diagnostics) => {
              if (cancelled) return
              render()
              setImageWarning(diagnostics.length > 0)
            })
            .catch((error: unknown) => {
              console.error(
                `Unable to finish loading template preview images: ${label}`,
                error
              )
            })
        }
      } catch (error) {
        console.error(`Unable to render template preview: ${label}`, error)
        if (!cancelled) setPreviewStatus("error")
      } finally {
        if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      }
    }

    void renderPreview()
    return () => {
      cancelled = true
    }
  }, [document, isVisible, label, scene])

  return (
    <div
      ref={containerRef}
      className={`relative grid min-h-32 place-items-center overflow-hidden ${className}`}
    >
      {error ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {error}
        </p>
      ) : (
        <>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-hidden={previewStatus === "ready"}
            className={`absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,color-mix(in_oklab,var(--muted)_88%,transparent),color-mix(in_oklab,var(--card)_70%,transparent))] transition-opacity duration-300 ${
              previewStatus === "ready"
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }`}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              {previewStatus === "error" ? (
                <Sparkles aria-hidden="true" className="size-5 opacity-60" />
              ) : (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-5 animate-spin text-primary"
                />
              )}
              <span className="text-[11px] font-medium tracking-wide">
                {previewStatus === "error"
                  ? "Preview unavailable"
                  : isVisible
                    ? "Drawing preview"
                    : "Loading preview"}
              </span>
            </div>
          </div>
          {isVisible && document && scene && (
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={label}
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                previewStatus === "ready" ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
          {previewStatus === "ready" && imageWarning && (
            <span
              title="Some linked images could not be loaded."
              className="absolute right-2 bottom-2 rounded-md border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm"
            >
              Some images unavailable
            </span>
          )}
        </>
      )}
    </div>
  )
}
