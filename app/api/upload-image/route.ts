import { NextResponse } from "next/server";
import { getAuthEditor } from "@/lib/require-auth-api";
import { uploadImage } from "@/lib/r2";
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Samo slike" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Slika je prevelika (max 10MB)" }, { status: 400 });
    }

    const ext = file.type.includes("png") ? "png"
      : file.type.includes("webp") ? "webp"
      : "jpg";

    const fileName = `${draftId || "manual"}-${randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadImage(buffer, fileName, file.type);

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
