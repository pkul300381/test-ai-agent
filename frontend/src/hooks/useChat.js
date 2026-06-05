import { useCallback, useRef, useState } from 'react'
import { streamChat } from '../services/api.js'

/**
 * Custom hook that manages chat state and streaming logic.
 *
 * Returns:
 *   messages        - array of {id, role, content, streaming?}
 *   isStreaming     - true while a response is being received
 *   error           - error string or null
 *   sendMessage     - (text: string, model: string) => void
 *   clearChat       - () => void
 *   clearError      - () => void
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)

  const abortRef = useRef(null)

  const sendMessage = useCallback(
    (text, model) => {
      if (!text.trim() || isStreaming) return

      const userMsg = { id: Date.now(), role: 'user', content: text.trim() }
      const assistantId = Date.now() + 1
      const assistantMsg = { id: assistantId, role: 'assistant', content: '', streaming: true }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)
      setError(null)

      // Build history to send (exclude the empty placeholder we just added)
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

      abortRef.current = new AbortController()

      streamChat(
        history,
        model,
        // onChunk: append to the streaming assistant message
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m,
            ),
          )
        },
        // onDone: mark streaming finished
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m,
            ),
          )
          setIsStreaming(false)
        },
        // onError
        (err) => {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
          setError(err)
          setIsStreaming(false)
        },
        abortRef.current.signal,
      )
    },
    [messages, isStreaming],
  )

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { messages, isStreaming, error, sendMessage, clearChat, clearError }
}
