import * as cheerio from "cheerio";
import { anthropic, WRITING_PROMPT } from "./anthropic";

const USER_AGENT = "SvetlaStran/1.0 (+https://svetlastran.si)";

// ── STEP 1: Generate search queries from a story ────────────────────────────

async function generateSearchQueries(story: {
  rawTitle: string;
  rawContent: string;
  sourceName: string;
}): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Generiraj 3-5 iskalnih poizvedb (v slovenscini IN anglescini) za globlje raziskovanje te zgodbe. Isci dejstva ki jih lahko preverimo: imena, datume, stevilke, kontekst.

Naslov: ${story.rawTitle}
Vir: ${story.sourceName}
Vsebina: ${story.rawContent.slice(0, 1000)}

Vrni SAMO JSON array stringov, brez markdown:
["iskalna poizvedba 1", "iskalna poizvedba 2", ...]`,
      },
    ],
  });

  const text = msg.content
    .map((b: any) => b.text || "")
    .join("")
    .trim();
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

// ── STEP 2: Web search via DuckDuckGo HTML ──────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encoded}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return results;

    const html = await res.text();
    const $ = cheerio.load(html);

    $(".result").each((i, el) => {
      if (i >= 5) return false; // top 5 per query
      const title = $(el).find(".result__title a").text().trim();
      const url = $(el).find(".result__url").text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();
      const href = $(el).find(".result__title a").attr("href") || "";

      // Extract actual URL from DuckDuckGo redirect
      let actualUrl = "";
      if (href.includes("uddg=")) {
        try {
          actualUrl = decodeURIComponent(
            href.split("uddg=")[1]?.split("&")[0] || ""
          );
        } catch {
          actualUrl = url.startsWith("http") ? url : `https://${url}`;
        }
      } else {
        actualUrl = url.startsWith("http") ? url : `https://${url}`;
      }

      if (title && actualUrl) {
        results.push({ title, url: actualUrl, snippet });
      }
    });
  } catch (e: any) {
    console.error(`Search fail [${query}]: ${e.message}`);
  }
  return results;
}

// ── STEP 3: Fetch and extract article content ───────────────────────────────

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return "";

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove nav, footer, scripts, styles, ads
    $("nav, footer, script, style, iframe, [class*='ad-'], [class*='banner']").remove();

    const body =
      $("article").text() ||
      $('[class*="article-body"]').text() ||
      $('[class*="story-body"]').text() ||
      $('[class*="content"]').first().text() ||
      $("main p")
        .map((_, el) => $(el).text())
        .get()
        .join("\n");

    return body.replace(/\s+/g, " ").trim().slice(0, 3000);
  } catch {
    return "";
  }
}

// ── STEP 4: Compile research into verified facts ────────────────────────────

export interface SourceReference {
  url: string;
  title: string;
}

interface CompileResult {
  verifiedFacts: string;
  usedSources: SourceReference[];
}

