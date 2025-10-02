import OpenAI from 'openai';
import { QueryConfig, GenerationResult } from '@/query/types';
import { logger } from '@/utils/logger';
import { env } from '@/utils/env';
import { SYSTEM_PROMPT, buildUserMessage } from './prompts';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate answer using OpenAI Chat API
 * @param query - The text of the query
 */
export async function generateAnswer(
  query: string,
  context: string,
  config: QueryConfig
): Promise<GenerationResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`Generating answer with ${config.model}...`);
    
    const userMessage = buildUserMessage(query, context);
    
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: config.temperature,
      max_tokens: config.maxResponseTokens,
    });
    
    const answer = completion.choices[0]?.message?.content || '';
    const usage = completion.usage;
    
    if (!answer) {
      throw new Error('No answer generated');
    }
    
    const elapsed = Date.now() - startTime;
    logger.info(
      `Answer generated in ${elapsed}ms (${usage?.total_tokens || 0} tokens)`
    );
    
    return {
      answer: answer.trim(),
      tokensUsed: {
        prompt: usage?.prompt_tokens || 0,
        completion: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    logger.error('Error generating answer:', error);
    throw new Error(
      `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}