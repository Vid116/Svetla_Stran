import { NextRequest, NextResponse } from "next/server";
import { writeArticle } from "@/lib/anthropic";
import { requireAuthAPI } from "@/lib/require-auth-api";
import { createDraft, pickHeadline } from "@/lib/db";

export async function POST(req: NextRequest) {
  const denied = await requireAuthAPI();
  if (denied) return denied;
  try {
    const story = await req.json();

    if (!story.rawTitle || !story.rawContent) {
      return NextResponse.json(
        { error: "Manjkata rawTitle in rawContent" },
        { status: 400 }
      );
    }

    const article = await writeArticle({
      rawTitle: story.rawTitle,
      rawContent: story.rawContent || story.fullContent,
      aiHeadline: story.ai?.headline_suggestion || story.ai_headline,
      aiCategory: story.ai?.category || story.ai_category,
    });

    // Save as draft and mark headline as picked
    if (story.headlineId || story.storyId) {
      const headlineId = story.headlineId || story.storyId;
      await pickHeadline(headlineId);
      await createDraft({
        headline_id: headlineId,
        title: article.title,
        subtitle: article.subtitle,
        body: article.body,
        slug: article.slug,
        category: story.ai?.category || story.ai_category,
        emotions: story.ai?.emotions || story.ai_emotions || [],
        antidote: story.ai?.antidote_for || story.ai_antidote,
        source_name: story.sourceName || story.source_name,
        source_url: story.sourceUrl || story.source_url,
      });
    }

    return NextResponse.json(article);
  } catch (err: any) {
    console.error("Write API error:", err);
    return NextResponse.json(
      { error: err.message || "Napaka pri pisanju" },
      { status: 500 }
    );
  }
}
