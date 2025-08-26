import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()

  // Define protected routes (routes that require authentication)
  const protectedPaths = ['/today', '/home', '/onboarding', '/identity', '/notes', '/saves', '/settings', '/connections', '/play', '/billing']
  
  // Define premium routes (require premium subscription)
  const premiumPaths = ['/premium', '/advanced-quests', '/custom-identity']
  
  // Define ultimate routes (require ultimate subscription)  
  const ultimatePaths = ['/coaching', '/workshops', '/insights']
  
  // Define auth routes (routes that redirect to /today if already authenticated)
  const authPaths = ['/auth', '/login', '/signup']

  const isProtectedRoute = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  const isPremiumRoute = premiumPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  const isUltimateRoute = ultimatePaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )
  
  const isAuthRoute = authPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
  )

  // Redirect unauthenticated users from protected routes to auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth pages to appropriate destination
  if (isAuthRoute && user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('user_id', user.id)
        .single()
      const redirectUrl = new URL(profile?.onboarded_at ? '/home' : '/onboarding', request.url)
      return NextResponse.redirect(redirectUrl)
    } catch {
      const redirectUrl = new URL('/home', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Subscription enforcement for premium/ultimate routes
  if ((isPremiumRoute || isUltimateRoute) && user) {
    try {
      // Get user's subscription status
      const { data: subscriptionData } = await supabase
        .rpc('get_user_subscription_status', { user_id: user.id })

      const subscriptionStatus = subscriptionData?.[0] || {
        tier: 'free',
        is_active: false
      }

      // Check if user has required subscription level
      const hasRequiredAccess = isUltimateRoute
        ? subscriptionStatus.tier === 'ultimate' && subscriptionStatus.is_active
        : (subscriptionStatus.tier === 'premium' || subscriptionStatus.tier === 'ultimate') && subscriptionStatus.is_active

      if (!hasRequiredAccess) {
        // Redirect to pricing page with upgrade prompt
        const redirectUrl = new URL('/pricing', request.url)
        redirectUrl.searchParams.set('upgrade', isUltimateRoute ? 'ultimate' : 'premium')
        redirectUrl.searchParams.set('return_to', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Error checking subscription status in middleware:', error)
      // On error, redirect to pricing page to be safe
      const redirectUrl = new URL('/pricing', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Onboarding gating for authenticated users only
  if (user) {
    const bypassOnboarding = process.env.NEXT_PUBLIC_BYPASS_ONBOARDING === '1' || process.env.NODE_ENV === 'development'
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('user_id', user.id)
        .single()

      const onboarded = bypassOnboarding ? true : !!profile?.onboarded_at

      // Root: send authenticated users to the right place
      if (request.nextUrl.pathname === '/') {
        const redirectUrl = new URL(onboarded ? '/home' : '/onboarding', request.url)
        return NextResponse.redirect(redirectUrl)
      }

      // If trying to access /today or /home without onboarding
      if (!onboarded && (request.nextUrl.pathname.startsWith('/today') || request.nextUrl.pathname.startsWith('/home'))) {
        const redirectUrl = new URL('/onboarding', request.url)
        return NextResponse.redirect(redirectUrl)
      }

      // If onboarded and accessing /onboarding, send to /home
      if (onboarded && request.nextUrl.pathname.startsWith('/onboarding')) {
        const redirectUrl = new URL('/home', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (e) {
      // If profile fetch fails, fall through
    }
  }

  // Allow unauthenticated users to access the public landing page at '/'

  // Allow public landing at '/'

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
