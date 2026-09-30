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
const AUDIO_DB_NAME = "strokeline-kokoro-audio-wasm-v1"
const LEGACY_AUDIO_DB_NAME = "strokeline-kokoro-audio-v1"
const AUDIO_STORE_NAME = "clips"
const AUDIO_CACHE_LIMIT = 64 * 1024 * 1024
const AUDIO_CACHE_ENTRY_LIMIT = 500
type StoredAudio = { key: string; samples: ArrayBuffer; sampleRate: number; savedAt: number }
let audioDbPromise: Promise<IDBDatabase | null> | null = null
let persistenceRequest: Promise<boolean> | null = null
let legacyAudioCacheCleared = false
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

function openAudioDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  if (!legacyAudioCacheCleared) {
    legacyAudioCacheCleared = true
    indexedDB.deleteDatabase(LEGACY_AUDIO_DB_NAME)
  }
  if (audioDbPromise) return audioDbPromise
  audioDbPromise = new Promise((resolve) => {
    const request = indexedDB.open(AUDIO_DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        request.result.createObjectStore(AUDIO_STORE_NAME, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
  return audioDbPromise
}

async function readStoredAudio(key: string): Promise<KokoroAudio | null> {
  const db = await openAudioDb()
  if (!db) return null
  return new Promise((resolve) => {
    const request = db.transaction(AUDIO_STORE_NAME, "readonly").objectStore(AUDIO_STORE_NAME).get(key)
    request.onsuccess = () => {
      const stored = request.result as StoredAudio | undefined
      resolve(stored
        ? { samples: new Float32Array(stored.samples), sampleRate: stored.sampleRate }
        : null)
    }
    request.onerror = () => resolve(null)
  })
}

async function writeStoredAudio(key: string, audio: KokoroAudio): Promise<void> {
  const db = await openAudioDb()
  if (!db) return
  const transaction = db.transaction(AUDIO_STORE_NAME, "readwrite")
  const store = transaction.objectStore(AUDIO_STORE_NAME)
  const copy = audio.samples.slice()
  store.put({ key, samples: copy.buffer, sampleRate: audio.sampleRate, savedAt: Date.now() } satisfies StoredAudio)
  const list = store.getAll()
  list.onsuccess = () => {
    const entries = (list.result as StoredAudio[]).sort((a, b) => a.savedAt - b.savedAt)
    let bytes = entries.reduce((total, entry) => total + entry.samples.byteLength, 0)
    let count = entries.length
    for (const entry of entries) {
      if (bytes <= AUDIO_CACHE_LIMIT && count <= AUDIO_CACHE_ENTRY_LIMIT) break
      store.delete(entry.key)
      bytes -= entry.samples.byteLength
      count--
    }
  }
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}

function requestPersistentStorage(): void {
  if (persistenceRequest || typeof navigator === "undefined" || !navigator.storage?.persist) return
  persistenceRequest = navigator.storage.persist().catch(() => false)
}

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
  requestPersistentStorage()
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
  const key = `${voice}:${text}`
  const cached = audioCache.get(key)
  if (cached) return cached
  const existing = generationJobs.get(key)
  if (existing) return existing
  const job = (async () => {
    const saved = await readStoredAudio(key)
    if (saved) {
      audioCache.set(key, saved)
      return saved
    }
    await loadKokoro()
    const id = ++requestId
    const generated = await new Promise<KokoroAudio>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      getWorker().postMessage({ type: "generate", id, text, voice })
    })
    audioCache.set(key, generated)
    await writeStoredAudio(key, generated).catch(() => undefined)
    return generated
  })()
  generationJobs.set(key, job)
  try {
    return await job
  } finally {
    generationJobs.delete(key)
  }
}
