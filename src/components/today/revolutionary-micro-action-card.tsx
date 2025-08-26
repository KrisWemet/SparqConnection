'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import HelpChip from '@/components/ui/help-chip'
import WhyHint from '@/components/ui/why-hint'
import { copy } from '@/content/copy/en-US'
import { 
  getClientNeuroscienceMicroActionService, 
  type NeuroscienceAction, 
  type ActionCategory,
  type CelebrationType 
} from '@/lib/neuroscience-micro-actions-client'

interface RevolutionaryMicroActionCardProps {
  action: string
  actionId?: string
  loveLanguage?: string
  attachmentStyle?: string
}

const emotionalStates = [
  'joy', 'love', 'gratitude', 'excitement', 'contentment', 'happiness', 'peace', 
  'confidence', 'enthusiasm', 'calm', 'focused', 'curious', 'thoughtful',
  'sadness', 'anxiety', 'frustration', 'stress', 'overwhelmed', 'tired', 'neutral'
]

const celebrationConfigs = {
  standard: {
    emoji: '✨',
    title: 'Action Complete!',
    subtitle: 'You\'re building stronger love patterns',
    color: 'green',
    particles: 20
  },
  milestone: {
    emoji: '🎯',
    title: 'Milestone Achieved!', 
    subtitle: 'Your neural pathways are strengthening',
    color: 'blue',
    particles: 40
  },
  breakthrough: {
    emoji: '🚀',
    title: 'Breakthrough Moment!',
    subtitle: 'You\'re rewiring your brain for love',
    color: 'purple',
    particles: 60
  },
  legendary: {
    emoji: '👑',
    title: 'Legendary Achievement!',
    subtitle: 'You\'ve mastered this love pattern',
    color: 'gold',
    particles: 100
  }
}

