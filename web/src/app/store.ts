import { create } from "zustand"
import workedExample from "@/dsl/__tests__/valid/12-worked-example.wbs?raw"
import { runScript } from "@/dsl/index.ts"
import { repairSyntax } from "@/dsl/repair.ts"
import { blocksScriptRun } from "@/dsl/diagnostics.ts"
import { normalizeScriptSource } from "@/dsl/source.ts"
import type { Diagnostic, Scene, SceneDocument } from "@/ir/types.ts"

const STORAGE_KEY = "strokeline.script.v1"

export interface EditorSourceEdit {
  from: number
  to: number
  insert: string
}

/** Minimal starter script used whenever the editor is emptied. */
export const STARTER_SCRIPT = `VERSION 1.0
CANVAS 1920 1080
BACKGROUND #FAFAFA
STYLE handdrawn
FONT handwritten
STROKE 4

SCENE 1 "Hello"
  CREATE title AS TEXT
    TEXT "Hello world"
    POSITION 960 300
    SIZE 96
    COLOR #2E86AB
    DRAW 1.2s
  END
END SCENE
`

function loadStoredScript(): string {
  try {
    if (typeof localStorage === "undefined") return workedExample
    return localStorage.getItem(STORAGE_KEY) ?? workedExample
  } catch {
    return workedExample
  }
}

function saveStoredScript(script: string): void {
  try {
    if (typeof localStorage === "undefined") return
    localStorage.setItem(STORAGE_KEY, script)
  } catch {
    /* storage unavailable: keep state in memory only */
  }
}

const initialScript = (() => {
  return loadStoredScript()
})()
const initialResult = runScript(initialScript)

interface PlayerState {
  elapsed: number
  duration: number
  isPlaying: boolean
}

interface AppStore {
  script: string
  compiledSource: string
  compiledIR: SceneDocument | null
  scenes: Scene[]
  diagnostics: Diagnostic[]
  activeSceneIndex: number
  runId: number
  editorJump: { line: number; col: number } | null
  editorLoad: { text: string } | null
  editorSourceReader: (() => string) | null
  editorSourceWriter: ((edits: EditorSourceEdit[]) => void) | null
  player: PlayerState
  setScript: (script: string) => void
  compileScript: () => void
  run: () => boolean
  setActiveSceneIndex: (index: number) => void
  setPlayerState: (state: Partial<PlayerState>) => void
  setImageDiagnostics: (diagnostics: Diagnostic[]) => void
  requestEditorJump: (line: number, col: number) => void
  clearEditorJump: () => void
  setEditorSourceReader: (reader: (() => string) | null) => void
  setEditorSourceWriter: (writer: ((edits: EditorSourceEdit[]) => void) | null) => void
  applyEditorSourceEdits: (edits: EditorSourceEdit[]) => void
  loadScript: (text: string) => void
  clearEditorLoad: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  script: initialScript,
  compiledSource: initialScript,
  compiledIR: initialResult.document,
  scenes: initialResult.document?.scenes ?? [],
  diagnostics: initialResult.diagnostics,
  activeSceneIndex: 0,
  runId: 0,
  editorJump: null,
  editorLoad: null,
  editorSourceReader: null,
  editorSourceWriter: null,
  player: { elapsed: 0, duration: 0, isPlaying: false },
  setScript: (script) => {
    const normalized = normalizeScriptSource(script).source
    saveStoredScript(normalized)
    set({ script: normalized })
  },
  compileScript: () => {
    const script = get().script
    if (get().compiledSource === script) return
    const previousSceneIndex = get().activeSceneIndex
    const result = runScript(script)
    set({
      compiledIR: result.document,
      scenes: result.document?.scenes ?? [],
      diagnostics: result.diagnostics,
      activeSceneIndex: result.document
        ? Math.min(previousSceneIndex, Math.max(0, result.document.scenes.length - 1))
        : 0,
      compiledSource: script,
    })
  },
  run: () => {
    const editorSource = get().editorSourceReader?.()
    const source = normalizeScriptSource(editorSource ?? get().script).source
    if (source !== get().script) {
      saveStoredScript(source)
      set({ script: source })
    }
    const script = repairSyntax(source).script
    if (script !== source) {
      saveStoredScript(script)
      set({ script, editorLoad: { text: script } })
    }
    const result = runScript(script)
    if (!result.document || result.diagnostics.some(blocksScriptRun)) {
      set({
        compiledIR: null,
        scenes: [],
        diagnostics: result.diagnostics,
        activeSceneIndex: 0,
        compiledSource: script,
      })
      return false
    }
    set({
      compiledIR: result.document,
      scenes: result.document.scenes,
      diagnostics: result.diagnostics,
      runId: get().runId + 1,
      activeSceneIndex: 0,
      compiledSource: script,
    })
    return true
  },
  setActiveSceneIndex: (activeSceneIndex) => set({ activeSceneIndex }),
  setPlayerState: (player) =>
    set((state) => ({ player: { ...state.player, ...player } })),
  setImageDiagnostics: (imageDiagnostics) =>
    set((state) => ({
      diagnostics: [
        ...state.diagnostics.filter((diagnostic) => diagnostic.code !== "E_IMAGE_LOAD"),
        ...imageDiagnostics,
      ],
    })),
  requestEditorJump: (line, col) => set({ editorJump: { line, col } }),
  clearEditorJump: () => set({ editorJump: null }),
  setEditorSourceReader: (editorSourceReader) => set({ editorSourceReader }),
  setEditorSourceWriter: (editorSourceWriter) => set({ editorSourceWriter }),
  applyEditorSourceEdits: (edits) => {
    const writer = get().editorSourceWriter
    if (writer) {
      writer(edits)
      return
    }
    let script = get().script
    for (const edit of [...edits].sort((left, right) => right.from - left.from)) {
      script = `${script.slice(0, edit.from)}${edit.insert}${script.slice(edit.to)}`
    }
    get().setScript(script)
  },
  loadScript: (text) => {
    const source = normalizeScriptSource(text).source
    saveStoredScript(source)
    const result = runScript(source)
    set((state) => ({
      script: source,
      compiledSource: source,
      compiledIR: result.document,
      scenes: result.document?.scenes ?? [],
      diagnostics: result.diagnostics,
      activeSceneIndex: 0,
      runId: result.document ? state.runId + 1 : state.runId,
      editorLoad: { text: source },
    }))
  },
  clearEditorLoad: () => set({ editorLoad: null }),
}))
