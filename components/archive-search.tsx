"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Debounced search input for the archive. Merges into existing URL params
 * (preserves theme filter) and resets ?page= when the query changes so the
 * user always lands on the first page of new results.
 */
export function ArchiveSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = query.trim();
      if (trimmed.length >= 2) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }
      next.delete("page");
      const qs = next.toString();
      router.push(qs ? `/arhiv?${qs}` : "/arhiv", { scroll: false });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Poišči po arhivu …"
        className="w-full pl-10 pr-10 py-2.5 rounded-full bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground/40 hover:text-foreground"
          aria-label="Počisti iskanje"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
