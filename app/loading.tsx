import { Sun } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Sun className="w-8 h-8 text-gold/50 animate-pulse" aria-hidden />
        <p className="text-sm">Nalagam…</p>
      </div>
    </div>
  );
}
