'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'
import {
  achievementManager,
  Achievement,
  AchievementDefinition,
  AchievementProgress,
  getAchievementCategoryDisplayName,
  getAchievementRarityColor
} from '@/lib/achievements'
import AchievementCelebrationModal from '@/components/achievements/achievement-celebration-modal'

type FilterCategory = 'all' | 'earned' | 'available' | 'in_progress'

interface AchievementGalleryItem {
  definition: AchievementDefinition
  earned?: Achievement
  progress?: AchievementProgress
  status: 'earned' | 'available' | 'in_progress' | 'locked'
}

export default function AchievementsPage() {
  const { user, loading } = useSupabase()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([])
  const [progress, setProgress] = useState<AchievementProgress[]>([])
  const [galleryItems, setGalleryItems] = useState<AchievementGalleryItem[]>([])
  const [stats, setStats] = useState({
    total_achievements: 0,
    achievements_by_category: {} as Record<string, number>,
    achievement_rate: 0,
    recent_achievements: [] as Achievement[]
  })
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading) return

    if (!user) {
      window.location.href = '/auth'
      return
    }

    fetchAchievementData()
    trackEvent('achievements_page_viewed')
  }, [user, loading])

  const fetchAchievementData = async () => {
    if (!user) return

    try {
      setIsLoading(true)

      const [earnedAchievements, allDefinitions, achievementProgress, achievementStats] = await Promise.all([
        achievementManager.getUserAchievements(user.id),
        achievementManager.getAchievementDefinitions(),
        achievementManager.getAchievementProgress(user.id),
        achievementManager.getAchievementStats(user.id)
      ])

      setAchievements(earnedAchievements)
      setDefinitions(allDefinitions)
      setProgress(achievementProgress)
      setStats(achievementStats)

      // Create gallery items by combining definitions with earned achievements and progress
      const items: AchievementGalleryItem[] = allDefinitions.map(definition => {
        const earned = earnedAchievements.find(a => a.achievement_key === definition.achievement_key)
        const progressItem = achievementProgress.find(p => p.achievement_key === definition.achievement_key)
        
        let status: AchievementGalleryItem['status'] = 'available'
        if (earned) {
          status = 'earned'
        } else if (progressItem && progressItem.current_progress > 0) {
          status = 'in_progress'
        } else if (Object.keys(definition.unlock_requirements).length > 0) {
          // Check unlock requirements here - for now, assume all are available
          status = 'available'
        }

        return {
          definition,
          earned,
          progress: progressItem,
          status
        }
      })

      setGalleryItems(items)

    } catch (err) {
      console.error('Error fetching achievement data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load achievements')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAchievementClick = (item: AchievementGalleryItem) => {
    if (item.earned) {
      setSelectedAchievement(item.earned)
      trackEvent('achievement_detail_viewed', {
        achievement_key: item.definition.achievement_key,
        status: 'earned'
      })
    } else {
      trackEvent('achievement_detail_viewed', {
        achievement_key: item.definition.achievement_key,
        status: item.status
      })
    }
  }

  const getFilteredItems = (): AchievementGalleryItem[] => {
    switch (selectedCategory) {
      case 'earned':
        return galleryItems.filter(item => item.status === 'earned')
      case 'available':
        return galleryItems.filter(item => item.status === 'available')
      case 'in_progress':
        return galleryItems.filter(item => item.status === 'in_progress')
      default:
        return galleryItems
    }
  }

  const getCategoryCount = (category: FilterCategory): number => {
    if (category === 'all') return galleryItems.length
    return galleryItems.filter(item => item.status === category).length
  }

  const renderAchievementCard = (item: AchievementGalleryItem) => {
    const { definition, earned, progress, status } = item
    const isEarned = status === 'earned'
    const hasProgress = status === 'in_progress'

    return (
      <div
        key={definition.id}
        className={`relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
          isEarned
            ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md'
            : hasProgress
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleAchievementClick(item)}
      >
        {/* Rarity indicator */}
        <div 
          className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-b-[30px] border-l-transparent"
          style={{ borderBottomColor: getAchievementRarityColor(definition.rarity) }}
        />

        <div className="p-6">
          {/* Badge and Title */}
          <div className="flex items-start space-x-4 mb-4">
            <div className={`text-4xl ${isEarned ? '' : 'grayscale opacity-40'}`}>
              {definition.badge_icon}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg mb-1 ${isEarned ? 'text-green-900' : 'text-gray-900'}`}>
                {definition.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {definition.description}
              </p>
            </div>
          </div>

          {/* Progress Bar (for in-progress achievements) */}
          {hasProgress && progress && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-blue-700">Progress</span>
                <span className="text-xs text-blue-600">
                  {progress.current_progress}/{progress.required_progress}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Category and Date */}
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${
              isEarned
                ? 'bg-green-200 text-green-800'
                : hasProgress
                ? 'bg-blue-200 text-blue-800'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {getAchievementCategoryDisplayName(definition.category)}
            </span>
            {earned && (
              <span className="text-gray-500">
                {new Date(earned.earned_at).toLocaleDateString()}
              </span>
            )}
            {!earned && definition.rarity !== 'common' && (
              <span 
                className="px-2 py-1 rounded-full text-white text-xs font-medium"
                style={{ backgroundColor: getAchievementRarityColor(definition.rarity) }}
              >
                {definition.rarity}
              </span>
            )}
          </div>

          {/* Earned indicator */}
          {isEarned && (
            <div className="absolute top-4 right-4">
              <div className="bg-green-500 text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your achievements...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAchievementData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const filteredItems = getFilteredItems()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 Your Achievements</h1>
          <p className="text-gray-600">
            Celebrating your relationship journey and growth together
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {stats.total_achievements}
            </div>
            <div className="text-sm text-gray-600">Total Earned</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.achievement_rate}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {Object.keys(stats.achievements_by_category).length}
            </div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm border">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {galleryItems.filter(item => item.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'all' as FilterCategory, label: 'All Achievements' },
            { key: 'earned' as FilterCategory, label: 'Earned' },
            { key: 'in_progress' as FilterCategory, label: 'In Progress' },
            { key: 'available' as FilterCategory, label: 'Available' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {label} ({getCategoryCount(key)})
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(renderAchievementCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedCategory === 'earned' 
                ? 'No achievements earned yet' 
                : selectedCategory === 'in_progress'
                ? 'No achievements in progress'
                : 'No available achievements'}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === 'earned'
                ? 'Start completing daily rituals and engaging with your partner to earn your first achievements!'
                : 'Keep exploring different categories to find achievements you can work on.'}
            </p>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                View All Achievements
              </button>
            )}
          </div>
        )}

        {/* Achievement Celebration Modal */}
        <AchievementCelebrationModal
          achievement={selectedAchievement}
          celebrationConfig={{ confetti: true, badge_animation: 'bounce' }}
          isOpen={!!selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />

        {/* Navigation */}
        <div className="text-center mt-12">
          <a
            href="/today"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← Back to Today
          </a>
        </div>
      </div>
    </div>
  )
}