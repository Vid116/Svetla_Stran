"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { THEMES, formatDate } from "@/lib/article-helpers";

interface Reserve {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  image_url?: string;
  ai_image_url?: string;
  sunday_fit_score?: number | null;
  sunday_fit_dimensions?: any;
  sunday_reserved_for?: string;
}

interface SwapCandidate {
  id: string;
  title: string;
  subtitle?: string;
  sunday_fit_score?: number | null;
}

export function SundayReserveCard({
  reserve,
  candidates,
}: {
  reserve: Reserve | null;
  candidates: SwapCandidate[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = THEMES["nedeljska-zgodba"];
  const score = reserve?.sunday_fit_score != null ? Number(reserve.sunday_fit_score) : null;
  const rationale = (reserve?.sunday_fit_dimensions as any)?.rationale;
  const dimensions = (reserve?.sunday_fit_dimensions as any)?.dimensions;

  const scoreBadge =
    score == null
      ? { bg: "#e5e5e5", color: "#666", label: "Brez ocene" }
      : score >= 78
      ? { bg: "#dcfce7", color: "#166534", label: "Odlična" }
      : score >= 60
      ? { bg: "#fef3c7", color: "#92400e", label: "Solidna" }
      : { bg: "#fee2e2", color: "#991b1b", label: "Tanka" };

  async function callApi(payload: any) {
    setError(null);
    try {
      const res = await fetch("/api/sunday-reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka");
      }
      startTransition(() => router.refresh());
      setShowPicker(false);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function release() {
    if (!reserve) return;
    if (!confirm("Sprostiti rezervacijo? Osnutek bo ostal v navadni vrsti.")) return;
    callApi({ action: "release", draftId: reserve.id });
  }

  function swap(newDraftId: string) {
    callApi({ action: "swap", draftId: newDraftId, currentReserveId: reserve?.id || null });
  }

  // Empty state
  if (!reserve) {
    return (
      <section
        className="mb-8 rounded-2xl border border-dashed p-6"
        style={{ borderColor: `${theme.colors.fill}40`, backgroundColor: `${theme.colors.soft}40` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-semibold tracking-[2.5px] uppercase mb-2"
              style={{ color: theme.colors.text }}
            >
              Nedeljska zgodba · rezerva
            </p>
            <p className="text-sm text-muted-foreground">
              Trenutno ni rezervirane zgodbe za prihajajočo nedeljo. Nova dolga zgodba iz cevi bo samodejno zasedla mesto.
            </p>
          </div>
          {candidates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPicker((s) => !s)}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.colors.fill, color: theme.colors.activeText }}
            >
              Izberi ročno
            </button>
          )}
        </div>
        {showPicker && (
          <SwapPicker candidates={candidates} onPick={swap} disabled={isPending} />
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </section>
    );
  }

  const imageUrl = reserve.ai_image_url || reserve.image_url;

  return (
    <section
      className="mb-8 rounded-2xl overflow-hidden"
      style={{ backgroundColor: `${theme.colors.soft}40`, border: `1px solid ${theme.colors.fill}40` }}
    >
      <div className="flex flex-col md:flex-row gap-0">
        {/* Image */}
        <div className="relative md:w-56 h-48 md:h-auto shrink-0">
          {imageUrl ? (
            <SafeImage
              src={imageUrl}
              className="absolute inset-0 w-full h-full object-cover"
              fallback={<div className="absolute inset-0" style={{ backgroundColor: theme.colors.soft }} />}
            />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: theme.colors.soft }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p
                className="text-[11px] font-semibold tracking-[2.5px] uppercase"
                style={{ color: theme.colors.text }}
              >
                Nedeljska zgodba · rezerva
              </p>
              {reserve.sunday_reserved_for && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Za nedeljo {formatDate(reserve.sunday_reserved_for)}
                </p>
              )}
            </div>
            <div
              className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: scoreBadge.bg, color: scoreBadge.color }}
              title={scoreBadge.label}
            >
              {score != null ? `${Math.round(score)}/100` : "—"}
            </div>
          </div>

          <Link
            href={`/urednik/osnutki/${reserve.id}`}
            className="block group"
          >
            <h3 className="text-lg md:text-xl font-semibold leading-tight mb-1 group-hover:underline">
              {reserve.title}
            </h3>
            {reserve.subtitle && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                {reserve.subtitle}
              </p>
            )}
          </Link>

          {dimensions && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
              <span>brezčasnost {dimensions.timelessness}/10</span>
              <span>lok {dimensions.narrative}/10</span>
              <span>globina {dimensions.depth}/10</span>
              <span>počasno {dimensions.slowRead}/10</span>
              <span>neočitno {dimensions.nonObvious}/10</span>
              <span>slika {dimensions.image}/10</span>
            </div>
          )}

          {rationale && (
            <p className="text-xs italic text-muted-foreground mb-4 leading-relaxed">
              &ldquo;{rationale}&rdquo;
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPicker((s) => !s)}
              disabled={isPending || candidates.length === 0}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.colors.fill, color: theme.colors.activeText }}
            >
              Zamenjaj
            </button>
            <button
              type="button"
              onClick={release}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-full font-medium border transition-all disabled:opacity-50 hover:bg-muted"
              style={{ borderColor: `${theme.colors.text}30`, color: theme.colors.text }}
            >
              Sprosti
            </button>
            <Link
              href={`/urednik/osnutki/${reserve.id}`}
              className="text-xs px-3 py-1.5 rounded-full font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Odpri osnutek &rarr;
            </Link>
          </div>
        </div>
      </div>

      {showPicker && (
        <div className="border-t px-5 md:px-6 py-4" style={{ borderColor: `${theme.colors.fill}30` }}>
          <SwapPicker candidates={candidates} onPick={swap} disabled={isPending} />
        </div>
      )}

      {error && <p className="px-5 md:px-6 pb-4 text-xs text-destructive">{error}</p>}
    </section>
  );
}

function SwapPicker({
  candidates,
  onPick,
  disabled,
}: {
  candidates: SwapCandidate[];
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  if (candidates.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Ni drugih dolgih osnutkov za zamenjavo.
      </p>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground/70 mb-2">
        Drugi dolgi osnutki
      </p>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {candidates.map((c) => {
          const score = c.sunday_fit_score != null ? Math.round(Number(c.sunday_fit_score)) : null;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              disabled={disabled}
              className="w-full text-left px-3 py-2 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug truncate">{c.title}</p>
                  {c.subtitle && (
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-1 mt-0.5">
                      {c.subtitle}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                  {score != null ? `${score}/100` : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
