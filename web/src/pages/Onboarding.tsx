import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Cpu, CheckCircle2, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'
import { QUERY_KEYS } from '../lib/queryKeys'
import { apiRequest, getActionableErrorMessage } from '../lib/api'

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null)

  // Query catalog for diagnostic step
  const { data: catalog = [], isLoading, isError, error, refetch } = useQuery<any[]>({
    queryKey: QUERY_KEYS.modelsCatalog,
    queryFn: () => apiRequest('/models/catalog'),
    enabled: step === 2, // only run when on step 2
    retry: false,
  })

  useEffect(() => {
    if (step === 2) {
      if (isError) {
        setDiagnosticError(getActionableErrorMessage(error))
      } else if (!isLoading && catalog.length === 0) {
        setDiagnosticError(
          "Aucun modèle n'est chargé ou installé. Ouvrez LM Studio, chargez un modèle dans l'onglet Developer ou installez un modèle dans l'onglet Modèles."
        )
      } else {
        setDiagnosticError(null)
      }
    }
  }, [step, catalog, isLoading, isError, error])

  const handleNextStep = () => {
    if (step === 3) {
      localStorage.setItem('atelier:onboarded', 'true')
      navigate('/')
    } else {
      setStep(step + 1)
    }
  }

  const handleRetry = () => {
    setDiagnosticError(null)
    refetch()
  }

  const slideVariants: any = {
    initial: { x: 50, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    exit: { x: -50, opacity: 0, transition: { duration: 0.3 } },
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-0 text-text-1 font-sans p-6 overflow-hidden">
      <div className="w-full max-w-xl bg-bg-1 border border-line-1 rounded-lg p-10 shadow-2xl relative min-h-[380px] flex flex-col justify-between">
        
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-accent-warm/5 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-accent-cool/5 blur-3xl" />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6 flex-1 flex flex-col justify-center"
            >
              <div className="space-y-2">
                <span className="text-xs font-mono text-accent-warm uppercase tracking-widest">
                  Onboarding — Étape 1 sur 3
                </span>
                <h1 className="font-display text-5xl font-light tracking-tight text-text-1">
                  L'Atelier Lumineux
                </h1>
                <p className="text-lg text-text-2 font-display italic">
                  "L'intelligence que vous tenez dans votre main."
                </p>
              </div>
              <p className="text-sm text-text-2 leading-relaxed max-w-md">
                Bienvenue dans votre espace d'orchestration IA. Vos conversations, prompts et documents sont conservés à 100% sur votre propre machine.
              </p>
              <div className="pt-4">
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded-md font-medium text-sm text-accent-warm transition-all cursor-pointer hover:scale-[1.01]"
                >
                  Commencer
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6 flex-1 flex flex-col justify-center"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono text-accent-warm uppercase tracking-widest">
                  Diagnostic — Étape 2 sur 3
                </span>
                <h2 className="font-display text-3xl font-light text-text-1">
                  Analyse de l'environnement local
                </h2>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-accent-warm" />
                  <span className="text-xs font-mono text-text-3">Recherche des moteurs locaux...</span>
                </div>
              ) : diagnosticError ? (
                <div className="p-4 border border-accent-danger/20 bg-accent-danger/5 rounded-md space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-accent-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-mono uppercase text-accent-danger font-bold">
                        Moteur Injoignable
                      </h4>
                      <p className="text-xs text-text-2 mt-1 leading-relaxed">
                        {diagnosticError}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 bg-bg-2 border border-line-1 hover:border-line-2 rounded-md text-xs font-mono text-text-1 cursor-pointer"
                    >
                      Réessayer le diagnostic
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border border-accent-success/20 bg-accent-success/5 rounded-md flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-accent-success flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-mono uppercase text-accent-success font-bold">
                        Moteur Détecté
                      </h4>
                      <p className="text-xs text-text-2 mt-1">
                        Votre serveur d'inférence local répond correctement. Nous avons détecté les modèles suivants :
                      </p>
                    </div>
                  </div>

                  <div className="max-h-24 overflow-y-auto border border-line-1 rounded-md p-2 bg-bg-2/30 space-y-1">
                    {catalog.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-xs font-mono py-1 px-2 border-b border-line-1/40 last:border-b-0 text-text-2">
                        <span>{m.id}</span>
                        <span className="text-[10px] text-text-3 uppercase">{m.family}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      onClick={handleNextStep}
                      className="flex items-center gap-2 px-6 py-3 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded-md font-medium text-sm text-accent-warm transition-all cursor-pointer"
                    >
                      Continuer
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6 flex-1 flex flex-col justify-center"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono text-accent-warm uppercase tracking-widest">
                  Premier Modèle — Étape 3 sur 3
                </span>
                <h2 className="font-display text-3xl font-light text-text-1">
                  Prêt à démarrer
                </h2>
              </div>
              
              <div className="p-4 border border-line-1 bg-bg-2/30 rounded-md space-y-2">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-accent-cool" />
                  <span className="font-mono text-sm text-text-1 font-bold">
                    {catalog[0]?.id || 'llama3.1-8b-instruct-q4'}
                  </span>
                </div>
                <p className="text-xs text-text-2 leading-relaxed">
                  Ce modèle sera sélectionné par défaut pour votre première conversation. Vous pourrez en installer d'autres à tout moment depuis la page de catalogue.
                </p>
              </div>

              <div>
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-bg-2 hover:bg-bg-3 border border-line-2 rounded-md font-medium text-sm text-accent-warm transition-all cursor-pointer hover:scale-[1.01]"
                >
                  Lancer une conversation
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
