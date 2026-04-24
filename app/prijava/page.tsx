import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Prijava",
  robots: { index: false, follow: false },
};

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
            Prijava v uredniški vmesnik
          </p>
        </div>

        <Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground">Nalagam…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