async function compileResearch(
  story: { rawTitle: string; rawContent: string },
  searchResults: { url: string; title: string; content: string }[]
): Promise<CompileResult> {
  const usable = searchResults
    .filter((s) => s.content.length > 100)
    .slice(0, 8);

  const sourceSummaries = usable
    .map(
      (s, i) =>
        `[Vir ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.content.slice(0, 1500)}`
    )
    .join("\n\n---\n\n");

  if (!sourceSummaries) return { verifiedFacts: "", usedSources: [] };

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Si raziskovalec za slovensko novico. Tvoja naloga je SAMO zbrati preverjeno DEJSTVA — nic mnenj, nic interpretacij.

IZVIRNA ZGODBA:
Naslov: ${story.rawTitle}
Vsebina: ${story.rawContent.slice(0, 1500)}

DODATNI VIRI:
${sourceSummaries}

NALOGA:
1. Najdi dejstva ki DOPOLNJUJEJO izvorno zgodbo (imena, stevilke, datumi, kontekst, ozadje)
2. Vkljuci SAMO dejstva ki jih potrjuje vsaj en zanesljiv vir
3. NE vkljucuj mnenj, spekulacij ali informacij ki si jih ne mores preveriti
4. NE ponavljaj informacij ki ze so v izvirni zgodbi
5. Za vsako dejstvo v oklepaju navedi stevilko vira iz katerega izvira, npr. (Vir 2)

Vrni seznam preverjenih dodatnih dejstev, vsako v svoji vrstici:`,
      },
    ],
  });

  const facts = msg.content
    .map((b: any) => b.text || "")
    .join("")
    .trim();

  // Find which sources were actually referenced in the facts
  const usedSources: SourceReference[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < usable.length; i++) {
    // Check if "Vir N" (1-indexed) appears in facts
    if (facts.includes(`Vir ${i + 1}`) || facts.includes(`vir ${i + 1}`)) {
      usedIndices.add(i);
    }
  }
  // If no explicit references found, include all usable sources
  if (usedIndices.size === 0) {
    for (let i = 0; i < usable.length; i++) usedIndices.add(i);
  }
  for (const i of usedIndices) {
    usedSources.push({ url: usable[i].url, title: usable[i].title });
  }

  return { verifiedFacts: facts, usedSources };
}

// ── STEP 5: Write enriched article ──────────────────────────────────────────

const ENRICHED_WRITING_PROMPT = `Si novinar za Svetla Stran - slovensko spletno stran pozitivnih novic.

ABSOLUTNA PRAVILA - BREZ IZJEM:
1. Pisi na podlagi IZVIRNEGA VIRA + PREVERJENIH DODATNIH DEJSTEV.
2. Dodatna dejstva so ze preverjena — jih lahko uporabis za obogatitev clanka.
3. NE dodajaj NICESAR kar ni v izvirnem viru ALI v preverjenih dejstvih.
4. NIKOLI ne moraliziraj. Pusti da zgodba govori sama.
5. NIKOLI ne pisi: pozivov k donacijam, statistik nesrec, politicnih komentarjev.

TON:
- Topel, human, brez patetike in senzacionalizma
- Pisi kot bi pripovedoval prijatelju ob kavi
- Brez klicajev (!), brez clickbait naslovov

STRUKTURA:
- Naslov: max 10 besed, konkreten, pove kaj se je zgodilo
- Podnaslov: 1 stavek, jedro zgodbe — vkljuci kljucno podrobnost iz raziskave
- Telo: 300-500 besed, 4-6 odstavkov (DALJSE kot obicajno — imas vec gradiva)
  1. Uvod: kdo, kaj, kje - bralec takoj ve za kaj gre
  2. Ozadje: kontekst iz dodatnih dejstev
  3-4. Jedro zgodbe: dejanski dosezek z bogatimi podrobnostmi
  5. Sirsi kontekst: zakaj je to pomembno (dejstva, ne mnenja)
  6. Zakljucek: odprt, topel, NE moralizira
- Slug: naslov v URL obliki brez sumnikov (c->c, s->s, z->z)

Vrni SAMO JSON brez markdown:
{
  "title": "naslov",
  "subtitle": "podnaslov - en stavek",
  "body": "telo clanka, odstavki loceni z \\n\\n",
  "slug": "naslov-v-url-obliki"
}`;

async function writeEnrichedArticle(
  story: {
    rawTitle: string;
    rawContent: string;
    aiHeadline?: string | null;
    aiCategory?: string | null;
  },
  verifiedFacts: string
): Promise<{ title: string; subtitle: string; body: string; slug: string }> {
  let content = `IZVIRNI VIR:\nNaslov: ${story.rawTitle}\nVsebina:\n${story.rawContent}`;

  if (verifiedFacts) {
    content += `\n\nPREVERJENA DODATNA DEJSTVA (iz vecih virov):\n${verifiedFacts}`;
  }

  if (story.aiHeadline) {
    content += `\n\nPredlagani naslov: ${story.aiHeadline}`;
  }
  if (story.aiCategory) {
    content += `\nKategorija: ${story.aiCategory}`;
  }

  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    system: ENRICHED_WRITING_PROMPT,
    messages: [{ role: "user", content }],
  });

  const text = msg.content
    .map((b: any) => b.text || "")
    .join("")
    .trim();
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── STEP 6: Verify article against sources ──────────────────────────────────

export interface VerificationResult {
  passed: boolean;
  claims: {
    claim: string;
    status: "ok" | "nepreverljivo" | "napacno";
    note: string;
  }[];
  summary: string;
}

async function verifyArticle(
  articleBody: string,
  originalContent: string,
  verifiedFacts: string
): Promise<VerificationResult> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Si dejstveni preverjevalec (fact-checker) za slovensko novico. Tvoja naloga je preveriti VSAKO trditev v napisanem clanku.

NAPISANI CLANEK:
${articleBody}

IZVIRNI VIR:
${originalContent.slice(0, 2000)}

PREVERJENA DODATNA DEJSTVA:
${verifiedFacts || "(brez dodatnih dejstev)"}

NALOGA:
Preglej VSAKO dejstveno trditev v clanku (imena, stevilke, datumi, kraji, rezultati, citati). Za vsako trditev doloci:
- "ok" — trditev je potrjena v izvirnem viru ALI v preverjenih dejstvih
- "nepreverljivo" — trditev ni ne potrjena ne zanikana v virih (morda dodana od AI)
- "napacno" — trditev nasprotuje virom

PRAVILA:
- Stilske izjave in zakljucki niso trditve (jih preskoci)
- Preveri VSAK konkreten podatek: imena, stevilke, datume, rezultate
- Bodi strog — ce podatek ni nikjer v virih, je "nepreverljivo"

Vrni SAMO JSON brez markdown:
{
  "passed": true/false,
  "claims": [
    {"claim": "kratka trditev", "status": "ok"|"nepreverljivo"|"napacno", "note": "kje je potrjena ali zakaj ne"}
  ],
  "summary": "en stavek povzetek preverbe"
}

passed = true ce ni NOBENE "napacno" trditve IN manj kot 3 "nepreverljivo" trditve.`,
      },
    ],
  });

  const text = msg.content
    .map((b: any) => b.text || "")
    .join("")
    .trim();
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── STEP 7: Try to find a good image ────────────────────────────────────────

