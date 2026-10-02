import { describe, expect, it } from "vitest"
import { runScript } from "@/dsl/index.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { STARTER_SCRIPT, useAppStore } from "@/app/store.ts"

const multiSceneScript = `VERSION 1.0
CANVAS 800 600
SCENE 1 "One"
CREATE first AS TEXT
POSITION 100 100
TEXT "First"
END
END SCENE
SCENE 2 "Two"
CREATE second AS TEXT
POSITION 200 200
TEXT "Second"
END
END SCENE`

describe("app store scene tabs", () => {
  it("keeps a stable scene-list snapshot after compiling multiple scenes", () => {
    const store = useAppStore.getState()
    store.setScript(multiSceneScript)
    store.compileScript()

    const scenes = useAppStore.getState().scenes
    expect(scenes).toHaveLength(2)

    useAppStore.getState().setPlayerState({ elapsed: 0.5 })
    expect(useAppStore.getState().scenes).toBe(scenes)
  })

  it("preserves an intentionally cleared editor script", () => {
    const result = runScript(STARTER_SCRIPT)
    expect(result.diagnostics.filter(blocksScriptRun)).toEqual([])

    useAppStore.getState().setScript("")
    expect(useAppStore.getState().script).toBe("")
    useAppStore.getState().setScript(STARTER_SCRIPT)
  })

  it("runs the live editor document when the store snapshot is stale", () => {
    const staleScript = multiSceneScript
    const liveScript = `VERSION 1.0
CANVAS 800 600
SCENE 1 "Live editor"
CREATE liveText AS TEXT
POSITION 400 300
TEXT "Latest code"
END
END SCENE`
    useAppStore.getState().setScript(staleScript)
    useAppStore.getState().setEditorSourceReader(() => liveScript)

    try {
      expect(useAppStore.getState().run()).toBe(true)
      expect(useAppStore.getState().compiledSource).toBe(liveScript)
      expect(useAppStore.getState().script).toBe(liveScript)
    } finally {
      useAppStore.getState().setEditorSourceReader(null)
      useAppStore.getState().setScript(STARTER_SCRIPT)
    }
  })
})
