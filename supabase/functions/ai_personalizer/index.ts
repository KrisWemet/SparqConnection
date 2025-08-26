// supabase/functions/ai_personalizer/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Model ladder configuration
const MODEL_LADDER = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o-mini', 
  'deepseek/deepseek-chat'
]

const SYSTEM_PROMPT = `You are the **Sparq Personalizer**. Adapt wording tenderly and playfully (when mode = Play), but never change therapeutic intent. No trauma/diagnosis. Output **ONLY JSON** matching \`DailyPlanSchema\`. If any constraint fails (unsafe topic, schema mismatch, token overrun), output the canonical fallback provided.

**Constraints**
* Temperature ≤ 0.3, max_tokens ≤ 320.
* Forbidden topic examples: trauma processing, abuse inventories, diagnoses.
* Use user IANA timezone date.`

interface ModelMeta {
  provider: string
  model: string
  latency_ms: number
  status: 'success' | 'error' | 'fallback'
  cost_cents?: number
}

async function callOpenRouter(model: string, userPrompt: string, maxRetries = 3): Promise<{ response: unknown, meta: ModelMeta }> {
  const startTime = Date.now()
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY')
  
  if (!openrouterKey) {
    throw new Error('OPENROUTER_API_KEY not found')
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Sparq Connection AI Personalizer'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 320,
          response_format: { type: 'json_object' }
        })
      })

      const latency = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenRouter API error (${response.status}):`, errorText)
        
        if (attempt === maxRetries - 1) {
          return {
            response: null,
            meta: {
              provider: 'openrouter',
              model: model,
              latency_ms: latency,
              status: 'error'
            }
          }
        }
        continue
      }

      const data = await response.json()
      
      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenRouter')
      }

      // Try to parse the JSON response
      let parsedContent
      try {
        parsedContent = JSON.parse(data.choices[0].message.content)
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', data.choices[0].message.content)
        throw parseError
      }

      return {
        response: parsedContent,
        meta: {
          provider: 'openrouter',
          model: model,
          latency_ms: latency,
          status: 'success',
          cost_cents: data.usage ? estimateCost(model, data.usage) : undefined
        }
      }

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed for model ${model}:`, error)
      
      if (attempt === maxRetries - 1) {
        return {
          response: null,
          meta: {
            provider: 'openrouter',
            model: model,
            latency_ms: Date.now() - startTime,
            status: 'error'
          }
        }
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  throw new Error('All attempts failed')
}

function estimateCost(model: string, usage: unknown): number {
  // Rough cost estimates in cents per 1k tokens
  const costs: Record<string, { input: number, output: number }> = {
    'anthropic/claude-3.5-sonnet': { input: 0.3, output: 1.5 },
    'openai/gpt-4o-mini': { input: 0.015, output: 0.06 },
    'deepseek/deepseek-chat': { input: 0.014, output: 0.028 }
  }

  const modelCost = costs[model] || { input: 0.1, output: 0.1 }
  const usageObj = usage as { prompt_tokens?: number; completion_tokens?: number } | undefined
  const inputTokens = usageObj?.prompt_tokens || 0
  const outputTokens = usageObj?.completion_tokens || 0
  
  return ((inputTokens / 1000) * modelCost.input) + ((outputTokens / 1000) * modelCost.output)
}

async function tryModelLadder(userPrompt: string): Promise<{ response: unknown, meta: ModelMeta }> {
  for (const model of MODEL_LADDER) {
    console.log(`Trying model: ${model}`)
    
    const result = await callOpenRouter(model, userPrompt)
    
    if (result.meta.status === 'success' && result.response) {
      return result
    }
    
    console.log(`Model ${model} failed, trying next...`)
  }
  
  // All models failed
  throw new Error('All models in ladder failed')
}

function validateDailyPlan(plan: unknown): boolean {
  // Basic validation - in production you'd use Zod schema validation
  const required = ['date', 'identity', 'story', 'dq', 'micro_action', 'journal', 'reflection', 'version']
  const planObj = plan as Record<string, unknown>
  
  for (const field of required) {
    if (!planObj[field]) {
      console.error(`Missing required field: ${field}`)
      return false
    }
  }
  
  // Check string length constraints
  if ((planObj.story as string)?.length > 500 || (planObj.dq as string)?.length > 240 || 
      (planObj.micro_action as string)?.length > 240 || (planObj.journal as string)?.length > 240 ||
      (planObj.reflection as string)?.length > 240) {
    console.error('String length constraints violated')
    return false
  }
  
  return true
}

function createCanonicalFallback(canonicalDay: Record<string, unknown>, userProfile: Record<string, unknown>): Record<string, unknown> {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
  return {
    date: today,
    identity: userProfile.identity || 'Mindful Partner',
    story: canonicalDay.story || 'A moment of connection between partners.',
    dq: canonicalDay.dq || 'What small gesture would feel meaningful today?',
    micro_action: canonicalDay.micro_action || 'Share one thing you appreciate about your partner.',
    journal: canonicalDay.journal || 'How did expressing appreciation feel?',
    reflection: canonicalDay.reflection || 'What connection did you notice today?',
    appreciation_templates: [
      'I noticed how you [specific thing] and it made me feel [emotion].',
      'Thank you for [action]. It really helped me [impact].'
    ],
    tags: canonicalDay.tags || ['light', 'words'],
    version: 1
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const requestData = await req.json()
    const { CANONICAL_DAY, USER_PROFILE, QUEST, RECENT, VERSION } = requestData

    if (!CANONICAL_DAY || !USER_PROFILE) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: CANONICAL_DAY, USER_PROFILE' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build user prompt
    const userPrompt = JSON.stringify({
      CANONICAL_DAY,
      USER_PROFILE, 
      QUEST: QUEST || { id: 'default', title: 'Daily Connection', day: 1 },
      RECENT: RECENT || { micro_done: false, streak: 0 },
      VERSION: VERSION || 1,
      SCHEMA: 'DailyPlanSchema'
    })

    let result
    let meta: ModelMeta

    try {
      // Try AI personalization
      const aiResult = await tryModelLadder(userPrompt)
      result = aiResult.response
      meta = aiResult.meta

      // Validate the AI response
      if (!validateDailyPlan(result)) {
        throw new Error('AI response failed validation')
      }

    } catch (error) {
      console.error('AI personalization failed, using canonical fallback:', error)
      
      // Create canonical fallback
      result = createCanonicalFallback(CANONICAL_DAY, USER_PROFILE)
      meta = {
        provider: 'canonical',
        model: 'fallback',
        latency_ms: 0,
        status: 'fallback'
      }
    }

    // Return the personalized or canonical plan
    return new Response(
      JSON.stringify({
        plan: result,
        model_meta: meta,
        source: meta.status === 'success' ? 'ai' : 'canonical'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})