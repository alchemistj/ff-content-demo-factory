/** Injectable boundaries for paid/network work. Implementations may wrap Apify,
 * Cursor, fetch, or a database. The factory never imports a vendor SDK. */
class DiscoveryAdapter {
  async discover() { throw new Error('DiscoveryAdapter.discover is not configured'); }
}
class WebsiteAuditAdapter {
  async audit() { throw new Error('WebsiteAuditAdapter.audit is not configured'); }
}
class FinalistEnrichmentAdapter {
  async enrichExactPlace() { throw new Error('FinalistEnrichmentAdapter.enrichExactPlace is not configured'); }
}
class ReviewJudgeAdapter {
  async judge() { throw new Error('ReviewJudgeAdapter.judge is not configured'); }
}
class StateStore {
  constructor(initial = { activeRun: null, prospects: [] }) { this.state = structuredClone(initial); }
  read() { return structuredClone(this.state); }
  write(state) { this.state = structuredClone(state); return this.read(); }
}

module.exports = { DiscoveryAdapter, WebsiteAuditAdapter, FinalistEnrichmentAdapter, ReviewJudgeAdapter, StateStore };
