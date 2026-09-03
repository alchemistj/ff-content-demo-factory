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
    archiveDigest: 'sha256:a5c948af6389b21786d9daf01106f1fd0662d7bf6bb0f21e078a4d7e2ecb1999',
    rootIdentity: 'github-actions-artifact:9516514426',
    approvalFileDigest: 'sha256:e9f271facf08876bd59cfdacb04378f530048abb3d08893897736e92dfbbc64f',
    ledgerFileDigest: 'sha256:40b5b0e5833c03b55c6a6fa46b2f43e6565263aff1e008f6bc55d53cb2d61169',
    discoveryFileDigest: 'sha256:d24de9e2075727eeb8a7867d89a8f667ac3158bb4bf9bc858d854a917ce05dd6',
    handoffFileDigest: 'sha256:54bb8b31d5927d5b1ccd952499926ca2f99a8fca3c243b7215398399c6cdda7b',
    sourceArtifactDigest: 'sha256:1525d7ad96da0b1b8213dfc38ac2068c94a87540aedbcb85f2bfe5738a4709e0',
    sourceManifestDigest: 'sha256:490c4d4844a895d97014c8a0d00a50dde2516e81af11f5a5fa31a51837b93573',
    evidenceDigest: 'sha256:0b01030ebdad4ece325a2cb390a79fd1c60ee985cfae6230f30701427486f504',
    pageSetDigest: 'sha256:3111870c0acd262a030cb4a4b6ac56b9d6a3b83567321d5953b4e875d5cf364e',
    prescriptionDigest: 'sha256:c0c9a62b04fe950c0037b237f76c97384b203e056c60b9f967e63e7f2a1b57b9',
    approvalDigest: 'sha256:558fb8984c7bc516f265fdffd8c2321e4223cc0b6b85111fd6f36e7f54320742',
    strategyDigest: 'sha256:8b1e4e983e7041302b82f9b0bc2bae4a5b3fb793a395c43e35125f7721bab94a',
    selectedServiceIds: Object.freeze(['garage-door-installation', 'garage-door-repair']),
    routes: Object.freeze(['/', '/garage-door-repair', '/garage-door-installation', '/contact']),
  }),
  '32717620900:9516514426:test-source-sha-360': Object.freeze({
    provider: 'repository-test-fixture',
    runId: '32717620900',
    artifactId: '9516514426',
    sourceSha: 'test-source-sha-360',
    archiveName: 'ff-reseal-test.zip',
    archiveSha256: '03e755f86d8bfbd8dd6a74673f193cbf13815de6bd92e0f3c8704eecca5e4919',
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
