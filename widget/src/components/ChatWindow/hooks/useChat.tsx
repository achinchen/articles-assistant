import { useState, useCallback } from 'react';
import type { Message } from '@/components/types';
import { askQuestion } from './utils/api';

export function useChat(apiUrl: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, role: 'user' | 'system' = 'user') => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date().toISOString(),
        status: role === 'user' ? 'sending' : 'sent',
      };

      setMessages(prev => [...prev, userMessage]);
      
      if (role === 'system') return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await askQuestion(apiUrl, content);

        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
          )
        );

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
          timestamp: new Date().toISOString(),
          status: 'sent',
        };

        setMessages(prev => [...prev, assistantMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [apiUrl]
  );

  return { messages, isLoading, error, sendMessage };
}