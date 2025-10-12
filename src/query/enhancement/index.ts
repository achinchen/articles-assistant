import OpenAI from 'openai';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { detectQueryLanguage as detectLanguage } from '@/query/utils';

export interface QueryEnhancement {
  originalQuery: string;
  enhancedQuery: string;
  expansions: string[];
  synonyms: string[];
  relatedTerms: string[];
  confidence: number;
}

export interface QueryEnhancementConfig {
  enabled: boolean;
  minQueryLength: number;
  maxQueryLength: number;
  expansionModel: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_ENHANCEMENT_CONFIG: QueryEnhancementConfig = {
  enabled: true,
  minQueryLength: 3,
  maxQueryLength: 15,
  expansionModel: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 150,
};

export class QueryEnhancementService {
  private static openai: OpenAI = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  private static config: QueryEnhancementConfig = DEFAULT_ENHANCEMENT_CONFIG;

  /**
   * Check if query needs enhancement
   */
  static shouldEnhance(query: string): boolean {
    if (!this.config.enabled) return false;
    
    const trimmedQuery = query.trim();
    const wordCount = trimmedQuery.split(/\s+/).length;
    const charCount = trimmedQuery.length;
    
    return (
      charCount >= this.config.minQueryLength &&
      charCount <= this.config.maxQueryLength &&
      wordCount <= 3
    );
  }

  /**
   * Enhance a short or ambiguous query
   */
  static async enhance(query: string): Promise<QueryEnhancement> {
    const startTime = Date.now();
    const locale = detectLanguage(query);
    
    try {
      const systemPrompt = locale === 'zh' 
        ? this.getChineseSystemPrompt()
        : this.getEnglishSystemPrompt();
      
      const userPrompt = locale === 'zh'
        ? `請增強這個查詢: "${query}"`
        : `Please enhance this query: "${query}"`;

      const completion = await this.openai.chat.completions.create({
        model: this.config.expansionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const enhancement = this.parseEnhancement(query, response);
      const responseTime = Date.now() - startTime;

      logger.debug('Query enhanced:', {
        original: query,
        enhanced: enhancement.enhancedQuery,
        confidence: enhancement.confidence,
        responseTime,
        tokensUsed: completion.usage?.total_tokens || 0,
      });

      return enhancement;
    } catch (error) {
      logger.warn('Query enhancement failed, using original:', error);
      return {
        originalQuery: query,
        enhancedQuery: query,
        expansions: [],
        synonyms: [],
        relatedTerms: [],
        confidence: 0,
      };
    }
  }

  /**
   * Parse enhancement response
   */
  private static parseEnhancement(originalQuery: string, response: string): QueryEnhancement {
    try {
      const parsed = JSON.parse(response);
      
      return {
        originalQuery,
        enhancedQuery: parsed.enhanced_query || originalQuery,
        expansions: Array.isArray(parsed.expansions) ? parsed.expansions : [],
        synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
        relatedTerms: Array.isArray(parsed.related_terms) ? parsed.related_terms : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch (error) {
      // Fallback: treat response as enhanced query
      logger.debug('Failed to parse enhancement JSON, using as enhanced query:', error);
      
      return {
        originalQuery,
        enhancedQuery: response.trim() || originalQuery,
        expansions: [],
        synonyms: [],
        relatedTerms: [],
        confidence: 0.3,
      };
    }
  }

  /**
   * English system prompt for query enhancement
   */
  private static getEnglishSystemPrompt(): string {
    return `You are a query enhancement assistant for a technical blog search system. Your job is to expand short, ambiguous queries into more specific and searchable terms.

Given a short query, enhance it by:
1. Adding relevant technical context
2. Including common synonyms and related terms
3. Expanding abbreviations
4. Adding related concepts

The blog covers topics like:
- Software Engineering (Staff Engineer, Tech Lead, Architecture)
- Web Development (React, TypeScript, JavaScript)
- System Design and Scalability
- Performance Optimization
- Career Development in Tech
- Engineering Management

Respond with a JSON object:
{
  "enhanced_query": "expanded version of the query",
  "expansions": ["alternative", "phrasings", "of", "query"],
  "synonyms": ["related", "terms"],
  "related_terms": ["broader", "concepts"],
  "confidence": 0.8
}

Keep it concise and relevant. The enhanced query should be 1-2 sentences max.`;
  }

  /**
   * Chinese system prompt for query enhancement
   */
  private static getChineseSystemPrompt(): string {
    return `你是一個技術部落格搜尋系統的查詢增強助手。你的任務是將簡短、模糊的查詢擴展為更具體、更容易搜尋的詞彙。

對於簡短查詢，請通過以下方式增強：
1. 添加相關的技術背景
2. 包含常見同義詞和相關術語
3. 展開縮寫詞
4. 添加相關概念

部落格涵蓋的主題包括：
- 軟體工程（Staff Engineer、Tech Lead、架構）
- Web 開發（React、TypeScript、JavaScript）
- 系統設計和可擴展性
- 效能優化
- 技術職涯發展
- 工程管理

請用 JSON 格式回應：
{
  "enhanced_query": "查詢的擴展版本",
  "expansions": ["查詢的", "替代", "表述"],
  "synonyms": ["相關", "術語"],
  "related_terms": ["更廣泛的", "概念"],
  "confidence": 0.8
}

保持簡潔和相關性。增強查詢應該最多 1-2 句話。`;
  }

  /**
   * Generate search variations for a query
   */
  static generateSearchVariations(enhancement: QueryEnhancement): string[] {
    const variations = new Set<string>();
    
    // Always include original and enhanced
    variations.add(enhancement.originalQuery);
    variations.add(enhancement.enhancedQuery);
    
    // Add expansions
    enhancement.expansions.forEach(exp => variations.add(exp));
    
    // Combine original with synonyms
    enhancement.synonyms.forEach(synonym => {
      variations.add(`${enhancement.originalQuery} ${synonym}`);
    });
    
    // Add related terms
    enhancement.relatedTerms.forEach(term => {
      if (term.length > 2) {
        variations.add(term);
      }
    });
    
    return Array.from(variations)
      .filter(v => v.trim().length > 2)
      .slice(0, 5); // Limit to 5 variations
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<QueryEnhancementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Query enhancement config updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  static getConfig(): QueryEnhancementConfig {
    return { ...this.config };
  }
}