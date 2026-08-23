'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { deriveDeterministicSignals } = require('./signals');

const VALID_DECISIONS = new Set(['anchor', 'supporting', 'negative', 'not-applicable']);

function assertJudgment(judgment, review) {
  if (!judgment || judgment.authoritative !== true) {
    throw new Error(`Authoritative judgment missing for review ${review.id}`);
  }
  if (!VALID_DECISIONS.has(judgment.decision)) {
    throw new Error(`Invalid authoritative decision for review ${review.id}`);
  }
  if (!judgment.judgmentId || !judgment.model || !judgment.provenance) {
    throw new Error(`Judgment provenance incomplete for review ${review.id}`);
  }
  if (judgment.provenance.reviewId !== review.id || judgment.provenance.source !== review.source) {
    throw new Error(`Judgment provenance does not bind to review ${review.id}`);
  }
  if (judgment.directCompletedService === true && judgment.decision !== 'anchor') {
    throw new Error(`Direct completed service must be an anchor: ${review.id}`);
  }
}

/**
 * Run the required deterministic-signal -> authoritative-judge transition.
 * No default evaluator exists: callers must supply a real Cursor/model adapter
 * in production or a deterministic injected evaluator in tests.
 */
async function classifyReviewInventory({ reviews, authoritativeJudge, persist }) {
  if (!Array.isArray(reviews)) throw new TypeError('reviews must be an array');
  if (typeof authoritativeJudge !== 'function') {
    throw new TypeError('authoritativeJudge is required; heuristics cannot be promoted');
  }

  const written = reviews.filter((review) => String(review.text || '').trim());
  const empty = reviews.filter((review) => !String(review.text || '').trim());
  const judgments = {};

  for (const review of written) {
    const signals = deriveDeterministicSignals(review);
    const judgment = await authoritativeJudge({ review, signals });
    assertJudgment(judgment, review);
    judgments[review.id] = judgment;
  }

  const output = buildClassificationArtifact({ reviews, judgments });

  if (typeof persist === 'function') await persist(output);
  return output;
}

function buildClassificationArtifact({ reviews, judgments }) {
  if (!Array.isArray(reviews)) throw new TypeError('reviews must be an array');
  const written = reviews.filter((review) => String(review.text || '').trim());
  const empty = reviews.filter((review) => !String(review.text || '').trim());
  const classified = written.map((review) => {
    if (!review.id) throw new Error('Every retained review requires a stable ID');
    const judgment = judgments instanceof Map ? judgments.get(review.id) : judgments?.[review.id];
    assertJudgment(judgment, review);
    const signals = deriveDeterministicSignals(review);
    return {
      id: review.id,
      sourceReview: {
        author: review.author,
        rating: review.rating,
        date: review.date,
        text: review.text,
        source: review.source,
        platform: review.platform,
      },
      deterministicSignals: signals,
      authoritativeJudgment: judgment,
      grade: judgment.decision,
      authoritative: true,
      provenance: {
        source: review.source,
        sourcePath: review.sourcePath || null,
        reviewId: review.id,
        judgedAt: judgment.judgedAt || null,
        model: judgment.model,
        judgmentId: judgment.judgmentId,
      },
    };
  });

  return {
    schemaVersion: '1.0.0',
    classificationMethod: 'deterministic-signals-to-authoritative-model-judgment-v1',
    reviewCount: reviews.length,
    writtenReviewCount: written.length,
    emptyReviewCount: empty.length,
    authoritativeJudgmentCount: classified.length,
    anchorCount: classified.filter((entry) => entry.grade === 'anchor').length,
    negativeCount: classified.filter((entry) => entry.grade === 'negative').length,
    reviews: classified,
    emptyReviews: empty.map((review) => ({
      id: review.id,
      author: review.author,
      rating: review.rating,
      date: review.date,
      source: review.source,
      provenance: review.provenance || null,
    })),
  };
}

function persistClassification(output, filePath) {
  if (!filePath) throw new TypeError('filePath is required');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
}

module.exports = { classifyReviewInventory, buildClassificationArtifact, persistClassification, assertJudgment };
