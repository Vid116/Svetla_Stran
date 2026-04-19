import { NextRequest, NextResponse } from "next/server";
import { getSQL } from "@/lib/neon";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getSQL();

  // Skip-guard: if a nedeljska-zgodba article was published in the last 6 days,
  // don't run. Editor likely handled it manually.
  const recent = await sql`
    SELECT id, slug, published_at FROM articles
    WHERE 'nedeljska-zgodba' = ANY(themes)
      AND published_at > NOW() - INTERVAL '6 days'
    ORDER BY published_at DESC
    LIMIT 1
  `;
  if (recent.length > 0) {
    return NextResponse.json({
      skipped: true,
      reason: "nedeljska-zgodba already published within last 6 days",
      existing: { slug: recent[0].slug, published_at: recent[0].published_at },
    });
  }

  // Claim: atomically take the reserved draft for today. If a second cron
  // invocation fires, this UPDATE returns zero rows and we no-op.
  const claimed = await sql`
    UPDATE drafts
    SET sunday_reserved_for = NULL
    WHERE sunday_reserved_for = CURRENT_DATE
    RETURNING *
  `;
  if (claimed.length === 0) {
    return NextResponse.json({ skipped: true, reason: "no reserved draft for today" });
  }

  const draft = claimed[0] as any;

  // Ensure nedeljska-zgodba is in the themes array
  const themes: string[] = Array.isArray(draft.themes) ? [...draft.themes] : [];
  if (!themes.includes("nedeljska-zgodba")) themes.push("nedeljska-zgodba");

  // Pull headline score as fallback (mirrors publishDraft in lib/db.ts)
  let headlineScore: number | null = null;
  if (draft.headline_id) {
    const hRows = await sql`SELECT ai_score FROM headlines WHERE id = ${draft.headline_id}`;
    headlineScore = hRows[0]?.ai_score ?? null;
  }

  // Insert into articles (mirrors publishDraft field list)
  await sql`
    INSERT INTO articles (
      headline_id, title, subtitle, body, slug, image_url, category, emotions, antidote,
      antidote_secondary, source_name, source_url, image_position, research_references,
      raw_title, ai_score, initial_score, initial_antidote, initial_category, ai_image_url,
      verification_passed, verification_summary, verification_claims,
      research_queries, research_sources_found, research_sources_used, long_form, themes
    ) VALUES (
      ${draft.headline_id}, ${draft.title}, ${draft.subtitle}, ${draft.body}, ${draft.slug},
      ${draft.image_url}, ${draft.category}, ${draft.emotions || []}, ${draft.antidote},
      ${draft.antidote_secondary || null}, ${draft.source_name}, ${draft.source_url},
      50, ${typeof draft.research_references === "string" ? draft.research_references : JSON.stringify(draft.research_references || [])}::jsonb,
      ${draft.raw_title || null}, ${draft.ai_score || headlineScore || 0},
      ${draft.initial_score || null}, ${draft.initial_antidote || null}, ${draft.initial_category || null},
      ${draft.ai_image_url || null},
      ${draft.verification_passed ?? null}, ${draft.verification_summary || null},
      ${typeof draft.verification_claims === "string" ? draft.verification_claims : JSON.stringify(draft.verification_claims || [])}::jsonb,
      ${draft.research_queries || []}, ${draft.research_sources_found ?? null},
      ${draft.research_sources_used ?? null}, ${draft.long_form ? (typeof draft.long_form === "string" ? draft.long_form : JSON.stringify(draft.long_form)) : null}::jsonb,
      ${themes}
    )
  `;

  if (draft.headline_id) {
    await sql`UPDATE headlines SET status = 'published' WHERE id = ${draft.headline_id}`;
  }

  await sql`DELETE FROM drafts WHERE id = ${draft.id}`;

  console.log(`[cron/sunday-publish] Published "${draft.title}" (slug=${draft.slug}, fit=${draft.sunday_fit_score}/100)`);

  return NextResponse.json({
    published: true,
    slug: draft.slug,
    title: draft.title,
    sunday_fit_score: draft.sunday_fit_score,
  });
}
