'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import { 
  getClientEmotionAwareNotificationService, 
  type EmotionalState, 
  type NotificationType,
  type EmotionalContext,
  type EmotionalNotification
} from '@/lib/emotion-aware-notifications-client'

interface EmotionAwareNotificationCardProps {
  className?: string
}

const emotions: { value: EmotionalState; label: string; emoji: string; color: string; description: string }[] = [
  { value: 'joy', label: 'Joyful', emoji: '😊', color: 'yellow', description: 'Feeling happy and uplifted' },
  { value: 'love', label: 'Loving', emoji: '💕', color: 'pink', description: 'Feeling connected and affectionate' },
  { value: 'excitement', label: 'Excited', emoji: '🤩', color: 'orange', description: 'Enthusiastic and energetic' },
  { value: 'peaceful', label: 'Peaceful', emoji: '😌', color: 'blue', description: 'Calm and serene' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏', color: 'green', description: 'Appreciative and thankful' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: 'gray', description: 'Feeling okay, nothing special' },
  { value: 'stress', label: 'Stressed', emoji: '😰', color: 'red', description: 'Feeling overwhelmed or pressured' },
  { value: 'sadness', label: 'Sad', emoji: '😢', color: 'blue', description: 'Feeling down or melancholy' },
  { value: 'anxiety', label: 'Anxious', emoji: '😟', color: 'purple', description: 'Feeling worried or nervous' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤', color: 'red', description: 'Feeling annoyed or blocked' },
  { value: 'distance', label: 'Distant', emoji: '😶', color: 'gray', description: 'Feeling disconnected or apart' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '🤯', color: 'red', description: 'Feeling like too much is happening' }
]

const notificationTypes: { value: NotificationType; label: string; emoji: string; description: string }[] = [
  { value: 'ritual_reminder', label: 'Ritual Reminder', emoji: '🔔', description: 'Gentle nudge for daily connection' },
  { value: 'appreciation_prompt', label: 'Appreciation Prompt', emoji: '✨', description: 'Encourage sharing love and gratitude' },
  { value: 'connection_nudge', label: 'Connection Nudge', emoji: '💕', description: 'Prompt to reach out to your partner' },
  { value: 'growth_encouragement', label: 'Growth Support', emoji: '🌱', description: 'Motivational message for relationship growth' },
  { value: 'milestone_celebration', label: 'Celebration', emoji: '🎉', description: 'Celebrate relationship achievements' },
  { value: 'crisis_intervention', label: 'Crisis Support', emoji: '🤝', description: 'Gentle intervention during difficult times' }
]

export default function EmotionAwareNotificationCard({ className = '' }: EmotionAwareNotificationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionalState>('neutral')
  const [emotionIntensity, setEmotionIntensity] = useState<number>(3)
  const [stressLevel, setStressLevel] = useState<number>(3)
  const [energyLevel, setEnergyLevel] = useState<number>(3)
  const [relationshipRelated, setRelationshipRelated] = useState<boolean>(true)
  const [selectedNotificationType, setSelectedNotificationType] = useState<NotificationType>('appreciation_prompt')
  const [detectedEmotion, setDetectedEmotion] = useState<EmotionalContext | null>(null)
  const [generatedNotification, setGeneratedNotification] = useState<EmotionalNotification | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showEmotionDetected, setShowEmotionDetected] = useState(false)
  const [recentNotifications, setRecentNotifications] = useState<EmotionalNotification[]>([])
  const [showCrisisIntervention, setShowCrisisIntervention] = useState(false)

  const pulseCanvasRef = useRef<HTMLCanvasElement>(null)

  // Emotion pulse animation
  useEffect(() => {
    if (!pulseCanvasRef.current) return

    const canvas = pulseCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    let animationFrame: number
    let time = 0

    const animate = () => {
      time += 0.02
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)
      
      const centerX = canvas.width / 4
      const centerY = canvas.height / 4
      
      // Create emotion-based color pulses
      const emotionColor = emotions.find(e => e.value === selectedEmotion)?.color || 'blue'
      const colorMap = {
        yellow: '#fbbf24',
        pink: '#ec4899', 
        orange: '#f97316',
        blue: '#3b82f6',
        green: '#10b981',
        gray: '#6b7280',
        red: '#ef4444',
        purple: '#8b5cf6'
      }

      for (let i = 0; i < 3; i++) {
        const radius = (Math.sin(time + i) * 20 + 30) * (emotionIntensity / 5)
        const alpha = (Math.sin(time + i) * 0.3 + 0.4) * (emotionIntensity / 5)
        
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.strokeStyle = colorMap[emotionColor as keyof typeof colorMap] || '#3b82f6'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      
      animationFrame = requestAnimationFrame(animate)
    }
    
    animate()

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
    }
  }, [selectedEmotion, emotionIntensity])

  const recordEmotionalState = async () => {
    setIsLoading(true)
    
    try {
      const notificationService = getClientEmotionAwareNotificationService()
      
      const result = await notificationService.recordEmotionalState({
        primaryEmotion: selectedEmotion,
        emotionIntensity,
        stressLevel,
        energyLevel,
        relationshipRelated,
        trigger: 'user_reported',
        confidenceScore: 1.0,
        detectionMethod: 'self_reported'
      })
      
      if (result.success && result.emotionalContext) {
        setDetectedEmotion(result.emotionalContext)
        setShowEmotionDetected(true)
        setTimeout(() => setShowEmotionDetected(false), 3000)
        
        trackEvent('emotional_state_recorded', {
          emotion: selectedEmotion,
          intensity: emotionIntensity,
          stress_level: stressLevel,
          energy_level: energyLevel,
          relationship_related: relationshipRelated
        })
      }
    } catch (error) {
      console.error('Error recording emotional state:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateEmotionalNotification = async () => {
    setIsLoading(true)
    
    try {
      const notificationService = getClientEmotionAwareNotificationService()
      
      const emotionalContext: EmotionalContext = {
        primaryEmotion: selectedEmotion,
        emotionIntensity,
        stressLevel,
        energyLevel,
        relationshipRelated,
        confidenceScore: 1.0
      }
      
      const result = await notificationService.generateEmotionalNotification({
        notificationType: selectedNotificationType,
        emotionalContext,
        sendImmediately: false
      })
      
      if (result.success && result.notification) {
        setGeneratedNotification(result.notification)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 5000)
        
        trackEvent('emotional_notification_generated', {
          notification_type: selectedNotificationType,
          detected_emotion: selectedEmotion,
          empathy_level: result.notification.empathyLevel,
          ai_confidence: result.notification.relationshipHealthScore
        })
      }
    } catch (error) {
      console.error('Error generating notification:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const triggerCrisisDetection = async () => {
    setIsLoading(true)
    
    try {
      const notificationService = getClientEmotionAwareNotificationService()
      
      const result = await notificationService.triggerCrisisDetection()
      
      if (result.success) {
        if (result.crisisDetected && result.crisis) {
          setShowCrisisIntervention(true)
          setTimeout(() => setShowCrisisIntervention(false), 8000)
          
          trackEvent('relationship_crisis_detected', {
            crisis_type: result.crisis.crisisType,
            severity: result.crisis.severityLevel,
            confidence: result.crisis.confidenceScore
          })
        }
      }
    } catch (error) {
      console.error('Error triggering crisis detection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecentNotifications = async () => {
    try {
      const notificationService = getClientEmotionAwareNotificationService()
      
      const result = await notificationService.getEmotionalNotifications({
        limit: 5
      })
      
      if (result.success && result.notifications) {
        setRecentNotifications(result.notifications)
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  useEffect(() => {
    loadRecentNotifications()
  }, [])

  const getEmotionColor = (emotion: EmotionalState): string => {
    const emotionData = emotions.find(e => e.value === emotion)
    return emotionData?.color || 'blue'
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      yellow: 'border-yellow-500 bg-yellow-50 text-yellow-700',
      pink: 'border-pink-500 bg-pink-50 text-pink-700',
      orange: 'border-orange-500 bg-orange-50 text-orange-700',
      blue: 'border-blue-500 bg-blue-50 text-blue-700',
      green: 'border-green-500 bg-green-50 text-green-700',
      gray: 'border-gray-500 bg-gray-50 text-gray-700',
      red: 'border-red-500 bg-red-50 text-red-700',
      purple: 'border-purple-500 bg-purple-50 text-purple-700'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {/* Emotion Pulse Background */}
      <div className="relative">
        <canvas
          ref={pulseCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        />
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">Emotion-Aware Notifications</h3>
              <p className="text-white/90 text-sm">Revolutionary push notifications with emotional intelligence</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Emotional State */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            How are you feeling right now?
          </label>
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
            {emotions.map((emotion) => (
              <button
                key={emotion.value}
                onClick={() => setSelectedEmotion(emotion.value)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedEmotion === emotion.value
                    ? getColorClasses(emotion.color)
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-xl mb-1">{emotion.emoji}</div>
                <div className="text-xs font-medium">{emotion.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Emotion Intensity & Context */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Intensity
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="5"
                value={emotionIntensity}
                onChange={(e) => setEmotionIntensity(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Mild</span>
                <span className="font-medium text-purple-600">
                  {emotionIntensity}/5
                </span>
                <span>Intense</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stress Level
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Relaxed</span>
                <span className="font-medium text-red-600">
                  {stressLevel}/5
                </span>
                <span>Very Stressed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Energy Level
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="5"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Drained</span>
                <span className="font-medium text-green-600">
                  {energyLevel}/5
                </span>
                <span>Energized</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Context
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={relationshipRelated}
                  onChange={(e) => setRelationshipRelated(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Relationship related</span>
              </label>
            </div>
          </div>
        </div>

        {/* Record Emotional State */}
        <motion.button
          onClick={recordEmotionalState}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Recording Emotion...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <span>💫</span>
              <span>Record My Emotional State</span>
            </span>
          )}
        </motion.button>

        {/* Notification Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Test Notification Type
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {notificationTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedNotificationType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedNotificationType === type.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{type.emoji}</span>
                  <span className="font-medium text-xs">{type.label}</span>
                </div>
                <p className="text-xs opacity-75">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Generate Notification */}
        <div className="flex space-x-3">
          <motion.button
            onClick={generateEmotionalNotification}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🧠</span>
              <span>Generate AI Notification</span>
            </span>
          </motion.button>
          
          <motion.button
            onClick={triggerCrisisDetection}
            disabled={isLoading}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🚨</span>
              <span>Crisis Detection</span>
            </span>
          </motion.button>
        </div>

        {/* Emotion Detected Success */}
        <AnimatePresence>
          {showEmotionDetected && detectedEmotion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {emotions.find(e => e.value === detectedEmotion.primaryEmotion)?.emoji}
                </div>
                <div>
                  <h4 className="font-bold text-green-800">Emotion Recorded!</h4>
                  <p className="text-green-700 text-sm">
                    Feeling {emotions.find(e => e.value === detectedEmotion.primaryEmotion)?.label.toLowerCase()} 
                    with intensity {detectedEmotion.emotionIntensity}/5
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generated Notification */}
        <AnimatePresence>
          {showSuccess && generatedNotification && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <h4 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <span>🧠</span>
                <span>AI-Generated Emotional Notification</span>
              </h4>
              
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-bold text-indigo-800">{generatedNotification.title}</h5>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Empathy Level: {generatedNotification.empathyLevel}/5
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Psychology: {generatedNotification.psychologicalTrigger}
                    </span>
                  </div>
                </div>
                
                <p className="text-indigo-700 mb-3">{generatedNotification.message}</p>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-indigo-800">Target Emotion:</span>
                    <span className="ml-1 text-indigo-600">
                      {emotions.find(e => e.value === generatedNotification.targetEmotionalState)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-indigo-800">Cognitive Load:</span>
                    <span className="ml-1 text-indigo-600">
                      {generatedNotification.cognitiveLoad}/5
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Crisis Intervention Alert */}
        <AnimatePresence>
          {showCrisisIntervention && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-red-50 rounded-lg p-4 border border-red-200"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🤝</div>
                <h4 className="font-bold text-red-800 mb-2">Crisis Intervention Triggered</h4>
                <p className="text-red-700 text-sm mb-3">
                  Our AI detected some concerning patterns in your relationship data. 
                  We're here to help with gentle guidance and support.
                </p>
                <div className="bg-white rounded-lg p-3 border border-red-100">
                  <p className="text-red-600 text-xs italic">
                    "Relationships go through seasons - some sunny, some stormy. Right now feels challenging, 
                    but you have tools and each other. One gentle conversation or kind gesture might be exactly what's needed."
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Notifications */}
        {recentNotifications.length > 0 && (
          <div>
            <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
              <span>📱</span>
              <span>Recent Emotional Notifications</span>
            </h4>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recentNotifications.map((notification) => (
                <div key={notification.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <h6 className="font-medium text-gray-800 text-sm">{notification.title}</h6>
                    <span className="text-xs text-gray-500">
                      {notification.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                      {notification.notificationType.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      Empathy: {notification.empathyLevel}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}