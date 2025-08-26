'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '@/lib/analytics'
import { 
  getClientAIPlannerService, 
  type PlanSuggestion, 
  type PlanCategory,
  type OptimalTiming,
  type RelationshipPlan 
} from '@/lib/ai-planner-client'

interface AIPlannerCardProps {
  userId?: string
  className?: string
}

const planCategories: { value: PlanCategory; label: string; emoji: string; description: string }[] = [
  { value: 'bonding', label: 'Bonding', emoji: '💕', description: 'Activities to strengthen your emotional connection' },
  { value: 'communication', label: 'Communication', emoji: '💬', description: 'Deep conversations and sharing experiences' },
  { value: 'adventure', label: 'Adventure', emoji: '🌟', description: 'Exciting new experiences to share together' },
  { value: 'intimacy', label: 'Intimacy', emoji: '🔥', description: 'Activities to deepen physical and emotional intimacy' },
  { value: 'personal_growth', label: 'Growth', emoji: '🌱', description: 'Activities to support individual and couple growth' },
  { value: 'fun', label: 'Fun', emoji: '🎉', description: 'Playful activities to bring joy and laughter' },
  { value: 'celebration', label: 'Celebration', emoji: '🎊', description: 'Special moments and milestone celebrations' }
]

const moodContexts = [
  { value: 'stressed', label: 'Feeling Stressed', emoji: '😰' },
  { value: 'excited', label: 'Feeling Excited', emoji: '🤩' },
  { value: 'romantic', label: 'Feeling Romantic', emoji: '😍' },
  { value: 'adventurous', label: 'Feeling Adventurous', emoji: '🚀' },
  { value: 'cozy', label: 'Want Something Cozy', emoji: '🤗' },
  { value: 'energetic', label: 'Feeling Energetic', emoji: '⚡' },
  { value: 'thoughtful', label: 'Feeling Reflective', emoji: '🤔' }
]

