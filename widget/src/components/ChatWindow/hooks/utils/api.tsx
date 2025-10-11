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
  const response = await fetch(`${apiUrl}/api/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get response');
  }

  const data: ApiResponse = await response.json();
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