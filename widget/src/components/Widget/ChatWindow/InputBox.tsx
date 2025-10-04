import { useState, useRef, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import clsx from 'clsx';
import { useLocale } from '@/contexts/LocaleContext';

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBox({
  onSend: propsOnSend,
  disabled = false,
  placeholder,
}: InputBoxProps) {
  const { t } = useLocale();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      propsOnSend(trimmed);
      setValue('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder={placeholder || t('inputPlaceholder')}
          disabled={disabled}
          rows={1}
          className={clsx(
            'flex-1 resize-none px-4 py-2.5 rounded-lg',
            'border border-gray-300 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
            'outline-none transition-colors',
            'placeholder:text-gray-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            'max-h-[120px] overflow-y-auto'
          )}
          style={{ minHeight: '42px' }}
        />

        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className={clsx(
            'flex-shrink-0 w-10 h-10 rounded-full',
            'flex items-center justify-center',
            'bg-[var(--primary)] text-white',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:scale-110 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50'
          )}
          aria-label={t('sendButton')}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Shift+Enter</kbd> for new line
      </div>
    </div>
  );
}