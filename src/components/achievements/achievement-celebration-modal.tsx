'use client'

import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { 
  Achievement, 
  CelebrationConfig, 
  getCelebrationAnimationClass,
  achievementManager 
} from '@/lib/achievements'

interface AchievementCelebrationModalProps {
  achievement: Achievement | null
  celebrationConfig?: CelebrationConfig
  isOpen: boolean
  onClose: () => void
  onShare?: () => void
}

export default function AchievementCelebrationModal({
  achievement,
  celebrationConfig,
  isOpen,
  onClose,
  onShare
}: AchievementCelebrationModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isOpen && achievement && celebrationConfig) {
      // Show confetti effect
      if (celebrationConfig.confetti) {
        setShowConfetti(true)
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 3000)
      }

      // Set badge animation
      if (celebrationConfig.badge_animation) {
        setAnimationClass(getCelebrationAnimationClass(celebrationConfig.badge_animation))
      }

      // Play celebration sound
      if (celebrationConfig.sound === 'celebration') {
        // Note: In a real implementation, you'd play an actual sound file
        console.log('🔊 Playing celebration sound')
      }

      // Auto-dismiss if configured
      if (celebrationConfig.auto_dismiss_ms) {
        setTimeout(() => {
          handleClose('auto_dismissed')
        }, celebrationConfig.auto_dismiss_ms)
      }

      // Track modal view
      if (achievement.id) {
        achievementManager.recordCelebration(
          achievement.id,
          achievement.id,
          'modal',
          'viewed'
        )
      }

      // Track analytics
      trackEvent('achievement_celebration_modal_shown', {
        achievement_key: achievement.achievement_key,
        achievement_title: achievement.title,
        celebration_type: 'modal'
      })
    }
  }, [isOpen, achievement, celebrationConfig])

  const handleClose = (engagementLevel: 'viewed' | 'dismissed' | 'shared' = 'dismissed') => {
    if (achievement?.id) {
      achievementManager.recordCelebration(
        achievement.id,
        achievement.id,
        'modal',
        engagementLevel
      )
    }

    trackEvent('achievement_celebration_modal_closed', {
      achievement_key: achievement?.achievement_key,
      engagement_level: engagementLevel
    })

    onClose()
  }

  const handleShare = () => {
    if (achievement?.id) {
      achievementManager.recordCelebration(
        achievement.id,
        achievement.id,
        'modal',
        'shared'
      )
    }

    trackEvent('achievement_shared', {
      achievement_key: achievement?.achievement_key,
      share_source: 'celebration_modal'
    })

    if (onShare) {
      onShare()
    }
    
    handleClose('shared')
  }

  if (!isOpen || !achievement) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={() => handleClose('dismissed')}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="confetti-container">
                {/* Simple CSS confetti animation */}
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'][
                        Math.floor(Math.random() * 5)
                      ]
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 text-center text-white relative">
            <div className="mb-4">
              <div className={`text-6xl mb-4 ${animationClass}`}>
                {achievement.badge_icon}
              </div>
              <h2 className="text-2xl font-bold mb-2">🎉 Achievement Unlocked!</h2>
              <h3 className="text-xl font-semibold">{achievement.title}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <p className="text-gray-600 leading-relaxed">
                {achievement.description}
              </p>

              {celebrationConfig?.special_message && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">
                    🌟 You're building something beautiful together! Keep nurturing your connection.
                  </p>
                </div>
              )}
            </div>

            {/* Achievement Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Category</span>
                <span className="font-medium text-gray-900 capitalize">
                  {achievement.achievement_type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Earned</span>
                <span className="font-medium text-gray-900">
                  {new Date(achievement.earned_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {onShare && (
                <button
                  onClick={handleShare}
                  className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Share with Partner 💕
                </button>
              )}
              <button
                onClick={() => handleClose('dismissed')}
                className={`${onShare ? 'flex-1' : 'w-full'} bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style jsx>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          pointer-events: none;
        }

        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: confetti-fall 3s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            top: -10px;
            transform: translateX(0px) rotateZ(0deg);
            opacity: 1;
          }
          100% {
            top: 100vh;
            transform: translateX(100px) rotateZ(720deg);
            opacity: 0;
          }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out 2;
        }

        .animate-spin {
          animation: spin 1s ease-in-out 2;
        }

        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-25%);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .5;
          }
        }
      `}</style>
    </>
  )
}