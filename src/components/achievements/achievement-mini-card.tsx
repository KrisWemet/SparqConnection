'use client'

import { Achievement, getAchievementCategoryDisplayName } from '@/lib/achievements'

interface AchievementMiniCardProps {
  achievement: Achievement
  onClick?: () => void
  size?: 'small' | 'medium'
  showCategory?: boolean
}

export default function AchievementMiniCard({
  achievement,
  onClick,
  size = 'medium',
  showCategory = true
}: AchievementMiniCardProps) {
  const isSmall = size === 'small'

  return (
    <div 
      className={`bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
        isSmall ? 'min-w-[120px]' : ''
      }`}
      onClick={onClick}
    >
      <div className={`flex items-center space-x-3 ${isSmall ? 'flex-col space-x-0 space-y-2 text-center' : ''}`}>
        <div className={`${isSmall ? 'text-2xl' : 'text-3xl'} flex-shrink-0`}>
          {achievement.badge_icon}
        </div>
        
        <div className={`flex-1 min-w-0 ${isSmall ? 'text-center' : ''}`}>
          <h4 className={`font-semibold text-green-900 ${isSmall ? 'text-sm' : 'text-base'} leading-tight`}>
            {achievement.title}
          </h4>
          
          {!isSmall && (
            <p className="text-xs text-green-700 mt-1 line-clamp-2">
              {achievement.description}
            </p>
          )}
          
          {showCategory && (
            <div className="flex items-center justify-between mt-2">
              <span className={`px-2 py-1 rounded-full font-medium text-green-800 bg-green-200 ${
                isSmall ? 'text-xs' : 'text-xs'
              }`}>
                {getAchievementCategoryDisplayName(achievement.achievement_type).replace(/\s+/g, ' ')}
              </span>
              
              {!isSmall && (
                <span className="text-xs text-green-600">
                  {new Date(achievement.earned_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Achievement earned indicator */}
      <div className={`absolute ${isSmall ? 'top-1 right-1' : 'top-2 right-2'}`}>
        <div className="bg-green-500 text-white rounded-full p-1">
          <svg className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  )
}