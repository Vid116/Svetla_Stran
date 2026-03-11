/**
 * AI helpers — wraps Claude Agent SDK for structured queries.
 *
 * Two modes:
 * - askClaude(): single-turn, no tools — for writing and verification
 * - researchWithClaude(): multi-turn with WebSearch + WebFetch — for research
 */
import { query } from '@anthropic-ai/claude-agent-sdk';

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
 * Single-turn Claude call with no tools.
 * Used for writing articles and fact-checking.
 */
export async function askClaude(systemPrompt, userMessage, phase = 'unknown') {
  let result = '';
  let resultMsg = null;

  for await (const msg of query({
    prompt: userMessage,
    options: {
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
 * Multi-turn Claude call with WebSearch + WebFetch tools.
 * The agent autonomously searches the web, fetches articles, and compiles research.
 */
export async function researchWithClaude(systemPrompt, userMessage, maxTurns = 25, phase = 'research') {
  let result = '';
  let resultMsg = null;
  let toolCalls = 0;

  for await (const msg of query({
    prompt: userMessage,
    options: {
      systemPrompt,
      maxTurns,
      tools: ['WebSearch', 'WebFetch'],
      allowedTools: ['WebSearch', 'WebFetch'],
    },
  })) {
    if (msg.type === 'result') {
      resultMsg = msg;
      if (msg.subtype === 'success') result = msg.result;
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
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.search(/[{[]/);
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (start === -1 || end === -1) {
    process.stderr.write(`[extractJSON] Failed to find JSON in: ${cleaned.slice(0, 200)}\n`);
    throw new Error('No JSON in response');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
