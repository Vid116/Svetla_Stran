import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { setSundayReserve, clearSundayReserve } from "@/lib/db";
import { nextSundayInLjubljana } from "@/lib/research-write/sunday-reserve.mjs";

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const body = await req.json();
    const { action, draftId, currentReserveId } = body;

    if (action === "release") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId je obvezen" }, { status: 400 });
      }
      await clearSundayReserve(draftId);
      return NextResponse.json({ ok: true });
    }

    if (action === "swap") {
      if (!draftId) {
        return NextResponse.json({ error: "draftId je obvezen" }, { status: 400 });
      }
      const targetDate = nextSundayInLjubljana();
      if (currentReserveId && currentReserveId !== draftId) {
        await clearSundayReserve(currentReserveId);
      }
      await setSundayReserve(draftId, targetDate);
      return NextResponse.json({ ok: true, targetDate });
    }

    return NextResponse.json({ error: "Neznana akcija" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
