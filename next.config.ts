import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Exclude Supabase functions from Next.js dev watching
  webpack: (config, { dev }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    }

    // In some environments, watchOptions.ignored is not an array.
    // Also, watchOptions only matters in dev, so guard on dev.
    if (dev) {
      const prevIgnored: unknown = (config.watchOptions as any)?.ignored
      const ignoredArray = Array.isArray(prevIgnored)
        ? prevIgnored
        : prevIgnored
        ? [prevIgnored]
        : []

      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [...ignoredArray, /supabase\/functions/],
      } as any
    }

    return config
  },
}

export default nextConfig
