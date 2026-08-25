#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function restore({ snapshotFile, targetFile }) {
  if (!snapshotFile || !targetFile) throw new Error('paid receipt restore requires snapshotFile and targetFile');
  if (!fs.existsSync(snapshotFile)) throw new Error('durable paid receipt snapshot is missing');
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  if (snapshot.schemaVersion !== 1 || !snapshot.receipts || typeof snapshot.receipts !== 'object') throw new Error('durable paid receipt snapshot schema is invalid');
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  const temporary = `${targetFile}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  fs.renameSync(temporary, targetFile);
  return targetFile;
}

if (require.main === module) {
  try {
    const [, , snapshotFile, targetFile] = process.argv;
    process.stdout.write(`${restore({ snapshotFile, targetFile })}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { restore };
