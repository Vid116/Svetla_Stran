'use client';

import { useCallback, useRef, useState } from 'react';
import { ANTIDOTE_LABELS, ANTIDOTE_CLOUD_COLORS } from '@/lib/article-helpers';

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
            const colors = ANTIDOTE_CLOUD_COLORS[key];
            const isTapped = tapped === key;

            return (
              <button
                key={key}
                onClick={() => handleTap(key)}
                className={`group relative flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 border ${
                  isActive
                    ? 'shadow-sm scale-105 border-2'
                    : 'hover:-translate-y-0.5'
                }`}
                style={{
                  // Outline style: transparent bg, colored border + text
                  // Active: filled with soft color
                  backgroundColor: isActive ? colors.soft : 'transparent',
                  color: isActive ? colors.activeText : colors.text,
                  borderColor: isActive ? colors.fill : `${colors.text}30`,
                }}
              >
                {label}
                <span
                  className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[0.5rem] whitespace-nowrap transition-all duration-500 ${
                    isTapped
                      ? 'opacity-50'
                      : 'opacity-0 group-hover:opacity-35'
                  }`}
                  style={{ color: colors.whisper }}
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
