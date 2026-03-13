import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, getAuthEditor } from "@/lib/require-auth-api";
import {
  getInboxHeadlines,
  getProcessedHeadlines,
  getPublishedArticles,
  dismissHeadline,
  getHeadlineById,
  setHeadlineProcessing,
  deleteDraftsByHeadlineId,
} from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET — inbox headlines (filtered by user's categories)
// ?view=processing returns processing+picked headlines
// ?view=published returns published articles
export async function GET(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const editor = await getAuthEditor();
    const categories = editor?.categories || [];
    const role = editor?.role;
    const cats = role === "admin" ? undefined : categories;

    const view = req.nextUrl.searchParams.get("view");

    if (view === "processing") {
      const headlines = await getProcessedHeadlines(cats);
      return NextResponse.json(headlines);
    }

    if (view === "published") {
      const articles = await getPublishedArticles();
      return NextResponse.json(articles);
    }

    const headlines = await getInboxHeadlines(cats);
    return NextResponse.json(headlines);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT — update headline status (dismiss)
export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { id, status, reason } = await req.json();
    if (status === "dismissed") {
      await dismissHeadline(id, reason);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — unpublish article (delete from articles, reset headline to "new")
export async function DELETE(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json({ error: "articleId je obvezen" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get article to find headline_id
    const { data: article } = await supabase
      .from("articles")
      .select("headline_id")
      .eq("id", articleId)
      .single();

    // Delete article
    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) throw error;

    // Reset headline back to "new" so it can be re-processed
    if (article?.headline_id) {
      await supabase
        .from("headlines")
        .update({ status: "new" })
        .eq("id", article.headline_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — rerun research on a published article
// Unpublishes, then triggers research-write pipeline
export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const view = req.nextUrl.searchParams.get("view");
    if (view !== "rerun") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json({ error: "articleId je obvezen" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get article to find headline
    const { data: article } = await supabase
      .from("articles")
      .select("headline_id")
      .eq("id", articleId)
      .single();

    if (!article?.headline_id) {
      return NextResponse.json({ error: "Clanek nima povezane novice" }, { status: 400 });
    }

    // Delete article
    await supabase.from("articles").delete().eq("id", articleId);

    // Delete any existing drafts for this headline
    await deleteDraftsByHeadlineId(article.headline_id);

    // Get headline data for research
    const headline = await getHeadlineById(article.headline_id);
    if (!headline) {
      return NextResponse.json({ error: "Novica ne obstaja vec" }, { status: 404 });
    }

    // Set to processing
    await setHeadlineProcessing(article.headline_id);

    // Fire research-write in background (don't await)
    fetch(`${req.nextUrl.origin}/api/research-write`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        headlineId: headline.id,
        rawTitle: headline.raw_title,
        rawContent: headline.raw_content,
        fullContent: headline.full_content,
        source_url: headline.source_url,
        source_name: headline.source_name,
        ai_category: headline.ai_category,
        ai_emotions: headline.ai_emotions,
        ai_headline: headline.ai_headline,
        ai_antidote: headline.ai_antidote,
      }),
    }).catch(() => {}); // Fire and forget

    return NextResponse.json({ ok: true, headlineId: headline.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
