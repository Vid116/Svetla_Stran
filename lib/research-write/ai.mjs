/**
 * AI helpers — wraps Claude Agent SDK for structured queries.
 *
 * Two modes:
 * - askClaude(): single-turn, no tools — for writing and verification
 * - researchWithClaude(): multi-turn with WebSearch + WebFetch — for research
 */
import { query } from '@anthropic-ai/claude-agent-sdk';

// Global token tracker — accumulates across all calls in one pipeline run
export const tokenTracker = {
  phases: {},
  total: { input: 0, output: 0 },

  record(phase, input, output) {
    if (!this.phases[phase]) this.phases[phase] = { input: 0, output: 0, calls: 0 };
    this.phases[phase].input += input;
    this.phases[phase].output += output;
    this.phases[phase].calls += 1;
    this.total.input += input;
    this.total.output += output;
  },

  summary() {
    const total = this.total.input + this.total.output;
    return {
      totalTokens: total,
      inputTokens: this.total.input,
      outputTokens: this.total.output,
      phases: { ...this.phases },
    };
  },
};

// Rough token estimate: ~4 chars per token for mixed Slovenian/English
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Single-turn Claude call with no tools.
 * Used for writing articles and fact-checking.
 */
export async function askClaude(systemPrompt, userMessage, phase = 'unknown') {
  let result = '';
  const inputEst = estimateTokens(systemPrompt) + estimateTokens(userMessage);

  for await (const msg of query({
    prompt: userMessage,
    options: {
      systemPrompt,
      maxTurns: 1,
      tools: [],
      allowedTools: [],
    },
  })) {
    if ('result' in msg) result = msg.result;
    else if ('content' in msg && typeof msg.content === 'string') result = msg.content;
  }

  const outputEst = estimateTokens(result);
  tokenTracker.record(phase, inputEst, outputEst);
  process.stderr.write(`[Tokens] ${phase}: ~${inputEst + outputEst} tokens (in:${inputEst} out:${outputEst})\n`);

  if (!result) {
    process.stderr.write(`[askClaude] WARNING: empty response\n`);
  }
  return result;
}

/**
 * Multi-turn Claude call with WebSearch + WebFetch tools.
 * The agent autonomously searches the web, fetches articles, and compiles research.
 * Returns the final text result after all tool turns complete.
 */
export async function researchWithClaude(systemPrompt, userMessage, maxTurns = 25, phase = 'research') {
  let result = '';
  let toolCalls = 0;
  let totalContent = '';
  const inputEst = estimateTokens(systemPrompt) + estimateTokens(userMessage);

  for await (const msg of query({
    prompt: userMessage,
    options: {
      systemPrompt,
      maxTurns,
      tools: ['WebSearch', 'WebFetch'],
      allowedTools: ['WebSearch', 'WebFetch'],
    },
  })) {
    if ('result' in msg) {
      result = msg.result;
    } else if ('content' in msg && typeof msg.content === 'string') {
      result = msg.content;
      totalContent += msg.content;
    }
    // Track tool results as context growth
    if (msg.type === 'tool_result' && msg.content) {
      totalContent += typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    }
    // Log tool usage for visibility
    if (msg.type === 'tool_use') {
      toolCalls++;
      process.stderr.write(`[Research] Tool call #${toolCalls}: ${msg.name || 'unknown'}\n`);
    }
  }

  // Estimate total context consumed by this multi-turn call
  const contextEst = inputEst + estimateTokens(totalContent);
  const outputEst = estimateTokens(result);
  tokenTracker.record(phase, contextEst, outputEst);
  process.stderr.write(`[Tokens] ${phase}: ~${contextEst + outputEst} tokens (context:${contextEst} out:${outputEst}) | ${toolCalls} tool calls\n`);

  if (!result) {
    process.stderr.write(`[researchWithClaude] WARNING: empty response after ${toolCalls} tool calls\n`);
  } else {
    process.stderr.write(`[Research] Completed with ${toolCalls} tool calls\n`);
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
