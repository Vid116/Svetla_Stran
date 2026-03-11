"use client";

import { Suspense, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useSearchParams } from "next/navigation";

function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/urednik";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: `${username}@svetlastran.si`,
      password,
    });

    if (authError) {
      setError("Napacno uporabnisko ime ali geslo");
      setLoading(false);
    } else {
      window.location.href = redirectTo;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Uporabnisko ime
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
          autoComplete="username"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="uporabnisko ime"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Geslo
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Prijavljam..." : "Prijava"}
      </button>
    </form>
  );
}

export default function PrijavaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-soft via-background to-background" />
      <div className="absolute top-1/4 left-1/4 h-64 w-96 rounded-full bg-gold-soft/40 blur-3xl" />
      <div className="absolute top-1/4 right-1/4 h-64 w-96 rounded-full bg-lavender-soft/40 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-2xl border border-border/50 bg-card/90 p-8 shadow-xl backdrop-blur-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            Svetla Stran
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Prijava v uredniski vmesnik
          </p>
        </div>

        <Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Nalagam...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
