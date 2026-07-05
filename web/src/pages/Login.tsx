import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Mail, Key, Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest, getActionableErrorMessage } from '../lib/api'
import type { User } from '../lib/types'

export default function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch current user if session exists
  const { data: user } = useQuery<User | null>({
    queryKey: QUERY_KEYS.me,
    queryFn: () => apiRequest<User>('/auth/me'),
    retry: false,
  })

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)
    const endpoint = isLogin ? '/auth/login' : '/auth/signup'

    try {
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (isLogin) {
        toast.success('Connexion réussie')
        queryClient.setQueryData(QUERY_KEYS.me, data.user)
        navigate('/')
      } else {
        toast.success('Inscription réussie ! Veuillez vous connecter.')
        setIsLogin(true)
        setPassword('')
      }
    } catch (err: any) {
      toast.error(getActionableErrorMessage(err))
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
        <div className="flex border-b border-line-1 mb-6 font-mono text-xs uppercase">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 pb-2.5 font-medium transition-all ${
              isLogin ? 'border-b-2 border-accent-warm text-text-1' : 'text-text-3 hover:text-text-2'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 pb-2.5 font-medium transition-all ${
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
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-text-3" />
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
              <Key className="absolute left-3 top-3.5 w-4 h-4 text-text-3" />
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
            className="w-full flex items-center justify-center gap-2 py-3 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded-md font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] text-accent-warm cursor-pointer"
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
