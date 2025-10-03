import type { Source } from '@/components/Widget/types';
import { ExternalLink } from 'lucide-react';

interface SourceCardProps {
  source: Source;
}

export default function SourceCard({ source }: SourceCardProps) {
  return (
    <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex p-3 bg-gray-50 rounded-lg text-gray-500 border border-gray-200 items-center gap-2 text-xs group transition-colors hover:border-gray-300 hover:text-[var(--primary)]"
        aria-label="Open article"
      >
          [{source.id}]
          <div className="text-sm text-gray-700 truncate group-hover:text-[var(--primary)]">
            {source.articleTitle}
          </div>
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-[var(--primary)]" />
      </a>  
  );
}