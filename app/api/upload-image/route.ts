import { NextResponse } from "next/server";
import { getAuthEditor } from "@/lib/require-auth-api";
import { getSupabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "node:crypto";

export async function POST(req: Request) {
  const editor = await getAuthEditor();
  if (!editor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const draftId = formData.get("draftId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Ni datoteke" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Samo slike" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Slika je prevelika (max 10MB)" }, { status: 400 });
    }

    const ext = file.type.includes("png") ? "png"
      : file.type.includes("webp") ? "webp"
      : "jpg";

    const fileName = `${draftId || "manual"}-${randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const supabase = getSupabaseAdmin();

    const { error: uploadErr } = await supabase.storage
      .from("article-images")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("article-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
