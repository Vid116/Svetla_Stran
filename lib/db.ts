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

export async function dismissHeadline(id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("headlines")
    .update({ status: "dismissed" })
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
    ai_score: null, // will be looked up from headline if needed
  });

  if (insertErr) throw insertErr;

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
