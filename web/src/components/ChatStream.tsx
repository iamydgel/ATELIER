import { motion } from 'motion/react'

interface ChatStreamProps {
  text: string
  isStreaming: boolean
}

export function ChatStream({ text, isStreaming }: ChatStreamProps) {
  if (!text && !isStreaming) return null

  return (
    <div className="py-4 border-l-4 pl-4 border-accent-cool bg-bg-1/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-3 font-mono uppercase tracking-wider">
          L'Atelier
        </span>
      </div>
      <div className="text-text-1 text-base leading-relaxed whitespace-pre-wrap font-sans selection:bg-accent-cool/30">
        {text}
        {isStreaming && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block w-1.5 h-4 bg-accent-cool ml-1 align-middle"
          />
        )}
      </div>
    </div>
  )
}
