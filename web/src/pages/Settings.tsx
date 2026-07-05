import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, LogOut, Copy, Check, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest } from '../lib/api'
import { Sidebar } from '../components/layout/Sidebar'
import type { User } from '../lib/types'

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [isSidebarOpen] = useState(true)

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: QUERY_KEYS.me,
    enabled: false,
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(QUERY_KEYS.me, null)
      toast.success('Déconnexion réussie')
      navigate('/login')
    },
    onError: () => {
      toast.error('Erreur lors de la déconnexion')
    },
  })

  // Fetch live settings from backend
  const { data: appSettings, isLoading: isLoadingSettings } = useQuery<{
    backend_active: string
    backend_url: string
    session_ttl_hours: number
    data_dir: string
  }>({
    queryKey: QUERY_KEYS.settings,
    queryFn: () => apiRequest('/settings'),
  })

  const backendType = appSettings?.backend_active ?? ''
  const backendUrl = appSettings?.backend_url ?? ''

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(backendUrl)
    setCopied(true)
    toast.success('URL copiée dans le presse-papier')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-screen bg-bg-0 text-text-1 font-sans overflow-hidden">
      {isSidebarOpen && <Sidebar />}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative p-8">
        <header className="pb-6 border-b border-line-1 mb-8">
          <h1 className="font-display text-4xl font-light text-text-1">
            Réglages de la console
          </h1>
          <p className="text-sm text-text-2 mt-1">
            Visualisez les configurations de votre environnement local
          </p>
        </header>

        {/* Configurations list */}
        <div className="flex-1 overflow-y-auto max-w-2xl space-y-6">
          {/* Section: Backend */}
          <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-text-2 pb-2 border-b border-line-1 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-accent-warm" />
              Moteur d'inférence
            </h3>
            
            <div className="space-y-4">
              {isLoadingSettings ? (
                <div className="flex items-center gap-2 text-text-3 text-xs font-mono py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement de la configuration...
                </div>
              ) : (
              <div>
                <label className="block text-xs font-mono text-text-3 uppercase tracking-wider mb-2">
                  Backend Actif
                </label>
                <div className="flex items-center gap-6">
                  {['lmstudio', 'ollama', 'llamacpp'].map(backend => (
                    <label key={backend} className="flex items-center gap-2 text-sm text-text-2 cursor-not-allowed">
                      <input
                        type="radio"
                        name="backend-type"
                        checked={backendType === backend}
                        readOnly
                        disabled={backendType !== backend}
                        className="accent-accent-warm"
                      />
                      <span className={`capitalize ${backendType === backend ? 'text-accent-warm font-bold' : 'text-text-3'}`}>
                        {backend === 'llamacpp' ? 'llama.cpp' : backend}
                      </span>
                    </label>
                  ))}
                </div>
                <span className="block text-[10px] text-text-3 font-mono mt-2 italic">
                  💡 Modifiable dans ~/.localai/.env (Redémarrage requis)
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-text-3 uppercase tracking-wider mb-1">
                  URL de l'API locale
                </label>
                <div className="flex items-center gap-2">
                  <span className="flex-1 bg-bg-2 border border-line-1 rounded py-2 px-3 text-xs font-mono text-text-2 truncate select-all">
                    {backendUrl}
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 border border-line-1 hover:border-line-2 bg-bg-2 rounded text-text-3 hover:text-text-1 active:scale-95 transition-all cursor-pointer"
                    title="Copier l'URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-accent-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Section: Profil */}
          {user && (
            <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-text-2 pb-2 border-b border-line-1 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent-cool" />
                Mon Profil
              </h3>

              <div className="space-y-4 font-mono text-sm text-text-2">
                <div className="flex justify-between py-1 border-b border-line-1/30">
                  <span className="text-text-3">Email</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line-1/30">
                  <span className="text-text-3">Rôle système</span>
                  <span className="capitalize text-accent-warm font-bold">{user.role}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line-1/30">
                  <span className="text-text-3">Statut du compte</span>
                  <span className="text-accent-success font-bold">Actif</span>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => logoutMutation.mutate()}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-danger/10 hover:bg-accent-danger/25 border border-accent-danger/30 hover:border-accent-danger/50 text-accent-danger rounded text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
