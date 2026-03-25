'use client';

import { useState } from 'react';
import { NewsletterSignup } from './newsletter-signup';

export function MidArticleCta({ category }: { category?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="my-4">
        <NewsletterSignup variant="inline" category={category} />
      </div>
    );
  }

  return (
    <p className="my-4 text-sm text-muted-foreground inline-flex items-center gap-1.5">
      <svg viewBox="0 0 48 48" width={16} height={16} fill="none" className="shrink-0">
        <circle cx="24" cy="24" r="14" fill="currentColor" className="text-gold/30" />
        <circle cx="24" cy="24" r="8" fill="currentColor" className="text-gold" />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-gold">
          <line x1="24" y1="4" x2="24" y2="8" />
          <line x1="13" y1="9" x2="15.5" y2="12" />
          <line x1="35" y1="9" x2="32.5" y2="12" />
          <line x1="7" y1="24" x2="11" y2="24" />
          <line x1="37" y1="24" x2="41" y2="24" />
        </g>
      </svg>
      <span>Všeč? </span>
      <button
        onClick={() => setExpanded(true)}
        className="text-warmth font-medium hover:text-warmth/70 transition-colors"
      >
        Vsak dan ena taka.
      </button>
    </p>
  );
}
