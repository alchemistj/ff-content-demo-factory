'use strict';

/**
 * Derive review signals that are useful to an authoritative judge.
 *
 * These signals are deliberately non-authoritative. They are never promoted
 * to anchors without a model judgment that names the evidence and its scope.
 */
function deriveDeterministicSignals(review) {
  const text = String(review.text || '');
  const lower = text.toLowerCase();
  const has = (pattern) => pattern.test(lower);

  const availability = {
    night: has(/\bnight(?:time)?\b|\bevening\b|\blate at night\b|\bafter dark\b/),
    holiday: has(/\bholiday\b|\bchristmas\b|\bthanksgiving\b|\bnew year/),
    beforeSunrise: has(/\bbefore (?:sunrise|dawn)\b|\bbefore the sun came up\b|\bearly (?:morning|hours)\b|\b\d{1,2}(?::\d{2})?\s*(?:a\.m\.?|am)\b/),
  };

  const serviceSignals = [];
  const servicePatterns = [
    ['ev-charging', /\b(?:ev|electric vehicle|tesla)\b|\bnema\s*\d{1,2}[- ]?\d{2}\b|\bcharging\b/],
    ['electrical-repair', /\bcircuit\b|\boutlet\b|\bbreaker\b|\blost power\b|\bno power\b|\bpower went out\b|\btroubleshoot/],
    ['panel-upgrade', /\bpanel\b|\belectrical service\b|\bservice upgrade\b/],
    ['new-construction-wiring', /\bnew construction\b|\bshop house\b|\bnew build\b|\bwired .*building\b|\b30\s*[x×]\s*40\b/],
    ['lighting', /\blight(?:s|ing)?\b|\bchandelier\b|\bfixture\b/],
  ];
  for (const [service, pattern] of servicePatterns) {
    if (has(pattern)) serviceSignals.push(service);
  }

  const actionSignals = [];
  if (has(/\binstalled\b|\binstall(?:ed|ation)?\b|\bput in\b|\bwired\b|\bbuilt\b/)) actionSignals.push('installation');
  if (has(/\brepaired\b|\breplaced\b|\bfixed\b|\bresolved\b|\bdiagnos(?:ed|is)\b|\btroubleshoot(?:ed|ing)?\b/)) actionSignals.push('repair-or-diagnosis');
  if (has(/\bcame out\b|\bshowed up\b|\bstarted work\b|\bgot straight to work\b|\bcompleted\b|\bfinished\b/)) actionSignals.push('on-site-completion');

  const responseTimeClaims = [];
  if (has(/\bone[- ]hour\b|\bwithin an hour\b|\bsame[- ]day\b|\bguaranteed\b|\bsla\b/)) responseTimeClaims.push('response-time-language');

  return {
    hasConcreteReferent: actionSignals.length > 0 && (serviceSignals.length > 0 || has(/\bjob\b|\bwork\b|\bissue\b|\bproblem\b/)),
    serviceSignals,
    actionSignals,
    availability,
    responseTimeClaims,
    negativeSignal: Number(review.rating) <= 3 || has(/\bnever again\b|\bdo not recommend\b|\bcomplaint\b|\bdisappoint(?:ed|ing)\b|\bterrible\b|\bpoor\b/),
    method: 'deterministic-signals-v1',
  };
}

module.exports = { deriveDeterministicSignals };
