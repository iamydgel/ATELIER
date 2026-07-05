import type { Model } from '../../lib/types'
import { Trash2, Download, CheckCircle, Loader2 } from 'lucide-react'

interface ModelCardProps {
  model: Model
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  isInstalling?: boolean
  installStatus?: 'not_installed' | 'installed' | 'loaded' | 'installing'
  installProgress?: number
}

export function ModelCard({
  model,
  onInstall,
  onUninstall,
  isInstalling = false,
  installStatus = 'not_installed',
  installProgress = 0,
}: ModelCardProps) {
  // Format model size in GB
  const sizeGB = (model.size_bytes / (1024 * 1024 * 1024)).toFixed(1)

  return (
    <div className={`p-6 bg-bg-1 border rounded-lg flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
      installStatus === 'loaded' 
        ? 'border-accent-cool/50 shadow-md shadow-accent-cool/5' 
        : 'border-line-1 hover:border-line-2'
    }`}>
      {/* Decorative gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-warm/0 to-accent-cool/0 group-hover:from-accent-warm/5 group-hover:to-accent-cool/5 transition-all duration-500 pointer-events-none" />

      <div>
        {/* Model Brand Hexagon Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Hexagon shape logo */}
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full text-bg-2 fill-current" viewBox="0 0 100 100">
                <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" stroke="var(--color-line-2)" strokeWidth="4" />
              </svg>
              <span className="font-mono text-xs text-accent-warm font-bold uppercase z-10">
                {model.family.slice(0, 3)}
              </span>
            </div>
            <div>
              <h3 className="font-display text-xl font-light text-text-1 truncate max-w-[180px]">
                {model.id}
              </h3>
              <span className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
                {model.family} · {model.quant}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono border border-line-2 rounded px-2 py-0.5 text-text-2 bg-bg-2">
            {model.license}
          </span>
        </div>

        {/* Technical specs in font-mono */}
        <div className="space-y-1.5 py-3 border-t border-b border-line-1/50 my-3 font-mono text-xs text-text-2">
          <div className="flex justify-between">
            <span className="text-text-3">Taille</span>
            <span>{sizeGB} GB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-3">Version</span>
            <span>{model.version}</span>
          </div>
          {model.requires_vram_gb && (
            <div className="flex justify-between">
              <span className="text-text-3">VRAM Recommandée</span>
              <span>{model.requires_vram_gb} GB</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button states */}
      <div className="mt-4 pt-2">
        {isInstalling ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-3">
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-cool" />
                Copie en cours...
              </span>
              <span>{installProgress}%</span>
            </div>
            <div className="w-full h-1 bg-bg-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-cool transition-all duration-300"
                style={{ width: `${installProgress}%` }}
              />
            </div>
          </div>
        ) : installStatus === 'loaded' ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-accent-success font-mono">
              <CheckCircle className="w-4 h-4" />
              Actif en mémoire
            </span>
            <button
              onClick={() => onUninstall(model.id)}
              className="p-1.5 text-text-3 hover:text-accent-danger transition-colors rounded hover:bg-bg-2 cursor-pointer"
              title="Désinstaller le modèle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : installStatus === 'installed' ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-text-2 font-mono">
              <CheckCircle className="w-4 h-4 text-text-3" />
              Installé
            </span>
            <button
              onClick={() => onUninstall(model.id)}
              className="p-1.5 text-text-3 hover:text-accent-danger transition-colors rounded hover:bg-bg-2 cursor-pointer"
              title="Désinstaller"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onInstall(model.id)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded text-xs font-mono font-bold text-accent-warm hover:text-accent-warm-soft transition-all active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Installer le modèle
          </button>
        )}
      </div>
    </div>
  )
}
