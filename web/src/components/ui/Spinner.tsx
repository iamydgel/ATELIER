import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: number
  className?: string
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2
        style={{ width: size, height: size }}
        className="animate-spin text-accent-warm opacity-80"
      />
    </div>
  )
}
