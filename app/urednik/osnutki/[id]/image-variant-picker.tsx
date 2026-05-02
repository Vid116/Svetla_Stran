"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { url: string; prompt: string } | null;

export type ImageVariants = {
  watercolor: Variant;
  photo: Variant;
  chosen: "watercolor" | "photo" | null;
};

export function ImageVariantPicker({
  draftId,
  variants,
}: {
  draftId: string;
  variants: ImageVariants;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"watercolor" | "photo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = variants.chosen ?? "watercolor";

  async function pick(which: "watercolor" | "photo") {
    if (which === chosen || busy) return;
    const target = variants[which];
    if (!target) return;

    setBusy(which);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId,
          ai_image_url: target.url,
          ai_image_variants: { ...variants, chosen: which },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Napaka pri menjavi");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (!variants.watercolor && !variants.photo) return null;

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 px-1">
        Slog
      </span>
      <VariantButton
        label="Akvarel"
        active={chosen === "watercolor"}
        disabled={!variants.watercolor || busy === "watercolor"}
        loading={busy === "watercolor"}
        onClick={() => pick("watercolor")}
      />
      <VariantButton
        label="Foto"
        active={chosen === "photo"}
        disabled={!variants.photo || busy === "photo"}
        loading={busy === "photo"}
        onClick={() => pick("photo")}
      />
      {error && <span className="text-[10px] text-destructive ml-1">{error}</span>}
    </div>
  );
}

function VariantButton({
  label,
  active,
  disabled,
  loading,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-medium rounded-md px-2.5 py-1 transition-all ${
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-foreground/70 hover:bg-foreground/10 disabled:opacity-40 disabled:cursor-not-allowed"
      }`}
    >
      {loading ? "..." : label}
    </button>
  );
}
