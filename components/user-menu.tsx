"use client";

import { useEffect, useState } from "react";

export function UserMenu() {
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setDisplayName(data.name || data.username);
      })
      .catch(() => {});
  }, []);

  if (!displayName) return null;

  async function handleSignOut() {
    await fetch("/api/me", { method: "DELETE" });
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
