/**
 * Source Discovery Agent
 *
 * Runs in parallel with article writing inside run.mjs.
 * Analyzes URLs encountered during research and suggests new sources.
 *
 * Uses Claude Agent SDK (same as research) with WebSearch + WebFetch
 * to evaluate candidate sites.
 */
import { askClaude, extractJSON } from './ai.mjs';
import { DISCOVERY_PROMPT } from './prompts.mjs';
import * as cheerio from 'cheerio';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

// Common non-news domains to skip
const SKIP_DOMAINS = new Set([
  'google.com', 'google.si', 'youtube.com', 'facebook.com', 'twitter.com',
  'instagram.com', 'linkedin.com', 'reddit.com', 'wikipedia.org',
  'duckduckgo.com', 'amazon.com', 'apple.com', 'microsoft.com',
  'github.com', 'stackoverflow.com', 'tiktok.com', 'pinterest.com',
]);

/**
 * Extract domain from URL, stripping www.
 */
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Probe a domain for RSS feeds by trying common paths
 * and checking <link rel="alternate"> in HTML head.
 */
async function probeRSS(domain) {
  // First check homepage for <link rel="alternate" type="application/rss+xml">
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const rssLink = $('link[type="application/rss+xml"], link[type="application/atom+xml"]').attr('href');
      if (rssLink) {
        // Could be relative
        return rssLink.startsWith('http') ? rssLink : `https://${domain}${rssLink.startsWith('/') ? '' : '/'}${rssLink}`;
      }
    }
  } catch {}

  // Try common RSS paths
  const paths = ['/rss', '/feed', '/rss.xml', '/atom.xml', '/feed.xml', '/rss-0', '/feeds/posts/default'];
  for (const p of paths) {
    try {
      const res = await fetch(`https://${domain}${p}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(4000),
        redirect: 'follow',
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && (ct.includes('xml') || ct.includes('rss') || ct.includes('atom'))) {
        return `https://${domain}${p}`;
      }
    } catch {}
  }

  return null;
}

/**
 * Main discovery function.
 *
 * @param {Object} research - Research result from step 1 (contains references)
 * @param {string} headlineTitle - Title of the headline being researched
 * @param {string[]} knownDomains - Domains already in sources table
 * @param {string} headlineId - ID of the headline
 */
export async function discoverSources(research, headlineTitle, knownDomains, headlineId) {
  const log = (msg) => process.stderr.write(`[Discovery] ${msg}\n`);
  log('Starting source discovery...');

  // 1. Collect all domains from research references
  const references = research.references || [];
  const allDomains = new Map(); // domain -> { url, title }

  for (const ref of references) {
    const domain = extractDomain(ref.url);
    if (!domain) continue;
    if (SKIP_DOMAINS.has(domain)) continue;
    if (knownDomains.includes(domain)) continue;
    if (!allDomains.has(domain)) {
      allDomains.set(domain, { url: ref.url, title: ref.title });
    }
  }

  if (allDomains.size === 0) {
    log('No new domains found in research.');
    return [];
  }

  log(`Found ${allDomains.size} unknown domains to evaluate.`);

  // 2. Probe for RSS in parallel
  const domainEntries = [...allDomains.entries()];
  const rssResults = await Promise.allSettled(
    domainEntries.map(([domain]) => probeRSS(domain))
  );

  const candidates = domainEntries.map(([domain, info], i) => ({
    domain,
    url: `https://${domain}`,
    foundViaUrl: info.url,
    foundViaTitle: info.title,
    rssUrl: rssResults[i].status === 'fulfilled' ? rssResults[i].value : null,
  }));

  log(`RSS probed: ${candidates.filter(c => c.rssUrl).length}/${candidates.length} have RSS.`);

  // 3. Ask Claude to evaluate candidates
  const candidateList = candidates.map(c =>
    `- ${c.domain} (found via: "${c.foundViaTitle}")${c.rssUrl ? ' [HAS RSS]' : ''}`
  ).join('\n');

  const knownList = knownDomains.slice(0, 50).join(', ');

  const userMsg = `Zgodba ki sem jo raziskoval: "${headlineTitle}"

Najdene spletne strani med raziskovanjem:
${candidateList}

Ze znani viri (preskoci te): ${knownList}`;

  try {
    const response = await askClaude(DISCOVERY_PROMPT, userMsg);
    const result = extractJSON(response);
    const suggestions = result.suggestions || [];

    // Enrich with RSS data and headline_id
    const enriched = suggestions.map(s => {
      const candidate = candidates.find(c => c.domain === s.domain);
      return {
        domain: s.domain,
        name: s.name || s.domain,
        url: s.url || `https://${s.domain}`,
        rss_url: candidate?.rssUrl || s.rss_url || null,
        suggested_type: candidate?.rssUrl ? 'rss' : 'html',
        category: s.category || null,
        reason: s.reason || null,
        confidence: Math.min(1, Math.max(0, s.confidence || 0.5)),
        headline_id: headlineId || null,
      };
    });

    log(`Claude suggested ${enriched.length} new sources.`);
    return enriched;
  } catch (err) {
    log(`Discovery AI error: ${err.message}`);
    return [];
  }
}
