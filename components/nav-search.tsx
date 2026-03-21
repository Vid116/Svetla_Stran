"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export function NavSearch() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="flex-1 max-w-xs">
      {expanded ? (
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => { if (!query) setExpanded(false); }}
            autoFocus
            placeholder="Poišči zgodbe..."
            className="w-full pl-9 pr-8 py-1.5 rounded-full bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setExpanded(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 pl-9 pr-4 py-1.5 rounded-full bg-muted/40 border border-border/50 text-sm text-muted-foreground/40 cursor-pointer hover:border-border hover:text-muted-foreground transition-all relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" />
          Poišči zgodbe...
        </button>
      )}
    </div>
  );
}
