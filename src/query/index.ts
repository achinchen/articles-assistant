import { QueryInput, QueryResponse } from './types';
import { hybridRetrieveChunks } from './retrieval/hybride';
import { buildContext } from './augmentation';
import { generateAnswer } from './generation';
import { buildSources, validateCitations } from './citation';
import { DEFAULT_QUERY_CONFIG } from './constants';
import { logger } from '@/utils/logger';
import { retrieveRelevantChunks } from './retrieval';
import { detectQueryLanguage } from './utils';

export async function query(input: QueryInput): Promise<QueryResponse> {
  const startTime = Date.now();
    
  const config = {
    ...DEFAULT_QUERY_CONFIG,
    ...(input.config && Object.fromEntries(
      Object.entries(input.config).filter(([_, v]) => v !== undefined)
    )),
  };
  
  const queryLocale = input.locale || detectQueryLanguage(input.query);
  logger.info(`Query language detected: ${queryLocale}`);
  logger.info(`Using config: topK=${config.topK}, model=${config.model}, threshold=${config.similarityThreshold}`);
  
  // Determine search method
  const searchMethod = input.useHybridSearch ? 'hybrid' : 'vector';
  logger.info(`Search method: ${searchMethod}`);
  
  try {
    // Step 1: Retrieval
    logger.info('=== Step 1: Retrieval ===');
    const chunks = input.useHybridSearch
      ? await hybridRetrieveChunks(input.query, input.locale, config as any)
      : await retrieveRelevantChunks(input.query, input.locale, config);
    
    
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
    
    // Step 2: Augmentation
    logger.info('=== Step 2: Augmentation ===');
    const context = buildContext(chunks, config, queryLocale);
    
    // Step 3: Generation
    logger.info('=== Step 3: Generation ===');
    const generation = await generateAnswer(
      input.query,
      context.formattedContext,
      config
    );
    
    // Step 4: Citation
    logger.info('=== Step 4: Citation ===');
    const sources = buildSources(context.chunks);
    
    const citationsValid = validateCitations(generation.answer, sources);
    if (!citationsValid) {
      logger.warn('Some citations in answer are invalid');
    }
    
    const responseTime = Date.now() - startTime;
    logger.info(`Total query time: ${responseTime}ms`);
    
    return {
      answer: generation.answer,
      sources,
      metadata: {
        queryLocale,
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