import { useEffect, useRef, useState } from "react"
import { drawScene } from "@/renderer/draw.ts"
import { Timeline } from "@/timeline/timeline.ts"
import { compileTemplate } from "@/templates/templatePreview.ts"

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
  const result = isVisible ? compileTemplate(script) : null
  const document = result?.document
  const scene = document?.scenes[sceneIndex]
  const error = !document
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
    const context = canvas.getContext("2d")
    if (!context) return

    const { width, height } = document.canvas
    const renderScale = Math.min(640 / width, 640 / height, 1)
    canvas.width = Math.max(1, Math.round(width * renderScale))
    canvas.height = Math.max(1, Math.round(height * renderScale))
    const timeline = new Timeline(scene, document.canvas)
    const state = timeline.resolveAt(timeline.duration + 0.1)
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
  }, [document, isVisible, scene])

  return (
    <div
      ref={containerRef}
      className={`relative grid min-h-32 place-items-center overflow-hidden ${className}`}
    >
      {error ? (
        <p className="px-4 text-center text-xs text-muted-foreground">
          {error}
        </p>
      ) : isVisible ? (
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-xs text-muted-foreground">Loading preview…</span>
      )}
    </div>
  )
}
