"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/urednik";
  const [state, formAction, pending] = useActionState(loginAction, null);

  // Redirect on success
  if (state?.success) {
    window.location.href = redirectTo;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Uporabnisko ime
        </label>
        <input
          type="text"
          name="username"
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
          name="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Prijavljam..." : "Prijava"}
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
