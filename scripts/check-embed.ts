import { config } from 'dotenv';
config({ path: '.env.local' });
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Sparq Embed Check'
  }
});

// Try different embedding models that OpenRouter supports
const MODELS = [
  'text-embedding-3-small',
  'openai/text-embedding-3-small', 
  'text-embedding-ada-002',
  'openai/text-embedding-ada-002'
];
const MODEL = process.env.EMBEDDING_MODEL ?? MODELS[0];

(async () => {
  console.log('API Key:', process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...');
  console.log('Base URL:', process.env.OPENROUTER_BASE_URL);
  console.log('Model:', MODEL);
  
  // First, test if OpenRouter API key is valid with a chat completion
  console.log('\n--- Testing API key validity with chat completion ---');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Sparq API Test'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })
    });
    
    const text = await response.text();
    console.log('Chat API Status:', response.status);
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log('✅ API key is valid for chat completions');
      } catch (parseErr) {
        console.log('❌ Chat API returned HTML instead of JSON');
      }
    } else if (response.status === 401) {
      console.log('❌ API key is invalid (401 Unauthorized)');
    } else {
      console.log(`❌ Chat API failed with status ${response.status}`);
      console.log('Response:', text.substring(0, 200) + '...');
    }
  } catch (e: any) {
    console.error('Chat API test failed:', e.message);
  }

  // Test embeddings API
  console.log('\n--- Testing embeddings API ---');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Sparq Embed Check'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: 'hello world'
      })
    });
    
    const text = await response.text();
    console.log('Embeddings Status:', response.status);
    
    if (response.status === 404) {
      console.log('❌ OpenRouter does not support /embeddings endpoint (404)');
    } else if (response.status === 200 && text.includes('<!DOCTYPE')) {
      console.log('❌ OpenRouter embeddings API returns HTML (likely not implemented)');
    } else if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        const dim = data?.data?.[0]?.embedding?.length;
        console.log(`✅ Embeddings API works! Dimension: ${dim}`);
      } catch (parseErr) {
        console.log('❌ Embeddings API returned invalid JSON');
      }
    } else {
      console.log(`❌ Embeddings API failed with status ${response.status}`);
      console.log('Response:', text.substring(0, 100) + '...');
    }
  } catch (e: any) {
    console.error('Embeddings API test failed:', e.message);
  }
  
  console.log('\n--- Testing with OpenAI client ---');
  try {
    const r: any = await client.embeddings.create({
      model: MODEL,
      input: 'hello world'
    });
    const dim = r?.data?.[0]?.embedding?.length;
    console.log('Model:', MODEL, 'Dimension:', dim, 'RawOK:', Array.isArray(r?.data));
    if (!dim) {
      console.log('Full response:');
      console.dir(r, { depth: 5 });
      process.exit(2);
    }
  } catch (e: any) {
    console.error('Embedding request failed:', e?.message ?? e);
    if (e?.status || e?.response) {
      console.log('Full error:');
      console.dir(e, { depth: 5 });
    }
    process.exit(1);
  }
})();