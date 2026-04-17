import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import {
  deleteDraftsByHeadlineId,
  setHeadlineProcessing,
  pickHeadline,
  createDraft,
  getHeadlineById,
} from "@/lib/db";

const WORKER_URL = process.env.WORKER_URL; // e.g., http://109.205.179.86:3001
const WORKER_SECRET = process.env.WORKER_SECRET;

// Localhost dev → run pipeline in-process so logs stream to the terminal.
// Production (Vercel) → always hand off to the VPS worker (only way it works there).
const IS_LOCAL_DEV = process.env.NODE_ENV !== "production";

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const story = await req.json();

    if (!story.rawTitle) {
      return NextResponse.json({ error: "Manjka rawTitle" }, { status: 400 });
    }

    const headlineId = story.headlineId || story.storyId;

    // Set headline to processing immediately (so UI updates)
    if (headlineId) {
      await deleteDraftsByHeadlineId(headlineId);
      await setHeadlineProcessing(headlineId);
    }

    // Local dev: run in-process, save draft, update headline — same as VPS worker
    if (IS_LOCAL_DEV) {
      console.log("[research-write] Running pipeline locally (NODE_ENV=development)");
      try {
        const result = await runResearchScriptLocally(story) as any;

        // Save draft (mirrors scripts/worker.mjs handleResearchWrite logic)
        if (headlineId && result.article) {
          const headline = await getHeadlineById(headlineId);
          const headlineInitialScore = headline?.ai_score ?? null;

          await pickHeadline(headlineId);
          await createDraft({
            headline_id: headlineId,
            title: result.article.title,
            subtitle: result.article.subtitle,
            body: result.article.body,
            slug: result.article.slug,
            image_url: result.imageUrl || null,
            ai_image_url: result.aiImageUrl || null,
            image_prompt: result.imagePrompt || null,
            category: result.deepScore?.category || story.ai_category,
            emotions: story.ai_emotions || [],
            antidote: result.deepScore?.antidote || story.ai_antidote,
            antidote_secondary: result.deepScore?.antidote_secondary || null,
            ai_score: Math.round(result.deepScore?.score || headlineInitialScore || 0) || null,
            initial_score: headlineInitialScore,
            initial_antidote: story.ai_antidote || null,
            initial_category: story.ai_category || null,
            source_name: story.source_name,
            source_url: story.source_url,
            research_queries: result.research?.queriesUsed || [],
            research_sources_found: result.research?.sourcesFound || 0,
            research_sources_used: result.research?.sourcesUsed || 0,
            research_references: result.research?.references || [],
            verification_passed: result.verification?.passed ?? null,
            verification_summary: result.verification?.summary || null,
            verification_claims: result.verification?.claims || [],
            long_form: result.longFormArticle || null,
            themes: Array.isArray(result.deepScore?.themes) ? result.deepScore.themes : [],
          });

          console.log(`[research-write] Draft saved: "${result.article.title}"`);
        }

        return NextResponse.json({ ok: true, local: true });
      } catch (err: any) {
        // Reset headline on failure so it doesn't stay stuck in 'processing'
        if (headlineId) {
          const { getSQL } = await import("@/lib/neon");
          const sql = getSQL();
          await sql`UPDATE headlines SET status = 'new' WHERE id = ${headlineId}`;
          console.log(`[research-write] Pipeline failed, headline ${headlineId} reset to 'new'`);
        }
        throw err;
      }
    }

    // Production: forward to VPS worker (fire and forget)
    if (WORKER_URL && WORKER_SECRET) {
      fetch(`${WORKER_URL}/research-write`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": WORKER_SECRET,
        },
        body: JSON.stringify(story),
      }).catch((err) => {
        console.error("[research-write] Worker call failed:", err.message);
      });

      return NextResponse.json({ ok: true, queued: true });
    }

    return NextResponse.json(
      { error: "V produkciji mora biti nastavljen WORKER_URL + WORKER_SECRET." },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Research-write API error:", err);
    return NextResponse.json(
      { error: err.message || "Napaka pri raziskovanju" },
      { status: 500 }
    );
  }
}

// Local fallback — spawns run.mjs as child process, streams stderr to terminal
async function runResearchScriptLocally(story: Record<string, unknown>): Promise<unknown> {
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

    child.stdin.write(JSON.stringify(story));
    child.stdin.end();

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (data: Buffer) => stdout.push(data));
    child.stderr.on("data", (data: Buffer) => {
      stderr.push(data);
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
