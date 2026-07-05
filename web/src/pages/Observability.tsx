import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, Cpu, Database, RefreshCw, BarChart2 } from 'lucide-react'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest } from '../lib/api'
import { useWindowSize } from '../lib/hooks'
import { Sidebar } from '../components/layout/Sidebar'
import { Spinner } from '../components/ui/Spinner'

export default function Observability() {
  const [isSidebarOpen] = useState(true)
  const { isMobile } = useWindowSize()

  // Fetch observability stats
  const { data: stats, isLoading, isError, refetch } = useQuery<any>({
    queryKey: QUERY_KEYS.observabilityStats,
    queryFn: () => apiRequest('/chat/observability'),
    refetchInterval: 10000, // auto refresh every 10s as required by Sprint 4.3
  })

  return (
    <div className="flex h-screen bg-bg-0 text-text-1 font-sans overflow-hidden">
      {isSidebarOpen && !isMobile && <Sidebar />}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative p-8">
        <header className="flex items-center justify-between pb-6 border-b border-line-1 mb-8">
          <div>
            <h1 className="font-display text-4xl font-light text-text-1">
              Supervision Système
            </h1>
            <p className="text-sm text-text-2 mt-1">
              Observabilité en temps réel des ressources locales et de l'usage de la console
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-2 border border-line-1 hover:border-line-2 rounded text-xs font-mono text-text-2 hover:text-text-1 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </header>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size={32} />
          </div>
        ) : isError || !stats ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <ShieldAlert className="w-12 h-12 text-accent-danger" />
            <h3 className="font-display text-2xl font-light">Erreur de chargement</h3>
            <p className="text-sm text-text-2 max-w-sm">
              Impossible de récupérer les statistiques d'observabilité. Assurez-vous que le serveur backend est démarré.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 max-w-5xl">
            {/* Grid of status cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Engine Status */}
              <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-1/40">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-2 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-accent-warm" />
                    Moteur Local
                  </span>
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      stats.backend_ping ? 'bg-accent-success' : 'bg-accent-danger'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      stats.backend_ping ? 'bg-accent-success' : 'bg-accent-danger'
                    }`}></span>
                  </span>
                </div>
                <div className="font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-3">Backend</span>
                    <span className="text-accent-warm font-bold uppercase">{stats.backend_active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">Statut</span>
                    <span className={stats.backend_ping ? 'text-accent-success' : 'text-accent-danger'}>
                      {stats.backend_ping ? 'Connecté' : 'Hors ligne'}
                    </span>
                  </div>
                  <div className="flex justify-between truncate">
                    <span className="text-text-3">URL</span>
                    <span className="max-w-[140px] truncate text-text-2">{stats.backend_url}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Stats Usage */}
              <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-1/40">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-2 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-accent-cool" />
                    Volume Usage
                  </span>
                </div>
                <div className="font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-3">Discussions</span>
                    <span className="text-text-1 font-bold">{stats.conversations_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">Modèles Installés</span>
                    <span className="text-text-1 font-bold">{stats.installed_count}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Tokens Stats */}
              <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-line-1/40">
                  <span className="font-mono text-xs uppercase tracking-wider text-text-2 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-accent-success" />
                    Jetons consommés
                  </span>
                </div>
                <div className="font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-text-3">Prompt (In)</span>
                    <span className="text-text-1">{stats.total_tokens_in.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-3">Completion (Out)</span>
                    <span className="text-text-1">{stats.total_tokens_out.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-line-1/35 pt-1.5">
                    <span className="text-text-3">Cumul total</span>
                    <span className="text-accent-warm font-bold">
                      {(stats.total_tokens_in + stats.total_tokens_out).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Models loaded in memory */}
            <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-text-2 pb-2 border-b border-line-1/40">
                Modèles chargés en mémoire
              </h3>
              {stats.models_loaded.length === 0 ? (
                <p className="text-xs text-text-3 font-mono italic">Aucun modèle actif détecté dans le moteur.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {stats.models_loaded.map((model: string) => (
                    <span key={model} className="px-3 py-1 bg-bg-2 border border-line-2 rounded text-xs font-mono text-accent-cool">
                      {model}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations list */}
            <div className="p-6 bg-bg-1 border border-line-1 rounded-lg space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-text-2 pb-2 border-b border-line-1/40">
                Dernières conversations
              </h3>
              
              {stats.recent_conversations.length === 0 ? (
                <p className="text-xs text-text-3 font-mono italic py-4 text-center">Aucune discussion enregistrée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-line-1 text-text-3 font-mono uppercase text-[10px]">
                        <th className="py-2.5">Discussion</th>
                        <th className="py-2.5">Modèle</th>
                        <th className="py-2.5">Messages</th>
                        <th className="py-2.5 text-right">Dernière mise à jour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent_conversations.map((convo: any) => (
                        <tr key={convo.id} className="border-b border-line-1/30 hover:bg-bg-2/20">
                          <td className="py-3 font-medium text-text-1 font-display text-sm">{convo.title}</td>
                          <td className="py-3 font-mono text-text-2">{convo.model_id}</td>
                          <td className="py-3 font-mono text-text-2">{convo.message_count} msg</td>
                          <td className="py-3 font-mono text-text-3 text-right">
                            {new Date(convo.created_at * 1000).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
