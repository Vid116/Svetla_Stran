'use client';

import { useState, useCallback } from 'react';
import { ANTIDOTE_LABELS, ANTIDOTE_CLOUD_COLORS } from '@/lib/article-helpers';

// Same cloud puff shapes as article-grid.tsx — 7 distinct ones for the antidotes
const CLOUD_PUFFS: [number, number, number][][] = [
  // shape 0 — slightly bigger top
  [
    [7,10,16], [20,10,18], [33,10,20], [46,10,20], [59,10,20], [72,10,18], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
  // shape 1 — bigger left-top
  [
    [7,10,18], [20,10,20], [33,10,20], [46,10,18], [59,10,16], [72,10,16], [85,10,14],
    [96,38,16], [96,62,16],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,20], [4,38,20],
  ],
  // shape 2 — bigger right-top
  [
    [7,10,14], [20,10,14], [33,10,16], [46,10,18], [59,10,20], [72,10,20], [85,10,18],
    [96,38,20], [96,62,20],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,16], [4,38,16],
  ],
  // shape 3 — dome top
  [
    [7,10,14], [20,10,16], [33,10,18], [46,10,20], [59,10,20], [72,10,18], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,14], [72,90,14], [59,90,14], [46,90,14], [33,90,14], [20,90,14],
    [4,62,18], [4,38,18],
  ],
  // shape 4 — twin bumps
  [
    [7,10,16], [20,10,18], [33,10,20], [46,10,16], [59,10,16], [72,10,20], [85,10,18],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
  // shape 5 — even all around
  [
    [7,10,18], [20,10,18], [33,10,18], [46,10,18], [59,10,18], [72,10,18], [85,10,18],
    [96,38,18], [96,62,18],
    [85,90,18], [72,90,18], [59,90,18], [46,90,18], [33,90,18], [20,90,18],
    [4,62,18], [4,38,18],
  ],
  // shape 6 — one bigger bump center-top (playful for Nasmeh)
  [
    [7,10,16], [20,10,16], [33,10,18], [46,10,22], [59,10,18], [72,10,16], [85,10,16],
    [96,38,18], [96,62,18],
    [85,90,16], [72,90,16], [59,90,16], [46,90,16], [33,90,16], [20,90,16],
    [4,62,18], [4,38,18],
  ],
];

interface EmotionSectionProps {
  activeAntidote: string | null;
  onSelect: (antidote: string | null) => void;
}

export function EmotionSection({ activeAntidote, onSelect }: EmotionSectionProps) {
  const antidotes = Object.entries(ANTIDOTE_LABELS);
  // Track which cloud was tapped on mobile (for whisper flash)
  const [tapped, setTapped] = useState<string | null>(null);

  const handleTap = useCallback((key: string) => {
    // Flash the whisper on mobile
    setTapped(key);
    setTimeout(() => setTapped(null), 1500);
    const isActive = activeAntidote === key;
    onSelect(isActive ? null : key);
  }, [activeAntidote, onSelect]);

  return (
    <section className="py-8">
      <h2 className="mb-6 text-center font-brand text-xl font-semibold text-foreground/90 sm:text-2xl">
        Kaj potrebuješ danes?
      </h2>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-7">
        {antidotes.map(([key, { label, oneLiner }], i) => {
          const isActive = activeAntidote === key;
          const colors = ANTIDOTE_CLOUD_COLORS[key];
          const puffs = CLOUD_PUFFS[i % CLOUD_PUFFS.length];
          const bg = isActive ? colors.fill : colors.soft;
          const fg = isActive ? colors.activeText : colors.text;
          const isTapped = tapped === key;

          return (
            <div key={key} className="group flex flex-col items-center">
              {/* Cloud button */}
              <button
                onClick={() => handleTap(key)}
                className="relative cursor-pointer transition-all duration-300 group-hover:-translate-y-1.5 active:translate-y-0"
                style={{ color: fg }}
              >
                {/* Puffs */}
                {puffs.map((p, j) => (
                  <div
                    key={j}
                    className="absolute rounded-full transition-colors duration-300"
                    style={{
                      left: `${p[0]}%`,
                      top: `${p[1]}%`,
                      width: `${p[2]}%`,
                      aspectRatio: '1',
                      backgroundColor: bg,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                ))}
                {/* Inner fill */}
                <div
                  className="absolute transition-colors duration-300"
                  style={{
                    inset: '10% 4%',
                    borderRadius: '40%',
                    backgroundColor: bg,
                  }}
                />
                {/* Label */}
                <span className="relative z-10 inline-flex items-center px-7 py-3.5 text-sm font-semibold whitespace-nowrap">
                  {label}
                </span>
              </button>
              {/* Whisper — invisible, reveals on hover (desktop) or tap flash (mobile) */}
              <span
                className={`mt-1 text-[0.6rem] leading-tight text-center transition-all duration-500 ${
                  isTapped
                    ? 'opacity-60'
                    : 'opacity-0 group-hover:opacity-40'
                }`}
                style={{ color: colors.whisper, maxWidth: '100px' }}
              >
                {oneLiner}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
