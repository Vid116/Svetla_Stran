"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { THEMES, ALL_THEME_SLUGS } from "@/lib/article-helpers";

/**
 * Single-select theme chips for the archive filter. Click toggles: if the
 * chip is already active, it deactivates ("Vse"). Resets ?page= so the user
 * lands on page 1 of the filtered set.
 */
export function ArchiveThemeFilter() {
  const searchParams = useSearchParams();
  const active = searchParams.get("theme");

  function buildHref(slug: string | null): string {
    const next = new URLSearchParams(searchParams.toString());
    if (slug) next.set("theme", slug);
    else next.delete("theme");
    next.delete("page");
    const qs = next.toString();
    return qs ? `/arhiv?${qs}` : "/arhiv";
  }

  const baseChip =
    "rounded-full px-4 py-1.5 text-xs font-medium border shadow-sm transition-all duration-200 hover:-translate-y-0.5";

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Link
        href={buildHref(null)}
        className={`${baseChip} ${
          !active
            ? "bg-foreground text-background border-foreground"
            : "bg-card text-muted-foreground border-border/50 hover:text-foreground"
        }`}
        scroll={false}
      >
        Vse
      </Link>
      {ALL_THEME_SLUGS.map((slug) => {
        const t = THEMES[slug];
        if (!t) return null;
        const isActive = active === slug;
        return (
          <Link
            key={slug}
            href={buildHref(isActive ? null : slug)}
            scroll={false}
            className={baseChip}
            style={
              isActive
                ? {
                    backgroundColor: t.colors.fill,
                    color: t.colors.activeText,
                    borderColor: t.colors.fill,
                  }
                : {
                    backgroundColor: t.colors.soft,
                    color: t.colors.text,
                    borderColor: `${t.colors.fill}40`,
                  }
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
