import { QueryConfig } from "./types";

export const DEFAULT_QUERY_CONFIG: QueryConfig = {
    topK: 5,
    similarityThreshold: 0.3,
    maxContextTokens: 3000,
    maxResponseTokens: 1000,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    keywordWeight: 0.3,
    vectorWeight: 0.7,
  };