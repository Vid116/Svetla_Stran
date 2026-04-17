"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export function NavSearch({ basePath = "/" }: { basePath?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [expanded, setExpanded] = useState(!!initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Live search — push to URL as user types (debounced)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed.length >= 2) {
        router.push(`${basePath}?q=${encodeURIComponent(trimmed)}`, { scroll: false });
      } else if (trimmed.length === 0 && initialQ) {
        router.push(basePath, { scroll: false });
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleClear() {
    setQuery("");
    setExpanded(false);
    if (initialQ) {
      router.push(basePath, { scroll: false });
    }
  }

  return (
    <div className="flex-1 max-w-xs">
      {expanded ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Poišči zgodbe..."
            className="w-full pl-9 pr-8 py-1.5 rounded-full bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground cursor-pointer p-0.5"
            aria-label="Zapri iskanje"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
