import { MessageCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function FloatingButton({
  isOpen,
  onClick,
}: FloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-16 h-16 rounded-full shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-250 ease-out',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-4 focus:ring-primary/20',
        'bg-[var(--primary)] text-white'
      )}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      <div
        className={clsx(
          'transition-transform duration-250',
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </div>

      {!isOpen && (
        <div className="absolute inset-0 rounded-full bg-[var(--primary)] hover:animate-ping opacity-20" />
      )}
    </button>
  );
}