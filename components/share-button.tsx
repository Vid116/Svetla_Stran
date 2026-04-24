"use client";

import { useState } from "react";

function useShare(title: string) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return { copied, handleShare };
}

function ShareIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

export function ShareButton({ title }: { title: string }) {
  const { copied, handleShare } = useShare(title);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
      aria-label="Deli zgodbo"
    >
      <ShareIcon copied={copied} />
      <span>{copied ? "Kopirano" : "Deli"}</span>
    </button>
  );
}

export function ShareBar({ title }: { title: string }) {
  const { copied, handleShare } = useShare(title);

  return (
    <button
      onClick={handleShare}
      className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-6 py-4 cursor-pointer transition-all hover:bg-muted/50 hover:border-border/60 group"
    >
      <p className="text-sm font-medium text-foreground">
        {copied ? "Povezava kopirana!" : "Ti je bila zgodba všeč? Deli jo naprej."}
      </p>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-foreground transition-colors">
        <ShareIcon copied={copied} />
        <span>{copied ? "Kopirano" : "Deli"}</span>
      </span>
    </button>
  );
}
