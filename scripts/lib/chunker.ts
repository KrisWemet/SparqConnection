// scripts/lib/chunker.ts
import { DocumentChunk } from './types';

export interface ChunkerConfig {
  maxTokens: number;
  overlapTokens: number;
  preserveSections: boolean;
  minChunkSize: number;
}

export class DocumentChunker {
  private config: ChunkerConfig;

  constructor(config: Partial<ChunkerConfig> = {}) {
    this.config = {
      maxTokens: 800,
      overlapTokens: 100,
      preserveSections: true,
      minChunkSize: 50,
      ...config
    };
  }

  /**
   * Chunk a document based on its content type
   */
  async chunkDocument(
    content: string,
    filePath: string,
    contentType: 'docs' | 'schema' | 'design'
  ): Promise<DocumentChunk[]> {
    switch (contentType) {
      case 'docs':
        return this.chunkMarkdown(content, filePath);
      case 'schema':
        return this.chunkTypeScript(content, filePath);
      case 'design':
        return this.chunkDesignFile(content, filePath);
      default:
        return this.chunkGeneric(content, filePath, contentType);
    }
  }

  /**
   * Chunk markdown documents by sections
   */
  private async chunkMarkdown(
    content: string,
    filePath: string
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    if (this.config.preserveSections) {
      // Split by headers first
      const sections = this.splitByHeaders(content);
      
      for (const section of sections) {
        if (section.content.trim().length < this.config.minChunkSize) {
          continue;
        }

        const tokenCount = this.estimateTokenCount(section.content);
        
        if (tokenCount <= this.config.maxTokens) {
          // Section fits in one chunk
          chunks.push({
            content: section.content.trim(),
            contentType: 'docs',
            filePath,
            sectionTitle: section.title,
            chunkIndex: chunkIndex++,
            tokenCount,
            agentRelevance: {},
            metadata: {
              sectionLevel: section.level,
              hasCodeBlocks: this.hasCodeBlocks(section.content),
              hasLists: this.hasLists(section.content)
            }
          });
        } else {
          // Split large section into smaller chunks
          const subChunks = await this.chunkLargeText(
            section.content,
            filePath,
            section.title,
            chunkIndex
          );
          chunks.push(...subChunks);
          chunkIndex += subChunks.length;
        }
      }
    } else {
      // Simple text-based chunking
      const textChunks = await this.chunkLargeText(content, filePath, undefined, 0);
      chunks.push(...textChunks);
    }

    return chunks;
  }

