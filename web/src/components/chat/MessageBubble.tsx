import type { Message } from '../../lib/types'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`py-4 border-l-4 pl-4 transition-all ${
        isUser ? 'border-accent-warm bg-bg-1/20' : 'border-accent-cool bg-bg-1/40'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-3 font-mono uppercase tracking-wider">
          {isUser ? 'Utilisateur' : "L'Atelier"}
        </span>
        {message.latency_ms > 0 && !isUser && (
          <span className="text-[10px] font-mono text-text-3">
            {message.latency_ms}ms | {message.tokens_out} tokens out
          </span>
        )}
      </div>
      <div className="text-text-1 text-base leading-relaxed whitespace-pre-wrap selection:bg-accent-warm/30 selection:text-text-1">
        {message.content}
      </div>
    </div>
  )
}
