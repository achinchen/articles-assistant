export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Source[];
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface Source {
  id: number;
  articleSlug: string;
  articleTitle: string;
  similarity: number;
  locale: string;
  url?: string;
}

export interface WidgetConfig {
  apiUrl: string;
  primaryColor?: string;
  position?: 'right' | 'left';
  greeting?: string;
  target?: string;
}

export interface SDKOptions {
  config: WidgetConfig;
  container?: HTMLElement | string;
}
