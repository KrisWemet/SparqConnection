// scripts/index.ts - Knowledge Base Embedding Pipeline (OpenAI + Supabase)
// - Uses OpenAI embeddings
// - No DB DDL here (avoid missing execute_sql). Create tables via SQL once.
// - Can write to either a "rich" table (public.knowledge_embeddings) or a simple table (ai.kb_chunks)
//   Configure with env: KB_SCHEMA, KB_TABLE, KB_TABLE_SHAPE=("rich"|"simple")

import { config } from 'dotenv';

// Always load the project’s .env.local and override any exported shell vars
config({ path: path.resolve(process.cwd(), '.env.local'), override: true });


import { createClient } from '@supabase/supabase-js';
import { glob } from 'glob';
import { promises as fs } from 'fs';
import path from 'path';
import OpenAI from 'openai';

import { DocumentChunker } from './lib/chunker';
import { AgentRelevanceScorer } from './lib/agent-scorer';
import type { DocumentChunk, ProcessingStats } from './lib/types';

// ---------- Env / Config ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function normalizeEmbeddingModel(m?: string) {
  if (!m) return 'text-embedding-3-small';
  // strip common vendor prefixes that cause "invalid model ID" on OpenAI
  return m.replace(/^openai[/:]/i, '').replace(/^oai[/:]/i, '');
}

const EMBEDDING_MODEL = normalizeEmbeddingModel(process.env.EMBEDDING_MODEL);
console.log('🔧 Using embedding model:', EMBEDDING_MODEL);
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

// where to write embeddings
const KB_SCHEMA = process.env.KB_SCHEMA ?? 'public';
const KB_TABLE = process.env.KB_TABLE ?? 'knowledge_embeddings';
// "rich" = columns like content_type, file_path, section_title, chunk_index, agent_relevance, metadata
// "simple" = columns like path, content, content_type, tokens, embedding
const KB_TABLE_SHAPE: 'rich' | 'simple' =
  (process.env.KB_TABLE_SHAPE as 'rich' | 'simple') ?? 'rich';

// batching / rate limits
const BATCH_SIZE = 10;          // docs processed per batch
const RATE_LIMIT_DELAY = 1000;  // ms between embedding API batches

// ---------- Clients ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

const chunker = new DocumentChunker({
  maxTokens: 800,
  overlapTokens: 100,
  preserveSections: true,
  minChunkSize: 50
});

const scorer = new AgentRelevanceScorer();

// ---------- Types ----------
interface IndexingConfig {
  includeDocs: boolean;
  includeSchemas: boolean;
  includeDesign: boolean;
  recreateTable: boolean; // ignored here (no DDL in this script)
  verbose: boolean;
}

