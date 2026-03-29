import { getSQL } from "./neon";

// ── Headline queries ────────────────────────────────────────────────────────

export async function getInboxHeadlines(categories?: string[]) {
  const sql = getSQL();
  if (categories && categories.length > 0) {
    return sql`
      SELECT id, status, source_url, source_name, raw_title, raw_content, full_content,
             ai_score, ai_emotions, ai_reason, ai_category, ai_headline, ai_antidote, hero_image, scraped_at
      FROM headlines
      WHERE status = 'new' AND ai_category = ANY(${categories})
      ORDER BY ai_score DESC
    `;
  }
  return sql`
    SELECT id, status, source_url, source_name, raw_title, raw_content, full_content,
           ai_score, ai_emotions, ai_reason, ai_category, ai_headline, ai_antidote, hero_image, scraped_at
    FROM headlines
    WHERE status = 'new'
    ORDER BY ai_score DESC
  `;
}

export async function dismissHeadline(id: string, reason?: string) {
  const sql = getSQL();
  await sql`UPDATE headlines SET status = 'dismissed', dismissed_reason = ${reason || null} WHERE id = ${id}`;
}

export async function pickHeadline(id: string) {
  const sql = getSQL();
  await sql`UPDATE headlines SET status = 'picked' WHERE id = ${id}`;
}

export async function setHeadlineProcessing(id: string) {
  const sql = getSQL();
  await sql`UPDATE headlines SET status = 'processing' WHERE id = ${id}`;
}

export async function getProcessedHeadlines(categories?: string[]) {
  const sql = getSQL();

  // Fetch headlines
  let headlines: any[];
  if (categories && categories.length > 0) {
    headlines = await sql`
      SELECT id, status, source_url, source_name, raw_title, raw_content, full_content,
             ai_score, ai_category, ai_headline, ai_antidote, ai_emotions, scraped_at
      FROM headlines
      WHERE status IN ('processing', 'picked') AND ai_category = ANY(${categories})
      ORDER BY scraped_at DESC
    `;
  } else {
    headlines = await sql`
      SELECT id, status, source_url, source_name, raw_title, raw_content, full_content,
             ai_score, ai_category, ai_headline, ai_antidote, ai_emotions, scraped_at
      FROM headlines
      WHERE status IN ('processing', 'picked')
      ORDER BY scraped_at DESC
    `;
  }

  if (headlines.length === 0) return [];

  // Fetch drafts for these headlines
  const headlineIds = headlines.map(h => h.id);
  const drafts = await sql`
    SELECT id, headline_id, title, slug, status, created_at, ai_score, category,
           antidote, antidote_secondary, ai_image_url, image_url,
           verification_passed, verification_summary, verification_claims,
           research_queries, research_sources_found, research_sources_used, research_references
    FROM drafts
    WHERE headline_id = ANY(${headlineIds})
  `;

  // Group drafts by headline_id
  const draftsByHeadline: Record<string, any[]> = {};
  for (const d of drafts) {
    if (!draftsByHeadline[d.headline_id]) draftsByHeadline[d.headline_id] = [];
    draftsByHeadline[d.headline_id].push(d);
  }

  // Attach drafts to headlines
  return headlines.map(h => ({
    ...h,
    drafts: draftsByHeadline[h.id] || [],
  }));
}

export async function deleteDraftsByHeadlineId(headlineId: string) {
  const sql = getSQL();
  await sql`DELETE FROM drafts WHERE headline_id = ${headlineId}`;
}

