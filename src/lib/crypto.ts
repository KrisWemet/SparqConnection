import { createHash, randomBytes } from 'crypto'

/**
 * Secure token utilities for invitations and other sensitive operations
 */

export interface SecureToken {
  token: string
  hash: string
  expiresAt: Date
}

/**
 * Generate a secure token for invitations
 * Returns both the token (for URLs) and its hash (for database storage)
 */
export function generateSecureInviteToken(expirationHours: number = 168): SecureToken { // 7 days default
  // Generate a secure random token (32 bytes = 256 bits)
  const tokenBytes = randomBytes(32)
  const token = tokenBytes.toString('base64url') // URL-safe base64 encoding
  
  // Create a hash for database storage (never store the raw token)
  const hash = createHash('sha256').update(token).digest('hex')
  
  // Set expiration
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expirationHours)
  
  return {
    token,
    hash,
    expiresAt
  }
}

/**
 * Hash a token for database lookup
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Generate a user-friendly 6-digit code (for manual entry fallback)
 */
export function generateInviteCode(): string {
  // Generate a secure 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  return code
}

/**
 * Validate token format
 */
export function isValidTokenFormat(token: string): boolean {
  // Base64url tokens should be 43 characters long for 32 bytes
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix?: string): string {
  const key = randomBytes(32).toString('base64url')
  return prefix ? `${prefix}_${key}` : key
}

/**
 * Time-safe string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}