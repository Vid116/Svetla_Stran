/**
 * AI helpers — wraps Claude Agent SDK for structured queries.
 *
 * Two modes:
 * - askClaude(): single-turn, no tools — for writing and verification
 * - researchWithClaude(): multi-turn with WebSearch + FetchArticleText — for research
 */
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createResearchTools } from './tools.mjs';

// Model to use for all pipeline calls (sonnet, opus, haiku)
const MODEL = process.env.PIPELINE_MODEL || 'sonnet';

// Global token tracker — accumulates real SDK usage across all calls
export const tokenTracker = {
  phases: {},
  total: { inputTokens: 0, outputTokens: 0, webSearchRequests: 0, costUSD: 0, turns: 0 },

  record(phase, resultMsg) {
    const usage = resultMsg.modelUsage || {};
    const models = Object.keys(usage);
    let input = 0, output = 0, searches = 0, cost = 0;

    for (const model of models) {
      const u = usage[model];
      input += u.inputTokens || 0;
      output += u.outputTokens || 0;
      searches += u.webSearchRequests || 0;
      cost += u.costUSD || 0;
    }

    const turns = resultMsg.num_turns || 0;

    this.phases[phase] = { inputTokens: input, outputTokens: output, webSearchRequests: searches, costUSD: cost, turns, models };
    this.total.inputTokens += input;
    this.total.outputTokens += output;
    this.total.webSearchRequests += searches;
    this.total.costUSD += cost;
    this.total.turns += turns;
  },

  summary() {
    return {
      totalTokens: this.total.inputTokens + this.total.outputTokens,
      inputTokens: this.total.inputTokens,
      outputTokens: this.total.outputTokens,
      webSearchRequests: this.total.webSearchRequests,
      costUSD: this.total.costUSD,
      totalTurns: this.total.turns,
      phases: { ...this.phases },
    };
  },
};

/**
 * Single-turn Claude call with an image attachment (vision).
 * Used for verifying image relevance to article content.
 */
export async function askClaudeWithImage(systemPrompt, textMessage, imageBase64, mediaType, phase = 'vision') {
  let result = '';
  let resultMsg = null;

  async function* generatePrompt() {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: [
          { type: 'text', text: textMessage },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
        ],
      },
    };
  }

  for await (const msg of query({
    prompt: generatePrompt(),
    options: {
      model: MODEL,
      systemPrompt,
      maxTurns: 1,
      tools: [],
      allowedTools: [],
    },
  })) {
    if (msg.type === 'result') {
      resultMsg = msg;
      if (msg.subtype === 'success') result = msg.result;
    }
  }

  if (resultMsg) {
    tokenTracker.record(phase, resultMsg);
    const p = tokenTracker.phases[phase];
    process.stderr.write(`[Tokens] ${phase}: ${p.inputTokens + p.outputTokens} tokens (in:${p.inputTokens} out:${p.outputTokens}) | ${p.turns} turns\n`);
  }

  return result;
}

/**
 * Single-turn Claude call with no tools.
 * Used for writing articles and fact-checking.
 */
export async function askClaude(systemPrompt, userMessage, phase = 'unknown') {
  let result = '';
  let resultMsg = null;

  for await (const msg of query({
    prompt: userMessage,
    options: {
      model: MODEL,
      systemPrompt,
      maxTurns: 1,
      tools: [],
      allowedTools: [],
    },
  })) {
    if (msg.type === 'result') {
      resultMsg = msg;
      if (msg.subtype === 'success') result = msg.result;
    }
  }

  if (resultMsg) {
    tokenTracker.record(phase, resultMsg);
    const p = tokenTracker.phases[phase];
    process.stderr.write(`[Tokens] ${phase}: ${p.inputTokens + p.outputTokens} tokens (in:${p.inputTokens} out:${p.outputTokens}) | ${p.turns} turns\n`);
  }

  if (!result) {
    process.stderr.write(`[askClaude] WARNING: empty response\n`);
  }
  return result;
}

