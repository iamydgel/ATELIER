import React from 'react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-line-1 rounded-lg bg-bg-1/20 ${className}`}>
      {icon && <div className="mb-4 text-text-3 opacity-60">{icon}</div>}
      <h3 className="font-display text-2xl font-light text-text-1 mb-2">{title}</h3>
      <p className="text-sm text-text-2 max-w-sm mb-6 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
