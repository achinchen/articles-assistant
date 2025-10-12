import { QueryInput, QueryResponse } from './types';
import { hybridRetrieveChunks } from './retrieval/hybride';
import { buildContext } from './augmentation';
import { generateAnswer } from './generation';
import { buildSources, validateCitations } from './citation';
import { DEFAULT_QUERY_CONFIG } from './constants';
import { logger } from '@/utils/logger';
import { retrieveRelevantChunks } from './retrieval';
import { detectQueryLanguage } from './utils';
import { QueryEnhancementService } from './enhancement';
import { ThresholdOptimizer } from './optimization/threshold';

export async function query(input: QueryInput): Promise<QueryResponse> {
  const startTime = Date.now();
    
  // Step -1: Dynamic threshold optimization
  const optimalThreshold = ThresholdOptimizer.calculateOptimalThreshold(
    input.query,
    input.query.length,
    input.locale || 'en',
    input.useHybridSearch
  );

  const config = {
    ...DEFAULT_QUERY_CONFIG,
    similarityThreshold: optimalThreshold, // Override with optimized threshold
    ...(input.config && Object.fromEntries(
      Object.entries(input.config).filter(([_, v]) => v !== undefined)
    )),
  };
  
  const queryLocale = input.locale || detectQueryLanguage(input.query);
  logger.info(`Query language detected: ${queryLocale}`);
  logger.info(`Using config: topK=${config.topK}, model=${config.model}, threshold=${config.similarityThreshold}`);
  
  const searchMethod = input.useHybridSearch ? 'hybrid' : 'vector';
  logger.info(`Search method: ${searchMethod}`);

  // Step 0: Query Enhancement for short queries
  let actualQuery = input.query;
  let enhancement = null;
  
  if (QueryEnhancementService.shouldEnhance(input.query)) {
    logger.info('=== Step 0: Query Enhancement ===');
    try {
      enhancement = await QueryEnhancementService.enhance(input.query);
      if (enhancement.confidence > 0.5) {
        actualQuery = enhancement.enhancedQuery;
        logger.info(`Query enhanced: "${input.query}" -> "${actualQuery}" (confidence: ${enhancement.confidence})`);
      } else {
        logger.info(`Query enhancement low confidence (${enhancement.confidence}), using original`);
      }
    } catch (error) {
      logger.warn('Query enhancement failed, using original query:', error);
    }
  }
  
  try {
    logger.info('=== Step 1: Retrieval ===');
    const chunks = input.useHybridSearch
      ? await hybridRetrieveChunks(actualQuery, input.locale, config as any)
      : await retrieveRelevantChunks(actualQuery, input.locale, config);
    
    
    if (chunks.length === 0) {
      logger.warn('No relevant chunks found');
      
      const noContentMessage = queryLocale === 'zh'
        ? '抱歉，我沒有找到與您問題相關的內容。這個問題可能超出了現有文章的範圍。'
        : 'Sorry, I could not find any relevant content for your question. This topic may be outside the scope of the available articles.';
      
      return {
        answer: noContentMessage,
        sources: [],
        metadata: {
          queryLocale,
          chunksRetrieved: 0,
          chunksUsed: 0,
          model: config.model,
          tokensUsed: {
            context: 0,
            prompt: 0,
            completion: 0,
            total: 0,
          },
          responseTime: Date.now() - startTime,
        },
      };
    }
    
    logger.info('=== Step 2: Augmentation ===');
    const context = buildContext(chunks, config, queryLocale);
    
    logger.info('=== Step 3: Generation ===');
    const generation = await generateAnswer(
      actualQuery,
      context.formattedContext,
      config
    );
    
    logger.info('=== Step 4: Citation ===');
    const sources = buildSources(context.chunks);
    
    const citationsValid = validateCitations(generation.answer, sources);
    if (!citationsValid) {
      logger.warn('Some citations in answer are invalid');
    }
    
    const responseTime = Date.now() - startTime;
    logger.info(`Total query time: ${responseTime}ms`);

    // Record performance for threshold optimization
    ThresholdOptimizer.recordPerformance(
      input.query,
      config.similarityThreshold,
      chunks
    );
    
    return {
      answer: generation.answer,
      sources,
      metadata: {
        queryLocale,
        originalQuery: input.query,
        actualQuery,
        queryEnhancement: enhancement ? {
          enhanced: enhancement.enhancedQuery !== input.query,
          confidence: enhancement.confidence,
          expansions: enhancement.expansions,
        } : undefined,
        chunksRetrieved: chunks.length,
        chunksUsed: context.chunks.length,
        model: config.model,
        tokensUsed: {
          context: context.totalTokens,
          prompt: generation.tokensUsed.prompt,
          completion: generation.tokensUsed.completion,
          total: generation.tokensUsed.total,
        },
        responseTime,
      },
    };
  } catch (error) {
    logger.error('Query failed:', error);
    throw error;
  }
}

export * from './types';
export { formatSourcesForDisplay } from './citation';