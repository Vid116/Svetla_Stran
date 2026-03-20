/**
 * Image extraction and quality checking for articles.
 *
 * Strategy: site-specific selectors first (we know our sources),
 * then JSON-LD, then og:image, then generic fallback.
 */
import * as cheerio from 'cheerio';
import { Buffer } from 'buffer';

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';
const MIN_WIDTH = 800;
const MIN_HEIGHT = 400;
const MIN_FILE_SIZE = 40_000; // 40KB — real photos are almost always larger

// ── Site-specific image selectors ──────────────────────────────────────────
// Each entry: { selector, urlFilter (optional — only accept img src matching this) }
// Built from manual audit of each source site's HTML structure.

const SITE_SELECTORS = {
  // === PROBLEMATIC SOURCES (no og:image, custom HTML) ===

  'zoo.si': {
    // Hero: /files/news/{id}/picture/1080x512/{name}.jpg
    // Gallery: /files/news/{id}/gallery/1200w/{name}.jpg
    selector: 'img[src*="/files/news/"]',
    urlFilter: /\/files\/news\/\d+\/(picture|gallery)\//,
  },
  'startup.si': {
    // Articles: /Data/Images/Novice/YYYY/filename
    // AVOID: /Data/Images/Logotipi/ (logos!)
    selector: 'img[src*="/Data/Images/Novice/"]',
    urlFilter: /\/Data\/Images\/Novice\//,
  },
  'gov.si': {
    // Photos at /assets/vladne-sluzbe/.../Fotografije/
    selector: 'img[src*="/assets/"]',
    urlFilter: /\/assets\/.*\.(jpg|jpeg|png|webp)/i,
  },
  'cnvos.si': {
    // S3 CDN: s3.fr-par.scw.cloud/djnd/cnvos/news_images/
    selector: 'img[src*="cnvos/news_images/"]',
  },
  'ljubljana.si': {
    // Hero: /assets/news/ or /assets/Element-Gallery/
    selector: 'img[src*="/assets/news/"], img[src*="/assets/Element-Gallery/"]',
  },
  'maribor.si': {
    // WordPress: wp-content/uploads/
    selector: 'img[src*="wp-content/uploads/"]',
  },
  'rks.si': {
    // Custom: /files/YYYY/MM/filename.jpg
    selector: 'img[src*="/files/"]',
    urlFilter: /\/files\/\d{4}\/\d{2}\//,
  },
  'olympic.si': {
    // Headless CMS: cms.olympic.si/api/media/file/
    selector: 'img[src*="cms.olympic.si/api/media/file/"]',
  },
  'zavetisce-ljubljana.si': {
    // Next.js proxied from DigitalOcean Spaces
    selector: 'img[src*="zavetisce.fra1.digitaloceanspaces.com"], img[src*="/_next/image"]',
  },
  'zavetisce-mb.si': {
    // Custom: swan.jhmb.si/storage/photos/
    selector: 'img[src*="swan.jhmb.si/storage/photos/"]',
  },
  'kgzs.si': {
    // Direct uploads: /uploads/ or /media/cache/resolve/og/uploads/
    selector: 'img[src*="/uploads/"]',
    urlFilter: /\/uploads\/.*\.(jpg|jpeg|png|webp)/i,
  },

  // === NEWS PORTALS (JSON-LD usually works, but add selectors as backup) ===

  'rtvslo.si': {
    // CDN: img.rtvcdn.si/_up/upload/
    selector: 'figure img[src*="rtvcdn.si"], img[src*="rtvcdn.si"]',
  },
  '24ur.com': {
    // CDN: images.24ur.com/media/images/
    selector: 'figure img[src*="images.24ur.com"], picture img[src*="images.24ur.com"]',
  },
  'delo.si': {
    selector: 'figure img, article img',
  },
  'dnevnik.si': {
    selector: 'figure img, article img',
  },
  'vecer.com': {
    selector: 'figure img, article img',
  },
  'zurnal24.si': {
    selector: 'figure img, article img',
  },
  'primorske.si': {
    selector: 'figure img, article img',
  },
  'gorenjskiglas.si': {
    selector: 'figure img, article img',
  },
  'savinjske.com': {
    // Article images are inside fancybox lightbox links — ads are in sidebar links to /narocnina/
    selector: 'a.fancybox img[src*="/Storage/Images/"]',
  },
  'sobotainfo.com': {
    selector: 'figure img, article img',
  },
  'monitor.si': {
    selector: 'figure img, article img',
  },
  'sloveniatimes.com': {
    selector: 'figure img, article img',
  },

  // === WORDPRESS PATTERN (many NGO sites) ===
  // karitas.si, filantropija.org, ptice.si, gasilec.net, sloski.si, etc.
  // All use wp-content/uploads/ — handled by generic WordPress selector below
};

