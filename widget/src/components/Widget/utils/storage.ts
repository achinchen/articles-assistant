import type { Message } from '@/components/Widget/types';

const STORAGE_KEY = 'articles-assistant-chat';
  
export function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages:', error);
  }
}

export function loadMessages(): Message[] | [] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load messages:', error);
    return [];
  }
}

export function clearMessages() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear messages:', error);
  }
}