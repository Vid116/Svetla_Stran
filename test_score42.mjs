delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync } from 'fs';

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran - portal pozitivnih novic iz Slovenije.

SVETLA STRAN je slovenski portal dobrih novic. Naše poslanstvo:
Za vsak strup, ki ga mediji dajejo, imamo specifično zdravilo.

| Strup medijev              | Naše zdravilo                                               |
|----------------------------|-------------------------------------------------------------|
| Jeza (politika, konflikti) | Odpuščanje, sprava, ljudje ki izberejo prijaznost           |
| Skrb (kriminal, strah)    | Upanje, rešene težave, skupnosti ki delujejo                |
| Cinizem (korupcija)       | Dokaz da so ljudje dobri - brez skritih agend              |
| Osamljenost               | Skupnost, povezanost, tujci ki postanejo sosedje           |
| Obup (podnebje, vojna)    | Odpornost, obnova, narava ki se vrača                      |
| Strah (nevarnost povsod)  | Pogum - običajni ljudje ki naredijo tihe izredne stvari    |

Uredniško vprašanje NI "Ali je ta zgodba pozitivna?"
Vprašanje JE: "Ali ta zgodba RAZBLINI kaj težkega?"

9 KATEGORIJ: ZIVALI, SKUPNOST, SPORT, NARAVA, INFRASTRUKTURA, PODJETNISTVO, SLOVENIJA_V_SVETU, JUNAKI, KULTURA

TVOJA NALOGA: Oceni zgodbo od 0 do 10 po uredniškem filtru.

5 ČUSTEV KI JIH IŠČEMO (zgodba mora zbiditi vsaj eno):
- PONOS: Slovenec, kraj, ekipa ali stvar je prepoznana, zmaga ali slavljena.
- TOPLINA: Človek ali žival v težkem položaju in drugi so stopili zraven.
- OLAJSANJE: Nekaj kar je bilo pokvarjeno ali manjkalo je končno popravljeno ali rešeno.
- CUDESENJE: Zgodilo se je nekaj lepega, nepričakovanega ali izrednega.
- UPANJE: Zgodba te prepriča da je prihodnost morda vendarle vredna zaupanja.

UREDNIŠKI PREIZKUS: Katero je PRVO čustvo ki ga ta zgodba zbudi?
- Če je katero od petih dobrih → oceni visoko
- Če je karkoli s seznama zavrnitve → ocena 0, ne glede na to koliko dobrega je zakopano v njej

AVTOMATSKA OCENA 0 - zgodba primarno zbudi:
- Krivdo (tudi če je rešitev podana)
- Jezo (tudi če je pravica zmagala)
- Žalost (tudi s srebrno podlogo)
- Tesnobo (tudi s pozitivnim izidom)
- Zahteva denarno pomoč ali donacije
- Politična zmaga ki je zgolj poraz za drugo stran
- Senzacionalizem z zelenim premazom

ABSOLUTNO PRAVILO: Ocenjuješ SAMO vsebino ki ti je predana. Nikoli ne izmišljaš.

