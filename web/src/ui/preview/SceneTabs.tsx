import { useEffect, useRef, useState } from "react"
import { useAppStore } from "@/app/store.ts"

export function SceneTabs({
  activeIndex,
  onSelect,
}: {
  activeIndex?: number
  onSelect?: (index: number) => void
}) {
  const scenes = useAppStore((state) => state.scenes)
  const storedActiveSceneIndex = useAppStore((state) => state.activeSceneIndex)
  const setActiveSceneIndex = useAppStore((state) => state.setActiveSceneIndex)
  const activeSceneIndex = activeIndex ?? storedActiveSceneIndex
  const viewportRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const updateScrollButtons = () => {
      setCanScrollLeft(viewport.scrollLeft > 1)
      setCanScrollRight(viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1)
    }
    updateScrollButtons()
    viewport.addEventListener("scroll", updateScrollButtons, { passive: true })
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollButtons)
    observer?.observe(viewport)
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild)
    window.addEventListener("resize", updateScrollButtons)
    return () => {
      viewport.removeEventListener("scroll", updateScrollButtons)
      observer?.disconnect()
      window.removeEventListener("resize", updateScrollButtons)
    }
  }, [scenes.length])

  useEffect(() => {
    const viewport = viewportRef.current
    const activeTab = tabRefs.current[activeSceneIndex]
    if (!viewport || !activeTab) return
    const frame = requestAnimationFrame(() => {
      const viewportBounds = viewport.getBoundingClientRect()
      const tabBounds = activeTab.getBoundingClientRect()
      if (tabBounds.left < viewportBounds.left) {
        viewport.scrollBy({ left: tabBounds.left - viewportBounds.left - 12, behavior: "smooth" })
      } else if (tabBounds.right > viewportBounds.right) {
        viewport.scrollBy({ left: tabBounds.right - viewportBounds.right + 12, behavior: "smooth" })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [activeSceneIndex, scenes.length])

  if (scenes.length < 2) return null

  const scrollByPage = (direction: -1 | 1) => {
    const viewport = viewportRef.current
    if (!viewport) return
    viewport.scrollBy({ left: direction * Math.max(160, viewport.clientWidth * 0.72), behavior: "smooth" })
  }

  return (
    <div className="flex min-w-0 items-center border-b border-border bg-muted px-1 py-1">
      <button
        type="button"
        aria-label="Scroll scenes left"
        title="Scroll scenes left"
        disabled={!canScrollLeft}
        onClick={() => scrollByPage(-1)}
        className={`grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground disabled:invisible ${canScrollLeft ? "" : "pointer-events-none"}`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
        </svg>
      </button>
      <div ref={viewportRef} className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1 px-1">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              ref={(element) => { tabRefs.current[index] = element }}
              type="button"
              onClick={() => {
                setActiveSceneIndex(index)
                onSelect?.(index)
              }}
              className={`shrink-0 rounded-md px-2.5 py-2 text-xs sm:px-3 sm:py-1.5 sm:text-sm ${index === activeSceneIndex ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/70"}`}
            >
              {scene.label ?? `Scene ${scene.index}`}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label="Scroll scenes right"
        title="Scroll scenes right"
        disabled={!canScrollRight}
        onClick={() => scrollByPage(1)}
        className={`grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground disabled:invisible ${canScrollRight ? "" : "pointer-events-none"}`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
        </svg>
      </button>
    </div>
  )
}
