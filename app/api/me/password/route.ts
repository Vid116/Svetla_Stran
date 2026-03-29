import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getSQL } from "@/lib/neon";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  try {
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Geslo mora imeti vsaj 6 znakov" }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const sql = getSQL();
    await sql`UPDATE editors SET password_hash = ${hash}, updated_at = now() WHERE id = ${session.userId}`;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
