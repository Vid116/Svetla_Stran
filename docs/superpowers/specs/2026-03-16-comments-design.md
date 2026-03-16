# Comments Feature — Design Spec

## Overview

Add public comments to article pages on Svetla Stran. Visitors comment anonymously (name stored in localStorage), AI moderates instantly, editors manage inline on the article page. One level of reply nesting. Editors and AI can reply to comments.

## Database

### `comments` table

```sql
CREATE TABLE comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id        uuid REFERENCES comments(id) ON DELETE CASCADE,
  author_name      text NOT NULL CHECK (char_length(author_name) <= 50),
  author_type      text NOT NULL DEFAULT 'visitor',  -- 'visitor' | 'editor' | 'ai'
  editor_id        uuid REFERENCES editors(id),
  body             text NOT NULL CHECK (char_length(body) <= 2000),
  status           text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  rejection_reason text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_article_status ON comments (article_id, status);
CREATE INDEX idx_comments_parent ON comments (parent_id);
```

- `parent_id` is null for top-level comments, references a top-level comment for replies (one level only).
- `author_type` distinguishes visitors, editors, and AI auto-replies.
- `rejection_reason` is visible to editors only — explains why AI filtered a comment.
- `ON DELETE CASCADE` on both FKs for clean removal.
- `author_name` max 50 chars, `body` max 2000 chars — enforced at DB level and validated server-side.
- `updated_at` tracks moderation actions (approve/reject).
- Indexes on `(article_id, status)` for page loads and `(parent_id)` for threading.
- **No RLS** — all access goes through `getSupabaseAdmin()` (service role), consistent with other tables.

## API

### `POST /api/comments`

Submit a new comment (public).

**Request body:**
```json
{
  "articleId": "uuid",
  "parentId": "uuid | null",
  "authorName": "string",
  "body": "string"
}
```

**Flow:**
1. Validate input: articleId exists, parentId references a top-level comment if set, body non-empty and <= 2000 chars, authorName non-empty and <= 50 chars. Comment bodies rendered as **plain text only** (no HTML).
2. Check auth with `getAuthEditor()` (returns null for visitors — do NOT use `requireAuthAPI()` which would reject anonymous users). This is a new pattern: public-write endpoint with optional auth.
3. If submitter is a logged-in editor, skip moderation — insert as `approved` with `author_type: 'editor'`.
4. Otherwise, call Claude for moderation.
5. **If moderation call fails** (timeout, API error): insert as `pending` so editors can review manually. Never auto-approve on failure.
6. Insert comment with status from moderation result (`approved` or `rejected`).
7. If Claude returned an `autoReply`, insert it as a separate comment with `author_type: 'ai'`, `status: 'approved'`, `parent_id` set to the visitor's comment.
8. Return the inserted comment(s).

**Rate limiting:** Server-side check before moderation — max 5 comments per minute per IP. Query: `SELECT count(*) FROM comments WHERE created_at > now() - interval '1 minute'` filtered by a stored IP hash (or use in-memory counter). Return 429 if exceeded. This prevents Claude API credit abuse.

### `GET /api/comments?articleId=<uuid>`

Fetch comments for an article.

- **Public:** Returns only `approved` comments.
- **Editor (authenticated):** Returns all comments (approved, pending, rejected) with `rejection_reason`.
- Uses `getAuthEditor()` to detect editor (same dual-mode pattern as POST). Returns different result shapes based on auth state.

### `PUT /api/comments`

Moderate a comment (editor only).

**Request body:**
```json
{
  "commentId": "uuid",
  "action": "approve | reject | reply",
  "body": "string (for reply)",
  "rejectionReason": "string (for reject, optional)"
}
```

- `approve`: sets status to `approved`.
- `reject`: sets status to `rejected`, stores reason. **Also rejects all child replies** of the comment (approved replies under a rejected parent become contextless).
- `reply`: inserts a new comment with `author_type: 'editor'`, `parent_id` set to the target comment.

### `DELETE /api/comments?id=<uuid>`

Delete a comment and its replies (editor only). Hard delete.

## AI Moderation