/**
 * Multi-turn Claude call with WebSearch + FetchArticleText tools.
 * The agent autonomously searches the web, fetches articles, and compiles research.
 */
export async function researchWithClaude(systemPrompt, userMessage, maxTurns = 25, phase = 'research') {
  let result = '';
  let resultMsg = null;
  let toolCalls = 0;

  for await (const msg of query({
    prompt: userMessage,
    options: {
      model: MODEL,
      systemPrompt,
      maxTurns,
      maxTokens: 16000,
      tools: ['WebSearch'],
      allowedTools: ['WebSearch', 'mcp__svetla-tools__FetchArticleText'],
      mcpServers: { 'svetla-tools': createResearchTools() },
    },
  })) {
    if (msg.type === 'result') {
      resultMsg = msg;
      if (msg.subtype === 'success') result = msg.result;
      else if (msg.result) result = msg.result; // Also capture result from non-success (e.g. max_turns)
    }
    // Track tool progress (SDK emits 'tool_progress' not 'tool_use')
    if (msg.type === 'tool_progress') {
      toolCalls++;
      process.stderr.write(`[Research] Tool: ${msg.tool_name} (${msg.elapsed_time_seconds?.toFixed(1)}s)\n`);
    }
  }

  if (resultMsg) {
    tokenTracker.record(phase, resultMsg);
    const p = tokenTracker.phases[phase];
    process.stderr.write(`[Tokens] ${phase}: ${p.inputTokens + p.outputTokens} tokens (in:${p.inputTokens} out:${p.outputTokens}) | ${p.webSearchRequests} web searches | ${p.turns} turns\n`);
  }

  if (!result) {
    process.stderr.write(`[researchWithClaude] WARNING: empty response after ${toolCalls} tool progress events\n`);
  } else {
    process.stderr.write(`[Research] Completed: ${toolCalls} tool events, ${resultMsg?.num_turns || 0} turns\n`);
  }

  return result;
}

export function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI');
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}

  // Try extracting JSON by finding balanced braces/brackets
  const start = cleaned.search(/[{[]/);
  if (start === -1) {
    process.stderr.write(`[extractJSON] Failed to find JSON in: ${cleaned.slice(0, 200)}\n`);
    throw new Error('No JSON in response');
  }

  // Find matching closing brace/bracket using nesting depth
  const openChar = cleaned[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (esc) { esc = false; continue; }
    if (c === '\\' && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));

  const jsonStr = cleaned.slice(start, end + 1);
  try { return JSON.parse(jsonStr); } catch {}

  // Fix LLM JSON: escape literal newlines and unescaped quotes inside string values
  // Uses a state machine to track whether we're inside a JSON string
  let fixed = '';
  try {
    let inString = false;
    let escaped = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const ch = jsonStr[i];

      if (escaped) {
        fixed += ch;
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        fixed += ch;
        escaped = true;
        continue;
      }

      if (ch === '"') {
        if (!inString) {
          inString = true;
          fixed += ch;
          continue;
        }
        // We're inside a string and hit a quote — is this the end of the string?
        // Look ahead: if followed by whitespace then , } ] : or end, it's the closing quote
        const rest = jsonStr.slice(i + 1).trimStart();
        if (rest.length === 0 || /^[,}\]:]/.test(rest)) {
          inString = false;
          fixed += ch;
        } else {
          // Unescaped quote inside a string value — escape it
          fixed += '\\"';
        }
        continue;
      }

      if (inString) {
        if (ch === '\n') { fixed += '\\n'; continue; }
        if (ch === '\r') { fixed += '\\r'; continue; }
        if (ch === '\t') { fixed += '\\t'; continue; }
      }

      fixed += ch;
    }

    return JSON.parse(fixed);
  } catch (e) {
    process.stderr.write(`[extractJSON] All parse attempts failed for: ${jsonStr.slice(0, 300)}\n`);
    throw new Error(`No valid JSON in response: ${e.message}`);
  }
}
