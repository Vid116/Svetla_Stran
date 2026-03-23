'use client';

import { ANTIDOTE_LABELS, ANTIDOTE_COLORS } from '@/lib/article-helpers';
import { motion } from 'motion/react';

const ANTIDOTE_ICONS: Record<string, string> = {
  jeza: '🕊️',
  skrb: '☀️',
  cinizem: '💛',
  osamljenost: '🤝',
  obup: '🌱',
  strah: '🦁',
};

interface EmotionSectionProps {
  activeAntidote: string | null;
  onSelect: (antidote: string | null) => void;
}

export function EmotionSection({ activeAntidote, onSelect }: EmotionSectionProps) {
  const antidotes = Object.entries(ANTIDOTE_LABELS);

  return (
    <section className="py-8">
      <h2 className="mb-1 text-center font-brand text-xl font-semibold text-foreground/90 sm:text-2xl">
        Kaj potrebuješ danes?
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Izberi zdravilo za to, kar ti mediji stresajo
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {antidotes.map(([key, { label, oneLiner }]) => {
          const isActive = activeAntidote === key;
          const colors = ANTIDOTE_COLORS[key];
          return (
            <motion.button
              key={key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(isActive ? null : key)}
              className={`flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
                isActive
                  ? `${colors.bg} ${colors.border} border-2 shadow-md`
                  : 'border-border/30 bg-card hover:border-border/60 hover:shadow-sm'
              }`}
            >
              <span className="mb-1 text-2xl">{ANTIDOTE_ICONS[key]}</span>
              <span className={`text-sm font-semibold ${isActive ? colors.text : 'text-foreground/80'}`}>
                {label}
              </span>
              <span className="mt-1 text-xs leading-tight text-muted-foreground">
                {oneLiner}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
