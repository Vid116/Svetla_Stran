"use client";

import { useState } from "react";
import { Sun } from "lucide-react";

export function MidArticleCta() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), categories: [] }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="my-8 flex items-center justify-center gap-2 rounded-xl bg-nature/10 px-5 py-3">
        <Sun className="w-4 h-4 text-gold" aria-hidden />
        <p className="text-sm font-medium text-nature">Ste znotraj. Dobrodošli.</p>
      </div>
    );
  }

  return (
    <div className="my-8 rounded-xl border border-border/40 bg-gradient-to-r from-gold-soft/20 via-card to-sky-soft/15 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Ti je všeč? Vsak ponedeljek 5 takih zgodb.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Brez clickbaita. Brez spama. Odjava kadarkoli.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 shrink-0">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.si"
            required
            className="w-40 sm:w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {status === "loading" ? "..." : "Naroči se"}
          </button>
        </form>
      </div>
      {status === "error" && (
        <p className="mt-2 text-xs text-destructive">Nekaj je šlo narobe. Poskusite znova.</p>
      )}
    </div>
  );
}
