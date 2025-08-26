// lib/openrouter.ts
import { trackEvent } from './analytics'

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
}

export interface OpenRouterRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  max_tokens?: number
  response_format?: { type: 'json_object' }
}

export interface ModelConfig {
  id: string
  temperature: number
  max_tokens: number
  fallbacks: string[]
}

// Model configurations based on AI_MODELS.md
export const AI_MODELS = {
  personalizer: {
    id: 'anthropic/claude-3.5-sonnet',
    temperature: 0.3,
    max_tokens: 320,
    fallbacks: ['openai/gpt-4o-mini', 'deepseek/deepseek-chat']
  },
  tip_coach: {
    id: 'openai/gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 120,
    fallbacks: ['google/gemini-1.5-flash', 'deepseek/deepseek-chat']
  },
  content_ops: {
    id: 'anthropic/claude-3.5-sonnet',
    temperature: 0.3,
    max_tokens: 1000,
    fallbacks: ['openai/gpt-4o']
  }
} as const

export type ModelType = keyof typeof AI_MODELS

export class OpenRouterClient {
  private baseUrl = 'https://openrouter.ai/api/v1'
  private apiKey: string
  private appName: string

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required')
    }
    this.apiKey = apiKey
    this.appName = process.env.OPENROUTER_APP_NAME || 'sparq-connection'
  }

  async chat(
    request: OpenRouterRequest,
    options: {
      timeout?: number
      retries?: number
    } = {}
  ): Promise<OpenRouterResponse> {
    const { timeout = 30000, retries = 2 } = options
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now()
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://sparq-connection.app',
            'X-Title': this.appName,
          },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(timeout)
        })

        const latency = Date.now() - startTime

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json() as OpenRouterResponse
        
        // Track successful API call
        trackEvent('openrouter_api_success', {
          model: request.model,
          attempt: attempt + 1,
          latency_ms: latency,
          prompt_tokens: data.usage?.prompt_tokens,
          completion_tokens: data.usage?.completion_tokens,
          total_tokens: data.usage?.total_tokens
        })

        return data

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Track API error
        trackEvent('openrouter_api_error', {
          model: request.model,
          attempt: attempt + 1,
          error_message: lastError.message,
          is_timeout: lastError.name === 'TimeoutError'
        })

        // Don't retry on final attempt
        if (attempt === retries) break
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError || new Error('All OpenRouter API attempts failed')
  }

  async chatWithFallback(
    modelType: ModelType,
    messages: OpenRouterRequest['messages'],
    options: {
      response_format?: { type: 'json_object' }
      timeout?: number
    } = {}
  ): Promise<{ response: OpenRouterResponse; modelUsed: string }> {
    const config = AI_MODELS[modelType]
    const modelsToTry = [config.id, ...config.fallbacks]

    for (const modelId of modelsToTry) {
      try {
        const request: OpenRouterRequest = {
          model: modelId,
          messages,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          ...options
        }

        const response = await this.chat(request, { timeout: options.timeout })
        
        // Track successful model usage
        trackEvent('ai_model_success', {
          model_type: modelType,
          model_used: modelId,
          was_fallback: modelId !== config.id
        })

        return { response, modelUsed: modelId }

      } catch (error) {
        console.error(`Model ${modelId} failed:`, error)
        
        // Track model failure
        trackEvent('ai_model_failed', {
          model_type: modelType,
          model_attempted: modelId,
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })

        // Continue to next fallback model
        continue
      }
    }

    // All models failed
    trackEvent('ai_all_models_failed', {
      model_type: modelType,
      models_attempted: modelsToTry
    })

    throw new Error(`All models failed for ${modelType}: ${modelsToTry.join(', ')}`)
  }
}

// Singleton instance
let client: OpenRouterClient | null = null

export function getOpenRouterClient(): OpenRouterClient {
  if (!client) {
    client = new OpenRouterClient()
  }
  return client
}