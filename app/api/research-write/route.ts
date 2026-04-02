import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { deleteDraftsByHeadlineId, setHeadlineProcessing } from "@/lib/db";

const WORKER_URL = process.env.WORKER_URL; // e.g., http://109.205.179.86:3001
const WORKER_SECRET = process.env.WORKER_SECRET;

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

    // Forward to VPS worker (fire and forget)
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

    // Fallback: run locally (for dev/testing without VPS)
    const result = await runResearchScriptLocally(story);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Research-write API error:", err);
    return NextResponse.json(
      { error: err.message || "Napaka pri raziskovanju" },
      { status: 500 }
    );
  }
}

// Local fallback — same as before, for dev without VPS
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
