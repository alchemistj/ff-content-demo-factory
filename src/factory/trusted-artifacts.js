'use strict';

// This registry is repository-controlled trust configuration. Callers provide
// only the lookup key; they cannot replace the archive digest, root identity,
// or source identity used to authenticate a reseal.
const TRUSTED_ARTIFACTS = Object.freeze({
  '32717620900:9516514426:81587f8422a23313fd7868751061eec7e2fb5926': Object.freeze({
    provider: 'github-actions-artifact',
    runId: '32717620900',
    artifactId: '9516514426',
    sourceSha: '81587f8422a23313fd7868751061eec7e2fb5926',
    archiveName: '360-garage-door-gate1.zip',
    archiveSha256: 'a5c948af6389b21786d9daf01106f1fd0662d7bf6bb0f21e078a4d7e2ecb1999',
    rootIdentity: 'github-actions-artifact:9516514426',
  }),
  '32717620900:9516514426:test-source-sha-360': Object.freeze({
    provider: 'repository-test-fixture',
    runId: '32717620900',
    artifactId: '9516514426',
    sourceSha: 'test-source-sha-360',
    archiveName: 'ff-reseal-test.zip',
    archiveSha256: '087f4b6b98a721b3311b95217b484ec970d9510d867f91695535874d94cb72d5',
    rootIdentity: 'test-artifact-root:9516514426',
  }),
});

function artifactIdentityKey({ runId, artifactId, sourceSha } = {}) {
  if (!runId || !artifactId || !sourceSha) throw new Error('trusted artifact identity key requires runId, artifactId, and sourceSha');
  return `${runId}:${artifactId}:${sourceSha}`;
}

function resolveTrustedArtifact(identity) {
  const key = typeof identity === 'string' ? identity : artifactIdentityKey(identity);
  const trusted = TRUSTED_ARTIFACTS[key];
  if (!trusted) throw new Error(`trusted artifact identity is not registered: ${key}`);
  return trusted;
}

module.exports = { TRUSTED_ARTIFACTS, artifactIdentityKey, resolveTrustedArtifact };
