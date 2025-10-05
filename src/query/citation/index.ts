import type { RetrievedChunk, Source } from '@/query/types';
import type { Locale } from '@/types/content';
import { ARTICLE_URI } from '@/query/citation/constants';

/**
 * Build source list from chunks used in context
 * @param chunks - The retrieved chunks
 * @returns The source list with deduplicated articleSlug
 */
export function buildSources(chunks: RetrievedChunk[]): Source[] {
  const articleMap = new Map<string, RetrievedChunk[]>();
  
  chunks.forEach(chunk => {
    if (!articleMap.has(chunk.articleSlug)) {
      articleMap.set(chunk.articleSlug, []);
    }
    articleMap.get(chunk.articleSlug)!.push(chunk);
  });
  
  const sources: Source[] = [];
  let id = 1;
  
  articleMap.forEach((articleChunks) => {
    const bestChunk = articleChunks.reduce((best, current) => 
      current.similarity > best.similarity ? current : best
    );
    
    sources.push({
      id: id++,
      articleSlug: bestChunk.articleSlug,
      articleTitle: bestChunk.articleTitle,
      chunkContent: bestChunk.content,
      similarity: bestChunk.similarity,
      locale: bestChunk.locale,
      url: `${ARTICLE_URI}${bestChunk.articleSlug}`
    });
  });

  return sources.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Format sources for display (CLI version with i18n)
 */
export function formatSourcesForDisplay(
  sources: Source[],
  language: Locale = 'en'
): string {
  if (sources.length === 0) {
    return '';
  }
  
  const header = language === 'zh' ? '\n📚 參考來源：' : '\n📚 Sources:';
  const similarityLabel = language === 'zh' ? '相似度' : 'similarity';
  
  const lines = [header];
  
  sources.forEach(source => {
    lines.push(
      `[${source.id}] ${source.articleTitle} (${similarityLabel}: ${source.similarity.toFixed(3)})`
    );
  });
  
  return lines.join('\n');
}

/**
 * Extract citation numbers from answer
 * E.g., "This is answer [1] more explanation [2]" -> [1, 2]
 */
export function extractCitations(answer: string): number[] {
  const matches = answer.matchAll(/\[(\d+)\]/g);
  const citations = new Set<number>();
  
  for (const match of matches) {
    citations.add(parseInt(match[1], 10));
  }
  
  return Array.from(citations).sort((a, b) => a - b);
}

/**
 * Validate that all citations in answer have corresponding sources
 * @param answer - The answer to validate
 * @param sources - The sources to validate against
 * @returns True if all citations have corresponding sources, false otherwise
 */
export function validateCitations(
  answer: string,
  sources: Source[]
): boolean {
  const citations = extractCitations(answer);
  const maxSourceId = sources.length;
  
  return citations.every(citation => citation >= 1 && citation <= maxSourceId);
}