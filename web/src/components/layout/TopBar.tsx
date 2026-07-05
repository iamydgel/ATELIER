import { useQuery } from '@tanstack/react-query'
import { Cpu, ChevronLeft, ChevronRight } from 'lucide-react'
import { QUERY_KEYS } from '../../lib/queryKeys'
import { apiRequest } from '../../lib/api'
import { useEffect } from 'react'

interface TopBarProps {
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  activeModel: string
  setActiveModel: (model: string) => void
  isStreaming: boolean
}

export function TopBar({
  isSidebarOpen,
  setIsSidebarOpen,
  activeModel,
  setActiveModel,
  isStreaming,
}: TopBarProps) {
  // Fetch models from backend
  const { data: models = [] } = useQuery<string[]>({
    queryKey: QUERY_KEYS.models,
    queryFn: () => apiRequest<string[]>('/chat/models'),
  })

  // Automatically update active model when models are loaded
  useEffect(() => {
    if (models.length > 0 && !models.includes(activeModel)) {
      setActiveModel(models[0])
    }
  }, [models, activeModel, setActiveModel])

  return (
    <header className="h-14 border-b border-line-1 flex items-center justify-between px-16 bg-bg-0 flex-shrink-0 relative">
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute left-4 top-3.5 z-10 p-1 bg-bg-1 border border-line-1 rounded-md text-text-3 hover:text-text-1 transition-all active:scale-95"
      >
        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className="flex items-center gap-3">
        <Cpu className={`w-5 h-5 ${isStreaming ? 'text-accent-cool animate-pulse' : 'text-accent-warm'}`} />
        <select
          value={activeModel}
          onChange={(e) => setActiveModel(e.target.value)}
          className="bg-bg-1 border border-line-1 text-sm rounded-md py-1 px-2.5 text-text-2 focus:outline-none focus:border-line-2 font-mono max-w-[240px] truncate"
        >
          {models.length > 0 ? (
            models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))
          ) : (
            <>
              <option value="llama3.1-8b-instruct-q4">llama3.1-8b-instruct-q4</option>
              <option value="mistral-7b-instruct-v0.3">mistral-7b-instruct-v0.3</option>
            </>
          )}
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isStreaming ? 'bg-accent-cool' : 'bg-accent-success'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            isStreaming ? 'bg-accent-cool' : 'bg-accent-success'
          }`}></span>
        </span>
        <span className="text-xs text-text-3 font-mono">
          {isStreaming ? 'Calcul en cours...' : 'Local — Hors Cloud'}
        </span>
      </div>
    </header>
  )
}
