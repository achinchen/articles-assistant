export interface LocaleMessages {
  greeting: string;
  inputPlaceholder: string;
  sendButton: string;
  typingIndicator: string;
  errorMessage: string;
  retryButton: string;
}

export interface Locale {
  code: string;
  name: string;
  messages: LocaleMessages;
}

export const locales: Record<string, Locale> = {
  en: {
    code: 'en',
    name: 'English',
    messages: {
      greeting: 'How can I help you?',
      inputPlaceholder: 'Ask me anything...',
      sendButton: 'Send',
      typingIndicator: 'Typing...',
      errorMessage: 'Sorry, something went wrong. Please try again.',
      retryButton: 'Retry'
    }
  },
  zh: {
    code: 'zh',
    name: '中文',
    messages: {
      greeting: '您好！請讓我幫您解答問題',
      inputPlaceholder: '請問您有什麼疑問呢？',
      sendButton: '送出',
      typingIndicator: '正在輸入...',
      errorMessage: '抱歉，出現了問題。請再試一次。',
      retryButton: '再試一次'
    }
  }
};

export const defaultMessages: LocaleMessages = locales.en.messages;

export function getLocale(code: string): Locale {
  return locales[code] || locales['en'];
}

export function getSupportedLocales(): Locale[] {
  return Object.values(locales);
}