export default function RevolutionaryMicroActionCard({ 
  action,
  actionId,
  loveLanguage,
  attachmentStyle
}: RevolutionaryMicroActionCardProps) {
  const [isDone, setIsDone] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [neuroscienceAction, setNeuroscienceAction] = useState<NeuroscienceAction | null>(null)
  const [showHypnoticMode, setShowHypnoticMode] = useState(false)
  const [emotionalStateBefore, setEmotionalStateBefore] = useState('')
  const [emotionalStateAfter, setEmotionalStateAfter] = useState('')
  const [confidenceLevel, setConfidenceLevel] = useState(5)
  const [relationshipImpact, setRelationshipImpact] = useState(5)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationType, setCelebrationType] = useState<CelebrationType>('standard')
  const [experiencePoints, setExperiencePoints] = useState(0)
  const [hypnoticAffirmation, setHypnoticAffirmation] = useState('')
  const [showProgrammingSession, setShowProgrammingSession] = useState(false)
  const [programmingContent, setProgrammingContent] = useState('')
  
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load neuroscience-enhanced action on mount
  useEffect(() => {
    const loadNeuroscienceAction = async () => {
      const service = getClientNeuroscienceMicroActionService()
      const enhancedAction = await service.getPersonalizedAction({
        primaryLoveLanguage: loveLanguage,
        attachmentStyle: attachmentStyle
      })
      
      if (enhancedAction) {
        setNeuroscienceAction(enhancedAction)
      }
    }
    
    loadNeuroscienceAction()
  }, [loveLanguage, attachmentStyle])

  // Particle system for celebrations
  useEffect(() => {
    if (showCelebration && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const config = celebrationConfigs[celebrationType]
      const particles: Array<{
        x: number
        y: number
        vx: number
        vy: number
        life: number
        maxLife: number
        color: string
        size: number
      }> = []

      // Create particles
      for (let i = 0; i < config.particles; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 5,
          life: 1,
          maxLife: 1,
          color: getRandomColor(config.color),
          size: Math.random() * 4 + 2
        })
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        particles.forEach((particle, index) => {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vy += 0.2 // gravity
          particle.life -= 0.02
          
          if (particle.life <= 0) {
            particles.splice(index, 1)
            return
          }
          
          ctx.save()
          ctx.globalAlpha = particle.life
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
        
        if (particles.length > 0) {
          requestAnimationFrame(animate)
        }
      }
      
      animate()
    }
  }, [showCelebration, celebrationType])

  const getRandomColor = (baseColor: string): string => {
    const colors = {
      green: ['#10b981', '#34d399', '#6ee7b7'],
      blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
      purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
      gold: ['#f59e0b', '#fbbf24', '#fcd34d']
    }
    
    const colorArray = colors[baseColor as keyof typeof colors] || colors.green
    return colorArray[Math.floor(Math.random() * colorArray.length)]
  }

  const handleMarkDone = async () => {
    if (!emotionalStateBefore || !emotionalStateAfter) {
      alert('Please select your emotional state before and after completing the action.')
      return
    }

    setIsLoading(true)

    try {
      const service = getClientNeuroscienceMicroActionService()
      
      const result = await service.completeAction({
        actionText: neuroscienceAction?.nlpEmbeddedVersion || action,
        actionCategory: (neuroscienceAction?.primaryLoveLanguage as ActionCategory) || 'words',
        emotionalStateBefore,
        emotionalStateAfter,
        confidenceLevel,
        relationshipImpactRating: relationshipImpact
      })

      if (result.success && result.completion) {
        setIsDone(true)
        setCelebrationType(result.completion.celebrationType)
        setExperiencePoints(result.completion.experiencePoints)
        setHypnoticAffirmation(result.affirmation || '')

        // Trigger celebration animation
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 5000)

        // Create programming session after celebration
        setTimeout(async () => {
          const sessionResult = await service.createProgrammingSession({
            sessionType: 'post_action',
            actionCompletedId: result.completion?.id,
            focusArea: neuroscienceAction?.neurosciencePrinciple,
            userReceptivity: confidenceLevel || 7
          })
          
          if (sessionResult.success && sessionResult.session) {
            setProgrammingContent(sessionResult.session.content)
            setShowProgrammingSession(true)
          }
        }, 3000)

        trackEvent('revolutionary_micro_action_completed', {
          action_id: actionId,
          celebration_type: result.completion.celebrationType,
          experience_points: result.completion.experiencePoints,
          neural_strength: result.completion.neuralStrength,
          habit_formation_score: result.completion.habitFormationScore,
          emotional_improvement: emotionalStateAfter ? 1 : 0,
          confidence_level: confidenceLevel,
          relationship_impact: relationshipImpact
        })
      } else {
        alert('Failed to complete action. Please try again.')
      }
    } catch (error) {
      console.error('Error completing action:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getActionText = () => {
    if (showHypnoticMode && neuroscienceAction) {
      return neuroscienceAction.hypnoticVariation
    }
    return neuroscienceAction?.nlpEmbeddedVersion || action
  }

  const getActionColor = () => {
    if (!neuroscienceAction) return 'orange'
    
    const colorMap = {
      touch: 'pink',
      words: 'blue', 
      acts: 'green',
      time: 'purple',
      gifts: 'yellow',
      physical: 'red',
      emotional: 'indigo',
      spiritual: 'violet'
    }
    
    return colorMap[neuroscienceAction.primaryLoveLanguage as keyof typeof colorMap] || 'orange'
  }

  // Hypnotic Programming Session Modal
  const ProgrammingSessionModal = () => (
    <AnimatePresence>
      {showProgrammingSession && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProgrammingSession(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-purple-700">Neural Reprogramming</h3>
              <p className="text-sm text-purple-600">Upgrading your subconscious love patterns</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <p className="text-purple-800 leading-relaxed text-sm">
                {programmingContent}
              </p>
            </div>

            {hypnoticAffirmation && (
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-purple-700 mb-2">Your Personal Affirmation:</h4>
                <p className="text-purple-800 italic">"{hypnoticAffirmation}"</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowProgrammingSession(false)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Integrate This Programming
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className="bg-white rounded-lg p-6 border shadow-sm relative overflow-hidden">
      {/* Celebration Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-10"
        width={400}
        height={400}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-20"
          >
            <div className="text-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.6, repeat: 3 }}
                className="text-6xl mb-4"
              >
                {celebrationConfigs[celebrationType].emoji}
              </motion.div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">
                {celebrationConfigs[celebrationType].title}
              </h3>
              <p className="text-gray-600 mb-4">
                {celebrationConfigs[celebrationType].subtitle}
              </p>
              <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-3">
                <p className="text-lg font-semibold text-orange-800">
                  +{experiencePoints} XP
                </p>
                <p className="text-sm text-orange-600">Neural pathway strengthened!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2 relative z-30">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">{copy.cards.action.title}</h2>
          <HelpChip title={copy.help.action.title} body={copy.help.action.body} eventName="help_opened_card_action" />
        </div>
        <div className="flex items-center space-x-2">
          {isDone && (
            <div className="text-sm text-green-600 font-medium">✓ Neural Pattern Activated</div>
          )}
          <div className="text-sm text-gray-500">4/7</div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        This micro-action uses neuroscience to rewire your brain for deeper love and connection.
      </p>

      {/* Neuroscience Enhancement Toggle */}
      {neuroscienceAction && (
        <div className="mb-4">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-lg mr-2">🧠</span>
              <span className="text-sm font-medium text-purple-700">
                Hypnotic Mode {showHypnoticMode ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              onClick={() => setShowHypnoticMode(!showHypnoticMode)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showHypnoticMode ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                  showHypnoticMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {showHypnoticMode && (
            <p className="text-xs text-purple-600 mt-2">
              Using embedded NLP patterns and presuppositions for subconscious programming
            </p>
          )}
        </div>
      )}

      {/* Action */}
      <div className="mb-6">
        <div className={`border rounded-lg p-4 transition-all ${
          isDone 
            ? `border-green-200 bg-green-50` 
            : `border-${getActionColor()}-200 bg-${getActionColor()}-50`
        }`}>
          <motion.p 
            key={showHypnoticMode ? 'hypnotic' : 'normal'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-medium leading-relaxed ${
              isDone ? 'text-green-900' : `text-${getActionColor()}-900`
            }`}
          >
            {getActionText()}
          </motion.p>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <p>⏱️ {neuroscienceAction?.durationMinutes || 2} minutes • 🧠 {neuroscienceAction?.neurochemicalTarget || 'Dopamine'} boost</p>
          {neuroscienceAction && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getActionColor()}-100 text-${getActionColor()}-800`}>
              {neuroscienceAction.primaryLoveLanguage}
            </span>
          )}
        </div>
      </div>

      {/* Emotional State Tracking - Only show if not done */}
      {!isDone && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Track Your Transformation</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How do you feel RIGHT NOW?
              </label>
              <select
                value={emotionalStateBefore}
                onChange={(e) => setEmotionalStateBefore(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="">Select emotion...</option>
                {emotionalStates.map(state => (
                  <option key={state} value={state}>
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How will you feel AFTER?
              </label>
              <select
                value={emotionalStateAfter}
                onChange={(e) => setEmotionalStateAfter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                required
              >
                <option value="">Predict emotion...</option>
                {emotionalStates.map(state => (
                  <option key={state} value={state}>
                    {state.charAt(0).toUpperCase() + state.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600">{confidenceLevel}/10</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship Impact (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={relationshipImpact}
                onChange={(e) => setRelationshipImpact(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600">{relationshipImpact}/10</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isDone ? (
        <div className="space-y-3">
          <button
            onClick={handleMarkDone}
            disabled={!emotionalStateBefore || !emotionalStateAfter || isLoading}
            className={`w-full bg-${getActionColor()}-600 text-white py-3 px-4 rounded-md font-medium hover:bg-${getActionColor()}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${getActionColor()}-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Activating Neural Pattern...
              </>
            ) : (
              <>
                🧠 Complete & Upgrade Brain
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Neuroscience Details
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className={`w-12 h-12 bg-${getActionColor()}-100 rounded-full flex items-center justify-center mx-auto mb-3`}>
            <span className="text-xl">🧠</span>
          </div>
          <p className={`text-${getActionColor()}-700 font-medium`}>Neural pathway activated!</p>
          <p className="text-sm text-gray-600 mt-1">
            Your brain is now wired for this loving behavior
          </p>
          
          {hypnoticAffirmation && (
            <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <p className="text-sm text-purple-800 italic">
                "{hypnoticAffirmation}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Neuroscience Details */}
      {showDetails && neuroscienceAction && !isDone && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg overflow-hidden"
        >
          <h4 className="font-medium text-purple-700 mb-2">🧠 Neuroscience Breakdown</h4>
          <div className="space-y-2 text-sm">
            <p><strong>Neural Target:</strong> {neuroscienceAction.neurochemicalTarget} release</p>
            <p><strong>Pathway:</strong> {neuroscienceAction.neuralPathway}</p>
            <p><strong>Brain State:</strong> {neuroscienceAction.optimalBrainState} wave optimization</p>
            <p><strong>Principle:</strong> {neuroscienceAction.neurosciencePrinciple}</p>
            
            {neuroscienceAction.embeddedSuggestions.length > 0 && (
              <div>
                <strong>Subconscious Programming:</strong>
                <ul className="list-disc list-inside mt-1 text-purple-600">
                  {neuroscienceAction.embeddedSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Why Hint */}
      {!isDone && (
        <div className="mt-4 pt-4 border-t">
          <WhyHint 
            text={neuroscienceAction?.positiveAssumption || "Micro-actions create massive changes by leveraging neuroplasticity - your brain's ability to rewire itself. Each loving action literally strengthens neural pathways of connection."} 
          />
        </div>
      )}

      <ProgrammingSessionModal />
    </div>
  )
}