Vrni SAMO JSON brez markdown:
{
  "score": number,
  "emotions": ["PONOS"|"TOPLINA"|"OLAJSANJE"|"CUDESENJE"|"UPANJE"],
  "rejected_because": null | "krivda"|"jeza"|"zalost"|"tesnoba"|"denar"|"politika"|"senzacionalizem",
  "reason": "max 2 stavka zakaj je ta zgodba dobra ali zakaj ni primerna",
  "category": "ZIVALI|SKUPNOST|SPORT|NARAVA|INFRASTRUKTURA|PODJETNISTVO|SLOVENIJA_V_SVETU|JUNAKI|KULTURA",
  "headline_suggestion": "predlagani naslov v slovenščini, max 10 besed, konkreten, ne clickbait",
  "antidote_for": null | "jeza"|"skrb"|"cinizem"|"osamljenost"|"obup"|"strah"
}`;

const USER_AGENT = 'SvetlaStran/1.0 (+https://svetlastran.si)';

async function askClaude(systemPrompt, userMessage) {
  let result = '';
  for await (const msg of query({
    prompt: userMessage,
    options: { systemPrompt, maxTurns: 1, allowedTools: [] },
  })) {
    if ('result' in msg) result = msg.result;
  }
  return result;
}

function extractJSON(text) {
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = cleaned.search(/[\[{]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end === -1) throw new Error('Ni JSON v odgovoru');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function fetchFullContent(url) {
  try {
    const { load } = await import('cheerio');
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const $ = load(html);
    const body =
      $('article').text() ||
      $('[class*="article-body"]').text() ||
      $('[class*="content"]').first().text() ||
      $('main p').map((_, el) => $(el).text()).get().join('\n');
    return body.trim().slice(0, 3000);
  } catch {
    return '';
  }
}

// ── MAIN ──
const filtered = JSON.parse(readFileSync('./output/filtered.json', 'utf-8'));
const stories = filtered.slice(0, 42);
console.log(`Scoring ${stories.length} zgodb...\n`);

// 1. Fetch full content (5 at a time)
console.log('── Fetching full content ──');
let fetched = 0;
for (let i = 0; i < stories.length; i += 5) {
  const batch = stories.slice(i, i + 5);
  await Promise.allSettled(
    batch.map(async s => {
      const content = await fetchFullContent(s.sourceUrl);
      if (content.length > 100) { s.fullContent = content; fetched++; }
    })
  );
  process.stdout.write(`  ${Math.min(i + 5, stories.length)}/${stories.length}\r`);
}
console.log(`  Full content: ${fetched}/${stories.length}\n`);

// 2. Score each
console.log('── Scoring ──');
const inbox = [];
const rejected = [];

for (let i = 0; i < stories.length; i++) {
  const s = stories[i];
  const content = s.fullContent || s.rawContent || '(ni vsebine, oceni samo na podlagi naslova)';
  try {
    const text = await askClaude(SCORING_PROMPT, `Naslov: ${s.rawTitle}\n\nVsebina:\n${content}`);
    const result = extractJSON(text);
    s.ai = result;

    if (result.score >= 6 && !result.rejected_because) {
      inbox.push(s);
      console.log(`  \x1b[32m✓\x1b[0m [${result.score}] \x1b[36m${result.category}\x1b[0m ${result.headline_suggestion}`);
    } else {
      rejected.push(s);
      const reason = result.rejected_because || `score ${result.score}`;
      console.log(`  \x1b[31m✗\x1b[0m [${reason}] ${s.rawTitle.slice(0, 60)}`);
    }
  } catch (e) {
    console.log(`  \x1b[31m✗\x1b[0m ERROR: ${e.message} | ${s.rawTitle.slice(0, 50)}`);
  }
}

// 3. Summary
console.log(`\n${'═'.repeat(60)}`);
console.log(`  INBOX: ${inbox.length} zgodb (score >= 6)`);
console.log(`  REJECTED: ${rejected.length}`);
console.log(`${'═'.repeat(60)}\n`);

inbox.sort((a, b) => b.ai.score - a.ai.score);
inbox.forEach((s, i) => {
  const ant = s.ai.antidote_for ? ` [zdravilo: ${s.ai.antidote_for}]` : '';
  console.log(`  [${i}] \x1b[1m${s.ai.score}/10\x1b[0m \x1b[36m${s.ai.category}\x1b[0m${ant}`);
  console.log(`      ${s.ai.headline_suggestion}`);
  console.log(`      \x1b[2m${s.ai.emotions.join(', ')} | ${s.sourceName}\x1b[0m`);
  console.log(`      \x1b[2m${s.ai.reason}\x1b[0m\n`);
});

// Save
writeFileSync('./output/inbox_test42.json', JSON.stringify(inbox, null, 2));
console.log(`Shranjeno: output/inbox_test42.json`);
