import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  Plus,
  LogOut,
  User,
  Cpu,
  Activity,
  Settings as SettingsIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../../lib/queryKeys'
import { apiRequest } from '../../lib/api'
import type { Conversation, User as UserType } from '../../lib/types'

interface SidebarProps {
  onNewChat?: () => void
}

export function Sidebar({ onNewChat }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Fetch current user
  const { data: user } = useQuery<UserType>({
    queryKey: QUERY_KEYS.me,
    enabled: false, // Already fetched in router guard
  })

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: QUERY_KEYS.conversations,
    queryFn: () => apiRequest<Conversation[]>('/chat/conversations'),
    enabled: !!user,
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

  const currentConvoId = location.pathname.startsWith('/chat/')
    ? location.pathname.split('/')[2]
    : null

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat()
    } else {
      navigate('/')
    }
  }

  const navLinks = [
    { path: '/models', label: 'Modèles', icon: Cpu },
    { path: '/admin/observability', label: 'Observabilité', icon: Activity },
    { path: '/settings', label: 'Réglages', icon: SettingsIcon },
  ]

  return (
    <div className="flex flex-col h-full bg-bg-1 border-r border-line-1 flex-shrink-0 w-[280px]">
      {/* Header / New Convo */}
      <div className="p-4 border-b border-line-1 space-y-3">
        <button
          onClick={handleNewChatClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-2 hover:bg-bg-3 border border-line-1 rounded-md text-sm font-medium transition-colors text-text-1 hover:text-accent-warm active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-accent-warm" />
          Nouvelle discussion
        </button>

        {/* Global Navigation Links */}
        <div className="space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all ${
                  isActive
                    ? 'bg-bg-3/50 text-accent-warm border-l-2 border-accent-warm'
                    : 'text-text-2 hover:bg-bg-2 hover:text-text-1'
                }`}
              >
                <Icon className="w-4 h-4 opacity-80" />
                <span className="font-mono text-xs uppercase tracking-wider">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Conversation history header */}
      <div className="px-4 pt-4 pb-2">
        <span className="text-[10px] font-mono text-text-3 uppercase tracking-widest">
          Discussions récentes
        </span>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-xs text-text-3 font-mono">Aucun historique</span>
          </div>
        ) : (
          conversations.map(convo => {
            const isChatActive = currentConvoId === convo.id
            return (
              <Link
                key={convo.id}
                to={`/chat/${convo.id}`}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-all ${
                  isChatActive
                    ? 'bg-bg-3 border-l-2 border-accent-warm text-text-1'
                    : 'text-text-2 hover:bg-bg-2 hover:text-text-1'
                }`}
              >
                <MessageSquare className="w-4 h-4 opacity-70" />
                <span className="truncate flex-1 font-display text-base">
                  {convo.title}
                </span>
              </Link>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-line-1 flex items-center justify-between">
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-bg-3 border border-line-2 flex items-center justify-center">
              <User className="w-4 h-4 text-accent-warm" />
            </div>
            <div className="text-xs truncate max-w-[140px]">
              <p className="font-medium text-text-1 truncate">{user.email}</p>
              <p className="text-text-3 capitalize text-[10px] font-mono">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logoutMutation.mutate()}
          aria-label="Déconnexion"
          className="p-2 text-text-3 hover:text-accent-danger transition-colors rounded-md hover:bg-bg-2"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
