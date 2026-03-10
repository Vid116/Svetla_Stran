import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { prisma } from '../prisma';
import { contentHash } from './dedup';
import { SourceType, StoryStatus } from '@prisma/client';
import type { HTMLSource } from './sources';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

const rssParser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': USER_AGENT },
});

export interface RawStory {
  rawTitle: string;
  rawContent: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: 'rss' | 'html';
}

// ── RSS CRAWL ─────────────────────────────────────────────────────────────────

export async function crawlRSS(url: string, sourceName: string): Promise<RawStory[]> {
  const results: RawStory[] = [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const feed = await rssParser.parseURL(url);

    for (const item of feed.items) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;
      if (pubDate && pubDate < cutoff) continue;

      const title = item.title?.trim();
      const link = item.link?.trim();
      if (!title || !link) continue;

      results.push({
        rawTitle: title,
        rawContent: item.contentSnippet?.trim() || item.content?.trim() || '',
        sourceUrl: link,
        sourceName,
        sourceType: 'rss',
      });
    }
  } catch (e: any) {
    console.error(`RSS napaka [${sourceName}]: ${e.message}`);
  }

  return results;
}

// ── HTML CRAWL (za strani brez RSS) ──────────────────────────────────────────

export async function crawlHTML(source: HTMLSource): Promise<RawStory[]> {
  const results: RawStory[] = [];
  const pattern = new RegExp(source.linkPattern);

  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const origin = new URL(source.url).origin;
    const seen = new Set<string>();

    $(source.linkSelector).each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');

      if (text.length < 15 || !pattern.test(href)) return;

      const fullUrl = href.startsWith('http') ? href : `${origin}${href.split('#')[0]}`;
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      results.push({
        rawTitle: text.slice(0, 200),
        rawContent: '',
        sourceUrl: fullUrl,
        sourceName: source.name,
        sourceType: 'html',
      });
    });
  } catch (e: any) {
    console.error(`HTML napaka [${source.name}]: ${e.message}`);
  }

  return results;
}

// ── POLNI CRAWL (za DA kandidate - pobere celotno vsebino članka) ─────────────

export async function crawlFullContent(urls: string[]): Promise<Map<string, string>> {
  const contents = new Map<string, string>();

  const BATCH = 5;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(15000),
        });
        const html = await res.text();
        const $ = cheerio.load(html);

        const body =
          $('article').text() ||
          $('[class*="article-body"]').text() ||
          $('[class*="content"]').first().text() ||
          $('main p').map((_, el) => $(el).text()).get().join('\n');

        return { url, body: body.trim().slice(0, 3000) };
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.body) {
        contents.set(r.value.url, r.value.body);
      }
    }
  }

  return contents;
}

// ── SHRANI V BAZO ─────────────────────────────────────────────────────────────

export async function saveNewStories(stories: RawStory[]): Promise<string[]> {
  if (stories.length === 0) return [];

  const existing = await prisma.story.findMany({
    select: { sourceUrl: true, contentHash: true },
  });
  const urlSet = new Set(existing.map(s => s.sourceUrl));
  const hashSet = new Set(existing.map(s => s.contentHash).filter(Boolean));

  const nove = stories.filter(s => {
    if (!s.sourceUrl || urlSet.has(s.sourceUrl)) return false;
    const hash = contentHash(s.rawTitle, s.rawContent);
    if (hashSet.has(hash)) return false;
    return true;
  });

  if (nove.length === 0) return [];

  const saved = await Promise.all(
    nove.map(s =>
      prisma.story.create({
        data: {
          sourceType: s.sourceType === 'html' ? SourceType.SCRAPE : SourceType.RSS,
          sourceUrl: s.sourceUrl,
          sourceName: s.sourceName,
          rawTitle: s.rawTitle,
          rawContent: s.rawContent,
          contentHash: contentHash(s.rawTitle, s.rawContent),
          status: StoryStatus.PENDING_TITLE_FILTER,
        },
      })
    )
  );

  return saved.map(s => s.id);
}