// ---------- Main ----------
async function main() {
  const cfg: IndexingConfig = {
    includeDocs: true,
    includeSchemas: true,
    includeDesign: false,
    recreateTable: process.argv.includes('--recreate'),
    verbose: process.argv.includes('--verbose')
  };

  console.log('🚀 Starting Sparq Knowledge Base Indexing');
  console.log('Configuration:', {
    ...cfg,
    KB_SCHEMA,
    KB_TABLE,
    KB_TABLE_SHAPE,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS
  });

  const stats: ProcessingStats = {
    totalFiles: 0,
    totalChunks: 0,
    processingTime: 0,
    embeddingCost: 0,
    errors: []
  };
  const startTime = Date.now();

  try {
    // We **do not** create/alter tables here. Ensure your table exists up-front.
    console.log(`🗄️  Using ${KB_SCHEMA}.${KB_TABLE} (shape: ${KB_TABLE_SHAPE})`);

    const files = await discoverFiles(cfg);
    stats.totalFiles = files.length;
    console.log(`📁 Found ${files.length} files to process`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(
        `\n📝 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}`
      );

      const batchStats = await processBatch(batch, cfg);
      stats.totalChunks += batchStats.totalChunks;
      stats.embeddingCost += batchStats.embeddingCost;
      stats.errors.push(...batchStats.errors);

      if (i + BATCH_SIZE < files.length) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    stats.processingTime = Date.now() - startTime;
    displayResults(stats);
  } catch (err) {
    console.error('❌ Indexing failed:', err);
    stats.errors.push(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ---------- File Discovery ----------
async function discoverFiles(config: IndexingConfig): Promise<Array<{
  path: string; contentType: 'docs' | 'schema' | 'design';
}>> {
  const files: Array<{ path: string; contentType: 'docs' | 'schema' | 'design' }> = [];

  if (config.includeDocs) {
    const docFiles = await glob('docs/**/*.md', { cwd: process.cwd(), absolute: true });
    files.push(...docFiles.map(p => ({ path: p, contentType: 'docs' as const })));
  }

  if (config.includeSchemas) {
    const schemaFiles = await glob('src/lib/schemas.ts', { cwd: process.cwd(), absolute: true });
    files.push(...schemaFiles.map(p => ({ path: p, contentType: 'schema' as const })));

    const agentSchemaFiles = await glob('orchestrator/schemas/**/*.ts', {
      cwd: process.cwd(),
      absolute: true
    }).catch(() => [] as string[]); // orchestrator dir might not exist
    files.push(...agentSchemaFiles.map(p => ({ path: p, contentType: 'schema' as const })));
  }

  if (config.includeDesign) {
    const designFiles = await glob('design/**/*', { cwd: process.cwd(), absolute: true });
    files.push(...designFiles.map(p => ({ path: p, contentType: 'design' as const })));
  }

  // filter big/binary
  const filtered: Array<{ path: string; contentType: 'docs' | 'schema' | 'design' }> = [];
  for (const f of files) {
    try {
      const st = await fs.stat(f.path);
      if (st.size > 1024 * 1024) {
        console.warn(`⚠️  Skipping large file: ${f.path} (${Math.round(st.size / 1024)}KB)`);
        continue;
      }
      filtered.push(f);
    } catch {
      console.warn(`⚠️  Cannot access file: ${f.path}`);
    }
  }
  return filtered;
}

// ---------- Batch / File Processing ----------
async function processBatch(
  files: Array<{ path: string; contentType: 'docs' | 'schema' | 'design' }>,
  config: IndexingConfig
): Promise<ProcessingStats> {
  const stats: ProcessingStats = {
    totalFiles: files.length,
    totalChunks: 0,
    processingTime: 0,
    embeddingCost: 0,
    errors: []
  };

  for (const file of files) {
    try {
      console.log(`  📄 Processing: ${path.relative(process.cwd(), file.path)}`);
      const st = await processFile(file.path, file.contentType, config);
      stats.totalChunks += st.totalChunks;
      stats.embeddingCost += st.embeddingCost;
      stats.errors.push(...st.errors);
      if (config.verbose) console.log(`    ✅ Generated ${st.totalChunks} chunks`);
    } catch (err) {
      const msg = `Failed to process ${file.path}: ${err}`;
      console.error(`    ❌ ${msg}`);
      stats.errors.push(msg);
    }
  }
  return stats;
}

async function processFile(
  filePath: string,
  contentType: 'docs' | 'schema' | 'design',
  _config: IndexingConfig
): Promise<ProcessingStats> {
  const stats: ProcessingStats = {
    totalFiles: 1,
    totalChunks: 0,
    processingTime: 0,
    embeddingCost: 0,
    errors: []
  };

  // read file
  const content = await fs.readFile(filePath, 'utf-8');
  if (content.trim().length === 0) return stats;

  // chunk
  const relativePath = path.relative(process.cwd(), filePath);
  const chunks = await chunker.chunkDocument(content, relativePath, contentType);
  if (chunks.length === 0) return stats;

  // agent relevance (kept in memory; only stored when using "rich" table)
  for (const c of chunks) {
    c.agentRelevance = scorer.calculateAllAgentRelevance(c.content);
  }

  // embeddings
  const embedded = await generateEmbeddings(chunks);
  stats.embeddingCost += estimateEmbeddingCost(embedded);

  // store
  await storeChunks(embedded);
  stats.totalChunks = embedded.length;

  return stats;
}

// ---------- Embeddings ----------
async function generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
  const out: DocumentChunk[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    try {
      const inputs = batch.map(c => c.content);

      // Try batched embeddings first
      let rows: any[] = [];
      try {
        const resp: any = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: inputs
        });
        rows = Array.isArray(resp?.data) ? resp.data : [];
      } catch (e: any) {
        console.error(`Embedding API error for batch @${i}:`, e?.message ?? e);
      }

      if (!Array.isArray(rows) || rows.length !== batch.length) {
        // Fallback: per-item requests
        console.warn(
          `Embedding count mismatch (got ${rows?.length ?? 0}, expected ${batch.length}). Falling back to per-item.`
        );

        for (const c0 of batch) {
          try {
            const r: any = await openai.embeddings.create({
              model: EMBEDDING_MODEL,
              input: c0.content
            });
            const emb = r?.data?.[0]?.embedding as number[] | undefined;
            if (emb?.length) out.push({ ...c0, embedding: emb });
          } catch (ee: any) {
            console.error('Per-item embedding failed:', ee?.message ?? ee);
          }
          // tiny spacing for rate limit friendliness
          await sleep(80);
        }
      } else {
        // Normal: 1:1 mapping
        for (let j = 0; j < batch.length; j++) {
          const emb = rows[j]?.embedding as number[] | undefined;
          if (emb?.length) out.push({ ...batch[j], embedding: emb });
        }
      }

      if (i + BATCH_SIZE < chunks.length) await sleep(200);
    } catch (err) {
      console.error(`Failed to generate embeddings for batch starting at ${i}:`, err);
      // skip this batch
    }
  }

  return out;
}
// ---------- Storage ----------
async function storeChunks(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  const table = supabase.schema(KB_SCHEMA).from(KB_TABLE);

  if (KB_TABLE_SHAPE === 'rich') {
    // expects columns:
    // content, content_type, file_path, section_title, chunk_index, token_count, embedding, agent_relevance, metadata
    const rows = chunks.map(c => ({
      content: c.content,
      content_type: c.contentType,
      file_path: c.filePath,
      section_title: c.sectionTitle ?? null,
      chunk_index: c.chunkIndex,
      token_count: c.tokenCount,
      embedding: `[${(c.embedding ?? []).join(',')}]`,
      agent_relevance: c.agentRelevance ?? {},
      metadata: c.metadata ?? {}
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await table.upsert(batch, {
        onConflict: 'file_path,chunk_index',
        ignoreDuplicates: false
      });
      if (error) throw new Error(`Failed to store chunk batch: ${error.message}`);
    }
  } else {
    // "simple" table shape: ai.kb_chunks with columns:
    // id (uuid default), path (text), content (text), content_type (text), tokens (int), embedding (vector)
    const rows = chunks.map(c => ({
      path: c.filePath,
      content: c.content,
      content_type: c.contentType,
      tokens: c.tokenCount,
      embedding: `[${(c.embedding ?? []).join(',')}]`
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await table.insert(batch);
      if (error) throw new Error(`Failed to store chunk batch: ${error.message}`);
    }
  }
}

// ---------- Utils ----------
function estimateEmbeddingCost(chunks: DocumentChunk[]): number {
  // OpenAI text-embedding-3-small pricing: $0.00002 per 1K tokens
  const totalTokens = chunks.reduce((sum, c) => sum + (c.tokenCount ?? 0), 0);
  return Number(((totalTokens / 1000) * 0.00002).toFixed(6));
}

function displayResults(stats: ProcessingStats): void {
  console.log('\n🎉 Indexing Complete!');
  console.log('='.repeat(50));
  console.log(`📁 Files processed: ${stats.totalFiles}`);
  console.log(`📝 Chunks created: ${stats.totalChunks}`);
  console.log(`⏱️  Total time: ${Math.round(stats.processingTime / 1000)}s`);
  console.log(`💰 Estimated cost: $${stats.embeddingCost.toFixed(4)}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
    if (stats.errors.length > 5) console.log(`  ... and ${stats.errors.length - 5} more`);
  }

  console.log('\n💡 Next steps:');
  console.log('  - Run retrieval tests: tsx scripts/retrieve.ts --test');
  console.log('  - Query specific agent: tsx scripts/retrieve.ts --agent=security --query="RLS policies"');
  console.log('  - View embeddings in Supabase dashboard');
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

// CLI
if (require.main === module) {
  main().catch(err => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
}

export { main as indexKnowledgeBase };
