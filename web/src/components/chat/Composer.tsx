import { useState } from 'react'
import { Send, Square, Settings } from 'lucide-react'

interface ComposerProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isStreaming: boolean
  onStop: () => void
  temperature: number
  setTemperature: (t: number) => void
  maxTokens: number
  setMaxTokens: (m: number) => void
}

export function Composer({
  input,
  setInput,
  onSubmit,
  isStreaming,
  onStop,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
}: ComposerProps) {
  const [showSettings, setShowSettings] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <div className="p-6 border-t border-line-1 bg-bg-0 flex-shrink-0 relative">
      <form onSubmit={onSubmit} className="max-w-3xl mx-auto relative">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre message à l'Atelier..."
          onKeyDown={handleKeyDown}
          className="w-full bg-bg-1 border border-line-1 rounded-md py-4 pl-4 pr-24 text-text-1 placeholder-text-3 focus:outline-none focus:border-line-2 resize-none text-base font-sans"
          style={{ maxHeight: '160px' }}
        />

        <div className="absolute right-3 bottom-3 flex items-center gap-2">
          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-md border border-line-1 transition-colors ${
              showSettings
                ? 'bg-bg-3 text-accent-warm border-line-2'
                : 'bg-bg-2 text-text-3 hover:text-text-1'
            }`}
            title="Paramètres d'inférence"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Action Button: Send or Stop */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2 bg-accent-danger/20 hover:bg-accent-danger/30 border border-accent-danger/40 rounded-md text-accent-danger transition-colors active:scale-95"
              title="Arrêter la génération"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-bg-2 border border-line-1 rounded-md text-text-3 hover:text-accent-warm disabled:opacity-40 disabled:hover:text-text-3 transition-colors active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Inference Settings Popover */}
        {showSettings && (
          <div className="absolute right-0 bottom-16 z-20 w-72 bg-bg-1 border border-line-2 rounded-lg p-4 shadow-xl font-sans">
            <h4 className="text-xs font-mono uppercase tracking-wider text-text-2 mb-3 pb-1 border-b border-line-1">
              Paramètres d'Inférence
            </h4>
            
            <div className="space-y-4">
              {/* Temperature slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-2 font-mono">Température</label>
                  <span className="text-xs font-mono text-accent-warm font-bold">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-accent-warm"
                />
              </div>

              {/* Max tokens input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-text-2 font-mono">Max Tokens</label>
                </div>
                <input
                  type="number"
                  min="1"
                  max="16384"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                  className="w-full bg-bg-2 border border-line-1 rounded-md py-1.5 px-3 text-sm text-text-1 focus:outline-none focus:border-line-2 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
