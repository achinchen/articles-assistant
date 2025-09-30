import OpenAI from 'openai';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small'; 
// text-embedding-3-small: 1536 dimensions, cheaper but less accurate
// text-embedding-3-large: 3072 dimensions, more expensive but more accurate

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error: any) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  const batchSize = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);
    
    logger.info(`  🔮 Generating embeddings batch ${batchNum}/${totalBatches} (${batch.length} texts)...`);
    
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float',
      });
      
      embeddings.push(...response.data.map(d => d.embedding));
      
      if (i + batchSize < texts.length) {
        await sleep(500);
      }
    } catch (error: any) {
      logger.error(`Error in batch ${batchNum}:`, error.message);
      throw error;
    }
  }
  
  return embeddings;
}

/**
 * estimate embedding cost
 * @param tokenCount number of tokens
 * @param model model to use
 * @returns cost in dollars
 * text-embedding-3-small: $0.02 per 1M tokens
 * text-embedding-3-large: $0.13 per 1M tokens
 */
export function estimateEmbeddingCost(tokenCount: number, model: string = EMBEDDING_MODEL): number {
  const pricePerMillion = model.includes('large') ? 0.13 : 0.02;
  return (tokenCount / 1_000_000) * pricePerMillion;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}