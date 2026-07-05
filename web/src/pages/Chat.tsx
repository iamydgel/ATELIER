import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest, getActionableErrorMessage, API_BASE } from '../lib/api'
import { Sidebar } from '../components/layout/Sidebar'
import { TopBar } from '../components/layout/TopBar'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatStream } from '../components/chat/ChatStream'
import { Composer } from '../components/chat/Composer'
import type { Message, Conversation } from '../lib/types'

export default function Chat() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Input text composer state
  const [inputMessage, setInputMessage] = useState('')
  const [activeModel, setActiveModel] = useState<string>(() => {
    return localStorage.getItem('atelier:chat:activeModel') || 'llama3.1-8b-instruct-q4'
  })
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Scroll marker ref
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load inference parameters from localStorage
  const [temperature, setTemperature] = useState<number>(() => {
    const saved = localStorage.getItem('atelier:inference:temperature')
    return saved !== null ? parseFloat(saved) : 0.7
  })
  
  const [maxTokens, setMaxTokens] = useState<number>(() => {
    const saved = localStorage.getItem('atelier:inference:max_tokens')
    return saved !== null ? parseInt(saved, 10) : 2048
  })

  // Persist settings to localStorage on change
  useEffect(() => {
    localStorage.setItem('atelier:inference:temperature', temperature.toString())
  }, [temperature])

  useEffect(() => {
    localStorage.setItem('atelier:inference:max_tokens', maxTokens.toString())
  }, [maxTokens])

  useEffect(() => {
    localStorage.setItem('atelier:chat:activeModel', activeModel)
  }, [activeModel])

  // Query conversations list
  const { refetch: refetchConversations } = useQuery<Conversation[]>({
    queryKey: QUERY_KEYS.conversations,
    enabled: false,
  })

  // Fetch messages if conversationId is defined
  const { data: messages = [], refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: QUERY_KEYS.messages(conversationId || null),
    queryFn: () => apiRequest<Message[]>(`/chat/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
  })

  // Scroll to bottom on new messages or during streaming
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamedText])

  // Stop current streaming calculate request
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
      toast.info('Génération interrompue.')
      
      // Refresh to fetch the partial content if backend saved it
      refetchMessages()
      refetchConversations()
    }
  }

  // Handle compose submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isStreaming) return

    const userPrompt = inputMessage.trim()
    setInputMessage('')
    setIsStreaming(true)
    setStreamedText('')
    
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Optimistic payload preparation
    const payload = {
      model: activeModel,
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userPrompt }
      ],
      conversation_id: conversationId || undefined,
      temperature,
      max_tokens: maxTokens,
    }

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw { status: response.status, detail: errorData.detail || 'Erreur lors du calcul.' }
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
        
        buffer = lines.pop() || ''

        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue
          
          const dataStr = cleanLine.slice(6)
          if (dataStr === '[DONE]') break

          try {
            const data = JSON.parse(dataStr)
            
            if (data.conversation_id && isFirstChunk) {
              isFirstChunk = false
              // If it's a new conversation, redirect to its route
              if (!conversationId) {
                navigate(`/chat/${data.conversation_id}`, { replace: true })
              }
            }
            
            if (data.content) {
              setStreamedText(prev => prev + data.content)
            }

            if (data.error) {
              toast.error(getActionableErrorMessage({ status: 500, detail: data.error }))
              break
            }
          } catch (err) {
            console.error('JSON parsing error:', err)
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stop already handled
        return
      }
      toast.error(getActionableErrorMessage(err))
    } finally {
      setIsStreaming(false)
      setStreamedText('')
      abortControllerRef.current = null
      
      // Refresh queries
      refetchMessages()
      refetchConversations()
    }
  }

  const handleNewChat = () => {
    handleStopStreaming()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-bg-0 text-text-1 font-sans overflow-hidden">
      {/* Collapsible Sidebar */}
      {isSidebarOpen && (
        <Sidebar onNewChat={handleNewChat} />
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeModel={activeModel}
          setActiveModel={setActiveModel}
          isStreaming={isStreaming}
        />

        {/* Conversation flow */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {!conversationId && messages.length === 0 && !isStreaming && (
              <div className="text-center py-20 animate-fade-in">
                <h1 className="font-display text-5xl font-light text-text-1 mb-4 select-none">
                  L'Atelier Lumineux
                </h1>
                <p className="text-text-2 max-w-md mx-auto text-base">
                  Sélectionnez un modèle et commencez à orchestrer l'intelligence locale en toute souveraineté.
                </p>
              </div>
            )}

            {conversationId && isLoadingMessages && (
              <div className="text-center py-10">
                <span className="text-xs font-mono text-text-3">Chargement des messages...</span>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* SSE Stream Render */}
            {isStreaming && streamedText && (
              <ChatStream text={streamedText} isStreaming={isStreaming} />
            )}
            
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input composer with stop trigger and parameter overrides */}
        <Composer
          input={inputMessage}
          setInput={setInputMessage}
          onSubmit={handleSendMessage}
          isStreaming={isStreaming}
          onStop={handleStopStreaming}
          temperature={temperature}
          setTemperature={setTemperature}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
        />
      </main>
    </div>
  )
}
