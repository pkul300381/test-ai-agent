const BASE = '/api'

/**
 * Fetch the list of available LLM models from the backend.
 * @returns {Promise<Array>}
 */
export async function fetchModels() {
  const res = await fetch(`${BASE}/models`)
  if (!res.ok) throw new Error(`Failed to load models: ${res.status}`)
  const data = await res.json()
  return data.models
}

/**
 * Stream a chat response from the backend.
 *
 * @param {Array<{role: string, content: string}>} messages - conversation history
 * @param {string} model - model ID
 * @param {(chunk: string) => void} onChunk - called for each streamed text chunk
 * @param {() => void} onDone - called when streaming completes
 * @param {(err: string) => void} onError - called on error
 * @param {AbortSignal} signal - AbortController signal to cancel the stream
 */
export async function streamChat(messages, model, onChunk, onDone, onError, signal) {
  let response
  try {
    response = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    })
  } catch (err) {
    if (err.name !== 'AbortError') onError(err.message)
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    onError(`Server error ${response.status}: ${text}`)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        let event
        try {
          event = JSON.parse(raw)
        } catch {
          continue
        }

        if (event.type === 'text') {
          onChunk(event.content)
        } else if (event.type === 'done') {
          onDone()
        } else if (event.type === 'error') {
          onError(event.message)
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') onError(err.message)
  }
}
