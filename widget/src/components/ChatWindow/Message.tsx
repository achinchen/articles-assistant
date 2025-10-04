import clsx from 'clsx';
import type { Message as MessageType } from '@/components/types';
import SourceCard from './SourceCard';
import { parseCitations, formatTimestamp } from './utils';
import { useLocale } from '@/contexts/LocaleContext';

interface MessageProps {
  message: MessageType;
}

export default function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { t } = useLocale();
  
  const { text } = parseCitations(message.content);

  return (
    <div
      className={clsx(
        'flex animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser && 'bg-[var(--primary)] text-white',
          isSystem && 'bg-blue-50 text-blue-900 border border-blue-200',
          !isUser && !isSystem && 'bg-white text-gray-900 shadow-sm'
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {text}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </div>
        )}

        <div
          className={clsx(
            'text-xs mt-1',
            isUser ? 'text-white/70' : 'text-gray-500'
          )}
        >
          {formatTimestamp(message.timestamp)}
        </div>

        {message.status === 'error' && (
          <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span>
            <span>{t('failedToSend')}</span>
          </div>
        )}
      </div>
    </div>
  );
}