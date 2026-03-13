"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublishedArticle {
  id: string;
  headline_id: string;
  title: string;
  subtitle: string;
  slug: string;
  image_url: string | null;
  category: string | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  created_at: string;
}

const CATEGORIES: Record<string, { label: string; color: string }> = {
  SPORT: { label: "Sport", color: "bg-sky text-sky-foreground" },
  ZIVALI: { label: "Zivali", color: "bg-warmth text-warmth-foreground" },
  SKUPNOST: { label: "Skupnost", color: "bg-lavender text-lavender-foreground" },
  NARAVA: { label: "Narava", color: "bg-nature text-nature-foreground" },
  INFRASTRUKTURA: { label: "Infrastruktura", color: "bg-gold text-gold-foreground" },
  PODJETNISTVO: { label: "Podjetnistvo", color: "bg-gold text-gold-foreground" },
  SLOVENIJA_V_SVETU: { label: "Slovenija v svetu", color: "bg-sky text-sky-foreground" },
  JUNAKI: { label: "Junaki", color: "bg-rose text-rose-foreground" },
  KULTURA: { label: "Kultura", color: "bg-lavender text-lavender-foreground" },
};

export function PublishedView() {
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/stories?view=published");
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-lg">Nalagam objavljene clanke...</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-base">Se ni objavljenih clankov.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3 border-b border-border/40 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Objavljeni clanki</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-nature/20 text-nature px-1.5 text-xs font-semibold">
          {articles.length}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((article) => (
          <PublishedCard
            key={article.id}
            article={article}
            onRefresh={fetchArticles}
          />
        ))}
      </div>
    </div>
  );
}

function PublishedCard({
  article,
  onRefresh,
}: {
  article: PublishedArticle;
  onRefresh: () => void;
}) {
  const [unpublishing, setUnpublishing] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catInfo = CATEGORIES[article.category || ""] || { label: article.category || "Drugo", color: "bg-muted" };

  const date = new Date(article.published_at || article.created_at).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function handleUnpublish() {
    if (!confirm("Umakni ta clanek? Clanek bo izbrisan iz objavljenih.")) return;
    setUnpublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/stories?view=unpublish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka");
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnpublishing(false);
    }
  }

  async function handleRerun() {
    if (!confirm("Ponovi raziskavo in pisanje za ta clanek?")) return;
    setRerunning(true);
    setError(null);
    try {
      // First unpublish (moves headline back), then trigger research
      const res = await fetch("/api/stories?view=rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Napaka");
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRerunning(false);
    }
  }

  return (
    <Card className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary" className={`rounded-full text-xs font-medium ${catInfo.color}`}>
            {catInfo.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{date}</span>
        </div>

        <h3 className="mb-1 text-sm font-semibold leading-snug text-foreground">
          {article.title}
        </h3>
        {article.subtitle && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-1">{article.subtitle}</p>
        )}
        <p className="mb-3 text-xs text-muted-foreground/70">{article.source_name}</p>

        {error && (
          <div className="mb-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href={`/clanki/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/20"
          >
            Odpri
          </a>
          <button
            onClick={handleRerun}
            disabled={rerunning || unpublishing}
            className="rounded-lg bg-sky/10 px-3 py-1.5 text-xs font-medium text-sky-foreground transition-all hover:bg-sky/20 disabled:opacity-50"
          >
            {rerunning ? "Ponavljam..." : "Ponovi"}
          </button>
          <button
            onClick={handleUnpublish}
            disabled={unpublishing || rerunning}
            className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50"
          >
            {unpublishing ? "Umikam..." : "Umakni"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