async function findOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('meta[property="og:image"]').attr("content") || null;
  } catch {
    return null;
  }
}

// ── MAIN: Full research-and-write pipeline ──────────────────────────────────

export interface ResearchWriteResult {
  article: {
    title: string;
    subtitle: string;
    body: string;
    slug: string;
  };
  research: {
    queriesUsed: string[];
    sourcesFound: number;
    sourcesUsed: number;
    verifiedFacts: string;
    references: SourceReference[];
  };
  verification: VerificationResult;
  imageUrl: string | null;
}

export async function researchAndWrite(story: {
  rawTitle: string;
  rawContent: string;
  sourceUrl: string;
  sourceName: string;
  fullContent?: string;
  ai?: {
    headline_suggestion?: string;
    category?: string;
  };
}): Promise<ResearchWriteResult> {
  const content = story.fullContent || story.rawContent;

  console.log(`[Research] Generating search queries...`);
  const queries = await generateSearchQueries({
    rawTitle: story.rawTitle,
    rawContent: content,
    sourceName: story.sourceName,
  });
  console.log(`[Research] ${queries.length} queries: ${queries.join(" | ")}`);

  // Search all queries in parallel
  console.log(`[Research] Searching...`);
  const allSearchResults = await Promise.all(queries.map((q) => searchWeb(q)));
  const flatResults = allSearchResults.flat();

  // Dedupe by URL, skip original source
  const seen = new Set<string>([story.sourceUrl]);
  const uniqueResults = flatResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  console.log(
    `[Research] ${uniqueResults.length} unique results (after dedup)`
  );

  // Fetch content from top results (parallel, max 10)
  console.log(`[Research] Fetching article content...`);
  const toFetch = uniqueResults.slice(0, 10);
  const fetched = await Promise.all(
    toFetch.map(async (r) => ({
      url: r.url,
      title: r.title,
      content: await fetchArticleContent(r.url),
    }))
  );
  const withContent = fetched.filter((f) => f.content.length > 100);
  console.log(
    `[Research] ${withContent.length}/${toFetch.length} sources had usable content`
  );

  // Compile verified facts
  console.log(`[Research] Compiling verified facts...`);
  let verifiedFacts = "";
  let references: SourceReference[] = [];
  if (withContent.length > 0) {
    const compiled = await compileResearch(
      { rawTitle: story.rawTitle, rawContent: content },
      withContent
    );
    verifiedFacts = compiled.verifiedFacts;
    references = compiled.usedSources;
  }
  // Always include original source as first reference
  references = [
    { url: story.sourceUrl, title: story.sourceName },
    ...references.filter((r) => r.url !== story.sourceUrl),
  ];
  console.log(
    `[Research] Facts compiled (${verifiedFacts.length} chars, ${references.length} sources)`
  );

  // Write the enriched article
  console.log(`[Research] Writing enriched article...`);
  const article = await writeEnrichedArticle(
    {
      rawTitle: story.rawTitle,
      rawContent: content,
      aiHeadline: story.ai?.headline_suggestion,
      aiCategory: story.ai?.category,
    },
    verifiedFacts
  );

  // Verify article against sources
  console.log(`[Research] Verifying article...`);
  const verification = await verifyArticle(article.body, content, verifiedFacts);
  const bad = verification.claims.filter((c) => c.status === "napacno").length;
  const unverified = verification.claims.filter((c) => c.status === "nepreverljivo").length;
  console.log(
    `[Research] Verification: ${verification.passed ? "PASSED" : "FAILED"} — ${bad} napacno, ${unverified} nepreverljivo`
  );

  // Try to get OG image from original source
  const imageUrl = await findOgImage(story.sourceUrl);

  console.log(`[Research] Done: "${article.title}" (${references.length} refs)`);

  return {
    article,
    research: {
      queriesUsed: queries,
      sourcesFound: uniqueResults.length,
      sourcesUsed: withContent.length,
      verifiedFacts,
      references,
    },
    verification,
    imageUrl,
  };
}
