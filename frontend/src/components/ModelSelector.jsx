import { useEffect, useState } from 'react'
import { fetchModels } from '../services/api.js'

export default function ModelSelector({ value, onChange, disabled }) {
  const [models, setModels] = useState([])

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch(() => {
        // Fall back to hard-coded list if backend is unreachable
        setModels([
          { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most capable' },
          { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Balanced' },
          { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fastest' },
        ])
      })
  }, [])

  return (
    <select
      className="model-selector"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Select LLM model"
    >
      {models.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name} — {m.description}
        </option>
      ))}
    </select>
  )
}
