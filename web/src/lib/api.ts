export const API_BASE = '/api/v1'

export class ApiError extends Error {
  status: number
  detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.status = status
    this.detail = detail
    this.name = 'ApiError'
  }
}

/**
 * Custom error mapping based on PRD §9.9 for highly action-oriented messages
 */
export function getActionableErrorMessage(error: any): string {
  const status = error.status
  const detail = error.detail || ''

  if (status === 401) {
    return 'Session expirée. Veuillez vous reconnecter.'
  }

  const detailLower = detail.toLowerCase()
  
  if (detailLower.includes('invalides') || detailLower.includes('incorrect')) {
    return 'Identifiants invalides. Veuillez vérifier votre e-mail ou votre mot de passe.'
  }
  
  if (
    detailLower.includes('connexion au serveur de streaming') ||
    detailLower.includes('connection refused') ||
    detailLower.includes('injoignable') ||
    detailLower.includes('failed to fetch')
  ) {
    return "LM Studio ou Ollama ne répond pas. Ouvrez votre moteur d'inférence, chargez un modèle, puis cliquez sur Réessayer."
  }
  
  if (detailLower.includes('aucun modèle') || detailLower.includes('no model loaded')) {
    return "Aucun modèle n'est chargé dans votre moteur d'inférence local. Ouvrez LM Studio, sélectionnez un modèle dans l'onglet Developer, puis rechargez."
  }

  if (detailLower.includes('introuvable') || detailLower.includes('not found')) {
    if (detailLower.includes('conversation')) {
      return "Cette conversation n'existe plus ou a été supprimée."
    }
    return "L'élément demandé est introuvable."
  }

  return detail || error.message || 'Une erreur inconnue est survenue.'
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_BASE}${cleanEndpoint}`
  
  const headers = new Headers(options.headers || {})
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send cookies
  })

  if (!response.ok) {
    let detail = ''
    try {
      const data = await response.json()
      detail = data.detail || ''
    } catch {
      detail = await response.text()
    }
    
    const error = new ApiError(
      detail || `Requête échouée (${response.status})`,
      response.status,
      detail
    )
    
    // Auto redirect on unauthorized if not on login page
    if (response.status === 401 && !window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }

    throw error
  }

  if (response.status === 204) {
    return null as any
  }

  return response.json()
}