/**
 * Get the site key from a URL hostname.
 * Strips www. and matches against SITE_SELECTORS keys.
 */
function getSiteKey(hostname) {
  const clean = hostname.replace(/^www\./, '');
  // Direct match
  if (SITE_SELECTORS[clean]) return clean;
  // Subdomain match (e.g. media.gzs.si → gzs.si)
  const parts = clean.split('.');
  if (parts.length > 2) {
    const parent = parts.slice(-2).join('.');
    if (SITE_SELECTORS[parent]) return parent;
  }
  return null;
}

// ── Image size detection ─────────────────────────────────────────────────────

async function getImageSize(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Range: 'bytes=0-65535' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!res.ok && res.status !== 206) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 24) return null;

    // JPEG — skip EXIF thumbnail SOF markers, find the real image dimensions
    if (buf[0] === 0xFF && buf[1] === 0xD8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xFF) { i++; continue; }
        const marker = buf[i + 1];
        // SOF0 or SOF2 — but skip if inside EXIF (before SOS marker)
        if (marker === 0xC0 || marker === 0xC2) {
          const h = buf.readUInt16BE(i + 5);
          const w = buf.readUInt16BE(i + 7);
          // EXIF thumbnails are typically <512px — skip them
          if (w >= 512 || h >= 512) return { width: w, height: h };
          // Small SOF — likely EXIF thumbnail, keep scanning
        }
        // Skip marker segment (read length and jump past it)
        if (marker >= 0xC0 && marker !== 0xD9 && marker !== 0xDA) {
          if (i + 3 < buf.length) {
            const segLen = buf.readUInt16BE(i + 2);
            i += 2 + segLen;
            continue;
          }
        }
        i++;
      }
      return null;
    }

    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }

    // WebP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
        return { width: buf.readUInt16LE(26) & 0x3FFF, height: buf.readUInt16LE(28) & 0x3FFF };
      }
      if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x4C) {
        const bits = buf.readUInt32LE(21);
        return { width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1 };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ── Image quality checks ─────────────────────────────────────────────────────

function looksLikeLogo(url) {
  const lower = url.toLowerCase();
  // English + Slovenian logo patterns
  if (/\/(logo|logotip|icon|favicon|badge|brand|sprite|banner-ad|pixel|tracking|widget)[sie\-_./]/i.test(lower)) return true;
  const filename = lower.split('/').pop() || '';
  if (/^(logo|logotip|icon|favicon|brand|og-default|default-share|placeholder)/i.test(filename)) return true;
  if (filename.endsWith('.svg')) return true;
  return false;
}

async function getFileSize(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const cl = res.headers.get('content-length');
    return cl ? parseInt(cl, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Validate an image candidate. Returns true only for real photos.
 * skipSizeCheck: for site-specific matches where we trust the selector
 */
async function isGoodQuality(url, skipSizeCheck = false) {
  if (!url) return false;
  if (looksLikeLogo(url)) {
    process.stderr.write(`[Image] SKIP (logo pattern): ${url.slice(0, 100)}\n`);
    return false;
  }

  const fileSize = await getFileSize(url);

  if (!skipSizeCheck && fileSize !== null && fileSize < MIN_FILE_SIZE) {
    process.stderr.write(`[Image] SKIP (${(fileSize/1024).toFixed(0)}KB < 40KB): ${url.slice(0, 100)}\n`);
    return false;
  }

  const size = await getImageSize(url);
  if (!size) {
    // If we can't read dimensions but file is large enough, accept it (site-specific match)
    if (skipSizeCheck && fileSize && fileSize > MIN_FILE_SIZE) {
      process.stderr.write(`[Image] OK (trusted, ${(fileSize/1024).toFixed(0)}KB, dims unknown): ${url.slice(0, 100)}\n`);
      return true;
    }
    return false;
  }

  const ratio = size.width / size.height;
  if (ratio > 3.5 || ratio < 0.5) {
    process.stderr.write(`[Image] SKIP (ratio ${ratio.toFixed(1)}): ${url.slice(0, 100)} → ${size.width}x${size.height}\n`);
    return false;
  }

  // OG template detection: exact 1200x630 with small file = generated card, not photo
  if (size.width === 1200 && size.height === 630 && fileSize !== null && fileSize < 100_000) {
    process.stderr.write(`[Image] SKIP (OG template ${(fileSize/1024).toFixed(0)}KB): ${url.slice(0, 100)} → 1200x630\n`);
    return false;
  }

  // Trusted sources (JSON-LD, site-specific) get relaxed dimensions (600x300)
  const minW = skipSizeCheck ? 600 : MIN_WIDTH;
  const minH = skipSizeCheck ? 300 : MIN_HEIGHT;
  const ok = size.width >= minW && size.height >= minH;
  process.stderr.write(`[Image] ${url.slice(0, 100)} → ${size.width}x${size.height} ${fileSize ? `${(fileSize/1024).toFixed(0)}KB` : '?KB'} ${ok ? 'OK' : 'TOO SMALL'}\n`);
  return ok;
}

// ── Cache path stripping ─────────────────────────────────────────────────────

function tryStripCachePath(url) {
  const candidates = [];
  const cacheMatch = url.match(/(.+?)\/media\/cache\/resolve\/[^/]+\/(.+)/);
  if (cacheMatch) {
    candidates.push(`${cacheMatch[1]}/${cacheMatch[2]}`);
    candidates.push(`${cacheMatch[1]}/media/${cacheMatch[2]}`);
  }
  const wpMatch = url.match(/^(.+)-\d+x\d+(\.\w+)$/);
  if (wpMatch) candidates.push(`${wpMatch[1]}${wpMatch[2]}`);
  const resizeMatch = url.match(/(.+?)\/(thumbs?|resized|small|medium|cache|_cache)\//);
  if (resizeMatch) {
    candidates.push(`${resizeMatch[1]}/${url.slice(resizeMatch[0].length)}`);
  }
  return candidates;
}

// ── Main image extraction ────────────────────────────────────────────────────

export async function findBestImage(url) {
  if (!url) return null;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);
    const hostname = baseUrl.hostname;

    const resolve = (src) => {
      if (!src) return null;
      try { return new URL(src, baseUrl).href; } catch { return null; }
    };

    const extractFromImgs = (imgs) => {
      const urls = [];
      imgs.each((_, el) => {
        const src = resolve($(el).attr('src'));
        const srcset = $(el).attr('srcset');
        if (srcset) {
          const parts = srcset.split(',').map(s => s.trim());
          const largest = parts.sort((a, b) => {
            const wa = parseInt(a.match(/(\d+)w/)?.[1] || '0');
            const wb = parseInt(b.match(/(\d+)w/)?.[1] || '0');
            return wb - wa;
          })[0];
          const largestUrl = resolve(largest?.split(/\s+/)[0]);
          if (largestUrl) urls.push(largestUrl);
        }
        if (src) urls.push(src);
      });
      return urls;
    };

    // ── STRATEGY 1: JSON-LD / Schema.org image (most reliable structured data) ──
    const ldImages = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const ld = JSON.parse($(el).html());
        const items = Array.isArray(ld) ? ld : [ld];
        for (const item of items) {
          const img = item.image;
          if (img) {
            if (typeof img === 'string') {
              const r = resolve(img); if (r) ldImages.push(r);
            } else if (Array.isArray(img)) {
              for (const i of img) {
                const r = resolve(typeof i === 'string' ? i : i?.url);
                if (r) ldImages.push(r);
              }
            } else if (img.url) {
              const r = resolve(img.url); if (r) ldImages.push(r);
            }
          }
          if (item.thumbnailUrl) {
            const r = resolve(item.thumbnailUrl); if (r) ldImages.push(r);
          }
        }
      } catch {}
    });
    if (ldImages.length > 0) {
      process.stderr.write(`[Image] JSON-LD: ${ldImages.length} candidates\n`);
      for (const candidate of ldImages) {
        const stripped = tryStripCachePath(candidate);
        for (const s of stripped) {
          if (await isGoodQuality(s)) return s;
        }
        // JSON-LD is structured data set by the site — trust it with relaxed size check
        if (await isGoodQuality(candidate, true)) return candidate;
      }
    }

    // ── STRATEGY 2: Site-specific selector (for sites without JSON-LD) ───
    const siteKey = getSiteKey(hostname);
    if (siteKey) {
      const site = SITE_SELECTORS[siteKey];
      const imgs = $(site.selector);
      if (imgs.length > 0) {
        let siteUrls = extractFromImgs(imgs);
        if (site.urlFilter) {
          siteUrls = siteUrls.filter(u => site.urlFilter.test(u));
        }
        process.stderr.write(`[Image] Site "${siteKey}": ${siteUrls.length} candidates from selector\n`);
        for (const candidate of siteUrls) {
          if (await isGoodQuality(candidate, true)) return candidate;
        }
      } else {
        process.stderr.write(`[Image] Site "${siteKey}": selector matched 0 elements\n`);
      }
    }

    // ── STRATEGY 3: og:image / twitter:image ─────────────────────────────
    const ogImage = resolve($('meta[property="og:image"]').attr('content'));
    const twImage = resolve(
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content')
    );

    for (const metaImg of [ogImage, twImage].filter(Boolean)) {
      const stripped = tryStripCachePath(metaImg);
      for (const s of stripped) {
        if (await isGoodQuality(s, true)) return s;
      }
      // Trust og:image/twitter:image — site explicitly declared this as their image
      if (await isGoodQuality(metaImg, true)) return metaImg;
    }

    // ── STRATEGY 4: Generic semantic selectors ───────────────────────────
    const genericSelectors = [
      'article img', '[role="main"] img', 'main img',
      '.article-body img', '.article-content img',
      '.post-content img', '.entry-content img',
      // WordPress pattern (covers karitas, filantropija, ptice, gasilec, sloski, etc.)
      'img[src*="wp-content/uploads/"]',
      'figure img', '#content img', '.content img',
    ];

    for (const sel of genericSelectors) {
      const imgs = $(sel);
      if (imgs.length > 0) {
        const urls = extractFromImgs(imgs);
        for (const candidate of urls) {
          if (await isGoodQuality(candidate)) return candidate;
        }
        break; // Don't try more selectors if we found elements (they just failed quality)
      }
    }

    // ── STRATEGY 5: Scan ALL images, skip obvious non-photos ─────────────
    process.stderr.write(`[Image] All strategies failed, scanning all <img> tags...\n`);
    const skipPatterns = /\/(logo|logotip|icon|favicon|flag|sponsor|sponzor|avatar|badge|banner-ad|pixel|tracking|widget|partner|narocnina|subscribe|advert|reklam)/i;
    const allImgs = [];
    $('img').each((_, el) => {
      const src = resolve($(el).attr('src'));
      if (src && !skipPatterns.test(src)) allImgs.push(src);
    });

    // Deduplicate
    const seen = new Set();
    const unique = allImgs.filter(u => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });

    for (const candidate of unique) {
      if (await isGoodQuality(candidate)) return candidate;
    }

    process.stderr.write(`[Image] No image found for ${url.slice(0, 80)}\n`);
    return null;
  } catch (err) {
    process.stderr.write(`[Image] Error: ${err.message}\n`);
    return null;
  }
}

// Backward compat alias
export const findOgImage = findBestImage;
