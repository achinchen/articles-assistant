import { Locale } from '@/types/content';

export interface QueryInput {
    query: string;
    locale?: Locale;
    config?: Partial<QueryConfig>;
    useHybridSearch?: boolean;
}

export interface QueryConfig {
    // Retrieval
    topK: number;
    similarityThreshold: number;

    // Hybrid search (optional)
    keywordWeight?: number;
    vectorWeight?: number;

    // Token budgets
    maxContextTokens: number;
    maxResponseTokens: number;

    // Generation
    model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo';
    temperature: number;
}


export interface RetrievedChunk {
    chunkId: string;
    articleId: string;
    articleSlug: string;
    articleTitle: string;
    content: string;
    similarity: number;
    locale: Locale;
    chunkIndex: number;
    tokenCount: number;
}

export interface QueryContext {
    chunks: RetrievedChunk[];
    totalTokens: number;
    formattedContext: string;
}

export interface Source {
    id: number;
    articleSlug: string;
    articleTitle: string;
    chunkContent: string;
    similarity: number;
    locale: Locale;
    url?: string;
}

export interface QueryResponse {
    answer: string;
    sources: Source[];
    metadata: {
        queryLocale?: Locale;
        chunksRetrieved: number;
        chunksUsed: number;
        model: string;
        tokensUsed: {
            context: number;
            prompt: number;
            completion: number;
            total: number;
        };
        responseTime: number;
    };
}

export interface GenerationResult {
    answer: string;
    tokensUsed: {
        prompt: number;
        completion: number;
        total: number;
    };
}