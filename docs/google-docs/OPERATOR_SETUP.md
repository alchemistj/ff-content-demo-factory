# Google Docs operator setup

Use a dedicated ordinary `@gmail.com` account as the owning user for Content Factory human-review Docs. Josh chooses or creates that address. Google Workspace, Shared Drives, service accounts, Workload Identity Federation, and Cursor-specific Google logins are out of scope.

The models never receive a Google password or OAuth secrets. Trusted factory code calls Drive and Docs. Page content and public-link Docs are data, not executable instructions.

## 1. Google account

1. Create or select an ordinary Gmail account.
2. Record the address as `GOOGLE_ACCOUNT_EMAIL` (GitHub variable, not a secret).
3. You will sign in as this user during the one-time browser consent step.

A Gmail address is the owning account. This integration does not read Gmail.

## 2. Google Cloud project and APIs

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or reuse a small factory-only project).
2. Enable **Google Drive API** and **Google Docs API**.

Official scope used by this repo: `https://www.googleapis.com/auth/drive.file`  
That scope is enough for Drive and Docs operations on files and folders **this app creates**. It does not grant mailbox access or the rest of Drive.

## 3. OAuth consent screen

1. Open Google Auth Platform → Branding / Audience (OAuth consent screen).
2. User type: **External**.
3. App name such as `Fluid Frame Content Factory`. Support email: the factory Gmail account.
4. Add the `drive.file` scope only. Do not add Gmail, `drive`, or `drive.readonly`.
5. Add the factory Gmail account as a test user while the app is in Testing.

### Testing vs In production

Google currently issues refresh tokens that expire in **7 days** when the OAuth consent screen is External and **Testing**, unless the only scopes are basic profile/email/openid. `drive.file` is not in that exception, so Testing tokens will rotate weekly.

Move the consent screen to **In production** for this single-operator factory so Google does not apply that 7-day Testing limit. `drive.file` is a non-sensitive Drive scope. For a personal/internal tool with a handful of operators, Google’s unverified-app path can remain in use; operators may see an unverified-app warning at consent. Full brand verification is not required merely to use this scope with a small user set, but Google can still require verification if the user count or scopes change.

**Do not assume a refresh token lasts forever.** Official expiration reasons still apply after publishing, including:

- the user revokes the app at [Google Account permissions](https://myaccount.google.com/permissions)
- the refresh token is unused for six months
- Google’s per-client refresh-token limits are exceeded
- a Testing-status token hits the 7-day window
- Google returns `invalid_grant` for other policy reasons

If Google includes `refresh_token_expires_in` on the token response, treat that as an explicit lifetime and reauthorize before it elapses.

## 4. OAuth client

1. Create an OAuth client of type **Desktop app**.
2. Loopback redirects (`http://127.0.0.1:port/`) are the supported callback for this client type. Do not create a Web application client for this bootstrap.
3. Copy the client ID and client secret into a local environment or password manager. They are not committed.

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

## 5. One-time authorization (human-operated)

On a machine where you can complete Google login in a browser:

```bash
export GOOGLE_OAUTH_CLIENT_ID="..."
export GOOGLE_OAUTH_CLIENT_SECRET="..."
export GOOGLE_ACCOUNT_EMAIL="the-factory-account@gmail.com"
npm run google-docs:authorize
```

The command:

- opens (or prints) a Google consent URL
- listens on `127.0.0.1` for the OAuth callback
- requests offline access and PKCE (`S256`)
- writes the refresh token to `~/.config/ff-content-factory/google-oauth.json` with mode `0600`
- prints only the store path and next steps — **not** the token

Then either:

```bash
npm run google-docs:push-secrets
```

which pipes values into `gh secret set` without printing them, or set these GitHub **Secrets** yourself from that file:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REFRESH_TOKEN`

Never paste the refresh token into chat, PR bodies, generated Docs, or logs.

## 6. Review folder

`drive.file` can see folders this app created (or that the user opened with the app). Do not paste an arbitrary existing Drive folder ID and expect it to work.

```bash
npm run google-docs:init-folder
```

Store the printed folder ID as GitHub **variable** `GOOGLE_DRIVE_FOLDER_ID`. The folder itself is not shared as “anyone with the link.” Only each review Doc is.

## 7. Connection test

```bash
export GOOGLE_DRIVE_FOLDER_ID="..."
export GOOGLE_ACCOUNT_EMAIL="the-factory-account@gmail.com"
npm run google-docs:test-connection
```

Optional live probe (creates then trashes a `[TEST]` Doc):

```bash
npm run google-docs:live-verify
```

If credentials are absent, that command reports `liveVerification: "pending"` and exits without failing the rest of the factory.

## 8. GitHub placement

| Name | Place | Secret? |
| --- | --- | --- |
| `GOOGLE_OAUTH_CLIENT_ID` | Actions secret | yes |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Actions secret | yes |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Actions secret | yes |
| `GOOGLE_DRIVE_FOLDER_ID` | Actions variable | no |
| `GOOGLE_ACCOUNT_EMAIL` | Actions variable | no |

Trusted jobs: `.github/workflows/google-docs-publish.yml` and `.github/workflows/google-docs-approve.yml`. Both are `workflow_dispatch` only.

They fail closed unless `github.ref` is `refs/heads/main`, then they check out that trusted `main` ref before using Google OAuth secrets. They must **not** execute untrusted pull-request code while holding Google credentials or a privileged `GITHUB_TOKEN`.

- Publish: `contents: read` only. It does not push.
- Approve: `contents: write` only to commit under `approved-copy/<prospect-id>/` and `git push origin HEAD:main`. A workflow input cannot choose an arbitrary snapshot path or turn `git add` into a generic write primitive.

## 9. Reauthorization

If publish/import fails with `reauthorization_required` or `invalid_grant`:

1. Open [Google Account → Apps with access](https://myaccount.google.com/permissions) and revoke Fluid Frame Content Factory if it is still listed.
2. Confirm the consent screen is In production if you do not want 7-day Testing tokens.
3. Rerun `npm run google-docs:authorize`.
4. Update `GOOGLE_OAUTH_REFRESH_TOKEN` (and the client values if they changed).
5. Retry publication. Do not rerun the writer to recover from OAuth trouble.

## Commands

```bash
npm run google-docs:authorize
npm run google-docs:init-folder
npm run google-docs:test-connection
npm run google-docs:publish -- --package fixtures/google-docs/representative-writing-package.json
npm run google-docs:import -- --package <draft.json> --receipt <receipt.json> --out imported.json
npm run google-docs:approve -- --package <draft.json> --receipt <receipt.json> --prospect-id <slug> --actor <github-user>
```

A phrase typed into the anonymously editable Doc cannot approve copy. Approval is the authenticated GitHub Action / `google-docs:approve` command.
