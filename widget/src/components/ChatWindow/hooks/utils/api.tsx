import type { Feedback, Source } from "@/components/types";

export interface ApiResponse {
    success: boolean;
    data: {
      answer: string;
      sources: Source[];
      metadata: {
        queryLocale: string;
        chunksRetrieved: number;
        model: string;
        responseTime: number;
        queryLogId: number;
      };
    };
  }
    
export async function askQuestion(
  apiUrl: string,
  query: string
): Promise<ApiResponse['data']> {
  // Support both Supabase Edge Functions and direct API
  const isSupabaseFunction = apiUrl.includes('supabase.co/functions');
  const endpoint = isSupabaseFunction ? `${apiUrl}/ask` : `${apiUrl}/api/ask`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      [isSupabaseFunction ? 'question' : 'query']: query 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response');
  }

  const data = await response.json();
  
  // Handle different response formats
  if (isSupabaseFunction) {
    return {
      answer: data.answer,
      sources: data.sources,
      metadata: {
        queryLocale: 'en',
        chunksRetrieved: data.sources?.length || 0,
        model: 'gpt-4',
        responseTime: 0,
        queryLogId: Date.now(),
      }
    };
  }
  
  return data.data;
}

export async function sendFeedback(
  apiUrl: string,
  queryLogId: number,
  rating: Feedback,
  feedbackText?: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      queryLogId,
      rating,
      feedbackText,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send feedback');
  }
}