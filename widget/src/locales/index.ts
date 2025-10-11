export interface LocaleMessages {
  greeting: string;
  inputPlaceholder: string;
  title: string;
  subtitle: string;
  sendButton: string;
  typingIndicator: string;
  errorMessage: string;
  failedToSend: string;
  retryButton: string;
  keyboardShortcuts: string;
  thanksForFeedback: string;
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
      title: 'Articles Assistant',
      subtitle: 'Ask me anything (:',
      inputPlaceholder: 'Ask me anything...',
      sendButton: 'Send',
      typingIndicator: 'Typing...',
      errorMessage: 'Sorry, something went wrong. Please try again.',
      failedToSend: 'Failed to send',
      retryButton: 'Retry',
      keyboardShortcuts: 'Press Enter to send, Shift+Enter for new line',
      thanksForFeedback: 'Thanks for your feedback!',
    }
  },
  zh: {
    code: 'zh',
    name: '中文',
    messages: {
      greeting: '您好！請讓我幫您解答問題',
      title: '文章小助理',
      subtitle: '讓我來幫您解答 (:',
      inputPlaceholder: '請問您有什麼疑問呢？',
      sendButton: '送出',
      typingIndicator: '正在輸入...',
      errorMessage: '抱歉，出現了問題。請再試一次。',
      failedToSend: '送出失敗',
      retryButton: '再試一次',
      keyboardShortcuts: '按下 Enter 送出，Shift+Enter 換行',
      thanksForFeedback: '感謝您的回饋！',
    },
  }
};

export const defaultMessages: LocaleMessages = locales.en.messages;

export function getLocale(code: string): Locale {
  return locales[code] || locales['en'];
}

export function getSupportedLocales(): Locale[] {
  return Object.values(locales);
}