# Approved-copy source manifest

Provenance for the Springfield reference set. Source repositories were not modified.

Copy authority is the git ref named below. HTTP/Preview may be used only as composition verification (routes, redirects, `ff-source-sha`), never as the sole source of approved copy.

## Required refs

| Business | Repository | Branch / ref | Exact SHA to extract |
| --- | --- | --- | --- |
| Window Dudes | `alchemistj/window-dudes` | canonical `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` |
| SRA Roofing & Gutters | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | `f3f22a8154555cc762593c41947a5f2c6d4a2832` |
| Greene Planet | `alchemistj/greene-planet-website` | canonical `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` |

SRA SHA is the recovery-branch head named in the architect review. Extract from that commit (or a later head on the same branch if it moves, and record the SHA actually used).

## Page status

| ID | Business | Page | Route | Repository | Branch / ref | SHA | Source files | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wd-home | Window Dudes | Homepage | `/` | `alchemistj/window-dudes` | `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | Not read — clone failed | pending-git |
| wd-glass | Window Dudes | Glass repair | `/springfield/glass-repair/` | `alchemistj/window-dudes` | `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | Not read — clone failed | pending-git |
| wd-replace | Window Dudes | Replacement window installation | `/springfield/replacement-window-installation/` | `alchemistj/window-dudes` | `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | Not read — clone failed | pending-git |
| wd-contact | Window Dudes | Contact | `/contact/` | `alchemistj/window-dudes` | `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | Not read — clone failed | pending-git |
| sra-home | SRA | Springfield homepage | `/springfield/` | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | `f3f22a8154555cc762593c41947a5f2c6d4a2832` | Not read — clone failed | pending-git |
| sra-replace | SRA | Roof replacement | `/springfield/roof-replacement/` | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | `f3f22a8154555cc762593c41947a5f2c6d4a2832` | Not read — clone failed | pending-git |
| sra-maint | SRA | Roof maintenance / The SRA Advantage | `/springfield/roof-maintenance/` | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | `f3f22a8154555cc762593c41947a5f2c6d4a2832` | Not read — clone failed | pending-git |
| sra-contact | SRA | Springfield contact | `/springfield/contact/` | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | `f3f22a8154555cc762593c41947a5f2c6d4a2832` | `src/content/springfieldContact.ts`, `src/content/contact.ts`, `src/pages/SpringfieldContactPage.tsx`, plus shared chrome/review sources as rendered | pending-git (source present on branch; not extracted) |
| gp-home | Greene Planet | Homepage | `/` | `alchemistj/greene-planet-website` | `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` | Not read — clone failed | pending-git |
| gp-inspect | Greene Planet | Mold inspection & testing | `/springfield/mold-inspection-testing/` | `alchemistj/greene-planet-website` | `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` | Not read — clone failed | pending-git |
| gp-black | Greene Planet | Black mold remediation | `/springfield/black-mold-remediation/` | `alchemistj/greene-planet-website` | `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` | Not read — clone failed | pending-git |
| gp-contact | Greene Planet | Contact | `/springfield/contact/` | `alchemistj/greene-planet-website` | `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` | Not read — clone failed | pending-git |

None of the twelve slots are marked `complete`. Catalog tests require all twelve pages to be git-complete; that assertion is supposed to fail until a runtime that can clone the client repositories extracts them.

There is no `wd-repair` slot. Window Dudes’ repair-side example is Glass Repair at `/springfield/glass-repair/`. The homepage is not counted twice. There is no dedicated `/springfield/window-repair/` page at the pinned SHA.

## Clone access on this SCM agent

`GET /installation/repositories` for this GitHub App token returns only `alchemistj/ff-content-demo-factory`. `git clone` of the three client repositories returns `Repository not found`. A later runtime with read access to those repos should extract from the SHAs above, fill `source files`, and set catalog `status: "complete"` with `copyAuthority: "git-repository"`.

Client repositories must stay read-only.
