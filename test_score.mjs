delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync } from 'fs';

const SCORING_PROMPT = `Si uredniški agent za Svetla Stran - portal pozitivnih novic iz Slovenije.

TVOJA NALOGA: Oceni zgodbo od 0 do 10 po uredniškem filtru.

5 ČUSTEV KI JIH IŠČEMO (zgodba mora zbiditi vsaj eno):
- PONOS: Slovenec, kraj, ekipa ali stvar je prepoznana, zmaga ali slavljena.
- TOPLINA: Človek ali žival v težkem položaju in drugi so stopili zraven.
- OLAJSANJE: Nekaj kar je bilo pokvarjeno ali manjkalo je končno popravljeno ali rešeno.
- CUDESENJE: Zgodilo se je nekaj lepega, nepričakovanega ali izrednega.
- UPANJE: Zgodba te prepriča da je prihodnost morda vendarle vredna zaupanja.

AVTOMATSKA OCENA 0 - zgodba primarno zbudi:
- Krivdo, Jezo, Žalost, Tesnobo
- Zahteva denarno pomoč ali donacije
- Politična zmaga ki je zgolj poraz za drugo stran
- Senzacionalizem z zelenim premazom

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

const filtered = JSON.parse(readFileSync('./output/filtered.json', 'utf-8'));
const test = filtered.slice(0, 3);

for (const s of test) {
  console.log(`\nScoring: ${s.rawTitle}`);
  const text = await askClaude(SCORING_PROMPT, `Naslov: ${s.rawTitle}\n\nVsebina:\n${s.rawContent || '(ni vsebine, oceni samo na podlagi naslova)'}`);

  try {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const start = cleaned.search(/[\[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    console.log(`  Score: ${parsed.score}/10 | ${parsed.emotions.join(', ')} | ${parsed.category}`);
    console.log(`  Headline: ${parsed.headline_suggestion}`);
    console.log(`  Reason: ${parsed.reason}`);
    if (parsed.rejected_because) console.log(`  REJECTED: ${parsed.rejected_because}`);
    if (parsed.antidote_for) console.log(`  Antidote: ${parsed.antidote_for}`);
  } catch (e) {
    console.log(`  Parse error: ${e.message}`);
    console.log(`  Raw: ${text.slice(0, 200)}`);
  }
}
