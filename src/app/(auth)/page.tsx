'use client'

import { useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import Link from 'next/link'

export default function AuthPage() {
  const { user, loading } = useSupabase()

  useEffect(() => {
    if (!loading && user) {
      // User is already logged in, redirect to today
      window.location.href = '/today'
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Sparq
        </h2>
        <p className="text-gray-600 mb-8">
          5-8 minutes daily to build stronger, kinder relationships
        </p>
        
        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full bg-pink-600 text-white py-3 px-4 rounded-md font-medium hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors text-center"
          >
            Get Started
          </Link>
          
          <Link
            href="/login"
            className="block w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors text-center"
          >
            Sign In
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t text-sm text-gray-500">
          <p>✨ Daily connection rituals</p>
          <p>🌱 Build stronger bonds</p>
          <p>💝 Made for couples who care</p>
        </div>
      </div>
    </div>
  )
}