import { useRef, useEffect, useState } from 'react'
import { useChat } from './hooks/useChat.js'
import ModelSelector from './components/ModelSelector.jsx'
import MessageBubble from './components/MessageBubble.jsx'
import ChatInput from './components/ChatInput.jsx'

export default function App() {
  const { messages, isStreaming, error, sendMessage, clearChat, clearError } = useChat()
  const [input, setInput] = useState('')
  const [model, setModel] = useState('gpt-5-mini')
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input, model)
    setInput('')
  }

  const handleStop = () => {
    // The abort controller lives inside useChat; expose it via clearChat's side-effect
    // We trigger a stop by calling clearChat won't work here — instead we track abort externally
    // useChat handles abort internally via its own ref, triggered by sendMessage's closure.
    // Calling clearChat is the safest way to abort + reset.
    clearChat()
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <span className="logo">💳</span>
          <div>
            <h1>Payment Card AI Agent</h1>
            <p className="header-subtitle">Card management · BIN config · Lifecycle ops</p>
          </div>
        </div>
        <div className="header-right">
          <ModelSelector value={model} onChange={setModel} disabled={isStreaming} />
          <button className="clear-btn" onClick={clearChat} title="Clear conversation">
            Clear
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <main className="chat-area">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <div className="messages-list">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ── Error banner ── */}
      {error && (
        <div className="error-banner" role="alert">
          <span>⚠️ {error}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* ── Input ── */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        showSuggestions={messages.length === 0}
      />
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="welcome">
      <div className="welcome-icon">💳</div>
      <h2>Payment Card Management Expert</h2>
      <p>
        Ask me about card issuance, lifecycle management, BIN configuration,
        prepaid card processing, PCI DSS compliance, and payment system integrations.
      </p>
    </div>
  )
}
