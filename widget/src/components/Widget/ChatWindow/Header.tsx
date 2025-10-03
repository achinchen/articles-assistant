import { MessageCircle, X } from 'lucide-react';

interface HeaderProps {
  onClose: () => void;
}

export default function Header({ onClose }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[var(--primary)] text-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Articles Assistant</h3>
          <p className="text-xs opacity-90">Ask me anything</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}