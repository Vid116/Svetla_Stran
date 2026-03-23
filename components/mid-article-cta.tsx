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
    <p className="my-4 text-sm text-muted-foreground">
      <span>☀️ Všeč? </span>
      <button
        onClick={() => setExpanded(true)}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        Vsak dan ena taka.
      </button>
    </p>
  );
}
