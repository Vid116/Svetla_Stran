import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, getAuthEditor } from "@/lib/require-auth-api";
import {
  getCommentsByArticle,
  createComment,
  moderateComment,
  deleteComment,
} from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const articleId = req.nextUrl.searchParams.get("articleId");
    if (!articleId) {
      return NextResponse.json({ error: "articleId je obvezen" }, { status: 400 });
    }

    const editor = await getAuthEditor();
    const isEditor = !!editor;
    const comments = await getCommentsByArticle(articleId, isEditor);

    return NextResponse.json({
      comments,
      isEditor,
      editorName: editor?.name ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { articleId, parentId, authorName, body } = await req.json();

    if (!articleId) {
      return NextResponse.json({ error: "articleId je obvezen" }, { status: 400 });
    }
    const editor = await getAuthEditor();

    if (!editor && (!authorName || authorName.length > 50)) {
      return NextResponse.json(
        { error: "Ime avtorja je obvezno (maks 50 znakov)" },
        { status: 400 },
      );
    }
    if (!body || body.length > 2000) {
      return NextResponse.json(
        { error: "Besedilo je obvezno (maks 2000 znakov)" },
        { status: 400 },
      );
    }

    const comment = await createComment({
      article_id: articleId,
      parent_id: parentId || null,
      author_name: editor ? editor.name : authorName,
      author_type: editor ? "editor" : "visitor",
      editor_id: editor ? editor.id : null,
      body,
      status: editor ? "approved" : "pending",
    });

    return NextResponse.json(comment);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const { commentId, action, body, rejectionReason } = await req.json();

    if (!commentId || !action) {
      return NextResponse.json(
        { error: "commentId in action sta obvezna" },
        { status: 400 },
      );
    }

    if (action === "approve") {
      await moderateComment(commentId, "approved");
    } else if (action === "reject") {
      await moderateComment(commentId, "rejected", rejectionReason);
    } else if (action === "reply") {
      if (!body) {
        return NextResponse.json(
          { error: "Besedilo odgovora je obvezno" },
          { status: 400 },
        );
      }

      // Fetch parent comment to get article_id
      const supabase = getSupabaseAdmin();
      const { data: parent, error: parentErr } = await supabase
        .from("comments")
        .select("article_id")
        .eq("id", commentId)
        .single();

      if (parentErr || !parent) {
        return NextResponse.json(
          { error: "Komentar ne obstaja" },
          { status: 404 },
        );
      }

      const editor = await getAuthEditor();

      await createComment({
        article_id: parent.article_id,
        parent_id: commentId,
        author_name: editor!.name,
        author_type: "editor",
        editor_id: editor!.id,
        body,
        status: "approved",
      });
    } else {
      return NextResponse.json({ error: "Neznana akcija" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id je obvezen" }, { status: 400 });
    }

    await deleteComment(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
