export type KokoroVoice = {
  id: string
  name?: string
  language?: string
  gender?: string
  traits?: string
}

export type KokoroState = {
  status: "idle" | "loading" | "ready" | "error"
  progress: number
  message: string
  voices: KokoroVoice[]
  error?: string
}

export type KokoroAudio = { samples: Float32Array; sampleRate: number }

type PendingAudio = {
  resolve: (audio: KokoroAudio) => void
  reject: (error: Error) => void
}

type WorkerMessage =
  | { type: "progress"; progress: number; message: string }
  | { type: "ready"; voices: KokoroVoice[] }
  | { type: "generated"; id: number; samples: ArrayBuffer; sampleRate: number }
  | { type: "error"; id?: number; message: string }

const listeners = new Set<() => void>()
const pending = new Map<number, PendingAudio>()
const audioCache = new Map<string, KokoroAudio>()
const generationJobs = new Map<string, Promise<KokoroAudio>>()
let state: KokoroState = {
  status: "idle",
  progress: 0,
  message: "",
  voices: [],
}
let worker: Worker | null = null
let loadPromise: Promise<void> | null = null
let loadResolve: (() => void) | null = null
let loadReject: ((error: Error) => void) | null = null
let requestId = 0

function updateState(next: Partial<KokoroState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), {
    type: "module",
  })
  worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data
    if (message.type === "progress") {
      updateState({ status: "loading", progress: message.progress, message: message.message })
    } else if (message.type === "ready") {
      updateState({ status: "ready", progress: 100, message: "Voice ready", voices: message.voices, error: undefined })
      loadResolve?.()
      loadResolve = null
      loadReject = null
    } else if (message.type === "generated") {
      const job = pending.get(message.id)
      pending.delete(message.id)
      job?.resolve({ samples: new Float32Array(message.samples), sampleRate: message.sampleRate })
    } else {
      const error = new Error(message.message)
      if (message.id !== undefined) {
        pending.get(message.id)?.reject(error)
        pending.delete(message.id)
      } else {
        updateState({ status: "error", error: message.message, message: "Could not load Kokoro" })
        loadReject?.(error)
        loadResolve = null
        loadReject = null
        loadPromise = null
      }
    }
  }
  worker.onerror = (event) => {
    const error = new Error(event.message || "Kokoro worker failed")
    worker?.terminate()
    worker = null
    updateState({ status: "error", error: error.message, message: "Could not load Kokoro" })
    pending.forEach((job) => job.reject(error))
    pending.clear()
    loadReject?.(error)
    loadResolve = null
    loadReject = null
    loadPromise = null
  }
  return worker
}

export function getKokoroState(): KokoroState {
  return state
}

export function subscribeKokoro(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function loadKokoro(): Promise<void> {
  if (state.status === "ready") return Promise.resolve()
  if (loadPromise) return loadPromise
  updateState({ status: "loading", progress: 0, message: "Starting Kokoro…", error: undefined })
  const job = new Promise<void>((resolve, reject) => {
    loadResolve = resolve
    loadReject = reject
  })
  loadPromise = job
  try {
    getWorker().postMessage({ type: "load" })
  } catch (reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    const reject = loadReject
    updateState({ status: "error", error: error.message, message: "Could not load Kokoro" })
    loadPromise = null
    loadResolve = null
    loadReject = null
    job.catch(() => undefined)
    reject?.(error)
    return job
  }
  return job
}

export async function generateKokoroAudio(text: string, voice: string): Promise<KokoroAudio> {
  await loadKokoro()
  const key = `${voice}:${text}`
  const cached = audioCache.get(key)
  if (cached) return cached
  const existing = generationJobs.get(key)
  if (existing) return existing
  const id = ++requestId
  const job = new Promise<KokoroAudio>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ type: "generate", id, text, voice })
  })
  generationJobs.set(key, job)
  try {
    const audio = await job
    audioCache.set(key, audio)
    return audio
  } finally {
    generationJobs.delete(key)
  }
}
