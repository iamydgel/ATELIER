import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Cpu, RotateCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest, getActionableErrorMessage } from '../lib/api'
import { useWindowSize } from '../lib/hooks'
import { Sidebar } from '../components/layout/Sidebar'
import { ModelCard } from '../components/models/ModelCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Spinner } from '../components/ui/Spinner'
import type { Model } from '../lib/types'

interface InstallProgressTracker {
  [modelId: string]: {
    installId: string
    progress: number
  }
}

export default function Models() {
  const queryClient = useQueryClient()
  const { isMobile } = useWindowSize()
  const [isSidebarOpen] = useState(true)
  
  // Track active installations in state
  const [activeInstalls, setActiveInstalls] = useState<InstallProgressTracker>({})

  // Fetch models catalog
  const {
    data: catalog = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Model[]>({
    queryKey: QUERY_KEYS.modelsCatalog,
    queryFn: () => apiRequest<Model[]>('/models/catalog'),
    retry: false,
  })

  // Keep a ref in sync with state to avoid stale closures in the interval
  const activeInstallsRef = useRef<InstallProgressTracker>({})
  useEffect(() => {
    activeInstallsRef.current = activeInstalls
  }, [activeInstalls])

  // Poll progress for active installations using ref to avoid stale closure
  useEffect(() => {
    const timer = setInterval(async () => {
      const currentInstalls = activeInstallsRef.current
      const activeModelIds = Object.keys(currentInstalls)
      if (activeModelIds.length === 0) return

      const updatedInstalls = { ...currentInstalls }
      let hasChanges = false

      for (const modelId of activeModelIds) {
        const { installId } = currentInstalls[modelId]
        try {
          const installStatus = await apiRequest(`/models/install/${installId}/status`)

          if (installStatus.status === 'done') {
            toast.success(`Modèle ${modelId} installé avec succès.`)
            delete updatedInstalls[modelId]
            hasChanges = true
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.modelsCatalog })
          } else if (installStatus.status === 'error') {
            toast.error(`Erreur d'installation pour ${modelId} : ${installStatus.error || 'inconnue'}`)
            delete updatedInstalls[modelId]
            hasChanges = true
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.modelsCatalog })
          } else {
            updatedInstalls[modelId] = {
              installId,
              progress: installStatus.progress || 0,
            }
            hasChanges = true
          }
        } catch (err) {
          console.error(`Error checking status for ${installId}:`, err)
        }
      }

      if (hasChanges) {
        setActiveInstalls(updatedInstalls)
      }
    }, 1500)

    return () => clearInterval(timer)
  }, [queryClient]) // stable deps only — reads ref for current installs

  // Install mutation
  const installMutation = useMutation({
    mutationFn: (modelId: string) =>
      apiRequest('/models/install', {
        method: 'POST',
        body: JSON.stringify({ model_id: modelId }),
      }),
    onSuccess: (data, modelId) => {
      toast.info(`Installation de ${modelId} démarrée...`)
      setActiveInstalls(prev => ({
        ...prev,
        [modelId]: {
          installId: data.install_id,
          progress: 0,
        },
      }))
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.modelsCatalog })
    },
    onError: (err: any) => {
      toast.error(getActionableErrorMessage(err))
    },
  })

  // Uninstall mutation
  const uninstallMutation = useMutation({
    mutationFn: (modelId: string) =>
      apiRequest(`/models/${modelId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, modelId) => {
      toast.success(`Modèle ${modelId} désinstallé.`)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.modelsCatalog })
    },
    onError: (err: any) => {
      toast.error(getActionableErrorMessage(err))
    },
  })

  const handleInstall = (modelId: string) => {
    installMutation.mutate(modelId)
  }

  const handleUninstall = (modelId: string) => {
    if (window.confirm(`Confirmez-vous la désinstallation du modèle ${modelId} ?`)) {
      uninstallMutation.mutate(modelId)
    }
  }

  return (
    <div className="flex h-screen bg-bg-0 text-text-1 font-sans overflow-hidden">
      {isSidebarOpen && !isMobile && <Sidebar />}

      <main className="flex-1 flex flex-col h-full overflow-hidden relative p-8">
        <header className="flex items-center justify-between pb-6 border-b border-line-1 mb-8">
          <div>
            <h1 className="font-display text-4xl font-light text-text-1">
              Catalogue de Modèles
            </h1>
            <p className="text-sm text-text-2 mt-1">
              Gérez et installez vos modèles d'inférence en local
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-2 border border-line-1 hover:border-line-2 rounded text-xs font-mono text-text-2 hover:text-text-1 transition-all active:scale-95 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </header>

        {/* Content Flow */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size={32} />
            </div>
          ) : isError ? (
            <div className="max-w-xl mx-auto py-12">
              <EmptyState
                title="Erreur de connexion"
                description={getActionableErrorMessage(error)}
                icon={<AlertTriangle className="w-12 h-12 text-accent-danger" />}
                action={
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-bg-2 border border-line-1 hover:border-line-2 rounded text-xs font-mono text-accent-warm cursor-pointer"
                  >
                    Réessayer
                  </button>
                }
              />
            </div>
          ) : catalog.length === 0 ? (
            <div className="max-w-xl mx-auto py-12">
              <EmptyState
                title="Aucun modèle détecté"
                description="Le catalogue de modèles est vide. Veuillez vous assurer que LM Studio ou Ollama est démarré sur le port configuré."
                icon={<Cpu className="w-12 h-12 text-text-3" />}
                action={
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-bg-2 border border-line-1 hover:border-line-2 rounded text-xs font-mono text-accent-warm cursor-pointer"
                  >
                    Actualiser le catalogue
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalog.map(model => {
                const tracking = activeInstalls[model.id]
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onInstall={handleInstall}
                    onUninstall={handleUninstall}
                    isInstalling={!!tracking}
                    installProgress={tracking ? tracking.progress : 0}
                    installStatus={model.installed_status}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
