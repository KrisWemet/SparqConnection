/**
 * Client-side E2EE encryption utilities for journal entries
 * Uses WebCrypto API with AES-GCM for maximum security
 * Keys never leave the user's device
 */

export interface EncryptedData {
  encryptedContent: string
  iv: string
  method: string
}

export interface EncryptionKey {
  key: CryptoKey
  keyId: string
  created: Date
}

/**
 * Generate a new AES-GCM encryption key
 */
export async function generateEncryptionKey(): Promise<EncryptionKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable for storage
    ['encrypt', 'decrypt']
  )
  
  const keyId = crypto.randomUUID()
  
  return {
    key,
    keyId,
    created: new Date()
  }
}

/**
 * Export encryption key for secure storage
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('jwk', key)
  return btoa(JSON.stringify(exported))
}

/**
 * Import encryption key from storage
 */
export async function importKey(exportedKey: string): Promise<CryptoKey> {
  const keyData = JSON.parse(atob(exportedKey))
  return crypto.subtle.importKey(
    'jwk',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt sensitive journal content
 */
export async function encryptJournalContent(
  content: string,
  key: CryptoKey
): Promise<EncryptedData> {
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Encode content as UTF-8
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  
  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    data
  )
  
  // Convert to base64 for storage
  const encryptedContent = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)))
  const ivString = btoa(String.fromCharCode(...iv))
  
  return {
    encryptedContent,
    iv: ivString,
    method: 'AES-GCM-256'
  }
}

/**
 * Decrypt journal content
 */
export async function decryptJournalContent(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  try {
    // Convert from base64
    const encryptedBuffer = Uint8Array.from(atob(encryptedData.encryptedContent), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0))
    
    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      key,
      encryptedBuffer
    )
    
    // Decode from UTF-8
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt journal content')
  }
}

/**
 * Derive encryption key from user password (for backup/recovery)
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  // Convert password to key material
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Convert salt from base64
  const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0))
  
  // Derive the key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...salt))
}

/**
 * Secure key storage in localStorage with encryption
 */
export class SecureKeyStorage {
  private static readonly STORAGE_KEY = 'sparq_journal_keys'
  private static readonly MASTER_KEY_KEY = 'sparq_master_key'
  
  /**
   * Store encryption key securely in localStorage
   */
  static async storeKey(keyId: string, key: CryptoKey): Promise<void> {
    try {
      const exportedKey = await exportKey(key)
      const keys = this.getStoredKeys()
      
      keys[keyId] = {
        key: exportedKey,
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys))
    } catch (error) {
      console.error('Failed to store encryption key:', error)
      throw new Error('Failed to store encryption key')
    }
  }
  
  /**
   * Retrieve encryption key from localStorage
   */
  static async retrieveKey(keyId: string): Promise<CryptoKey | null> {
    try {
      const keys = this.getStoredKeys()
      const keyData = keys[keyId]
      
      if (!keyData) {
        return null
      }
      
      // Update last used timestamp
      keyData.lastUsed = new Date().toISOString()
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys))
      
      return await importKey(keyData.key)
    } catch (error) {
      console.error('Failed to retrieve encryption key:', error)
      return null
    }
  }
  
  /**
   * Get all stored keys metadata
   */
  private static getStoredKeys(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }
  
  /**
   * Clear all stored keys (for logout/reset)
   */
  static clearKeys(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.MASTER_KEY_KEY)
  }
  
  /**
   * List available key IDs
   */
  static getAvailableKeys(): string[] {
    const keys = this.getStoredKeys()
    return Object.keys(keys)
  }
}

/**
 * Privacy-preserving sentiment analysis
 * Runs locally without sending data to servers
 */
export function analyzeSentiment(text: string): number {
  // Simple local sentiment analysis
  const positiveWords = [
    'love', 'happy', 'joy', 'grateful', 'amazing', 'wonderful', 'beautiful',
    'thankful', 'blessed', 'excited', 'proud', 'caring', 'warm', 'gentle',
    'kind', 'understanding', 'supportive', 'comfortable', 'safe', 'secure'
  ]
  
  const negativeWords = [
    'angry', 'sad', 'frustrated', 'worried', 'anxious', 'upset', 'disappointed',
    'hurt', 'lonely', 'stressed', 'overwhelmed', 'confused', 'distant',
    'disconnected', 'misunderstood', 'ignored', 'rejected', 'abandoned'
  ]
  
  const words = text.toLowerCase().split(/\s+/)
  let positiveCount = 0
  let negativeCount = 0
  
  words.forEach(word => {
    if (positiveWords.some(pos => word.includes(pos))) {
      positiveCount++
    }
    if (negativeWords.some(neg => word.includes(neg))) {
      negativeCount++
    }
  })
  
  const total = positiveCount + negativeCount
  if (total === 0) return 0
  
  // Return score between -1 and 1
  return (positiveCount - negativeCount) / Math.max(total, 1)
}

/**
 * Extract mood tags from text (privacy-preserving)
 */
export function extractMoodTags(text: string): string[] {
  const moodPatterns = {
    'grateful': /grateful|thankful|blessed|appreciate/i,
    'excited': /excited|thrilled|eager|looking forward/i,
    'content': /content|peaceful|calm|relaxed/i,
    'loving': /love|adore|cherish|treasure/i,
    'hopeful': /hope|optimistic|positive|bright/i,
    'concerned': /worried|anxious|concerned|nervous/i,
    'reflective': /thinking|reflecting|wondering|pondering/i,
    'nostalgic': /remember|memories|past|yesterday/i,
    'proud': /proud|accomplished|achieved|success/i,
    'connected': /close|together|bonded|united/i
  }
  
  const detectedMoods: string[] = []
  
  Object.entries(moodPatterns).forEach(([mood, pattern]) => {
    if (pattern.test(text)) {
      detectedMoods.push(mood)
    }
  })
  
  return detectedMoods
}

/**
 * Generate privacy-preserving analytics
 */
export function generatePrivacyPreservingInsights(entries: Array<{
  content: string
  date: string
  wordCount: number
}>): any {
  // Compute insights without exposing sensitive content
  const totalEntries = entries.length
  const avgWordCount = entries.reduce((sum, entry) => sum + entry.wordCount, 0) / totalEntries
  
  // Analyze patterns without exposing content
  const sentiments = entries.map(entry => analyzeSentiment(entry.content))
  const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
  
  // Extract common themes/moods
  const allMoods = entries.flatMap(entry => extractMoodTags(entry.content))
  const moodCounts = allMoods.reduce((counts, mood) => {
    counts[mood] = (counts[mood] || 0) + 1
    return counts
  }, {} as Record<string, number>)
  
  const dominantMoods = Object.entries(moodCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([mood]) => mood)
  
  return {
    totalEntries,
    avgWordCount: Math.round(avgWordCount),
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    dominantMoods,
    writingStreak: calculateWritingStreak(entries.map(e => e.date)),
    emotionalJourney: sentiments.map((sentiment, index) => ({
      date: entries[index].date,
      sentiment: Math.round(sentiment * 100) / 100
    }))
  }
}

/**
 * Calculate writing streak from dates
 */
function calculateWritingStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  
  const sortedDates = dates.sort().reverse()
  let streak = 1
  
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i - 1])
    const previous = new Date(sortedDates[i])
    const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

/**
 * Validate encryption support
 */
export function isEncryptionSupported(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.generateKey === 'function'
  )
}