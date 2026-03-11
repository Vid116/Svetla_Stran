import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { createDraft, pickHeadline } from "@/lib/db";

export const maxDuration = 300; // up to 5 minutes for full research pipeline

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const story = await req.json();

    if (!story.rawTitle || !(story.rawContent || story.fullContent)) {
      return NextResponse.json(
        { error: "Manjkata rawTitle in rawContent/fullContent" },
        { status: 400 }
      );
    }

    const result = await runResearchScript(story) as any;

    // Save as draft and mark headline as picked
    const headlineId = story.headlineId || story.storyId;
    if (headlineId && result.article) {
      await pickHeadline(headlineId);
      await createDraft({
        headline_id: headlineId,
        title: result.article.title,
        subtitle: result.article.subtitle,
        body: result.article.body,
        slug: result.article.slug,
        image_url: result.imageUrl || undefined,
        category: story.ai?.category || story.ai_category,
        emotions: story.ai?.emotions || story.ai_emotions || [],
        antidote: story.ai?.antidote_for || story.ai_antidote,
        source_name: story.sourceName || story.source_name,
        source_url: story.sourceUrl || story.source_url,
        research_queries: result.research?.queriesUsed || [],
        research_sources_found: result.research?.sourcesFound || 0,
        research_sources_used: result.research?.sourcesUsed || 0,
        research_references: result.research?.references || [],
        verification_passed: result.verification?.passed ?? undefined,
        verification_summary: result.verification?.summary || undefined,
        verification_claims: result.verification?.claims || [],
      });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Research-write API error:", err);
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
    const script = ["scripts", "research-write.mjs"].join("/");
    const child = spawn("node", [script], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDECODE: undefined },
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
