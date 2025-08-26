import { NextRequest, NextResponse } from 'next/server'
import { getOpenRouterClient } from '@/lib/openrouter'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Test endpoint only available in development' }, { status: 403 })
    }

    const client = getOpenRouterClient()
    
    const testRequest = {
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        {
          role: 'system' as const,
          content: 'You are a helpful assistant. Respond with a JSON object containing a success message and the current time.'
        },
        {
          role: 'user' as const,
          content: 'Test the AI connection for Sparq Connection personalization system.'
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
      response_format: { type: 'json_object' as const }
    }

    const response = await client.chat(testRequest)
    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response content')
    }

    const jsonResponse = JSON.parse(content)

    return NextResponse.json({
      success: true,
      ai_response: jsonResponse,
      model_used: 'anthropic/claude-3.5-sonnet',
      tokens_used: response.usage?.total_tokens,
      message: 'AI personalization system is working correctly!'
    })

  } catch (error) {
    console.error('AI test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'AI system test failed. Check OpenRouter API key and connectivity.'
    }, { status: 500 })
  }
}