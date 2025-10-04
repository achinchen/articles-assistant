import { createContext, useContext, type ReactNode } from 'react';
import { type LocaleMessages, getLocale, defaultMessages } from '@/locales';

interface LocaleContextType {
  locale: string;
  messages: LocaleMessages;
  t: (key: keyof LocaleMessages) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  messages: defaultMessages,
  t: (key: keyof LocaleMessages) => defaultMessages[key]
});

interface LocaleProviderProps {
  children: ReactNode;
  locale?: string;
}

export function LocaleProvider({ children, locale = 'en' }: LocaleProviderProps) {
  const localeData = getLocale(locale);
  const messages = localeData.messages;
  
  const t = (key: keyof LocaleMessages): string => {
    return messages[key] || defaultMessages[key];
  };

  return (
    <LocaleContext.Provider value={{ locale, messages, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}