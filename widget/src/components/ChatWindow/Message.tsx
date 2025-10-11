import clsx from 'clsx';
import type { Feedback, Message as MessageType } from '@/components/types';
import SourceCard from './SourceCard';
import { parseCitations, formatTimestamp } from './utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface MessageProps {
  message: MessageType;
  onFeedback: (messageId: string, rating: Feedback) => void;
}

export default function Message({ message, onFeedback }: MessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const { t } = useLocale();
  const [feedback, setFeedback] = useState<Feedback>(
    message.feedback || null
  );
  const { text } = parseCitations(message.content);

 const onFeedbackClick = (rating: Feedback) => {
    if (feedback === rating) {
      setFeedback(null);
    } else {
      setFeedback(rating);
      if (onFeedback && message.queryLogId) {
        onFeedback(message.id, rating);
      }
    }
  };
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

        {!isUser && !isSystem && message.queryLogId && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <button
              onClick={() => onFeedbackClick(1)}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                feedback === 1
                  ? 'bg-green-100 text-green-600'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-green-600'
              )}
              aria-label="Helpful"
              title="This was helpful"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onFeedbackClick(-1)}
              className={clsx(
                'p-1.5 rounded-lg transition-colors',
                feedback === -1
                  ? 'bg-red-100 text-red-600'
                  : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'
              )}
              aria-label="Not helpful"
              title="This was not helpful"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            {feedback && (
              <span className="text-xs text-gray-500 ml-1">
                {t('thanksForFeedback')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}