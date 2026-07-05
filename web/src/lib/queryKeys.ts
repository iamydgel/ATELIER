export const QUERY_KEYS = {
  me: ['me'] as const,
  conversations: ['conversations'] as const,
  messages: (convoId: string | null) => ['messages', convoId] as const,
  models: ['models'] as const,
  modelsCatalog: ['modelsCatalog'] as const,
  installStatus: (installId: string) => ['installStatus', installId] as const,
  observabilityStats: ['observabilityStats'] as const,
}
