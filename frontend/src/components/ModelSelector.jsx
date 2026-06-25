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
          { id: 'gpt-5-mini', name: 'GPT-5 mini', description: 'Default economical option' },
          { id: 'gpt-5', name: 'GPT-5', description: 'Most capable' },
          { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Fast and reliable' },
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