export default function AIPlannerCard({ userId, className = '' }: AIPlannerCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([])
  const [optimalTiming, setOptimalTiming] = useState<OptimalTiming | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('bonding')
  const [selectedMood, setSelectedMood] = useState<string>('excited')
  const [energyLevel, setEnergyLevel] = useState<number>(4)
  const [targetDate, setTargetDate] = useState<Date>(new Date())
  const [durationPreference, setDurationPreference] = useState<number>(60)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTiming, setShowTiming] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlanSuggestion | null>(null)
  const [createdPlan, setCreatedPlan] = useState<RelationshipPlan | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const sparkleCanvasRef = useRef<HTMLCanvasElement>(null)

  // Generate sparkle animation for AI magic
  useEffect(() => {
    if (!sparkleCanvasRef.current) return

    const canvas = sparkleCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const sparkles: Array<{
      x: number
      y: number
      size: number
      alpha: number
      speed: number
      color: string
    }> = []

    for (let i = 0; i < 20; i++) {
      sparkles.push({
        x: Math.random() * canvas.width / 2,
        y: Math.random() * canvas.height / 2,
        size: Math.random() * 3 + 1,
        alpha: Math.random(),
        speed: Math.random() * 0.02 + 0.005,
        color: ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981'][Math.floor(Math.random() * 4)]
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)
      
      sparkles.forEach(sparkle => {
        sparkle.alpha += sparkle.speed
        if (sparkle.alpha > 1) sparkle.alpha = 0
        
        ctx.save()
        ctx.globalAlpha = Math.sin(sparkle.alpha * Math.PI)
        ctx.fillStyle = sparkle.color
        ctx.beginPath()
        ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }, [])

  const generateSuggestions = async () => {
    setIsLoading(true)
    setShowSuggestions(false)
    
    try {
      const plannerService = getClientAIPlannerService()
      
      const result = await plannerService.getPlanSuggestions({
        category: selectedCategory,
        targetDate,
        duration: durationPreference,
        energyLevel,
        moodContext: selectedMood
      })
      
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions)
        setShowSuggestions(true)
        
        trackEvent('ai_planner_suggestions_requested', {
          category: selectedCategory,
          mood: selectedMood,
          energy_level: energyLevel,
          duration: durationPreference,
          suggestions_count: result.suggestions.length
        })
      } else {
        console.error('Failed to get suggestions:', result.error)
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateOptimalTiming = async () => {
    setIsLoading(true)
    setShowTiming(false)
    
    try {
      const plannerService = getClientAIPlannerService()
      
      const result = await plannerService.getOptimalTiming({
        duration: durationPreference,
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      })
      
      if (result.success && result.optimalTiming) {
        setOptimalTiming(result.optimalTiming)
        setShowTiming(true)
        
        trackEvent('ai_planner_timing_calculated', {
          duration: durationPreference,
          confidence: result.optimalTiming.availabilityConfidence
        })
      } else {
        console.error('Failed to calculate timing:', result.error)
      }
    } catch (error) {
      console.error('Error calculating timing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createPlanFromSuggestion = async (suggestion: PlanSuggestion) => {
    setIsLoading(true)
    
    try {
      const plannerService = getClientAIPlannerService()
      
      const result = await plannerService.createPlan({
        templateId: suggestion.templateId,
        title: suggestion.personalizedTitle || suggestion.title,
        description: suggestion.personalizedDescription || suggestion.description,
        planType: suggestion.planType,
        category: suggestion.category,
        scheduledDate: targetDate,
        durationMinutes: suggestion.estimatedDuration,
        locationType: 'anywhere'
      })
      
      if (result.success && result.plan) {
        setCreatedPlan(result.plan)
        setSelectedSuggestion(suggestion)
        setShowSuccess(true)
        
        trackEvent('ai_plan_created_from_suggestion', {
          template_id: suggestion.templateId,
          category: suggestion.category,
          plan_type: suggestion.planType,
          confidence_score: suggestion.confidenceScore,
          predicted_success_rate: suggestion.predictedSuccessRate
        })
        
        setTimeout(() => setShowSuccess(false), 5000)
      } else {
        console.error('Failed to create plan:', result.error)
      }
    } catch (error) {
      console.error('Error creating plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {/* AI Sparkle Background */}
      <div className="relative">
        <canvas
          ref={sparkleCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ mixBlendMode: 'multiply' }}
        />
        
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-400 p-6 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl">🧠</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Planner</h3>
              <p className="text-white/90 text-sm">Revolutionary relationship planning with predictive scheduling</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            What kind of experience are you looking for?
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {planCategories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedCategory === category.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{category.emoji}</span>
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
                <p className="text-xs opacity-75">{category.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Mood Context */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            How are you both feeling right now?
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {moodContexts.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedMood === mood.value
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-xl mb-1">{mood.emoji}</div>
                <div className="text-xs font-medium">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Energy Level & Duration */}
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
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low</span>
                <span className="font-medium text-blue-600">
                  {energyLevel}/5
                </span>
                <span>High</span>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <select
              value={durationPreference}
              onChange={(e) => setDurationPreference(parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <motion.button
            onClick={generateSuggestions}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>AI Thinking...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span>✨</span>
                <span>Get AI Suggestions</span>
              </span>
            )}
          </motion.button>
          
          <motion.button
            onClick={calculateOptimalTiming}
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center justify-center space-x-2">
              <span>🎯</span>
              <span>Find Optimal Time</span>
            </span>
          </motion.button>
        </div>

        {/* AI Suggestions */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <span>✨</span>
                <span>AI-Powered Suggestions</span>
              </h4>
              
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.templateId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-all cursor-pointer"
                    onClick={() => createPlanFromSuggestion(suggestion)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-gray-800">{suggestion.personalizedTitle}</h5>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {Math.round(suggestion.predictedSuccessRate * 100)}% success rate
                        </span>
                        <span className="text-blue-600 font-medium">
                          {Math.round(suggestion.confidenceScore * 100)}% AI confidence
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2">{suggestion.personalizedDescription}</p>
                    <p className="text-gray-500 text-xs italic">{suggestion.reasoning}</p>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {suggestion.estimatedDuration} minutes
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Create This Plan
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optimal Timing Display */}
        <AnimatePresence>
          {showTiming && optimalTiming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h4 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <span>🎯</span>
                <span>Optimal Timing Predictions</span>
              </h4>
              
              <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h5 className="font-semibold text-cyan-800 mb-1">Energy Predictions</h5>
                    <p className="text-sm text-cyan-700">
                      Your energy: {optimalTiming.energyPredictions.userAEnergy}/5<br />
                      Partner energy: {optimalTiming.energyPredictions.userBEnergy}/5
                    </p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-cyan-800 mb-1">Availability</h5>
                    <p className="text-sm text-cyan-700">
                      {Math.round(optimalTiming.availabilityConfidence * 100)}% confidence
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {optimalTiming.recommendedDates.slice(0, 3).map((date, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-cyan-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{date.date}</span>
                        <span className="text-sm text-cyan-600">
                          {Math.round(date.confidence * 100)}% optimal
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        {date.optimalTimes.slice(0, 2).map((time, timeIndex) => (
                          <span
                            key={timeIndex}
                            className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs"
                          >
                            {time.time}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{date.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && createdPlan && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-green-50 rounded-lg p-4 border border-green-200 text-center"
            >
              <div className="text-2xl mb-2">🎉</div>
              <h4 className="font-bold text-green-800 mb-1">Plan Created Successfully!</h4>
              <p className="text-green-700 text-sm mb-2">
                "{createdPlan.title}" has been added to your relationship plans.
              </p>
              <p className="text-green-600 text-xs">
                AI Confidence: {Math.round(createdPlan.aiConfidenceScore * 100)}% • 
                Predicted Success: {Math.round(createdPlan.predictedSuccessRate * 100)}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}