export async function getDraftByHeadlineId(headlineId: string) {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, title, slug, status, created_at, verification_passed, verification_summary
    FROM drafts
    WHERE headline_id = ${headlineId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function getHeadlineById(id: string) {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM headlines WHERE id = ${id}`;
  return rows[0] || null;
}

// ── Draft queries ───────────────────────────────────────────────────────────

export async function createDraft(draft: {
  headline_id: string;
  title: string;
  subtitle?: string;
  body: string;
  slug: string;
  image_url?: string;
  category?: string;
  emotions?: string[];
  antidote?: string;
  antidote_secondary?: string | null;
  source_name?: string;
  source_url?: string;
  research_queries?: string[];
  research_sources_found?: number;
  research_sources_used?: number;
  research_references?: any;
  verification_passed?: boolean;
  verification_summary?: string;
  verification_claims?: any;
  long_form?: { title: string; subtitle: string; body: string; slug: string };
  ai_image_url?: string;
  image_prompt?: string;
  ai_score?: number | null;
  initial_score?: number | null;
  initial_antidote?: string | null;
  initial_category?: string | null;
}) {
  // Sanitize slug
  if (draft.slug) {
    draft.slug = draft.slug
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const sql = getSQL();
  const rows = await sql`
    INSERT INTO drafts (
      headline_id, title, subtitle, body, slug, image_url, category, emotions, antidote,
      antidote_secondary, source_name, source_url, research_queries, research_sources_found,
      research_sources_used, research_references, verification_passed, verification_summary,
      verification_claims, long_form, ai_image_url, image_prompt, ai_score,
      initial_score, initial_antidote, initial_category, status
    ) VALUES (
      ${draft.headline_id}, ${draft.title}, ${draft.subtitle || null}, ${draft.body}, ${draft.slug},
      ${draft.image_url || null}, ${draft.category || null}, ${draft.emotions || []}, ${draft.antidote || null},
      ${draft.antidote_secondary ?? null}, ${draft.source_name || null}, ${draft.source_url || null},
      ${draft.research_queries || []}, ${draft.research_sources_found ?? null},
      ${draft.research_sources_used ?? null}, ${draft.research_references ? JSON.stringify(draft.research_references) : null}::jsonb,
      ${draft.verification_passed ?? null}, ${draft.verification_summary || null},
      ${draft.verification_claims ? JSON.stringify(draft.verification_claims) : null}::jsonb,
      ${draft.long_form ? JSON.stringify(draft.long_form) : null}::jsonb,
      ${draft.ai_image_url || null}, ${draft.image_prompt || null}, ${draft.ai_score ?? null},
      ${draft.initial_score ?? null}, ${draft.initial_antidote ?? null}, ${draft.initial_category ?? null},
      'ready'
    ) RETURNING id
  `;
  return rows[0];
}

export async function getDrafts() {
  const sql = getSQL();
  return sql`
    SELECT id, headline_id, title, subtitle, body, slug, image_url, category, emotions,
           antidote, antidote_secondary, ai_score, ai_image_url, source_name, source_url,
           research_queries, research_sources_found, research_sources_used, research_references,
           verification_passed, verification_summary, verification_claims, status, created_at
    FROM drafts
    WHERE status IN ('ready', 'editing')
    ORDER BY created_at DESC
  `;
}

export async function getDraftById(id: string) {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM drafts WHERE id = ${id}`;
  return rows[0] || null;
}

export async function updateDraft(id: string, updates: Record<string, any>) {
  const sql = getSQL();
  // Build SET clause dynamically
  const sets: string[] = [];
  const vals: any[] = [];
  updates.updated_at = new Date().toISOString();

  // For dynamic updates, use a simple approach: serialize to JSON and use jsonb_populate_record
  // Actually, let's just handle the common fields
  await sql`
    UPDATE drafts SET
      title = COALESCE(${updates.title ?? null}, title),
      subtitle = COALESCE(${updates.subtitle ?? null}, subtitle),
      body = COALESCE(${updates.body ?? null}, body),
      slug = COALESCE(${updates.slug ?? null}, slug),
      image_url = COALESCE(${updates.image_url ?? null}, image_url),
      category = COALESCE(${updates.category ?? null}, category),
      antidote = COALESCE(${updates.antidote ?? null}, antidote),
      antidote_secondary = COALESCE(${updates.antidote_secondary ?? null}, antidote_secondary),
      ai_image_url = COALESCE(${updates.ai_image_url ?? null}, ai_image_url),
      image_prompt = COALESCE(${updates.image_prompt ?? null}, image_prompt),
      ai_score = COALESCE(${updates.ai_score ?? null}, ai_score),
      status = COALESCE(${updates.status ?? null}, status),
      updated_at = ${updates.updated_at}
    WHERE id = ${id}
  `;
}

export async function deleteDraft(id: string) {
  const sql = getSQL();
  await sql`DELETE FROM drafts WHERE id = ${id}`;
}

// ── Article queries ─────────────────────────────────────────────────────────

export async function publishDraft(draftId: string) {
  const sql = getSQL();

  // Fetch the draft
  const drafts = await sql`SELECT * FROM drafts WHERE id = ${draftId}`;
  const draft = drafts[0];
  if (!draft) throw new Error("Draft not found");

  // Fetch ai_score from headline as fallback
  let headlineScore: number | null = null;
  if (draft.headline_id) {
    const hRows = await sql`SELECT ai_score FROM headlines WHERE id = ${draft.headline_id}`;
    headlineScore = hRows[0]?.ai_score ?? null;
  }

  // Insert into articles
  await sql`
    INSERT INTO articles (
      headline_id, title, subtitle, body, slug, image_url, category, emotions, antidote,
      antidote_secondary, source_name, source_url, image_position, research_references,
      raw_title, ai_score, initial_score, initial_antidote, initial_category, ai_image_url,
      verification_passed, verification_summary, verification_claims,
      research_queries, research_sources_found, research_sources_used, long_form
    ) VALUES (
      ${draft.headline_id}, ${draft.title}, ${draft.subtitle}, ${draft.body}, ${draft.slug},
      ${draft.image_url}, ${draft.category}, ${draft.emotions || []}, ${draft.antidote},
      ${draft.antidote_secondary || null}, ${draft.source_name}, ${draft.source_url},
      50, ${JSON.stringify(draft.research_references || [])}::jsonb,
      ${draft.raw_title || null}, ${draft.ai_score || headlineScore || 0},
      ${draft.initial_score || null}, ${draft.initial_antidote || null}, ${draft.initial_category || null},
      ${draft.ai_image_url || null},
      ${draft.verification_passed ?? null}, ${draft.verification_summary || null},
      ${JSON.stringify(draft.verification_claims || [])}::jsonb,
      ${draft.research_queries || []}, ${draft.research_sources_found ?? null},
      ${draft.research_sources_used ?? null}, ${draft.long_form ? JSON.stringify(draft.long_form) : null}::jsonb
    )
  `;

  // Mark headline as published
  if (draft.headline_id) {
    await sql`UPDATE headlines SET status = 'published' WHERE id = ${draft.headline_id}`;
  }

  // Remove the draft
  await sql`DELETE FROM drafts WHERE id = ${draftId}`;
}

export async function getPublishedArticles() {
  const sql = getSQL();
  return sql`
    SELECT id, title, subtitle, body, slug, image_url, ai_image_url, category,
           antidote, antidote_secondary, emotions, ai_score, source_url, source_name,
           published_at, created_at
    FROM articles
    ORDER BY published_at DESC
  `;
}

export async function getPublishedArticlesLight() {
  const sql = getSQL();
  return sql`
    SELECT id, headline_id, title, subtitle, slug, image_url, ai_image_url, category,
           ai_score, source_name, source_url, published_at, created_at
    FROM articles
    ORDER BY published_at DESC
  `;
}

export async function getArticleBySlug(slug: string) {
  const sql = getSQL();
  const rows = await sql`SELECT * FROM articles WHERE slug = ${slug}`;
  return rows[0] || null;
}

export async function getEmotionMatchedArticles(
  currentSlug: string,
  antidote: string | null,
  category: string | null,
  limit: number = 3
): Promise<any[]> {
  const sql = getSQL();
  const cols = `id, title, subtitle, body, slug, image_url, ai_image_url, category, antidote, antidote_secondary, published_at, created_at`;

  if (!antidote) {
    return sql`
      SELECT ${sql.unsafe(cols)}
      FROM articles
      WHERE slug != ${currentSlug} AND category = ${category}
      ORDER BY published_at DESC
      LIMIT ${limit}
    `;
  }

  // Best: same antidote + same category
  const bestMatch = await sql`
    SELECT ${sql.unsafe(cols)}
    FROM articles
    WHERE slug != ${currentSlug}
      AND (antidote = ${antidote} OR antidote_secondary = ${antidote})
      AND category = ${category}
    ORDER BY published_at DESC
    LIMIT ${limit}
  `;

  if (bestMatch.length >= limit) return bestMatch;

  // Good: same antidote, any category
  const excludeSlugs = [currentSlug, ...bestMatch.map((a: any) => a.slug)];
  const antidoteMatch = await sql`
    SELECT ${sql.unsafe(cols)}
    FROM articles
    WHERE slug != ALL(${excludeSlugs})
      AND (antidote = ${antidote} OR antidote_secondary = ${antidote})
    ORDER BY published_at DESC
    LIMIT ${limit - bestMatch.length}
  `;

  const combined = [...bestMatch, ...antidoteMatch];
  if (combined.length >= limit) return combined.slice(0, limit);

  // Fallback: category-only
  const usedSlugs = [currentSlug, ...combined.map((a: any) => a.slug)];
  const categoryFill = await sql`
    SELECT ${sql.unsafe(cols)}
    FROM articles
    WHERE slug != ALL(${usedSlugs}) AND category = ${category}
    ORDER BY published_at DESC
    LIMIT ${limit - combined.length}
  `;

  return [...combined, ...categoryFill].slice(0, limit);
}

// ── Sources queries ──────────────────────────────────────────────────────────

export async function getSources() {
  const sql = getSQL();
  return sql`SELECT * FROM sources ORDER BY name`;
}

export async function addSource(source: {
  name: string;
  url: string;
  type: string;
  category?: string;
  link_selector?: string;
  link_pattern?: string;
}) {
  const sql = getSQL();
  await sql`
    INSERT INTO sources (name, url, type, category, link_selector, link_pattern)
    VALUES (${source.name}, ${source.url}, ${source.type}, ${source.category || null},
            ${source.link_selector || null}, ${source.link_pattern || null})
  `;
}

export async function updateSource(url: string, updates: Record<string, any>) {
  const sql = getSQL();
  // Simple approach: update all settable fields
  await sql`
    UPDATE sources SET
      name = COALESCE(${updates.name ?? null}, name),
      type = COALESCE(${updates.type ?? null}, type),
      category = COALESCE(${updates.category ?? null}, category),
      link_selector = COALESCE(${updates.link_selector ?? null}, link_selector),
      link_pattern = COALESCE(${updates.link_pattern ?? null}, link_pattern),
      active = COALESCE(${updates.active ?? null}, active),
      scrape_tier = COALESCE(${updates.scrape_tier ?? null}, scrape_tier)
    WHERE url = ${url}
  `;
}

export async function deleteSource(url: string) {
  const sql = getSQL();
  await sql`DELETE FROM sources WHERE url = ${url}`;
}

// ── Source stats ─────────────────────────────────────────────────────────────

export async function getSourceStats() {
  const sql = getSQL();
  const headlineRows = await sql`SELECT source_name, count(*)::int AS cnt FROM headlines GROUP BY source_name`;
  const articleRows = await sql`SELECT source_name, count(*)::int AS cnt FROM articles GROUP BY source_name`;

  const headlines: Record<string, number> = {};
  for (const r of headlineRows) headlines[r.source_name] = r.cnt;

  const articles: Record<string, number> = {};
  for (const r of articleRows) articles[r.source_name] = r.cnt;

  return { headlines, articles };
}

// ── Source suggestion queries ────────────────────────────────────────────────

export async function getSourceSuggestions(status: string = "pending") {
  const sql = getSQL();
  return sql`
    SELECT * FROM source_suggestions
    WHERE status = ${status}
    ORDER BY confidence DESC
  `;
}

export async function addSourceSuggestion(suggestion: {
  domain: string;
  name?: string;
  url: string;
  rss_url?: string;
  suggested_type?: string;
  category?: string;
  reason?: string;
  confidence?: number;
  headline_id?: string;
}) {
  const sql = getSQL();

  // Check if domain already exists
  const existing = await sql`
    SELECT id, status, confidence FROM source_suggestions WHERE domain = ${suggestion.domain}
  `;

  if (existing.length > 0) {
    const row = existing[0];
    if (row.status === "pending") {
      const newConfidence = Math.min(1.0, (row.confidence || 0) + 0.15);
      await sql`
        UPDATE source_suggestions SET confidence = ${newConfidence}, reason = ${suggestion.reason || null}
        WHERE id = ${row.id}
      `;
    }
    return;
  }

  // New domain
  await sql`
    INSERT INTO source_suggestions (domain, name, url, rss_url, suggested_type, category, reason, confidence, headline_id)
    VALUES (${suggestion.domain}, ${suggestion.name || null}, ${suggestion.url},
            ${suggestion.rss_url || null}, ${suggestion.suggested_type || 'unknown'},
            ${suggestion.category || null}, ${suggestion.reason || null},
            ${suggestion.confidence || 0}, ${suggestion.headline_id || null})
    ON CONFLICT (domain) DO NOTHING
  `;
}

export async function updateSuggestionStatus(id: string, status: "approved" | "dismissed") {
  const sql = getSQL();
  await sql`UPDATE source_suggestions SET status = ${status} WHERE id = ${id}`;
}

// ── Editors queries ──────────────────────────────────────────────────────────

export async function getEditors() {
  const sql = getSQL();
  return sql`
    SELECT id, auth_id, username, name, role, categories, active, created_at
    FROM editors
    ORDER BY created_at
  `;
}

export async function getEditorByUsername(username: string) {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, auth_id, username, name, role, categories, active
    FROM editors
    WHERE username = ${username}
  `;
  return rows[0] || null;
}

export async function addEditor(editor: {
  auth_id?: string;
  username: string;
  name: string;
  role: string;
  categories: string[];
}) {
  const sql = getSQL();
  await sql`
    INSERT INTO editors (auth_id, username, name, role, categories)
    VALUES (${editor.auth_id || null}, ${editor.username}, ${editor.name}, ${editor.role}, ${editor.categories})
  `;
}

export async function updateEditor(id: string, updates: Record<string, any>) {
  const sql = getSQL();
  await sql`
    UPDATE editors SET
      username = COALESCE(${updates.username ?? null}, username),
      name = COALESCE(${updates.name ?? null}, name),
      role = COALESCE(${updates.role ?? null}, role),
      categories = COALESCE(${updates.categories ?? null}, categories),
      active = COALESCE(${updates.active ?? null}, active),
      updated_at = now()
    WHERE id = ${id}
  `;
}

export async function deleteEditor(id: string) {
  const sql = getSQL();
  await sql`DELETE FROM editors WHERE id = ${id}`;
}

// ── Comments queries ─────────────────────────────────────────────────────────

export async function getCommentsByArticle(articleId: string, includeAll = false) {
  const sql = getSQL();
  if (includeAll) {
    return sql`
      SELECT * FROM comments
      WHERE article_id = ${articleId}
      ORDER BY created_at ASC
    `;
  }
  return sql`
    SELECT * FROM comments
    WHERE article_id = ${articleId} AND status = 'approved'
    ORDER BY created_at ASC
  `;
}

export async function createComment(comment: {
  article_id: string;
  parent_id?: string | null;
  author_name: string;
  author_type: string;
  editor_id?: string | null;
  body: string;
  status: string;
}) {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO comments (article_id, parent_id, author_name, author_type, editor_id, body, status)
    VALUES (${comment.article_id}, ${comment.parent_id || null}, ${comment.author_name},
            ${comment.author_type}, ${comment.editor_id || null}, ${comment.body}, ${comment.status})
    RETURNING *
  `;
  return rows[0];
}

export async function moderateComment(id: string, status: string, rejectionReason?: string) {
  const sql = getSQL();
  await sql`
    UPDATE comments SET status = ${status}, rejection_reason = ${rejectionReason || null}, updated_at = now()
    WHERE id = ${id}
  `;

  if (status === "rejected") {
    await sql`UPDATE comments SET status = 'rejected', updated_at = now() WHERE parent_id = ${id}`;
  }
}

export async function deleteComment(id: string) {
  const sql = getSQL();
  await sql`DELETE FROM comments WHERE id = ${id}`;
}

export async function getPendingCommentCount() {
  const sql = getSQL();
  const rows = await sql`SELECT count(*)::int AS count FROM comments WHERE status = 'pending'`;
  return rows[0]?.count || 0;
}

export async function getPendingComments() {
  const sql = getSQL();
  return sql`
    SELECT c.*, json_build_object('title', a.title, 'slug', a.slug) AS articles
    FROM comments c
    JOIN articles a ON a.id = c.article_id
    WHERE c.status = 'pending'
    ORDER BY c.created_at ASC
  `;
}
