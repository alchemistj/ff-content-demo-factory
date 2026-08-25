#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createApifyAdapter } = require('../src/adapters/apify');
const { createFileReceiptStore } = require('../src/factory/receipt-store');

function value(argv, index, flag) {
  const next = argv[index + 1];
  if (!next || next.startsWith('--')) throw new Error(`${flag} requires a value`);
  return next;
}

function parseArgs(argv) {
  const result = { placeId: null, mapsUrl: null, output: path.join('state', 'exact-place-enrichment.json') };
  for (let index = 2; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--place-id') result.placeId = value(argv, index++, flag);
    else if (flag === '--maps-url') result.mapsUrl = value(argv, index++, flag);
    else if (flag === '--output') result.output = value(argv, index++, flag);
    else throw new Error(`unknown option: ${flag}`);
  }
  if (!result.placeId || !result.mapsUrl) throw new Error('--place-id and --maps-url are required');
  return result;
}

async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('APIFY_API_TOKEN is required');
  const root = process.cwd();
  const adapter = createApifyAdapter({
    token,
    receiptStore: createFileReceiptStore(root),
    pollIntervalMs: 2000,
    maxPollAttempts: 1800,
  });
  const packet = await adapter.enrichFinalist({ placeId: args.placeId, mapsUrl: args.mapsUrl, limit: 50 });
  const output = path.resolve(root, args.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(packet, null, 2)}\n`);
  const written = (packet.reviews || []).filter((review) => String(review.text || '').trim()).length;
  process.stdout.write(`${JSON.stringify({
    ok: true,
    placeId: packet.placeId,
    writtenReviewCount: written,
    emptyTextReviewCount: (packet.emptyTextReviews || []).length,
    listingReviewCount: packet.listingReviewCount ?? null,
    requestedReviewLimit: packet.requestedReviewLimit,
    dateWindow: packet.dateWindow,
    output: path.relative(root, output),
  }, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    const token = process.env.APIFY_API_TOKEN;
    let message = String(error?.stack || error?.message || error);
    if (token) message = message.split(token).join('[redacted]');
    console.error(message);
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, main };
