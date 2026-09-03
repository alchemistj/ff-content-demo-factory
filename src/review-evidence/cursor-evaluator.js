'use strict';

/**
 * Adapter contract for the production Cursor model call. The transport is
 * deliberately supplied by the caller so this feature has no fake LLM or
 * hidden API dependency. `complete` must call Cursor Grok 4.6 High (Fast off)
 * and return the structured judgment contract documented below.
 */
function createCursorReviewJudge({ complete, model = 'cursor-grok-4.6-high' }) {
  if (typeof complete !== 'function') throw new TypeError('complete is required');
  return async ({ review, signals }) => {
    const judgment = await complete({
      model,
      fast: false,
      review,
      signals,
      contract: {
        authoritative: true,
        decision: 'anchor|supporting|negative|not-applicable',
        directCompletedService: 'boolean',
        serviceEvidence: '[{service, evidenceType, excerpt}]',
        availabilityEvidence: '[{kind, excerpt}]',
        claims: '[string] (do not create response-time guarantees)',
      },
    });
    if (!judgment || judgment.model !== model || judgment.fast !== false) {
      throw new Error('Cursor judgment must identify cursor-grok-4.6-high with Fast off');
    }
    return judgment;
  };
}

module.exports = { createCursorReviewJudge };
