# External Architect approval contract

Actions verifies Architect documents; it never signs them. The pinned public
key is committed at
`qa/architect/architect-ed25519-v1-public.pem` and loaded by the workflow
after it verifies that the file is a regular non-symlink file with this exact
SHA-256:

`b0c4c57d7f905c215b6f8555d8abca81f7ea034319bc665dc920b50546b6e0f9`

The process-local `ARCHITECT_APPROVAL_PUBLIC_KEY_PEM` value is derived from
those committed bytes; no Actions variable is used. Missing, altered,
wrong-type, or private-key material fails before approval verification or
vendor access. The pinned key identifier is the code constant
`architect-ed25519-v1`. The corresponding private key must remain outside
this repository and outside GitHub Actions.

The exact source files for the Writer1 approval-seal wake are:

- `qa/architect/writer1-content.json`
- `qa/architect/writer1-evidence.json`
- `qa/architect/writer1-approval.json`

The wake pins each file's raw byte size and `sha256:` digest. The files may be
checked into the source repository or supplied beneath the exact extracted
external-artifact root selected by `WRITER1_APPROVAL_SOURCE_ROOT`; there is no
default-branch or alternate-path fallback.

Each QA file is `architect-writer1-qa/v1` with exactly these top-level keys:

```json
{
  "schemaVersion": "architect-writer1-qa/v1",
  "stage": "writer1",
  "decision": "PASS",
  "author": { "kind": "architect", "keyId": "architect-ed25519-v1" },
  "role": "content",
  "source": { "...": "the exact pinned Writer1 artifact and sealed-facts fields" },
  "issuedAt": "2026-08-25T00:00:00.000Z",
  "signature": "ed25519:<base64>"
}
```

The `role` is exactly `content` or `evidence`; both are required once. The
source object is checked against Action `32845845871`, artifact `9562364448`,
the exact Writer1 output/receipt/state digests and sizes, the two service
routes, changed path `/pages/0/sections/3/body`, frozen diff pins, and the
sealed handoff digest.

The approval file is `architect-writer1-approval/v1` with exactly these
top-level keys: `schemaVersion`, `stage`, `decision`, `author`, `qaArtifacts`,
`sealedHandoffDigest`, `receiptDigest`, `outputDigest`, `verifiedWriter1Seal`,
`issuedAt`, and `signature`. Its decision is `APPROVE`; `qaArtifacts` contains
the two exact role/path/size/digest/PASS pins above.

Canonical signing bytes are the UTF-8 bytes of:

```text
JSON.stringify(canonicalize(document with its `signature` field omitted))
```

There is no trailing newline. `canonicalize` recursively sorts object keys and
preserves array order. Sign those bytes with Ed25519 and encode the raw 64-byte
signature as `ed25519:<base64>`. Actions verifies this payload with the pinned
public key and rejects extra keys, wrong author/key, unsigned files, and any
source or path mismatch. The loader is
`scripts/architect-approval-key.mjs` (`loadPinnedArchitectPublicKey`), with
byte-level checks in `validatePinnedArchitectPublicKeyBytes`.
