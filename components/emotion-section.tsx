'use client';

import { useCallback, useRef, useState } from 'react';
import { ANTIDOTE_LABELS } from '@/lib/article-helpers';

interface EmotionSectionProps {
  activeAntidote: string | null;
  onSelect: (antidote: string | null) => void;
}

export function EmotionSection({ activeAntidote, onSelect }: EmotionSectionProps) {
  const antidotes = Object.entries(ANTIDOTE_LABELS);
  const [tapped, setTapped] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTap = useCallback((key: string) => {
    setTapped(key);
    setTimeout(() => setTapped(null), 1500);
    onSelect(activeAntidote === key ? null : key);
  }, [activeAntidote, onSelect]);

  return (
    <div className="relative py-2">
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-2 px-4 py-1 w-max mx-auto">
          {antidotes.map(([key, { label, oneLiner }]) => {
            const isActive = activeAntidote === key;
            const isTapped = tapped === key;

            return (
              <button
                key={key}
                onClick={() => handleTap(key)}
                className={`group relative flex-shrink-0 rounded-full px-4 py-1.5 text-xs transition-all duration-200 border ${
                  isActive
                    ? 'bg-warmth/20 text-warmth border-warmth/40 font-semibold shadow-sm scale-105'
                    : 'bg-white/60 text-foreground/40 border-border/20 font-medium hover:-translate-y-0.5 hover:text-foreground/60 hover:border-border/40'
                }`}
              >
                {label}
                <span
                  className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[0.5rem] whitespace-nowrap transition-all duration-500 ${
                    isTapped
                      ? 'opacity-50'
                      : 'opacity-0 group-hover:opacity-35'
                  }`}
                  style={{ color: isActive ? 'var(--warmth)' : '#aaa' }}
                >
                  {oneLiner}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
