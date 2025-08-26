'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { trackEvent } from '@/lib/analytics'

interface PlaySession {
  id: string
  game_type: string
  round_number: number
  max_rounds: number
  completed: boolean
  state: any
  is_user_turn: boolean
  partner: {
    id: string
    name: string
    email: string
  }
  progress: {
    current_round: number
    total_rounds: number
    percentage: number
  }
  last_activity_at: string
  created_at: string
}

interface GameMove {
  choice?: string
  answer?: string
  response?: string
}

export default function PlayPage() {
  const { user, loading } = useSupabase()
  const [sessions, setSessions] = useState<PlaySession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeSession, setActiveSession] = useState<PlaySession | null>(null)
  const [gameMove, setGameMove] = useState<GameMove>({})

  useEffect(() => {
    if (loading) return

    if (!user) {
      window.location.href = '/auth'
      return
    }

    fetchPlaySessions()
    trackEvent('play_page_viewed')
  }, [user, loading])

  const fetchPlaySessions = async () => {
    try {
      const response = await fetch('/api/play/sessions?status=active')
      if (!response.ok) {
        throw new Error('Failed to fetch play sessions')
      }
      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (err) {
      console.error('Error fetching play sessions:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const createGame = async (gameType: string) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/play/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_type: gameType,
          max_rounds: gameType === 'you_or_me' ? 5 : 3
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create game')
      }

      const result = await response.json()
      trackEvent('play_game_created', { game_type: gameType })
      await fetchPlaySessions()
      setSelectedGame(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setIsCreating(false)
    }
  }

  const makeMove = async (sessionId: string, moveData: any, roundNumber: number) => {
    try {
      const response = await fetch('/api/play/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          move_data: moveData,
          round_number: roundNumber
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to make move')
      }

      const result = await response.json()
      trackEvent('play_move_made', { 
        game_type: activeSession?.game_type || '',
        session_id: sessionId
      })
      
      await fetchPlaySessions()
      setActiveSession(null)
      setGameMove({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make move')
    }
  }

  const renderGameInterface = (session: PlaySession) => {
    const { game_type, state, round_number } = session

    switch (game_type) {
      case 'you_or_me':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Round {round_number}</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <p className="text-blue-900 font-medium text-lg">
                  {state.current_question}
                </p>
              </div>
            </div>
            
            {session.is_user_turn ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => makeMove(session.id, { choice: 'you' }, round_number)}
                  className="p-4 bg-pink-100 border border-pink-300 rounded-lg hover:bg-pink-200 transition-colors"
                >
                  <div className="text-2xl mb-2">👆</div>
                  <div className="font-medium">You</div>
                </button>
                <button
                  onClick={() => makeMove(session.id, { choice: 'me' }, round_number)}
                  className="p-4 bg-blue-100 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <div className="text-2xl mb-2">👋</div>
                  <div className="font-medium">Me</div>
                </button>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">⏳</div>
                <p className="text-gray-600">
                  Waiting for {session.partner.name} to answer...
                </p>
              </div>
            )}

            {state.round_result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {state.round_result.match ? '🎉' : '🤔'}
                  </div>
                  <p className="font-medium">
                    {state.round_result.match ? 'You matched!' : 'Different answers'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )

      case 'prompts':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Round {round_number}</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <p className="text-purple-900 font-medium text-lg">
                  {state.current_prompt}
                </p>
              </div>
            </div>
            
            {session.is_user_turn ? (
              <div className="space-y-4">
                <textarea
                  value={gameMove.response || ''}
                  onChange={(e) => setGameMove({...gameMove, response: e.target.value})}
                  placeholder="Share your response..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                />
                <button
                  onClick={() => makeMove(session.id, { response: gameMove.response }, round_number)}
                  disabled={!gameMove.response?.trim()}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Share Response
                </button>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-2">✏️</div>
                <p className="text-gray-600">
                  {session.partner.name} is sharing their thoughts...
                </p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-3xl mb-2">🎮</div>
            <p className="text-gray-600">Game interface coming soon!</p>
          </div>
        )
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading games...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">🎮 Play</h1>
            <div className="flex space-x-4">
              <a
                href="/today"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Today
              </a>
              <a
                href="/connections"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Connections
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-8 pb-12 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🎮 Play Together</h1>
          <p className="text-gray-600">Fun async games to connect with your partner</p>
        </div>

        {/* Active Game Interface */}
        {activeSession && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeSession.game_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
                <p className="text-sm text-gray-600">
                  Playing with {activeSession.partner.name}
                </p>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{activeSession.progress.current_round}/{activeSession.progress.total_rounds}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeSession.progress.percentage}%` }}
                ></div>
              </div>
            </div>

            {renderGameInterface(activeSession)}
          </div>
        )}

        {/* Active Games */}
        {!activeSession && sessions.length > 0 && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Games</h2>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {session.game_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Playing with {session.partner.name}</p>
                        <p>Round {session.progress.current_round} of {session.progress.total_rounds}</p>
                        {session.is_user_turn && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Your turn
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-2 bg-gray-200 rounded-full mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${session.progress.percentage}%` }}
                        ></div>
                      </div>
                      <button
                        onClick={() => setActiveSession(session)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      >
                        {session.is_user_turn ? 'Play' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Selection */}
        {!activeSession && (
          <div className="bg-white rounded-lg p-6 border shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Start New Game</h2>
            
            {selectedGame ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {selectedGame.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    {getGameDescription(selectedGame)}
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => createGame(selectedGame)}
                    disabled={isCreating}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Starting...' : 'Start Game'}
                  </button>
                  <button
                    onClick={() => setSelectedGame(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedGame('you_or_me')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="text-2xl mb-2">👆</div>
                  <h3 className="font-medium text-gray-900">You or Me?</h3>
                  <p className="text-sm text-gray-600">
                    Quick questions about who's more likely to do what
                  </p>
                </button>
                
                <button
                  onClick={() => setSelectedGame('prompts')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="text-2xl mb-2">💭</div>
                  <h3 className="font-medium text-gray-900">Share & Reflect</h3>
                  <p className="text-sm text-gray-600">
                    Thoughtful prompts to share memories and feelings
                  </p>
                </button>
                
                <button
                  onClick={() => setSelectedGame('trivia')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors opacity-50 cursor-not-allowed"
                >
                  <div className="text-2xl mb-2">🧠</div>
                  <h3 className="font-medium text-gray-900">Trivia</h3>
                  <p className="text-sm text-gray-600">
                    Coming soon - Test how well you know each other
                  </p>
                </button>
                
                <button
                  onClick={() => setSelectedGame('compatibility_quiz')}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors opacity-50 cursor-not-allowed"
                >
                  <div className="text-2xl mb-2">💕</div>
                  <h3 className="font-medium text-gray-900">Compatibility</h3>
                  <p className="text-sm text-gray-600">
                    Coming soon - Discover your compatibility score
                  </p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!activeSession && sessions.length === 0 && (
          <div className="bg-white rounded-lg p-8 border shadow-sm text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No games yet</h3>
            <p className="text-gray-600 mb-4">
              Start your first game with your partner above!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getGameDescription(gameType: string): string {
  switch (gameType) {
    case 'you_or_me':
      return 'Quick 5-round game where you both guess who\'s more likely to do certain things. See if you match!'
    case 'prompts':
      return 'Share meaningful responses to thoughtful prompts. Take turns reflecting together.'
    case 'trivia':
      return 'Test how well you know each other with personalized questions.'
    case 'compatibility_quiz':
      return 'Answer questions about preferences and values to discover your compatibility score.'
    default:
      return 'A fun way to connect and learn more about each other.'
  }
}