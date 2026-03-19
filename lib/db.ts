import { getSupabaseAdmin } from "./supabase";

// ── Headline queries ────────────────────────────────────────────────────────

export async function getInboxHeadlines(categories?: string[]) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("headlines")
    .select("*")
    .eq("status", "new")
    .order("ai_score", { ascending: false });

  if (categories && categories.length > 0) {
    query = query.in("ai_category", categories);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function dismissHeadline(id: string, reason?: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("headlines")
    .update({ status: "dismissed", dismissed_reason: reason || null })
    .eq("id", id);

  if (error) throw error;
}

export async function pickHeadline(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("headlines")
    .update({ status: "picked" })
    .eq("id", id);

  if (error) throw error;
}

export async function setHeadlineProcessing(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("headlines")
    .update({ status: "processing" })
    .eq("id", id);

  if (error) throw error;
}

export async function getProcessedHeadlines(categories?: string[]) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("headlines")
    .select("*, drafts(id, title, slug, status, created_at, verification_passed, verification_summary, verification_claims, research_queries, research_sources_found, research_sources_used, research_references)")
    .in("status", ["processing", "picked"])
    .order("scraped_at", { ascending: false });

  if (categories && categories.length > 0) {
    query = query.in("ai_category", categories);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function deleteDraftsByHeadlineId(headlineId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("headline_id", headlineId);

  if (error) throw error;
}

export async function getDraftByHeadlineId(headlineId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .select("id, title, slug, status, created_at, verification_passed, verification_summary")
    .eq("headline_id", headlineId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export async function getHeadlineById(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("headlines")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
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
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .insert({ ...draft, status: "ready" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function getDrafts() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .in("status", ["ready", "editing"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getDraftById(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function updateDraft(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("drafts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteDraft(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Article queries ─────────────────────────────────────────────────────────

export async function publishDraft(draftId: string) {
  const supabase = getSupabaseAdmin();

  // Fetch the draft
  const { data: draft, error: fetchErr } = await supabase
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (fetchErr || !draft) throw fetchErr || new Error("Draft not found");

  // Insert into articles
  const { error: insertErr } = await supabase.from("articles").insert({
    headline_id: draft.headline_id,
    title: draft.title,
    subtitle: draft.subtitle,
    body: draft.body,
    slug: draft.slug,
    image_url: draft.image_url,
    category: draft.category,
    emotions: draft.emotions,
    antidote: draft.antidote,
    source_name: draft.source_name,
    source_url: draft.source_url,
    image_position: draft.image_position ?? 33,
    research_references: draft.research_references || [],
    raw_title: draft.raw_title || null,
    ai_score: null,
    verification_passed: draft.verification_passed ?? null,
    verification_summary: draft.verification_summary || null,
    verification_claims: draft.verification_claims || [],
    research_queries: draft.research_queries || [],
    research_sources_found: draft.research_sources_found ?? null,
    research_sources_used: draft.research_sources_used ?? null,
    long_form: draft.long_form || null,
  });

  if (insertErr) throw insertErr;

  // Mark headline as published so it leaves "V obdelavi"
  if (draft.headline_id) {
    await supabase
      .from("headlines")
      .update({ status: "published" })
      .eq("id", draft.headline_id);
  }

  // Remove the draft
  await supabase.from("drafts").delete().eq("id", draftId);
}

export async function getPublishedArticles() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getArticleBySlug(slug: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data;
}

// ── Sources queries ──────────────────────────────────────────────────────────

export async function getSources() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function addSource(source: {
  name: string;
  url: string;
  type: string;
  category?: string;
  link_selector?: string;
  link_pattern?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sources").insert(source);
  if (error) throw error;
}

export async function updateSource(url: string, updates: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sources").update(updates).eq("url", url);
  if (error) throw error;
}

export async function deleteSource(url: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sources").delete().eq("url", url);
  if (error) throw error;
}

// ── Source stats ─────────────────────────────────────────────────────────────

export async function getSourceStats() {
  const supabase = getSupabaseAdmin();

  // Count headlines per source_name
  const { data: headlineCounts } = await supabase
    .from("headlines")
    .select("source_name")
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const h of data || []) {
        counts[h.source_name] = (counts[h.source_name] || 0) + 1;
      }
      return { data: counts };
    });

  // Count published articles per source_name
  const { data: articleCounts } = await supabase
    .from("articles")
    .select("source_name")
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      for (const a of data || []) {
        counts[a.source_name] = (counts[a.source_name] || 0) + 1;
      }
      return { data: counts };
    });

  return { headlines: headlineCounts || {}, articles: articleCounts || {} };
}

// ── Source suggestion queries ────────────────────────────────────────────────

export async function getSourceSuggestions(status: string = "pending") {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("source_suggestions")
    .select("*")
    .eq("status", status)
    .order("confidence", { ascending: false });

  if (error) throw error;
  return data || [];
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
  const supabase = getSupabaseAdmin();

  // Check if domain already exists (any status)
  const { data: existing } = await supabase
    .from("source_suggestions")
    .select("id, status, confidence")
    .eq("domain", suggestion.domain)
    .single();

  if (existing) {
    // If pending, bump confidence (seen in more researches = stronger signal)
    if (existing.status === "pending") {
      const newConfidence = Math.min(1.0, (existing.confidence || 0) + 0.15);
      await supabase
        .from("source_suggestions")
        .update({ confidence: newConfidence, reason: suggestion.reason })
        .eq("id", existing.id);
    }
    // If approved or dismissed, skip — editor already decided
    return;
  }

  // New domain — insert
  const { error } = await supabase
    .from("source_suggestions")
    .insert(suggestion);

  if (error && error.code !== "23505") throw error;
}

export async function updateSuggestionStatus(id: string, status: "approved" | "dismissed") {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("source_suggestions")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

// ── Editors queries ──────────────────────────────────────────────────────────

export async function getEditors() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("editors")
    .select("id, auth_id, username, name, role, categories, active, created_at")
    .order("created_at");

  if (error) throw error;
  return data || [];
}

export async function getEditorByUsername(username: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("editors")
    .select("id, auth_id, username, name, role, categories, active")
    .eq("username", username)
    .single();

  if (error) return null;
  return data;
}

export async function addEditor(editor: {
  auth_id?: string;
  username: string;
  name: string;
  role: string;
  categories: string[];
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("editors").insert(editor);
  if (error) throw error;
}

export async function updateEditor(id: string, updates: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("editors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEditor(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("editors").delete().eq("id", id);
  if (error) throw error;
}

// ── Comments queries ─────────────────────────────────────────────────────────

export async function getCommentsByArticle(articleId: string, includeAll = false) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("comments")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });

  if (!includeAll) {
    query = query.eq("status", "approved");
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
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
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comments")
    .insert(comment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function moderateComment(id: string, status: string, rejectionReason?: string) {
  const supabase = getSupabaseAdmin();

  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }

  const { error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", id);

  if (error) throw error;

  // If rejected, also reject all child comments
  if (status === "rejected") {
    const { error: childErr } = await supabase
      .from("comments")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("parent_id", id);

    if (childErr) throw childErr;
  }
}

export async function deleteComment(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function getPendingCommentCount() {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count || 0;
}

export async function getPendingComments() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("comments")
    .select("*, articles(title, slug)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
