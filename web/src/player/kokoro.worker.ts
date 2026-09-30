import { KokoroTTS } from "kokoro-js"

type WorkerRequest =
  | { type: "load" }
  | { type: "generate"; id: number; text: string; voice: string }

type VoiceInfo = { name?: string; language?: string; gender?: string; traits?: string }

const workerScope = self as DedicatedWorkerGlobalScope
const modelId = "onnx-community/Kokoro-82M-v1.0-ONNX"
let tts: KokoroTTS | null = null
let loading: Promise<KokoroTTS> | null = null
let lastProgress = 0
let modelFilesCached: Promise<boolean> | null = null

function hasCachedModelFiles(): Promise<boolean> {
  if (modelFilesCached) return modelFilesCached
  modelFilesCached = (async () => {
    if (typeof caches === "undefined") return false
    try {
      const cache = await caches.open("transformers-cache")
      const entries = await cache.keys()
      return entries.some(({ url }) =>
        url.includes("/onnx-community/Kokoro-82M-v1.0-ONNX/") && url.includes("/onnx/") && url.endsWith(".onnx")
      )
    } catch {
      return false
    }
  })()
  return modelFilesCached
}

function postProgress(progress: number, message: string): void {
  lastProgress = Math.max(lastProgress, Math.min(99, Math.round(progress)))
  workerScope.postMessage({ type: "progress", progress: lastProgress, message })
}

async function loadModel(): Promise<KokoroTTS> {
  if (tts) return tts
  if (loading) return loading
  lastProgress = 0
  loading = (async () => {
    const cached = await hasCachedModelFiles()
    postProgress(1, "Starting Kokoro…")
    return KokoroTTS.from_pretrained(modelId, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (event) => {
        const file = "file" in event ? event.file.toLowerCase() : ""
        if (event.status === "progress" && file.endsWith(".onnx")) {
          postProgress(event.progress * 0.94, cached ? "Loading saved voice model…" : "Downloading voice model…")
        } else if (event.status === "done" && file.endsWith(".onnx")) {
          postProgress(96, cached ? "Preparing saved voice model…" : "Preparing voice model…")
        } else if (event.status === "ready") {
          postProgress(99, "Finishing setup…")
        }
      },
    })
  })()
  try {
    tts = await loading
    return tts
  } finally {
    loading = null
  }
}

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type === "load") {
    void loadModel().then((model) => {
      const voices = Object.entries(
        model.voices as unknown as Record<string, VoiceInfo>
      ).map(([id, info]) => ({ id, ...info }))
      postProgress(100, "Voice ready")
      workerScope.postMessage({ type: "ready", voices })
    }).catch((error: unknown) => {
      workerScope.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    })
    return
  }

  void loadModel().then(async (model) => {
    const audio = await model.generate(request.text, { voice: request.voice as never })
    const samples = new Float32Array(audio.audio)
    workerScope.postMessage(
      {
        type: "generated",
        id: request.id,
        samples: samples.buffer,
        sampleRate: audio.sampling_rate,
      },
      [samples.buffer]
    )
  }).catch((error: unknown) => {
    workerScope.postMessage({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    })
  })
})
