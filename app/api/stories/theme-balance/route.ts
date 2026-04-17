import { NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { getRecentThemeCounts } from "@/lib/db";
import { getSQL } from "@/lib/neon";

const THEMES = [
  { key: "med-nami", label: "Med nami", antidotes: ["jeza", "cinizem", "osamljenost"], color: "#f0a0a0" },
  { key: "napredek", label: "Napredek", antidotes: ["skrb", "obup"], color: "#7cc4f5" },
  { key: "heroji", label: "Heroji", antidotes: ["strah"], color: "#e8a070" },
  { key: "drobne-radosti", label: "Drobne radosti", antidotes: ["dolgcas"], color: "#f0a0c0" },
];

export async function GET() {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const sql = getSQL();

    // Inbox counts per antidote
    const inboxRows = await sql`
      SELECT ai_antidote AS antidote, count(*)::int AS cnt
      FROM headlines
      WHERE status = 'new' AND ai_antidote IS NOT NULL
      GROUP BY ai_antidote
    `;
    const inboxByAntidote: Record<string, number> = {};
    for (const r of inboxRows as any[]) inboxByAntidote[r.antidote] = r.cnt;

    // Published in last 14 days per theme
    const publishedRows = await getRecentThemeCounts(14);
    const publishedByTheme: Record<string, number> = {};
    for (const r of publishedRows as any[]) {
      if (r.theme) publishedByTheme[r.theme] = r.cnt;
    }

    const result = THEMES.map((t) => ({
      theme: t.key,
      label: t.label,
      color: t.color,
      inbox: t.antidotes.reduce((sum, a) => sum + (inboxByAntidote[a] || 0), 0),
      published14d: publishedByTheme[t.key] || 0,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
