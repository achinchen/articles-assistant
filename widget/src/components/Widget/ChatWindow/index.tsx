import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import Header from './Header';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { useChat } from './hooks/useChat';
import { useLocale } from '@/contexts/LocaleContext';

interface ChatWindowProps {
  apiUrl: string;
  onClose: () => void;
  onNewMessage?: () => void;
}

export default function ChatWindow({
  apiUrl,
  onClose,
  onNewMessage,
}: ChatWindowProps) {
  const { messages, isLoading, sendMessage, error } = useChat(apiUrl);
  const { t } = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onNewMessage) onNewMessage();
  }, [messages, onNewMessage]);

  return (
    <div
      className={clsx(
        'bg-white shadow-2xl flex flex-col overflow-hidden rounded-xl',
        'md:w-[400px] md:h-[600px]',
        'fixed md:relative inset-0 md:inset-auto',
        'w-screen h-screen md:w-auto md:h-auto',
        'lt-md:rounded-none'
      )}
    >
      <Header onClose={onClose} />

      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          {t('greeting')}
        </div>
      ) :  (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <MessageList messages={messages} isLoading={isLoading} />
        <div ref={messagesEndRef} />
      </div>
      )}

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-sm text-red-600">
          {t('errorMessage')}
        </div>
      )}

      <InputBox
        onSend={sendMessage}
        disabled={isLoading}
        placeholder={t('inputPlaceholder')}
      />
    </div>
  );
}