"use client";

import { useState, useEffect } from "react";
import { Sun } from "lucide-react";

export function StickySubscribeBar() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  useEffect(() => {
    function onScroll() {
      const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      setVisible(scrollPct > 0.35);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      if (res.ok) {
        setStatus("success");
        setEmail("");
        setTimeout(() => setDismissed(true), 2500);
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("idle");
    }
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/50 bg-card/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="px-4 py-3">
        {status === "success" ? (
          <div className="flex items-center justify-center gap-2">
            <Sun className="w-4 h-4 text-gold" aria-hidden />
            <p className="text-sm font-medium text-nature">Ste znotraj!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-gold shrink-0" aria-hidden />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.si"
              required
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {status === "loading" ? "..." : "Naroči se"}
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors p-1"
              aria-label="Zapri"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
