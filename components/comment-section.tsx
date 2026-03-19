"use client";

import { useState, useEffect, useCallback } from "react";

interface Comment {
  id: string;
  article_id: string;
  parent_id: string | null;
  author_name: string;
  author_type: "visitor" | "editor" | "ai";
  body: string;
  status: "approved" | "pending" | "rejected";
  rejection_reason?: string | null;
  created_at: string;
}

function relativeDate(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "pravkar";
  if (diffMin < 60) return `pred ${diffMin} min`;
  if (diffHours < 24) return `pred ${diffHours} ${diffHours === 1 ? "uro" : diffHours === 2 ? "urama" : "urami"}`;
  return `pred ${diffDays} ${diffDays === 1 ? "dnem" : "dnevi"}`;
}

export function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [editorName, setEditorName] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments ?? []);
      setIsEditor(data.isEditor ?? false);
      setEditorName(data.editorName ?? null);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    const saved = localStorage.getItem("svetla_comment_name");
    if (saved) setAuthorName(saved);
    fetchComments();
  }, [fetchComments]);

  const handleNameBlur = () => {
    const trimmed = authorName.trim();
    if (trimmed) {
      localStorage.setItem("svetla_comment_name", trimmed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = isEditor ? editorName : authorName.trim();
    if (!name || !body.trim() || posting) return;

    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          body: body.trim(),
          authorName: isEditor ? undefined : name,
        }),
      });
      if (!res.ok) return;

      setBody("");
      if (isEditor) {
        await fetchComments();
      } else {
        setPendingMessage("Hvala! Komentar čaka na odobritev.");
        setTimeout(() => setPendingMessage(null), 5000);
      }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    const name = isEditor ? editorName : authorName.trim();
    if (!name || !replyBody.trim() || posting) return;

    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          parentId,
          body: replyBody.trim(),
          authorName: isEditor ? undefined : name,
        }),
      });
      if (!res.ok) return;

      setReplyBody("");
      setReplyingTo(null);
      if (isEditor) {
        await fetchComments();
      } else {
        setPendingMessage("Hvala! Komentar čaka na odobritev.");
        setTimeout(() => setPendingMessage(null), 5000);
      }
    } catch {
      // silent
    } finally {
      setPosting(false);
    }
  };

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    try {
      await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await fetchComments();
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
      await fetchComments();
    } catch {
      // silent
    }
  };

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);
  const getReplies = (parentId: string) =>
    replies.filter((c) => c.parent_id === parentId);

  const visibleCount = isEditor
    ? comments.length
    : comments.filter((c) => c.status === "approved").length;

  return (
    <section className="border-t border-border/30 mt-14 pt-10">
      <h2 className="text-xl font-semibold text-foreground mb-8">
        Komentarji
      </h2>

      {/* ── Comment form ── */}
      <form onSubmit={handleSubmit} className="mb-10">
        {!isEditor && (
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Vaše ime"
            className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-3"
          />
        )}
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 2000))}
            placeholder="Vaš komentar..."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          />
          {body.length > 1800 && (
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {body.length} / 2000
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            type="submit"
            disabled={posting || (!isEditor && !authorName.trim()) || !body.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-not-allowed"
          >
            {posting ? "Objavljanje..." : "Objavi komentar"}
          </button>
          {pendingMessage && (
            <span className="text-sm text-nature font-medium">
              {pendingMessage}
            </span>
          )}
        </div>
      </form>

      {/* ── Comment list ── */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Nalaganje komentarjev...</p>
      ) : visibleCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Še ni komentarjev. Bodite prvi!
        </p>
      ) : (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-6">
            {visibleCount} {visibleCount === 1 ? "komentar" : visibleCount === 2 ? "komentarja" : visibleCount <= 4 ? "komentarji" : "komentarjev"}
          </h3>
          <div className="space-y-6">
            {topLevel.map((comment) => {
              // Visitors only see approved comments
              if (!isEditor && comment.status !== "approved") return null;
              return (
                <div key={comment.id}>
                  <CommentCard
                    comment={comment}
                    isEditor={isEditor}
                    onReply={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                      setReplyBody("");
                    }}
                    onModerate={handleModerate}
                    onDelete={handleDelete}
                  />

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="ml-8 pl-4 border-l-2 border-border/30 mt-3">
                      {!isEditor && !authorName.trim() && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Najprej vnesite ime zgoraj.
                        </p>
                      )}
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value.slice(0, 2000))}
                        placeholder="Vaš odgovor..."
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleReply(comment.id)}
                          disabled={posting || (!isEditor && !authorName.trim()) || !replyBody.trim()}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        >
                          Odgovori
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                          className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          Prekliči
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {getReplies(comment.id).map((reply) => {
                    if (!isEditor && reply.status !== "approved") return null;
                    return (
                      <div key={reply.id} className="ml-8 pl-4 border-l-2 border-border/30 mt-3">
                        <CommentCard
                          comment={reply}
                          isEditor={isEditor}
                          onReply={() => {
                            setReplyingTo(replyingTo === reply.id ? null : reply.id);
                            setReplyBody("");
                          }}
                          onModerate={handleModerate}
                          onDelete={handleDelete}
                        />
                        {/* Nested reply form */}
                        {replyingTo === reply.id && (
                          <div className="mt-3">
                            <textarea
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value.slice(0, 2000))}
                              placeholder="Vaš odgovor..."
                              rows={3}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleReply(comment.id)}
                                disabled={posting || (!isEditor && !authorName.trim()) || !replyBody.trim()}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                              >
                                Odgovori
                              </button>
                              <button
                                type="button"
                                onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                Prekliči
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* ── Single comment card ── */

function CommentCard({
  comment,
  isEditor,
  onReply,
  onModerate,
  onDelete,
}: {
  comment: Comment;
  isEditor: boolean;
  onReply: () => void;
  onModerate: (id: string, action: "approve" | "reject") => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group">
      {/* Header: name, badge, date */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-foreground">
          {comment.author_name}
        </span>
        {comment.author_type === "editor" && (
          <span className="inline-flex items-center rounded-full bg-sky/20 text-sky-soft px-2 py-0.5 text-[10px] font-medium" style={{ color: "var(--color-primary)" }}>
            Urednik
          </span>
        )}
        {comment.author_type === "ai" && (
          <span className="inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-medium text-gold-foreground">
            Svetla Stran
          </span>
        )}
        {isEditor && comment.status === "pending" && (
          <span className="inline-flex items-center rounded-full bg-warmth/60 px-2 py-0.5 text-[10px] font-medium text-warmth-foreground">
            Čaka
          </span>
        )}
        {isEditor && comment.status === "rejected" && (
          <span className="inline-flex items-center rounded-full bg-rose/40 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Zavrnjeno
          </span>
        )}
        <span className="text-xs text-muted-foreground/50">
          {relativeDate(comment.created_at)}
        </span>
      </div>

      {/* Body */}
      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-2">
        {comment.body}
      </p>

      {/* Rejection reason */}
      {isEditor && comment.status === "rejected" && comment.rejection_reason && (
        <p className="text-xs text-muted-foreground mb-2">
          Razlog: {comment.rejection_reason}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReply}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Odgovori
        </button>

        {isEditor && comment.status === "pending" && (
          <>
            <button
              type="button"
              onClick={() => onModerate(comment.id, "approve")}
              className="text-xs font-medium text-nature-foreground hover:text-nature transition-colors cursor-pointer"
            >
              Odobri
            </button>
            <button
              type="button"
              onClick={() => onModerate(comment.id, "reject")}
              className="text-xs font-medium text-destructive hover:opacity-70 transition-opacity cursor-pointer"
            >
              Zavrni
            </button>
          </>
        )}

        {isEditor && (
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer"
          >
            Izbriši
          </button>
        )}
      </div>
    </div>
  );
}
