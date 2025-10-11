import { query } from '@/db/client';

export interface QueryLogData {
  queryText: string;
  queryLocale?: string;
  searchMethod: 'vector' | 'hybrid';
  chunksRetrieved: number;
  chunksUsed: number;
  answerLength: number;
  hasSources: boolean;
  responseTimeMs: number;
  tokensUsed: number;
  model: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
}

export interface FeedbackData {
  queryLogId: number;
  rating: -1 | 1;
  feedbackText?: string;
  feedbackCategory?: string;
  ipAddress?: string;
}

export class AnalyticsService {
  /**
   * Log a query and its response
   * @param data - The data to log
   * @returns The ID of the logged query
   */
  static async logQuery(data: QueryLogData): Promise<number> {    
    const result = await query(
      `INSERT INTO query_logs (
        query_text, query_locale, search_method,
        chunks_retrieved, chunks_used, answer_length, has_sources,
        response_time_ms, tokens_used, model,
        request_id, ip_address, user_agent, referer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        data.queryText,
        data.queryLocale,
        data.searchMethod,
        data.chunksRetrieved,
        data.chunksUsed,
        data.answerLength,
        data.hasSources,
        data.responseTimeMs,
        data.tokensUsed,
        data.model,
        data.requestId,
        data.ipAddress,
        data.userAgent,
        data.referer,
      ]
    );
    
    console.log('result', result.rows);
    return result.rows[0].id;
  }

  /**
   * Record user feedback
   * @param data - The data to record
   */
  static async recordFeedback(data: FeedbackData): Promise<void> {    
    await query(
      `INSERT INTO feedback (
        query_log_id, rating, feedback_text, feedback_category, ip_address
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        data.queryLogId,
        data.rating,
        data.feedbackText,
        data.feedbackCategory,
        data.ipAddress,
      ]
    );
    
    const queryLog = await query(
      'SELECT query_text FROM query_logs WHERE id = $1',
      [data.queryLogId]
    );
    
    if (queryLog.rows.length > 0) {
      const normalized = this.normalizeQuery(queryLog.rows[0].query_text);
      await this.updatePopularQuery(normalized, data.rating);
    }
  }

  /**
   * Log failed query
   * @param queryText - The text of the query
   * @param errorMessage - The error message
   * @param errorCode - The error code
   * @param requestId - The request ID
   * @param stackTrace - The stack trace
   */
  static async logError(
    queryText: string,
    errorMessage: string,
    errorCode: string,
    requestId: string,
    stackTrace?: string
  ): Promise<void> {    
    await query(
      `INSERT INTO failed_queries (
        query_text, error_message, error_code, request_id, stack_trace
      ) VALUES ($1, $2, $3, $4, $5)`,
      [queryText, errorMessage, errorCode, requestId, stackTrace]
    );
  }

  /**
   * Track daily costs
   * @param date - The date to track
   * @param embeddingTokens - The number of embedding tokens
   * @param promptTokens - The number of prompt tokens
   * @param completionTokens - The number of completion tokens
   */
  static async trackCost(
    date: Date,
    embeddingTokens: number,
    promptTokens: number,
    completionTokens: number
  ): Promise<void> {    
    // OpenAI pricing (as of 2024)
    const EMBEDDING_COST_PER_1K = 0.00002; // text-embedding-3-small
    const PROMPT_COST_PER_1K = 0.00015; // gpt-4o-mini
    const COMPLETION_COST_PER_1K = 0.0006; // gpt-4o-mini
    
    const embeddingCost = (embeddingTokens / 1000) * EMBEDDING_COST_PER_1K;
    const promptCost = (promptTokens / 1000) * PROMPT_COST_PER_1K;
    const completionCost = (completionTokens / 1000) * COMPLETION_COST_PER_1K;
    const totalCost = embeddingCost + promptCost + completionCost;
    
    await query(
      `INSERT INTO cost_tracking (
        date, embedding_tokens, embedding_cost,
        prompt_tokens, prompt_cost,
        completion_tokens, completion_cost,
        total_cost, total_queries
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
      ON CONFLICT (date) DO UPDATE SET
        embedding_tokens = cost_tracking.embedding_tokens + EXCLUDED.embedding_tokens,
        embedding_cost = cost_tracking.embedding_cost + EXCLUDED.embedding_cost,
        prompt_tokens = cost_tracking.prompt_tokens + EXCLUDED.prompt_tokens,
        prompt_cost = cost_tracking.prompt_cost + EXCLUDED.prompt_cost,
        completion_tokens = cost_tracking.completion_tokens + EXCLUDED.completion_tokens,
        completion_cost = cost_tracking.completion_cost + EXCLUDED.completion_cost,
        total_cost = cost_tracking.total_cost + EXCLUDED.total_cost,
        total_queries = cost_tracking.total_queries + 1,
        cost_per_query = (cost_tracking.total_cost + EXCLUDED.total_cost) / (cost_tracking.total_queries + 1)`,
      [
        date.toISOString().split('T')[0],
        embeddingTokens,
        embeddingCost,
        promptTokens,
        promptCost,
        completionTokens,
        completionCost,
        totalCost,
      ]
    );
  }

  /**
   * Get analytics summary
   * @param days - The number of days to get the summary for
   * @returns The summary
   */
  static async getSummary(days: number = 7) {    
    const result = await query(
      `SELECT
        COUNT(*) as total_queries,
        AVG(response_time_ms) as avg_response_time,
        AVG(tokens_used) as avg_tokens,
        COUNT(CASE WHEN has_sources THEN 1 END) as queries_with_sources,
        COUNT(DISTINCT query_locale) as languages_used,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM query_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'`
    );
    
    return result.rows[0];
  }

  /**
   * Get feedback stats
   * @param days - The number of days to get the feedback stats for
   * @returns The feedback stats
   */
  static async getFeedbackStats(days: number = 7) {
    const result = await query(
      `SELECT
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as positive,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as negative,
        ROUND(
          100.0 * COUNT(CASE WHEN rating = 1 THEN 1 END) / NULLIF(COUNT(*), 0),
          2
        ) as satisfaction_rate
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '${days} days'`
    );
    
    return result.rows[0];
  }

  /**
   * Normalize query for popular queries tracking
   * @param query - The query to normalize
   * @returns The normalized query
   */
  private static normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Update popular queries table
   * @param normalized - The normalized query
   * @param rating - The rating
   */
  private static async updatePopularQuery(
    normalized: string,
    rating: number
  ): Promise<void> {
    await query(
      `INSERT INTO popular_queries (query_normalized, query_count, avg_rating, last_queried_at)
      VALUES ($1, 1, $2, NOW())
      ON CONFLICT (query_normalized) DO UPDATE SET
        query_count = popular_queries.query_count + 1,
        avg_rating = (popular_queries.avg_rating * popular_queries.query_count + $2) / (popular_queries.query_count + 1),
        last_queried_at = NOW()`,
      [normalized, rating]
    );
  }
}