Runs on every visitor comment submission. Editor comments skip moderation.

**Prompt:**
```
You are a comment moderator for Svetla Stran, a Slovenian positive news portal.

Evaluate this comment and return JSON:
{ "approved": boolean, "reason": string | null, "autoReply": { "body": string } | null }

APPROVE if the comment is:
- Positive, neutral, or constructively critical
- On-topic or general appreciation
- In any language (Slovenian expected, but don't reject others)

REJECT if the comment is:
- Toxic, hateful, or personally attacking
- Spam or promotional
- Sexually explicit or violent

AUTO-REPLY only if:
- The comment is a direct question about Svetla Stran itself
  (what it is, how it works, what categories exist, publishing schedule)
- You are confident in the answer
- Never reply to opinions, article debates, or anything you're unsure about

When in doubt: approve and don't reply.
```

**Implementation:** Single `Anthropic.messages.create()` call (not a full agent loop — moderation is a simple structured-output task). Uses CC subscription auth: delete `process.env.CLAUDECODE` and `process.env.ANTHROPIC_API_KEY` before dynamic `import("@anthropic-ai/sdk")`, same pattern as scrape-cycle.mjs. Note: in serverless API routes, the env-var deletion affects the current request only (each invocation gets a fresh process).

**Returns:** `{ approved: boolean, reason: string | null, autoReply: { body: string } | null }`

## Frontend

### Component: `CommentSection` (client component)

Placed on the article detail page (`/clanki/[slug]`) after research details, before newsletter signup.

**Props:** `articleId: string`

**Prerequisite:** The `PublishedArticle` type and `rowToArticle()` in the article page must be updated to include the article's `id` field (currently omitted from the mapping). The server component passes `article.id` to `<CommentSection>`.

**Behavior:**
- On mount, fetches `GET /api/comments?articleId=X`.
- Reads `svetla_comment_name` from localStorage to pre-fill name input.
- Saves name to localStorage on change.

### UI Structure

```
"N komentarjev" heading
─────────────────────────────
Comment form:
  [Name input]  (pre-filled from localStorage)
  [Textarea]
  [Objavi komentar] button
─────────────────────────────
Comment list (oldest first):
  ┌ Author name  ·  badge (Urednik/Svetla Stran)  ·  relative date
  │ Comment body
  │ [Odgovori] button
  │ [Editor: Odobri | Zavrni | Izbriši]  [rejection reason if rejected]
  │
  │   └─ Reply (indented)
  │      Author name  ·  badge  ·  date
  │      Reply body
  └────────────────
```

### Visitor Experience

- Sees only approved comments.
- Submits comment, gets instant result:
  - Approved: comment appears in list.
  - Rejected: message "Komentar ni bil objavljen." (no reason shown).
- Reply button opens inline reply form under that comment.

### Editor Experience (inline, no separate page)

- Sees all comments: approved (normal), pending (yellow badge), rejected (red badge + AI reason).
- Inline action buttons: Odobri (approve), Zavrni (reject), Izbriši (delete).
- Can reply to any comment — reply posted with their editor name and "Urednik" badge.
- No separate `/urednik/komentarji` page.

### Styling

- Follows existing Tailwind patterns and color variables from globals.css.
- Editor/AI badges use accent colors consistent with category pills.
- Indented replies with a left border accent.
- Consistent with card/border/shadow patterns used elsewhere.

## Data Flow Summary

```
Visitor submits comment
  → POST /api/comments
  → AI moderation (Claude)
  → Insert comment (approved/rejected)
  → If autoReply generated, insert AI reply
  → Return result to client
  → Client updates UI

Editor moderates inline
  → PUT /api/comments (approve/reject/reply)
  → DB update
  → Client refreshes comments

Page load
  → GET /api/comments?articleId=X
  → Public: approved only
  → Editor: all statuses + rejection reasons
```

## Scope Exclusions

- No email collection or notifications.
- No pagination (all comments loaded at once — revisit if volume grows).
- No edit functionality for visitors (submit only).
- No real-time updates (manual refresh or page reload to see new comments).
- No comment counts on article cards (add later if desired).
