import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { createDraft, pickHeadline, setHeadlineProcessing, deleteDraftsByHeadlineId, getSources, addSourceSuggestion } from "@/lib/db";

export const maxDuration = 300; // up to 5 minutes for full research pipeline

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  let headlineId: string | undefined;
  try {
    const story = await req.json();

    if (!story.rawTitle) {
      return NextResponse.json(
        { error: "Manjka rawTitle" },
        { status: 400 }
      );
    }

    // Set headline to processing immediately
    headlineId = story.headlineId || story.storyId;
    if (headlineId) {
      // Delete old drafts if re-running
      await deleteDraftsByHeadlineId(headlineId);
      await setHeadlineProcessing(headlineId);
    }

    // Pass known source domains so discovery can skip them
    const sources = await getSources();
    const knownDomains = sources.map((s: any) => {
      try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    }).filter(Boolean);
    story._knownDomains = knownDomains;

    // Fetch headline's initial score for feedback loop (frontend doesn't send ai_score)
    let headlineInitialScore: number | null = null;
    if (headlineId) {
      const { getSupabaseAdmin } = await import("@/lib/supabase");
      const { data: hl } = await getSupabaseAdmin().from("headlines").select("ai_score").eq("id", headlineId).single();
      headlineInitialScore = hl?.ai_score ?? null;
    }

    const result = await runResearchScript(story) as any;

    // Dedup: pipeline detected duplicate, skip
    if (result.skipped) {
      if (headlineId) {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        await getSupabaseAdmin().from("headlines").update({
          status: "dismissed",
          dismissed_reason: result.reason,
        }).eq("id", headlineId);
      }
      return NextResponse.json(result);
    }

    // Save as draft and mark headline as picked
    if (headlineId && result.article) {
      await pickHeadline(headlineId);
      await createDraft({
        headline_id: headlineId,
        title: result.article.title,
        subtitle: result.article.subtitle,
        body: result.article.body,
        slug: result.article.slug,
        image_url: result.imageUrl || undefined,
        ai_image_url: result.aiImageUrl || undefined,
        image_prompt: result.imagePrompt || undefined,
        // Deep scores (from written article) override initial headline scores
        category: result.deepScore?.category || story.ai?.category || story.ai_category,
        emotions: story.ai?.emotions || story.ai_emotions || [],
        antidote: result.deepScore?.antidote || story.ai?.antidote_for || story.ai_antidote,
        ai_score: result.deepScore?.score || headlineInitialScore || null,
        // Store initial scores for feedback loop
        initial_score: headlineInitialScore,
        initial_antidote: story.ai?.antidote_for || story.ai_antidote || null,
        initial_category: story.ai?.category || story.ai_category || null,
        source_name: story.sourceName || story.source_name,
        source_url: story.sourceUrl || story.source_url,
        research_queries: result.research?.queriesUsed || [],
        research_sources_found: result.research?.sourcesFound || 0,
        research_sources_used: result.research?.sourcesUsed || 0,
        research_references: result.research?.references || [],
        verification_passed: result.verification?.passed ?? undefined,
        verification_summary: result.verification?.summary || undefined,
        verification_claims: result.verification?.claims || [],
        long_form: result.longFormArticle || undefined,
      });
    }

    // Save source suggestions (fire and forget, non-blocking)
    if (result.suggestions?.length) {
      for (const s of result.suggestions) {
        try { await addSourceSuggestion(s); } catch {}
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Research-write API error:", err);

    // Revert headline to "new" so it stays in inbox on failure
    if (headlineId) {
      try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        await getSupabaseAdmin().from("headlines").update({ status: "new" }).eq("id", headlineId);
      } catch {}
    }

    return NextResponse.json(
      { error: err.message || "Napaka pri raziskovanju" },
      { status: 500 }
    );
  }
}

async function runResearchScript(story: Record<string, unknown>): Promise<unknown> {
  // Dynamic import to avoid bundler tracing spawn paths
  const { spawn } = await import("child_process");
  const cwd = process.cwd();

  return new Promise((resolve, reject) => {
    const script = ["lib", "research-write", "run.mjs"].join("/");
    const child = spawn("node", [script], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: Object.fromEntries(
        Object.entries(process.env).filter(([k]) => k !== 'CLAUDECODE' && k !== 'ANTHROPIC_API_KEY')
      ) as NodeJS.ProcessEnv,
    });

    // Send story as JSON to stdin
    child.stdin.write(JSON.stringify(story));
    child.stdin.end();

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (data: Buffer) => stdout.push(data));
    child.stderr.on("data", (data: Buffer) => {
      stderr.push(data);
      // Log progress to server console
      process.stderr.write(data);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const errText = Buffer.concat(stderr).toString();
        reject(new Error(`Research script failed (code ${code}): ${errText.slice(-200)}`));
        return;
      }

      try {
        const output = Buffer.concat(stdout).toString();
        resolve(JSON.parse(output));
      } catch (e: any) {
        reject(new Error(`Failed to parse research output: ${e.message}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn research script: ${err.message}`));
    });
  });
}
