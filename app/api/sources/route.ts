import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { getSources, addSource, updateSource, deleteSource } from "@/lib/db";

export async function GET() {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const sources = await getSources();
    // Group into rss/html for backwards compat with the UI
    const rss = sources.filter((s: any) => s.type === "rss");
    const html = sources.filter((s: any) => s.type === "html");
    return NextResponse.json({ rss, html });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { type, source } = body;
    if (!source.name || !source.url) {
      return NextResponse.json({ error: "Ime in URL sta obvezna" }, { status: 400 });
    }
    await addSource({
      name: source.name,
      url: source.url,
      type,
      category: source.category || null,
      link_selector: source.linkSelector || null,
      link_pattern: source.linkPattern || null,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "Vir s tem URL ze obstaja" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const { url, updates } = await req.json();
    await updateSource(url, updates);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const { url } = await req.json();
    await deleteSource(url);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
