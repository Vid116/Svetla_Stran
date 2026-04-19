/**
 * Sunday reserve displacement logic.
 *
 * The reserve is a single slot holding the best-scoring long-form draft for
 * the upcoming Sunday. Each newly-scored draft either (a) takes the empty
 * slot, (b) displaces the current reserve if it scores higher, or (c) is
 * left to publish normally.
 *
 * Called from the research-write pipeline after scoring + insert.
 * Works with either `postgres` (VPS worker) or `@neondatabase/serverless`
 * (Vercel API) — both use tagged-template syntax.
 */

function ljubljanaDateParts(now = new Date()) {
  // sv-SE locale formats as YYYY-MM-DD
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Ljubljana' }).format(now);
  const dayShort = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Ljubljana', weekday: 'short' }).format(now);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dateStr, dayNum: dayMap[dayShort] };
}

/**
 * Returns the date string (YYYY-MM-DD) of the next upcoming Sunday in
 * Europe/Ljubljana. If today is already Sunday, returns the NEXT Sunday —
 * not today — so that post-cron scoring on Sunday targets the following week.
 */
export function nextSundayInLjubljana(now = new Date()) {
  const { dateStr, dayNum } = ljubljanaDateParts(now);
  const daysUntilSunday = dayNum === 0 ? 7 : (7 - dayNum);

  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  target.setUTCDate(target.getUTCDate() + daysUntilSunday);
  return target.toISOString().split('T')[0];
}

/**
 * Reconcile the reserve slot for the upcoming Sunday.
 *
 * @param {any} sql - Tagged-template SQL client (postgres or @neondatabase/serverless)
 * @param {string} draftId - The newly-scored draft's id
 * @param {number} score - Sunday-fit score (0-100). 0 means disqualified — no-op.
 * @returns {Promise<{action: string, targetDate?: string, [k: string]: any}>}
 */
export async function reconcileSundayReserve(sql, draftId, score) {
  const numericScore = Number(score) || 0;
  if (numericScore <= 0) {
    return { action: 'skipped', reason: 'zero-score-or-disqualified' };
  }

  const targetDate = nextSundayInLjubljana();

  const reserve = await sql`
    SELECT id, sunday_fit_score
    FROM drafts
    WHERE sunday_reserved_for = ${targetDate}
    LIMIT 1
  `;

  if (reserve.length === 0) {
    await sql`UPDATE drafts SET sunday_reserved_for = ${targetDate} WHERE id = ${draftId}`;
    return { action: 'reserved', targetDate, score: numericScore };
  }

  const currentId = reserve[0].id;
  const currentScore = Number(reserve[0].sunday_fit_score) || 0;

  if (currentId === draftId) {
    return { action: 'already-reserved', targetDate, score: numericScore };
  }

  if (numericScore > currentScore) {
    await sql`UPDATE drafts SET sunday_reserved_for = NULL WHERE id = ${currentId}`;
    await sql`UPDATE drafts SET sunday_reserved_for = ${targetDate} WHERE id = ${draftId}`;
    return {
      action: 'displaced',
      targetDate,
      score: numericScore,
      displacedDraftId: currentId,
      displacedScore: currentScore,
    };
  }

  return {
    action: 'noop',
    targetDate,
    score: numericScore,
    reserveScore: currentScore,
  };
}
