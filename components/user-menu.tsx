"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch editor info from API
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDisplayName(data.name || data.username);
      })
      .catch(() => {});
  }, []);

  if (!displayName) return null;

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = "/prijava";
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>{displayName}</span>
      <button
        onClick={handleSignOut}
        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Odjava
      </button>
    </div>
  );
}
