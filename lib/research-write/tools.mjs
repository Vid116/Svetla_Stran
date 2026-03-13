/**
 * Custom MCP tools for research pipeline.
 * Provides FetchArticleText — fetches a URL and returns clean text only.
 * Dramatically reduces token usage compared to WebFetch which returns full HTML.
 */
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as cheerio from 'cheerio';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const MAX_TEXT_LENGTH = 12000; // ~3K tokens, good balance of content vs cost

/**
 * Fetch a URL and extract just the article text.
 * Strips all HTML, scripts, styles, nav, ads, etc.
 * Returns clean readable text, truncated to MAX_TEXT_LENGTH chars.
 */
async function fetchAndExtractText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
    redirect: 'follow',
  });

  if (!res.ok) {
    return `Napaka: HTTP ${res.status} za ${url}`;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    return `Napaka: Ni HTML vsebina (${contentType})`;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, noscript, iframe, svg, nav, header, footer').remove();
  $('[class*="cookie"], [class*="banner"], [class*="popup"], [class*="modal"]').remove();
  $('[class*="sidebar"], [class*="widget"], [class*="comment"], [class*="social"]').remove();
  $('[class*="newsletter"], [class*="subscribe"], [class*="share"]').remove();
  $('[id*="cookie"], [id*="banner"], [id*="popup"], [id*="modal"]').remove();
  $('form, button, input, select, textarea').remove();

  // Try to find main article content
  const selectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-body',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.story-body',
    '.content-body',
    '#article-body',
    '#content',
    '.text',
  ];

  let text = '';
  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 200) {
      text = el.text();
      break;
    }
  }

  // Fallback to body
  if (!text || text.trim().length < 200) {
    text = $('body').text();
  }

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  // Extract title and meta description for context
  const title = $('title').text().trim() || $('h1').first().text().trim();
  const description = $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content')
    || '';

  // Extract publish date from common meta tags
  const publishDate = $('meta[property="article:published_time"]').attr('content')
    || $('meta[name="date"]').attr('content')
    || $('meta[name="pubdate"]').attr('content')
    || $('meta[name="publish-date"]').attr('content')
    || $('meta[property="og:article:published_time"]').attr('content')
    || $('time[datetime]').first().attr('datetime')
    || $('[itemprop="datePublished"]').attr('content')
    || $('[itemprop="datePublished"]').attr('datetime')
    || '';

  // Build clean output
  let output = '';
  if (title) output += `NASLOV: ${title}\n`;
  if (description) output += `OPIS: ${description}\n`;
  if (publishDate) output += `DATUM OBJAVE: ${publishDate}\n`;
  output += `URL: ${url}\n\n`;
  output += text.slice(0, MAX_TEXT_LENGTH);

  if (text.length > MAX_TEXT_LENGTH) {
    output += '\n\n[... besedilo skrajšano ...]';
  }

  return output;
}

/**
 * Create the custom MCP server with our tools.
 */
export function createResearchTools() {
  return createSdkMcpServer({
    name: 'svetla-tools',
    version: '1.0.0',
    tools: [
      tool(
        'FetchArticleText',
        'Preberi spletno stran in vrni samo čisto besedilo članka (brez HTML). Uporabi to namesto WebFetch za branje člankov — je hitrejše in porabi manj virov.',
        {
          url: z.string().describe('URL spletne strani za prebrati'),
        },
        async (args) => {
          try {
            const text = await fetchAndExtractText(args.url);
            return {
              content: [{ type: 'text', text }],
            };
          } catch (err) {
            return {
              content: [{ type: 'text', text: `Napaka pri branju ${args.url}: ${err.message}` }],
            };
          }
        }
      ),
    ],
  });
}
