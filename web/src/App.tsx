import React, { useState, useEffect, useRef } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import {
  MessageSquare,
  Plus,
  LogOut,
  Send,
  Loader2,
  Cpu,
  User,
  Shield,
  Key,
  Mail,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Toaster, toast } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

// BASE_URL of the FastAPI Server
const API_BASE = 'http://127.0.0.1:8080/api/v1'

interface Message {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  created_at: number
}

interface Conversation {
  id: string
  title: string
  model_id: string
  created_at: number
  updated_at: number
}

function MainApp() {
  const queryClient = useQueryClient()
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [inputMessage, setInputMessage] = useState('')
  const [activeModel, setActiveModel] = useState('llama3.1-8b-instruct-q4')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch current user
  const { data: user, error: userError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      if (!res.ok) throw new Error('Not authenticated')
      return res.json()
    },
  })

  // Fetch conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chat/conversations`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch conversations')
      return res.json()
    },
    enabled: !!user,
  })

  // Fetch messages for active conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ['messages', selectedConvoId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chat/conversations/${selectedConvoId}/messages`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch messages')
      return res.json()
    },
    enabled: !!user && !!selectedConvoId,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedText])

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    },
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      toast.success('Déconnexion réussie')
    },
  })

  // Send message streaming implementation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isStreaming) return

    const userPrompt = inputMessage.trim()
    setInputMessage('')
    setIsStreaming(true)
    setStreamedText('')

    // Optimistic payload preparation
    const currentMessages = [...messages, { id: 'temp-user', role: 'user', content: userPrompt }]
    
    // Prepare API format
    const payload = {
      model: activeModel,
      messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
      conversation_id: selectedConvoId || undefined,
    }

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la connexion au serveur de streaming.')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('Streaming non pris en charge.')

      let buffer = ''
      let isFirstChunk = true

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        
        // Save the last partial line back to buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue
          
          const dataStr = cleanLine.slice(6)
          if (dataStr === '[DONE]') break

          try {
            const data = JSON.parse(dataStr)
            
            if (data.conversation_id && isFirstChunk) {
              setSelectedConvoId(data.conversation_id)
              isFirstChunk = false
              refetchConversations()
            }
            
            if (data.content) {
              setStreamedText(prev => prev + data.content)
            }

            if (data.error) {
              toast.error(data.error)
              break
            }
          } catch (err) {
            console.error('JSON parsing error:', err)
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de contacter l'inférence locale.")
    } finally {
      setIsStreaming(false)
      setStreamedText('')
      refetchMessages()
      refetchConversations()
    }
  }

  // Auth check
  if (userError || !user) {
    return <AuthScreen />
  }

  return (
    <div className="flex h-screen bg-bg-0 text-text-1 font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full bg-bg-1 border-r border-line-1 flex-shrink-0"
          >
            {/* Header / New Convo */}
            <div className="p-4 border-b border-line-1">
              <button
                onClick={() => {
                  setSelectedConvoId(null)
                  setInputMessage('')
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-bg-2 hover:bg-bg-3 border border-line-1 rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 text-accent-warm" />
                Nouvelle discussion
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.map(convo => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvoId(convo.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm transition-all ${
                    selectedConvoId === convo.id
                      ? 'bg-bg-3 border-l-2 border-accent-warm text-text-1'
                      : 'text-text-2 hover:bg-bg-2 hover:text-text-1'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 opacity-70" />
                  <span className="truncate flex-1 font-display text-base">
                    {convo.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-line-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-bg-3 border border-line-2 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent-warm" />
                </div>
                <div className="text-xs truncate max-w-[140px]">
                  <p className="font-medium text-text-1">{user.email}</p>
                  <p className="text-text-3 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                className="p-2 text-text-3 hover:text-accent-danger transition-colors rounded-md hover:bg-bg-2"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main chat section */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-4 top-4 z-10 p-1.5 bg-bg-1 border border-line-1 rounded-md text-text-3 hover:text-text-1 transition-all"
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* TopBar */}
        <header className="h-14 border-b border-line-1 flex items-center justify-between px-16 bg-bg-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className={`w-5 h-5 ${isStreaming ? 'text-accent-cool animate-pulse-slow' : 'text-accent-warm'}`} />
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="bg-bg-1 border border-line-1 text-sm rounded-md py-1 px-2.5 text-text-2 focus:outline-none focus:border-line-2 font-mono"
            >
              <option value="llama3.1-8b-instruct-q4">llama3.1-8b-instruct-q4</option>
              <option value="mistral-7b-instruct-v0.3">mistral-7b-instruct-v0.3</option>
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

        {/* Conversation flow */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center py-20">
                <h1 className="font-display text-5xl font-light text-text-1 mb-4">
                  L'Atelier Lumineux
                </h1>
                <p className="text-text-2 max-w-md mx-auto text-base">
                  Sélectionnez un modèle et commencez à orchestrer l'intelligence locale en toute souveraineté.
                </p>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`py-4 border-l-4 pl-4 transition-all ${
                  msg.role === 'user'
                    ? 'border-accent-warm bg-bg-1/20'
                    : 'border-accent-cool bg-bg-1/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-3 font-mono uppercase tracking-wider">
                    {msg.role === 'user' ? 'Utilisateur' : 'L\'Atelier'}
                  </span>
                </div>
                <div className="text-text-1 text-base leading-relaxed whitespace-pre-wrap selection:bg-accent-warm/30 selection:text-text-1">
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streamed caret component placeholder */}
            {isStreaming && streamedText && (
              <div className="py-4 border-l-4 pl-4 border-accent-cool bg-bg-1/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-3 font-mono uppercase tracking-wider">
                    L'Atelier
                  </span>
                </div>
                <div className="text-text-1 text-base leading-relaxed whitespace-pre-wrap">
                  {streamedText}
                  <span className="inline-block w-1.5 h-4 bg-accent-cool ml-1 animate-pulse-slow align-middle"></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input composer area */}
        <div className="p-6 border-t border-line-1 bg-bg-0 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative">
            <textarea
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez votre message à l'Atelier..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              className="w-full bg-bg-1 border border-line-1 rounded-md py-4 pl-4 pr-16 text-text-1 placeholder-text-3 focus:outline-none focus:border-line-2 resize-none text-base"
              style={{ maxHeight: '160px' }}
            />
            <button
              type="submit"
              disabled={isStreaming || !inputMessage.trim()}
              className="absolute right-3 bottom-3 p-2 bg-bg-2 border border-line-1 rounded-md text-text-3 hover:text-accent-warm disabled:text-text-3 disabled:hover:text-text-3 transition-colors"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

function AuthScreen() {
  const queryClient = useQueryClient()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)
    const endpoint = isLogin ? 'login' : 'signup'

    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Une erreur est survenue.')
      }

      toast.success(isLogin ? 'Connexion réussie' : 'Inscription réussie ! Connectez-vous.')
      
      if (isLogin) {
        queryClient.setQueryData(['me'], data.user)
      } else {
        setIsLogin(true)
        setPassword('')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-0 text-text-1 font-sans p-6">
      <div className="w-full max-w-md bg-bg-1 border border-line-1 rounded-lg p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient lighting glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent-warm/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent-cool/5 blur-3xl" />

        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-light text-text-1 tracking-tight mb-2">
            L'Atelier Lumineux
          </h1>
          <p className="text-sm text-text-2">
            Console de supervision et d'orchestration d'IA locales
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-line-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 pb-2.5 text-sm font-medium transition-all ${
              isLogin ? 'border-b-2 border-accent-warm text-text-1' : 'text-text-3 hover:text-text-2'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 pb-2.5 text-sm font-medium transition-all ${
              !isLogin ? 'border-b-2 border-accent-warm text-text-1' : 'text-text-3 hover:text-text-2'
            }`}
          >
            Créer un compte
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-2 mb-1">
              Adresse Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-text-3" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full bg-bg-2 border border-line-1 rounded-md py-2.5 pl-10 pr-4 text-text-1 placeholder-text-3 focus:outline-none focus:border-line-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-text-2 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-text-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg-2 border border-line-1 rounded-md py-2.5 pl-10 pr-4 text-text-1 placeholder-text-3 focus:outline-none focus:border-line-2 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded-md font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] text-accent-warm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              'Se connecter'
            ) : (
              'Créer le compte'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-3 font-mono">
          <Shield className="w-3.5 h-3.5 text-accent-success" />
          <span>Souveraineté des données 100% garantie localement</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
      <Toaster theme="dark" closeButton />
    </QueryClientProvider>
  )
}
