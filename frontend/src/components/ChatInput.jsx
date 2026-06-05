import { useRef } from 'react'

const SUGGESTIONS = [
  'How do I implement card lifecycle management?',
  'What are best practices for BIN configuration?',
  'Explain the prepaid card activation flow',
  'How to handle card reissuance requests securely?',
]

export default function ChatInput({ value, onChange, onSend, onStop, isStreaming, showSuggestions }) {
  const textareaRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  // Auto-resize textarea up to ~5 lines
  const handleChange = (e) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    onChange(e.target.value)
  }

  return (
    <div className="input-area">
      {showSuggestions && (
        <div className="suggestions-row">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="suggestion-chip"
              onClick={() => {
                onChange(s)
                textareaRef.current?.focus()
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="input-row">
        <textarea
          ref={textareaRef}
          className="message-input"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about card management, BIN configuration, lifecycle…"
          rows={1}
          disabled={isStreaming}
          aria-label="Chat message input"
        />
        <button
          className={`send-btn ${isStreaming ? 'stop-btn' : ''}`}
          onClick={isStreaming ? onStop : onSend}
          disabled={!isStreaming && !value.trim()}
          aria-label={isStreaming ? 'Stop response' : 'Send message'}
        >
          {isStreaming ? '⏹ Stop' : '➤ Send'}
        </button>
      </div>

      <div className="input-hint">
        Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
      </div>
    </div>
  )
}
