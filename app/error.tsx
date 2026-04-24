"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Sun } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-24">
      <Sun className="w-12 h-12 text-gold/40 mb-6" aria-hidden />
      <p className="text-2xl font-light text-foreground mb-3">
        Nekaj se je zalomilo.
      </p>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Tudi pri nas se zgodi. Poskusi znova ali se vrni na začetek — zgodbe te čakajo.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-amber-600 text-white px-6 py-2.5 text-sm font-semibold transition-all hover:scale-105 hover:bg-amber-500 active:scale-100 cursor-pointer"
        >
          Poskusi znova
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
        >
          Na začetek
        </Link>
      </div>
    </main>
  );
}
