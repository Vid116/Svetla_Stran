import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { getSQL } from "./neon";

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/prijava");

  const sql = getSQL();
  const rows = await sql`
    SELECT id, username, name, role, categories, active
    FROM editors WHERE id = ${session.userId}
  `;
  const editor = rows[0];

  if (!editor || !editor.active) redirect("/prijava");

  return {
    user: {
      id: editor.id,
      username: editor.username,
      name: editor.name,
      role: editor.role,
      categories: editor.categories || [],
    },
  };
}
