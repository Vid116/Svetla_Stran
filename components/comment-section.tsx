"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { komentarjiCount } from "@/lib/article-helpers";

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
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "pravkar";
  if (diffMin < 60) return `pred ${diffMin} min`;
  if (diffHours < 24) return `pred ${diffHours} ${diffHours === 1 ? "uro" : diffHours === 2 ? "urama" : "urami"}`;
  return `pred ${diffDays} ${diffDays === 1 ? "dnem" : diffDays === 2 ? "dnevoma" : "dnevi"}`;
}

/* ── Self-contained comment form (used for top-level AND replies) ── */

function CommentForm({
  isEditor,
  editorName,
  onSubmit,
  onCancel,
  submitLabel = "Objavi komentar",
  compact = false,
}: {
  isEditor: boolean;
  editorName: string | null;
  onSubmit: (name: string, body: string) => Promise<"approved" | "pending" | "error">;
  onCancel?: () => void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("svetla_comment_name");
    if (saved) setName(saved);
  }, []);

  useEffect(() => {
    if (compact && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [compact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = isEditor ? (editorName || "") : name.trim();
    if (!trimmedName || !body.trim() || posting) return;

    if (!isEditor) {
      localStorage.setItem("svetla_comment_name", trimmedName);
    }

    setPosting(true);
    setMessage(null);

    const result = await onSubmit(trimmedName, body.trim());

    if (result === "approved") {
      setBody("");
      if (onCancel) onCancel();
    } else if (result === "pending") {
      setBody("");
      setMessage("Hvala! Komentar čaka na odobritev.");
      setTimeout(() => {
        setMessage(null);
        if (onCancel) onCancel();
      }, 3000);
    }

    setPosting(false);
  };

  const rows = compact ? 2 : 4;

  return (
    <form onSubmit={handleSubmit} className={compact ? "" : "mb-10"}>
      {isEditor ? (
        <p className="text-xs text-muted-foreground mb-2">
          Objavljaš kot <span className="font-medium text-foreground">{editorName}</span>
        </p>
      ) : (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tvoje ime"
          maxLength={50}
          className={`rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2 ${
            compact ? "w-full max-w-[200px]" : "w-full max-w-xs"
          }`}
        />
      )}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          placeholder={compact ? "Tvoj odgovor…" : "Tvoj komentar…"}
          rows={rows}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
        {body.length > 1800 && (
          <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">
            {body.length} / 2000
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          disabled={posting || (!isEditor && !name.trim()) || !body.trim()}
          className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-not-allowed ${
            compact ? "text-xs px-3 py-1.5" : ""
          }`}
        >
          {posting ? "…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Prekliči
          </button>
        )}
        {message && (
          <span className="text-xs text-nature font-medium">{message}</span>
        )}
      </div>
    </form>
  );
}

/* ── Single comment card ── */

function CommentCard({
  comment,
  isEditor,
  isReplyOpen,
  onToggleReply,
  onModerate,
  onDelete,
  hideReply,
}: {
  comment: Comment;
  isEditor: boolean;
  isReplyOpen: boolean;
  onToggleReply: () => void;
  onModerate: (id: string, action: "approve" | "reject") => void;
  onDelete: (id: string) => void;
  hideReply?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-foreground">
          {comment.author_name}
        </span>
        {comment.author_type === "editor" && (
          <span className="inline-flex items-center rounded-full bg-sky/20 px-2 py-0.5 text-[10px] font-medium" style={{ color: "var(--color-primary)" }}>
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

      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-2">
        {comment.body}
      </p>

      {isEditor && comment.status === "rejected" && comment.rejection_reason && (
        <p className="text-xs text-muted-foreground mb-2">
          Razlog: {comment.rejection_reason}
        </p>
      )}

      <div className="flex items-center gap-3">
        {!hideReply && (
          <button
            type="button"
            onClick={onToggleReply}
            className={`text-xs transition-colors cursor-pointer ${
              isReplyOpen ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Odgovori
          </button>
        )}

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

/* ── Main section ── */

export function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [myPending, setMyPending] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditor, setIsEditor] = useState(false);
  const [editorName, setEditorName] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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
    fetchComments();
  }, [fetchComments]);

  const submitComment = async (name: string, body: string, parentId?: string | null): Promise<"approved" | "pending" | "error"> => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          parentId: parentId || null,
          authorName: name,
          body,
        }),
      });
      if (!res.ok) return "error";

      const comment = await res.json();
      if (comment.status === "approved") {
        await fetchComments();
        return "approved";
      }
      // Show pending comment optimistically to the visitor
      setMyPending((prev) => [...prev, comment]);
      return "approved"; // Tell the form it succeeded (so it clears)
    } catch {
      return "error";
    }
  };

  const handleModerate = async (id: string, action: "approve" | "reject") => {
    try {
      await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: id, action }),
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

  // Merge server comments with optimistic pending ones (avoid dupes if page refreshed)
  const serverIds = new Set(comments.map((c) => c.id));
  const allComments = [...comments, ...myPending.filter((c) => !serverIds.has(c.id))];

  const topLevel = allComments.filter((c) => !c.parent_id);
  const replies = allComments.filter((c) => c.parent_id);
  const getReplies = (parentId: string) => replies.filter((c) => c.parent_id === parentId);
  const myPendingIds = new Set(myPending.map((c) => c.id));

  const visibleCount = isEditor
    ? allComments.length
    : allComments.filter((c) => c.status === "approved" || myPendingIds.has(c.id)).length;

  return (
    <section id="komentarji" className="border-t border-border/30 mt-14 pt-10 mx-auto max-w-3xl px-6 pb-12">
      <h2 className="text-xl font-semibold text-foreground mb-8">
        {visibleCount > 0 ? komentarjiCount(visibleCount) : "Komentarji"}
      </h2>

      {/* Top-level comment form */}
      <CommentForm
        isEditor={isEditor}
        editorName={editorName}
        onSubmit={(name, body) => submitComment(name, body)}
        submitLabel="Objavi komentar"
      />

      {/* Comment list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Nalagam…</p>
      ) : visibleCount === 0 ? (
        <p className="text-sm text-muted-foreground/60">
          Še ni komentarjev. Bodi prvi.
        </p>
      ) : (
        <div className="space-y-6">
          {topLevel.map((comment) => {
            const isMine = myPendingIds.has(comment.id);
            if (!isEditor && comment.status !== "approved" && !isMine) return null;
            return (
              <div key={comment.id} className={isMine && comment.status === "pending" ? "opacity-75" : ""}>
                {isMine && comment.status === "pending" && (
                  <p className="text-[11px] text-muted-foreground/50 mb-1">Čaka na odobritev</p>
                )}
                <CommentCard
                  comment={comment}
                  isEditor={isEditor}
                  isReplyOpen={replyingTo === comment.id}
                  onToggleReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  onModerate={handleModerate}
                  onDelete={handleDelete}
                />

                {/* Inline reply form */}
                {replyingTo === comment.id && (
                  <div className="ml-8 pl-4 border-l-2 border-border/30 mt-3">
                    <CommentForm
                      isEditor={isEditor}
                      editorName={editorName}
                      onSubmit={(name, body) => submitComment(name, body, comment.id)}
                      onCancel={() => setReplyingTo(null)}
                      submitLabel="Odgovori"
                      compact
                    />
                  </div>
                )}

                {/* Replies */}
                {getReplies(comment.id).map((reply) => {
                  const isMyReply = myPendingIds.has(reply.id);
                  if (!isEditor && reply.status !== "approved" && !isMyReply) return null;
                  return (
                    <div key={reply.id} className={`ml-8 pl-4 border-l-2 border-border/30 mt-3 ${isMyReply && reply.status === "pending" ? "opacity-75" : ""}`}>
                      {isMyReply && reply.status === "pending" && (
                        <p className="text-[11px] text-muted-foreground/50 mb-1">Čaka na odobritev</p>
                      )}
                      <CommentCard
                        comment={reply}
                        isEditor={isEditor}
                        isReplyOpen={false}
                        onToggleReply={() => {}}
                        onModerate={handleModerate}
                        onDelete={handleDelete}
                        hideReply
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
