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
  if (scenes.length < 2) return null
  return (
    <div className="flex min-w-0 snap-x items-center gap-1 overflow-x-auto border-b border-border bg-muted px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {scenes.map((scene, index) => (
        <button
          key={scene.id}
          type="button"
          onClick={() => {
            setActiveSceneIndex(index)
            onSelect?.(index)
          }}
          className={`shrink-0 snap-start rounded-md px-2.5 py-2 text-xs sm:px-3 sm:py-1.5 sm:text-sm ${index === activeSceneIndex ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:bg-background/70"}`}
        >
          {scene.label ?? `Scene ${scene.index}`}
        </button>
      ))}
    </div>
  )
}
