interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const modelPathPrefix = "/hf/onnx-community/Kokoro-82M-v1.0-ONNX/"

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith("/hf/")) return env.ASSETS.fetch(request)

    const headers = corsHeaders()
    if (!url.pathname.startsWith(modelPathPrefix)) {
      return new Response("Model asset not found", { status: 404, headers })
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers })
    }

    const upstreamUrl = new URL(`https://huggingface.co/${url.pathname.slice(4)}${url.search}`)
    const upstreamHeaders = new Headers()
    const range = request.headers.get("Range")
    if (range) upstreamHeaders.set("Range", range)

    try {
      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        redirect: "follow",
      })
      upstream.headers.forEach((value, key) => headers.set(key, value))
      headers.set("Access-Control-Allow-Origin", "*")
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
      headers.set("Access-Control-Allow-Headers", "*")
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      })
    } catch {
      return new Response("Kokoro model download failed. Please retry.", { status: 502, headers })
    }
  },
}
