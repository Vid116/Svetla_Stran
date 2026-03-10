delete process.env.CLAUDECODE;

import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync } from 'fs';

const PROMPT = `Si uredniški asistent za Svetla Stran - portal pozitivnih novic iz Slovenije.
Dobiš seznam naslovov člankov (ID: naslov). Za vsakega odloči:
- "DA" - naslov nakazuje potencialno pozitivno slovensko zgodbo
- "NE" - naslov je očitno negativen, političen, kriminalen, nesreča ali nerelevanten
Bodi LIBERALEN z DA. NE samo če je očitno neuporabno.
Vrni SAMO JSON brez markdown:
{"rezultati": [{"id": "string", "odlocitev": "DA" | "NE"}]}`;

const raw = JSON.parse(readFileSync('./output/raw.json', 'utf-8'));
const batch = raw.slice(0, 10);
const seznam = batch.map((s, i) => `${i}: ${s.rawTitle}`).join('\n');

console.log('Pošiljam 10 naslovov:');
console.log(seznam);
console.log('---');

let result = '';
for await (const msg of query({
  prompt: seznam,
  options: { systemPrompt: PROMPT, maxTurns: 1, allowedTools: [] },
})) {
  if ('result' in msg) result = msg.result;
}

console.log('Odgovor:');
console.log(result);

// Parse
const cleaned = result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
const start = cleaned.search(/[\[{]/);
const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
const parsed = JSON.parse(cleaned.slice(start, end + 1));

console.log('\nRezultati:');
const rez = parsed.rezultati || parsed;
rez.forEach(r => {
  const story = batch[parseInt(r.id)];
  const icon = r.odlocitev === 'DA' ? '✓' : '✗';
  console.log(`  ${icon} [${r.odlocitev}] ${story?.rawTitle || r.id}`);
});
