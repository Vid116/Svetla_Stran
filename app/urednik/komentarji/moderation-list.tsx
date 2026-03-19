"use client";

import { useState } from "react";
import Link from "next/link";

interface PendingComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  articles: { title: string; slug: string } | null;
}

function relativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "pravkar";
  if (diffMin < 60) return `pred ${diffMin} min`;
  if (diffHours < 24) return `pred ${diffHours} ${diffHours === 1 ? "uro" : diffHours === 2 ? "urama" : "urami"}`;
  return `pred ${diffDays} ${diffDays === 1 ? "dnem" : "dnevi"}`;
}

export function CommentModerationList({ initialComments }: { initialComments: PendingComment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [acting, setActing] = useState<string | null>(null);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      const res = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, action }),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // silent
    } finally {
      setActing(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // silent
    } finally {
      setActing(null);
    }
  };

  if (comments.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Ni komentarjev, ki čakajo na odobritev.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-border/50 bg-card p-5"
        >
          {/* Article title */}
          <Link
            href={`/clanki/${c.articles?.slug}`}
            className="text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            {c.articles?.title}
          </Link>

          {/* Comment header */}
          <div className="flex items-center gap-2 mt-3 mb-1">
            <span className="text-sm font-semibold text-foreground">
              {c.author_name}
            </span>
            <span className="text-xs text-muted-foreground/50">
              {relativeDate(c.created_at)}
            </span>
          </div>

          {/* Comment body */}
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4">
            {c.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction(c.id, "approve")}
              disabled={acting === c.id}
              className="rounded-lg bg-nature/15 px-4 py-1.5 text-xs font-medium text-nature-foreground hover:bg-nature/25 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Odobri
            </button>
            <button
              onClick={() => handleAction(c.id, "reject")}
              disabled={acting === c.id}
              className="rounded-lg bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Zavrni
            </button>
            <button
              onClick={() => handleDelete(c.id)}
              disabled={acting === c.id}
              className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
            >
              Izbriši
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