  /**
   * Chunk TypeScript schema files by definitions
   */
  private async chunkTypeScript(
    content: string,
    filePath: string
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Extract schema definitions
    const schemaDefinitions = this.extractSchemaDefinitions(content);
    
    for (const schema of schemaDefinitions) {
      const tokenCount = this.estimateTokenCount(schema.content);
      
      chunks.push({
        content: schema.content.trim(),
        contentType: 'schema',
        filePath,
        sectionTitle: schema.name,
        chunkIndex: chunkIndex++,
        tokenCount,
        agentRelevance: {},
        metadata: {
          schemaType: schema.type,
          exports: schema.exports,
          imports: schema.imports,
          dependencies: schema.dependencies
        }
      });
    }

    // If no schemas found, chunk by exports/functions
    if (chunks.length === 0) {
      const exports = this.extractExports(content);
      
      for (const exportItem of exports) {
        const tokenCount = this.estimateTokenCount(exportItem.content);
        
        if (tokenCount >= this.config.minChunkSize) {
          chunks.push({
            content: exportItem.content.trim(),
            contentType: 'schema',
            filePath,
            sectionTitle: exportItem.name,
            chunkIndex: chunkIndex++,
            tokenCount,
            agentRelevance: {},
            metadata: {
              exportType: exportItem.type,
              isDefault: exportItem.isDefault
            }
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Chunk design files (placeholder for future design file support)
   */
  private async chunkDesignFile(
    content: string,
    filePath: string
  ): Promise<DocumentChunk[]> {
    // For now, treat design files like markdown
    return this.chunkMarkdown(content, filePath);
  }

  /**
   * Generic text chunking fallback
   */
  private async chunkGeneric(
    content: string,
    filePath: string,
    contentType: 'docs' | 'schema' | 'design'
  ): Promise<DocumentChunk[]> {
    return this.chunkLargeText(content, filePath, undefined, 0, contentType);
  }

  /**
   * Split large text into overlapping chunks
   */
  private async chunkLargeText(
    content: string,
    filePath: string,
    sectionTitle?: string,
    startIndex: number = 0,
    contentType: 'docs' | 'schema' | 'design' = 'docs'
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk = '';
    let chunkIndex = startIndex;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      const tokenCount = this.estimateTokenCount(testChunk);

      if (tokenCount <= this.config.maxTokens) {
        currentChunk = testChunk;
      } else {
        // Current chunk is full, save it and start new chunk
        if (currentChunk.trim().length >= this.config.minChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            contentType,
            filePath,
            sectionTitle,
            chunkIndex: chunkIndex++,
            tokenCount: this.estimateTokenCount(currentChunk),
            agentRelevance: {},
            metadata: {
              sentenceCount: currentChunk.split(/[.!?]+/).length,
              hasNumbers: /\d/.test(currentChunk),
              avgSentenceLength: currentChunk.length / currentChunk.split(/[.!?]+/).length
            }
          });
        }

        // Start new chunk with overlap
        currentChunk = this.createOverlapChunk(sentences, i, this.config.overlapTokens);
      }
    }

    // Add final chunk
    if (currentChunk.trim().length >= this.config.minChunkSize) {
      chunks.push({
        content: currentChunk.trim(),
        contentType,
        filePath,
        sectionTitle,
        chunkIndex: chunkIndex++,
        tokenCount: this.estimateTokenCount(currentChunk),
        agentRelevance: {},
        metadata: {
          sentenceCount: currentChunk.split(/[.!?]+/).length,
          hasNumbers: /\d/.test(currentChunk),
          avgSentenceLength: currentChunk.length / currentChunk.split(/[.!?]+/).length
        }
      });
    }

    return chunks;
  }

  /**
   * Split text by markdown headers
   */
  private splitByHeaders(content: string): Array<{
    title?: string;
    content: string;
    level: number;
  }> {
    const sections: Array<{ title?: string; content: string; level: number }> = [];
    const lines = content.split('\n');
    
    let currentSection = { title: undefined as string | undefined, content: '', level: 0 };

    for (const line of lines) {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        // Save previous section if it has content
        if (currentSection.content.trim()) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        currentSection = {
          title: headerMatch[2],
          content: line + '\n',
          level: headerMatch[1].length
        };
      } else {
        currentSection.content += line + '\n';
      }
    }

    // Add final section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract schema definitions from TypeScript content
   */
  private extractSchemaDefinitions(content: string): Array<{
    name: string;
    content: string;
    type: string;
    exports: string[];
    imports: string[];
    dependencies: string[];
  }> {
    const schemas: Array<{
      name: string;
      content: string;
      type: string;
      exports: string[];
      imports: string[];
      dependencies: string[];
    }> = [];

    // Extract Zod schema definitions
    const zodSchemaRegex = /export\s+const\s+(\w+(?:Schema|Tag|Enum))\s*=\s*z\.([\s\S]*?);/g;
    let match;

    while ((match = zodSchemaRegex.exec(content)) !== null) {
      const name = match[1];
      const definition = match[0];
      
      schemas.push({
        name,
        content: definition,
        type: 'zod-schema',
        exports: [name],
        imports: this.extractImportsFromCode(definition),
        dependencies: this.extractDependenciesFromCode(definition)
      });
    }

    // Extract type definitions
    const typeRegex = /export\s+(?:type|interface)\s+(\w+)[\s\S]*?(?=export|$)/g;
    
    while ((match = typeRegex.exec(content)) !== null) {
      const name = match[1];
      const definition = match[0];
      
      schemas.push({
        name,
        content: definition,
        type: 'type-definition',
        exports: [name],
        imports: this.extractImportsFromCode(definition),
        dependencies: []
      });
    }

    return schemas;
  }

  /**
   * Extract exports from TypeScript content
   */
  private extractExports(content: string): Array<{
    name: string;
    content: string;
    type: string;
    isDefault: boolean;
  }> {
    const exports: Array<{
      name: string;
      content: string;
      type: string;
      isDefault: boolean;
    }> = [];

    // Extract named exports
    const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)[\s\S]*?(?=\nexport|\n\n|$)/g;
    let match;

    while ((match = namedExportRegex.exec(content)) !== null) {
      const name = match[1];
      const exportContent = match[0];
      
      let type = 'unknown';
      if (exportContent.includes('const') || exportContent.includes('let') || exportContent.includes('var')) {
        type = 'constant';
      } else if (exportContent.includes('function')) {
        type = 'function';
      } else if (exportContent.includes('class')) {
        type = 'class';
      } else if (exportContent.includes('interface')) {
        type = 'interface';
      } else if (exportContent.includes('type')) {
        type = 'type';
      }

      exports.push({
        name,
        content: exportContent,
        type,
        isDefault: false
      });
    }

    // Extract default export
    const defaultExportRegex = /export\s+default\s+([\s\S]+?)(?=\n|$)/;
    const defaultMatch = content.match(defaultExportRegex);
    
    if (defaultMatch) {
      exports.push({
        name: 'default',
        content: defaultMatch[0],
        type: 'default-export',
        isDefault: true
      });
    }

    return exports;
  }

  /**
   * Create overlapping chunk from sentences
   */
  private createOverlapChunk(
    sentences: string[],
    startIndex: number,
    overlapTokens: number
  ): string {
    let overlap = '';
    let tokenCount = 0;
    
    // Go backwards to build overlap
    for (let i = startIndex - 1; i >= 0 && tokenCount < overlapTokens; i--) {
      const sentence = sentences[i];
      const testOverlap = sentence + (overlap ? ' ' : '') + overlap;
      const testTokens = this.estimateTokenCount(testOverlap);
      
      if (testTokens <= overlapTokens) {
        overlap = testOverlap;
        tokenCount = testTokens;
      } else {
        break;
      }
    }

    // Add current sentence
    const currentSentence = sentences[startIndex];
    return overlap + (overlap && currentSentence ? ' ' : '') + currentSentence;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be enhanced with NLP
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplification; real tokenization would be more accurate
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if content has code blocks
   */
  private hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```|`[^`]+`/.test(content);
  }

  /**
   * Check if content has lists
   */
  private hasLists(content: string): boolean {
    return /^\s*[-*+]\s+/m.test(content) || /^\s*\d+\.\s+/m.test(content);
  }

  /**
   * Extract imports from code snippet
   */
  private extractImportsFromCode(code: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract dependencies from Zod schema code
   */
  private extractDependenciesFromCode(code: string): string[] {
    const dependencies: string[] = [];
    
    // Look for references to other schemas
    const schemaRefRegex = /(\w+(?:Schema|Tag|Enum))/g;
    let match;

    while ((match = schemaRefRegex.exec(code)) !== null) {
      const ref = match[1];
      if (!dependencies.includes(ref)) {
        dependencies.push(ref);
      }
    }

    return dependencies;
  }
}