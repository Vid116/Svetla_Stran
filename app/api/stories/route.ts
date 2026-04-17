import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, getAuthEditor } from "@/lib/require-auth-api";
import {
  getInboxHeadlines,
  getProcessedHeadlines,
  getPublishedArticlesLight,
  getRecentThemeCounts,
  dismissHeadline,
  getHeadlineById,
  setHeadlineProcessing,
  deleteDraftsByHeadlineId,
} from "@/lib/db";
import { getSQL } from "@/lib/neon";

// Map headline antidote → theme slug for diversity scoring
function antidoteToTheme(antidote: string | null): string | null {
  if (!antidote) return null;
  if (["jeza", "cinizem", "osamljenost"].includes(antidote)) return "med-nami";
  if (["skrb", "obup"].includes(antidote)) return "napredek";
  if (antidote === "strah") return "heroji";
  if (antidote === "dolgcas") return "drobne-radosti";
  return null;
}

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
      const articles = await getPublishedArticlesLight();
      return NextResponse.json(articles);
    }

    // Fetch headlines + recent theme publish counts in parallel
    const [headlines, themeCounts] = await Promise.all([
      getInboxHeadlines(cats),
      getRecentThemeCounts(14),
    ]);

    // Build theme → count map
    const countMap: Record<string, number> = {};
    for (const row of themeCounts as any[]) {
      if (row.theme) countMap[row.theme] = row.cnt;
    }

    // Apply diversity bonus: scarce themes get boosted so their headlines float up
    const boosted = (headlines as any[]).map((h) => {
      const theme = antidoteToTheme(h.ai_antidote);
      const published = theme ? (countMap[theme] ?? 0) : 999;
      const bonus = published === 0 ? 3 : published <= 2 ? 2 : published <= 5 ? 1 : 0;
      return { ...h, _boosted_score: (h.ai_score || 0) + bonus, _theme: theme, _theme_published_14d: published };
    });

    boosted.sort((a, b) => b._boosted_score - a._boosted_score);

    return NextResponse.json(boosted);
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

    const sql = getSQL();

    const articles = await sql`SELECT headline_id FROM articles WHERE id = ${articleId}`;
    const headlineId = articles[0]?.headline_id;

    await sql`DELETE FROM articles WHERE id = ${articleId}`;

    if (headlineId) {
      await sql`UPDATE headlines SET status = 'new' WHERE id = ${headlineId}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — rerun research on a published article
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

    const sql = getSQL();

    const articles = await sql`SELECT headline_id FROM articles WHERE id = ${articleId}`;
    if (!articles[0]?.headline_id) {
      return NextResponse.json({ error: "Clanek nima povezane novice" }, { status: 400 });
    }
    const headlineId = articles[0].headline_id;

    await sql`DELETE FROM articles WHERE id = ${articleId}`;
    await deleteDraftsByHeadlineId(headlineId);

    const headline = await getHeadlineById(headlineId);
    if (!headline) {
      return NextResponse.json({ error: "Novica ne obstaja vec" }, { status: 404 });
    }

    await setHeadlineProcessing(headlineId);

    // Fire research-write in background
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
    }).catch(() => {});

    return NextResponse.json({ ok: true, headlineId: headline.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
