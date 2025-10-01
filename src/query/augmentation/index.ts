import type { Locale } from '@/types/content';
import type { QueryConfig, QueryContext, RetrievedChunk } from '@/query/types';
import { logger } from '@/utils/logger';

/**
 * Build context from retrieved chunks, respecting token budget
 * @param chunks - The retrieved chunks
 * @param config - The configuration for the context
 * @param queryLanguage - The language of the query
 * @returns The context
 */
export function buildContext(
  chunks: RetrievedChunk[],
  config: QueryConfig,
  queryLanguage?: Locale
): QueryContext {
  if (chunks.length === 0) {
    return {
      chunks: [],
      totalTokens: 0,
      formattedContext: '',
    };
  }
  
  const selectedChunks: RetrievedChunk[] = [];
  let totalTokens = 0;
  
  for (const chunk of chunks) {
    const estimatedTokens = chunk.tokenCount + 50;
    
    if (totalTokens + estimatedTokens <= config.maxContextTokens) {
      selectedChunks.push(chunk);
      totalTokens += estimatedTokens;
    } else {
      logger.warn(
        `Token budget exceeded. Using ${selectedChunks.length}/${chunks.length} chunks (${totalTokens} tokens)`
      );
      break;
    }
  }
  
  if (selectedChunks.length === 0) {
    logger.warn('No chunks fit within token budget');
  }
  
  const isEnglish = queryLanguage === 'en';
  const articleLabel = isEnglish ? 'Article' : '文章';
  
  const formattedContext = selectedChunks
    .map((chunk, index) => {
      const sourceId = index + 1;
      return `[${sourceId}] ${articleLabel}: ${chunk.articleTitle}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
  
  logger.info(
    `Context built: ${selectedChunks.length} chunks, ~${totalTokens} tokens`
  );
  
  return {
    chunks: selectedChunks,
    totalTokens,
    formattedContext,
  };
}