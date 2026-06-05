/**
 * Renders a single chat message bubble.
 * Supports basic code-block detection for monospace rendering.
 */
export default function MessageBubble({ message }) {
  const { role, content, streaming } = message
  const isUser = role === 'user'

  return (
    <div className={`message message-${role}`}>
      <div className="message-avatar" aria-hidden="true">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-body">
        <div className="message-role">{isUser ? 'You' : 'Payment AI Agent'}</div>
        <div className="message-content">
          {content ? (
            <MessageContent text={content} />
          ) : streaming ? (
            <span className="cursor" aria-label="typing">▊</span>
          ) : null}
          {content && streaming && <span className="cursor" aria-hidden="true">▊</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * Splits message text into plain-text and code-block segments and renders each
 * appropriately. Handles fenced code blocks (``` ... ```).
 */
function MessageContent({ text }) {
  const parts = []
  const codeBlockRegex = /```[\w]*\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', content: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  if (parts.length === 0) {
    return <span className="message-text">{text}</span>
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === 'code' ? (
          <pre key={i} className="code-block">
            <code>{part.content}</code>
          </pre>
        ) : (
          <span key={i} className="message-text">
            {part.content}
          </span>
        ),
      )}
    </>
  )
}
