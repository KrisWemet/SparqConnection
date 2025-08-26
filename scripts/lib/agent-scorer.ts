// scripts/lib/agent-scorer.ts
import { AgentRelevanceConfig } from './types';

export class AgentRelevanceScorer {
  private agentConfigs: Record<string, AgentRelevanceConfig>;

  constructor() {
    this.agentConfigs = this.initializeAgentConfigs();
  }

  /**
   * Calculate relevance score for content to a specific agent
   */
  calculateRelevance(content: string, agentType: string): number {
    const config = this.agentConfigs[agentType];
    if (!config) {
      return 0.5; // Default neutral relevance for unknown agents
    }

    const contentLower = content.toLowerCase();
    let score = 0;

    // Keyword matching (40% of score)
    const keywordScore = this.calculateKeywordScore(contentLower, config.keywords);
    score += keywordScore * 0.4;

    // Content preference matching (30% of score)
    const preferenceScore = this.calculatePreferenceScore(contentLower, config.contentPreferences);
    score += preferenceScore * 0.3;

    // Penalty for excluded patterns (20% of score)
    const exclusionPenalty = this.calculateExclusionPenalty(contentLower, config.excludePatterns);
    score -= exclusionPenalty * 0.2;

    // Context bonus (10% of score)
    const contextBonus = this.calculateContextBonus(content, agentType);
    score += contextBonus * 0.1;

    // Normalize score to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get relevance scores for all agents
   */
  calculateAllAgentRelevance(content: string): Record<string, number> {
    const relevance: Record<string, number> = {};
    
    for (const agentType of Object.keys(this.agentConfigs)) {
      relevance[agentType] = this.calculateRelevance(content, agentType);
    }

    return relevance;
  }

  /**
   * Filter content by agent relevance threshold
   */
  isRelevantToAgent(content: string, agentType: string, minThreshold?: number): boolean {
    const config = this.agentConfigs[agentType];
    if (!config) return false;

    const relevance = this.calculateRelevance(content, agentType);
    const threshold = minThreshold ?? config.minRelevanceThreshold;
    
    return relevance >= threshold;
  }

  /**
   * Get top agents for content
   */
  getTopAgentsForContent(content: string, topK: number = 3): Array<{
    agentType: string;
    relevance: number;
  }> {
    const allRelevance = this.calculateAllAgentRelevance(content);
    
    return Object.entries(allRelevance)
      .map(([agentType, relevance]) => ({ agentType, relevance }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  /**
   * Calculate keyword matching score
   */
  private calculateKeywordScore(content: string, keywords: string[]): number {
    if (keywords.length === 0) return 0;

    let matches = 0;
    let totalWeight = 0;

    for (const keyword of keywords) {
      const weight = this.getKeywordWeight(keyword);
      totalWeight += weight;

      // Check for exact matches
      if (content.includes(keyword.toLowerCase())) {
        matches += weight;
      } else {
        // Check for partial matches (word boundaries)
        const wordRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
        if (wordRegex.test(content)) {
          matches += weight * 0.8; // Slightly lower score for partial matches
        }
      }
    }

    return totalWeight > 0 ? matches / totalWeight : 0;
  }

  /**
   * Calculate content preference matching score
   */
  private calculatePreferenceScore(content: string, preferences: string[]): number {
    if (preferences.length === 0) return 0;

    let matches = 0;
    
    for (const preference of preferences) {
      if (content.includes(preference.toLowerCase())) {
        matches++;
      }
    }

    return matches / preferences.length;
  }

  /**
   * Calculate exclusion penalty
   */
  private calculateExclusionPenalty(content: string, excludePatterns: string[]): number {
    if (excludePatterns.length === 0) return 0;

    let penalties = 0;

    for (const pattern of excludePatterns) {
      if (content.includes(pattern.toLowerCase())) {
        penalties++;
      }
    }

    return Math.min(1, penalties / excludePatterns.length);
  }

  /**
   * Calculate context-specific bonus
   */
  private calculateContextBonus(content: string, agentType: string): number {
    let bonus = 0;

    // Sparq-specific context bonuses
    if (content.includes('sparq') || content.includes('ritual')) {
      bonus += 0.1;
    }

    // Agent-specific context bonuses
    switch (agentType) {
      case 'orchestrator':
        if (content.includes('workflow') || content.includes('coordination')) {
          bonus += 0.2;
        }
        break;
      case 'security':
        if (content.includes('encrypt') || content.includes('auth') || content.includes('rls')) {
          bonus += 0.3;
        }
        break;
      case 'frontend':
        if (content.includes('component') || content.includes('react') || content.includes('ui')) {
          bonus += 0.2;
        }
        break;
      case 'backend':
        if (content.includes('api') || content.includes('database') || content.includes('server')) {
          bonus += 0.2;
        }
        break;
      case 'rag':
        if (content.includes('personalization') || content.includes('ai') || content.includes('content')) {
          bonus += 0.2;
        }
        break;
    }

    return Math.min(0.5, bonus); // Cap bonus at 0.5
  }

  /**
   * Get weight for keyword based on specificity
   */
  private getKeywordWeight(keyword: string): number {
    // Longer, more specific keywords get higher weights
    if (keyword.length > 10) return 2.0;
    if (keyword.length > 6) return 1.5;
    return 1.0;
  }

  /**
   * Initialize agent relevance configurations
   */
  private initializeAgentConfigs(): Record<string, AgentRelevanceConfig> {
    return {
      orchestrator: {
        agentType: 'orchestrator',
        keywords: [
          'workflow', 'coordination', 'orchestration', 'pipeline', 'agent',
          'task', 'delegation', 'integration', 'dependency', 'scheduling'
        ],
        contentPreferences: [
          'project management', 'coordination patterns', 'workflow design',
          'task management', 'system integration', 'process optimization'
        ],
        excludePatterns: [
          'implementation detail', 'code snippet', 'specific function'
        ],
        minRelevanceThreshold: 0.1
      },

      pm: {
        agentType: 'pm',
        keywords: [
          'product', 'requirement', 'user story', 'feature', 'roadmap',
          'user', 'customer', 'business', 'stakeholder', 'priority'
        ],
        contentPreferences: [
          'product requirements', 'user research', 'business goals',
          'feature specification', 'user experience', 'market analysis'
        ],
        excludePatterns: [
          'technical implementation', 'code', 'database schema'
        ],
        minRelevanceThreshold: 0.1
      },

      architect: {
        agentType: 'architect',
        keywords: [
          'architecture', 'system', 'design', 'integration', 'scalability',
          'performance', 'pattern', 'structure', 'component', 'service'
        ],
        contentPreferences: [
          'system design', 'architecture patterns', 'scalability',
          'technical design', 'integration patterns', 'performance'
        ],
        excludePatterns: [
          'user story', 'business requirement', 'marketing'
        ],
        minRelevanceThreshold: 0.1
      },

      rag: {
        agentType: 'rag',
        keywords: [
          'retrieval', 'knowledge', 'content', 'personalization', 'ai',
          'embedding', 'search', 'recommendation', 'context', 'relevance'
        ],
        contentPreferences: [
          'ai models', 'personalization', 'content strategy',
          'knowledge management', 'search algorithms', 'recommendations'
        ],
        excludePatterns: [
          'ui design', 'database schema', 'deployment'
        ],
        minRelevanceThreshold: 0.1
      },

      backend: {
        agentType: 'backend',
        keywords: [
          'api', 'database', 'server', 'endpoint', 'service', 'backend',
          'integration', 'data', 'migration', 'authentication', 'authorization'
        ],
        contentPreferences: [
          'api design', 'database design', 'server architecture',
          'authentication', 'data processing', 'integration patterns'
        ],
        excludePatterns: [
          'ui component', 'frontend', 'design system', 'user interface'
        ],
        minRelevanceThreshold: 0.1
      },

      frontend: {
        agentType: 'frontend',
        keywords: [
          'component', 'ui', 'interface', 'react', 'frontend', 'user',
          'design', 'responsive', 'accessibility', 'interaction', 'style'
        ],
        contentPreferences: [
          'ui components', 'user interface', 'design systems',
          'accessibility', 'user experience', 'responsive design'
        ],
        excludePatterns: [
          'database', 'server', 'api endpoint', 'backend service'
        ],
        minRelevanceThreshold: 0.1
      },

      security: {
        agentType: 'security',
        keywords: [
          'security', 'auth', 'authentication', 'authorization', 'encrypt',
          'rls', 'privacy', 'vulnerability', 'compliance', 'audit', 'permission'
        ],
        contentPreferences: [
          'security policies', 'authentication systems', 'privacy protection',
          'vulnerability assessment', 'compliance requirements', 'encryption'
        ],
        excludePatterns: [
          'ui design', 'user story', 'business requirement'
        ],
        minRelevanceThreshold: 0.1
      },

      qa: {
        agentType: 'qa',
        keywords: [
          'test', 'quality', 'validation', 'verification', 'bug', 'defect',
          'coverage', 'automation', 'regression', 'performance', 'reliability'
        ],
        contentPreferences: [
          'testing strategies', 'quality assurance', 'test automation',
          'validation procedures', 'quality metrics', 'reliability'
        ],
        excludePatterns: [
          'business strategy', 'market research', 'design mockup'
        ],
        minRelevanceThreshold: 0.1
      }
    };
  }

  /**
   * Update agent configuration
   */
  updateAgentConfig(agentType: string, config: Partial<AgentRelevanceConfig>): void {
    if (this.agentConfigs[agentType]) {
      this.agentConfigs[agentType] = {
        ...this.agentConfigs[agentType],
        ...config
      };
    }
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentType: string): AgentRelevanceConfig | undefined {
    return this.agentConfigs[agentType];
  }

  /**
   * Get all supported agent types
   */
  getSupportedAgents(): string[] {
    return Object.keys(this.agentConfigs);
  }
}