import { useEffect, useRef } from "react"

import { drawBoardPreview } from "@/renderer/draw.ts"

export function DocsBoardPreview({ board, color }: { board: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const render = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.round(bounds.width * ratio))
      const height = Math.max(1, Math.round(bounds.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      drawBoardPreview(context, board, color)
    }

    const observer = new ResizeObserver(render)
    observer.observe(canvas)
    render()
    return () => observer.disconnect()
  }, [board, color])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`${board} board texture example`}
      className="absolute inset-0 size-full"
    />
  )
}
