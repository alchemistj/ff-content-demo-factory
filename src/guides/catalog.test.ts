import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDE_SOURCES, STAGE_GUIDES, STRATEGY_INSTRUCTIONS, loadCanonicalGuides } from './index.js';

test('catalog contains the six approved guide URLs exactly', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(GUIDE_SOURCES).map(([id, source]) => [id, source.url])),
    {
      general: 'https://docs.google.com/document/d/10xIuYOon6zxWbatccGVU66BccbPaT2VyFsbCJfYnSSo',
      service: 'https://docs.google.com/document/d/1MCZPwhj3FzRfZPNERx-HmOgeymSyiZ8XFuRPozdm2rk',
      homepage: 'https://docs.google.com/document/d/1yLw8LCQys_SLyqmwDgOWdM-FkW03ZAa7AqvVqPIEK8A',
      contact: 'https://docs.google.com/document/d/10dJ6h42fkmwUvAyhi2FZ8uY8EHlcdFwa_lKAwe1K2l0',
      headerFooter: 'https://docs.google.com/document/d/1MNBqqdzKsrqOp6tWgb79oOoukXzo6cbMmaFb7JEeBTU',
      writerReadme: 'https://docs.google.com/document/d/1cVBPXF-wFMTatnN7jIH01M-sUzm2I0aIENNKBcBuzdg',
    },
  );
});

test('stage manifests are explicit and never include the README discovery source', async () => {
  assert.deepEqual(STAGE_GUIDES.writer1, ['general', 'service']);
  assert.deepEqual(STAGE_GUIDES.writer2, ['general', 'homepage', 'contact', 'headerFooter']);
  assert.deepEqual(STAGE_GUIDES.writer3, ['general', 'strategy']);
  assert.equal(STRATEGY_INSTRUCTIONS.kind, 'runtime');
  const seen: string[] = [];
  const guides = await loadCanonicalGuides('writer2', { load: (source) => { seen.push(source.id); return { content: source.id }; } });
  assert.deepEqual(seen, STAGE_GUIDES.writer2);
  assert.deepEqual(guides.sourceIds, STAGE_GUIDES.writer2);
});

test('guide loading fails closed on missing content or provider source drift', async () => {
  await assert.rejects(() => loadCanonicalGuides('writer1', { load: () => null }), /content is unavailable/);
  await assert.rejects(() => loadCanonicalGuides('writer1', { load: (source) => ({ id: `${source.id}-old`, content: 'deprecated' }) }), /mismatched source id/);
});
