import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { getSQL } from "./neon";

export async function requireAuthAPI(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT id, auth_id, username, name, role, categories, active
    FROM editors WHERE id = ${session.userId}
  `;
  const editor = rows[0];

  if (!editor || !editor.active) {
    return NextResponse.json({ error: "Neprijavljen" }, { status: 401 });
  }

  return null;
}

export async function getAuthEditor() {
  const session = await getSession();
  if (!session) return null;

  const sql = getSQL();
  const rows = await sql`
    SELECT id, auth_id, username, name, role, categories, active
    FROM editors WHERE id = ${session.userId}
  `;
  const editor = rows[0];

  if (!editor || !editor.active) return null;
  return editor;
}
