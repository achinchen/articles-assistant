import type { Source } from "@/components/Widget/types";

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
