/**
 * OG image extraction from source URLs.
 * Web search and content fetching are now handled by Claude Agent SDK tools.
 */
import * as cheerio from 'cheerio';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

export async function findOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('meta[property="og:image"]').attr('content') || null;
  } catch { return null; }
}
