// scripts/retrieve.ts — Agent-aware retrieval via Supabase RPC
import { config } from 'dotenv';
import path from 'path';

// Always load the project’s .env.local and override any exported shell vars
config({ path: path.resolve(process.cwd(), '.env.local'), override: true });


import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { AgentRelevanceScorer } from './lib/agent-scorer';

const KB_SCHEMA = (process.env.KB_SCHEMA || 'public').trim();
const KB_TABLE = (process.env.KB_TABLE || 'kb_chunks').trim();
const KB_TABLE_SHAPE = (process.env.KB_TABLE_SHAPE || 'simple').toLowerCase();

function normalizeEmbeddingModel(m?: string) {
  if (!m) return 'text-embedding-3-small';
  return m.replace(/^openai[/:]/i, '').replace(/^oai[/:]/i, '');
}
const EMBEDDING_MODEL = normalizeEmbeddingModel(process.env.EMBEDDING_MODEL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const scorer = new AgentRelevanceScorer();

type AgentType =
  | 'orchestrator' | 'pm' | 'architect' | 'rag'
  | 'backend' | 'frontend' | 'security' | 'qa';

export interface RetrievalQuery {
  query: string;
  agentType?: AgentType | string;
  limit?: number;
  contentTypes?: ('docs' | 'schema' | 'design')[];
  filePaths?: string[];
  pathPrefix?: string;
  minRelevance?: number;
}

export interface RetrievedChunk {
  content: string;
  contentType: string;
  filePath: string;
  sectionTitle?: string;
  chunkIndex?: number;
  tokens: number;
  agentRelevance: Record<string, number>;
  metadata: Record<string, any>;
}

export interface EmbeddingResult {
  id: string;
  similarity: number;
  relevanceScore?: number;
  chunk: RetrievedChunk;
}

export interface RetrievalResult {
  chunks: EmbeddingResult[];
  totalResults: number;
  processingTime: number;
  agentRelevanceApplied: boolean;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_MIN_REL = Number(process.env.MIN_RELEVANCE ?? '0.10');

async function generateQueryEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  return res.data[0].embedding;
}

// Add near the top-level helpers
function dedupeResults(results: EmbeddingResult[]): EmbeddingResult[] {
  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.chunk.filePath ?? ''}::${(r.chunk.content ?? '').slice(0,120)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Replace your old performSemanticSearch with this:
async function performSemanticSearch(
  queryEmbedding: number[],
  limit: number,
  contentTypes?: ('docs' | 'schema' | 'design')[],
  filePaths?: string[],
  pathPrefix?: string
): Promise<EmbeddingResult[]> {
  const minSim = Number(process.env.MIN_SIMILARITY ?? '0.10');

  const { data, error } = await supabase.rpc('match_kb_chunks_simple', {
    query_embedding: queryEmbedding as unknown as any,
    match_count: Math.max(limit, 10),  // slight overfetch is fine
    similarity_threshold: minSim,
    filter_paths: filePaths ?? null,
    filter_content_types: contentTypes ?? null,
    filter_path_prefix: pathPrefix ?? null
  });

  if (error) {
    throw new Error(`Semantic search failed: ${error.message}`);
  }
  if (!data?.length) return [];

  return data.map((row: any) => ({
    id: row.id,
    similarity: Number(row.similarity),
    chunk: {
      content: row.content,
      contentType: row.content_type || 'docs',
      filePath: row.path,            // <-- matches RPC
      sectionTitle: undefined,       // simple shape doesn't have it
      chunkIndex: 0,                 // simple shape doesn't have it
      tokenCount: row.tokens ?? 0,   // <-- map tokens -> tokenCount
      agentRelevance: {},            // none in simple shape
      metadata: {}                   // none in simple shape
    }
  }));
}

async function applyAgentRelevanceFiltering(
  results: EmbeddingResult[],
  agentType?: string,
  minRelevance?: number
): Promise<EmbeddingResult[]> {
  if (!agentType) return results;
  const threshold = minRelevance ?? DEFAULT_MIN_REL;

  const scored = results.map(r => {
    const pre = (r.chunk.agentRelevance ?? {})[agentType];
    const score = typeof pre === 'number'
      ? pre
      : (scorer.calculateRelevance(r.chunk.content, agentType) ?? 0.5);
    return { ...r, relevanceScore: score };
  });

  let filtered = scored.filter(r => (r.relevanceScore ?? 0) >= threshold);
  if (filtered.length === 0) {
    // relax once
   filtered = scored.filter(r => (r.relevanceScore ?? 0) >= Math.max(threshold / 2, 0.05));
  }
  // still empty? fall back to semantic top-k
  if (filtered.length === 0) return results;

  return filtered.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}

function rankResults(results: EmbeddingResult[]): EmbeddingResult[] {
  return results
    .map(r => {
      const semanticWeight = 0.7;
      const relevanceWeight = 0.3;
      const semanticScore = r.similarity ?? 0;
      const relevanceScore = r.relevanceScore ?? 0.5;
      (r as any).combinedScore = (semanticScore * semanticWeight) + (relevanceScore * relevanceWeight);
      return r;
    })
    .sort((a: any, b: any) => b.combinedScore - a.combinedScore);
}

export async function retrieveKnowledge(query: RetrievalQuery): Promise<RetrievalResult> {
  console.log('🔧 Using embedding model:', EMBEDDING_MODEL);
  console.log(`🔧 Using table: ${KB_SCHEMA}.${KB_TABLE} (shape: ${KB_TABLE_SHAPE})`);

  const start = Date.now();
  console.log(`🔍 Retrieving knowledge for: "${query.query}"`);
  console.log(`📋 Agent type: ${query.agentType || 'any'}`);

  const qEmbed = await generateQueryEmbedding(query.query);
  const semantic = await performSemanticSearch(qEmbed, query.limit ?? DEFAULT_LIMIT, query.contentTypes, query.filePaths, query.pathPrefix);
  console.log(`🔎 semantic hits: ${semantic.length}`);
  
  const filtered = await applyAgentRelevanceFiltering(
    semantic, query.agentType, query.minRelevance
  );
  console.log(`🧩 after agent filter: ${filtered.length}`);
  
  // const ranked = rankResults(filteredResults);
  // Replace with:
  const ranked = rankResults(dedupeResults(filtered));
  
  // And when slicing to the limit:
  const top = ranked.slice(0, query.limit ?? DEFAULT_LIMIT);

  const ms = Date.now() - start;
  console.log(`✅ Retrieved ${top.length} relevant chunks in ${ms}ms`);

  return {
    chunks: top,
    totalResults: top.length,
    processingTime: ms,
    agentRelevanceApplied: !!query.agentType
  };
}

export function formatRetrievalResults(
  result: RetrievalResult,
  opts: { showMetadata?: boolean; showScores?: boolean; maxContentLength?: number } = {}
): string {
  const { showMetadata = false, showScores = true, maxContentLength = 200 } = opts;

  let out = `\n📊 Retrieval Results\n`;
  out += `=${'='.repeat(50)}\n`;
  out += `🔍 Total chunks: ${result.totalResults}\n`;
  out += `⏱️  Processing time: ${result.processingTime}ms\n`;
  out += `🤖 Agent filtering: ${result.agentRelevanceApplied ? 'Applied' : 'None'}\n\n`;

  if (result.chunks.length === 0) return out + `❌ No relevant chunks found.\n`;

  for (let i = 0; i < result.chunks.length; i++) {
    const item = result.chunks[i];
    // Inside the loop that prints items
    const shortId = (item.id || '').toString().slice(0,8);
    const path = item.chunk.filePath || '(unknown)';
    out += `${i + 1}. 📄 ${path}  (#${shortId})\n`;
    if (showScores) {
      out += `   🎯 Similarity: ${(item.similarity || 0).toFixed(3)}`;
      if (item.relevanceScore !== undefined) out += ` | Relevance: ${item.relevanceScore.toFixed(3)}`;
      out += `\n`;
    }
    const text = item.chunk.content.replace(/\s+/g, ' ');
    const preview = text.length > maxContentLength ? text.slice(0, maxContentLength) + '…' : text;
    out += `   📝 ${preview}\n`;
    if (showMetadata && Object.keys(item.chunk.metadata || {}).length) {
      out += `   📋 Metadata: ${JSON.stringify(item.chunk.metadata)}\n`;
    }
    out += `\n`;
  }
  return out;
}

// CLI
async function runTestQueries(): Promise<void> {
  const tests: Array<{ query: string; agentType: AgentType }> = [
    { query: 'RLS policies for user data', agentType: 'security' },
    { query: 'React component design patterns', agentType: 'frontend' },
    { query: 'API endpoint authentication', agentType: 'backend' },
    { query: 'Zod schema validation', agentType: 'architect' },
    { query: 'Daily ritual workflow', agentType: 'orchestrator' },
    { query: 'User personalization features', agentType: 'rag' },
    { query: 'Test coverage and QA', agentType: 'qa' }
  ];

  console.log('🧪 Running test queries...\n');
  for (const t of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Query: "${t.query}"`);
    console.log(`🤖 Agent: ${t.agentType}`);
    console.log(`${'='.repeat(60)}`);
    try {
      const res = await retrieveKnowledge({ query: t.query, agentType: t.agentType, limit: 5 });
      console.log(formatRetrievalResults(res, { showScores: true, maxContentLength: 150 }));
    } catch (e) {
      console.error('❌ Test failed:', e);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) { await runTestQueries(); return; }

  const qi = args.indexOf('--query');
  if (qi === -1 || qi === args.length - 1) {
    console.log(`
🔍 Sparq Knowledge Retrieval

Usage:
  tsx scripts/retrieve.ts --test
  tsx scripts/retrieve.ts --query "search term" [options]

Options:
  --agent <type>     orchestrator, pm, architect, rag, backend, frontend, security, qa
  --limit <n>        max results (default 10)
  --min-rel <n>      min relevance score (default 0.10)
  --content-types <types>  comma-separated: docs,schema,design
  --path-prefix <prefix>   filter paths starting with prefix
`); return;
  }

  const query = args[qi + 1];
  const ai = args.indexOf('--agent');
  const li = args.indexOf('--limit');
  // parse flag
  const minRelFlag = args.indexOf('--min-rel');
  const minRel = minRelFlag !== -1 && minRelFlag < args.length -1 ? Number(args[minRelFlag+1]) : undefined;
  
  const contentTypesFlag = args.indexOf('--content-types');
  const contentTypesStr = contentTypesFlag !== -1 && contentTypesFlag < args.length - 1 ? args[contentTypesFlag + 1] : undefined;
  const contentTypes = contentTypesStr ? contentTypesStr.split(',') as ('docs' | 'schema' | 'design')[] : undefined;
  
  const pathPrefixFlag = args.indexOf('--path-prefix');
  const pathPrefix = pathPrefixFlag !== -1 && pathPrefixFlag < args.length - 1 ? args[pathPrefixFlag + 1] : undefined;

  const agentType: AgentType | undefined = ai !== -1 && ai < args.length - 1 ? (args[ai + 1] as AgentType) : undefined;
  const limit: number | undefined = li !== -1 && li < args.length - 1 ? parseInt(args[li + 1]) : undefined;

  try {
    // pass into retrieveKnowledge({ ..., minRelevance: minRel })
    const res = await retrieveKnowledge({ 
      query, 
      agentType, 
      limit, 
      minRelevance: minRel,
      contentTypes,
      pathPrefix
    });
    console.log(formatRetrievalResults(res, { showScores: true, showMetadata: !!agentType, maxContentLength: 300 }));
  } catch (e) {
    console.error('💥 Retrieval failed:', e);
    process.exit(1);
  }
}

if (require.main === module) main().catch((e) => { console.error('💥 Fatal error:', e); process.exit(1); });
