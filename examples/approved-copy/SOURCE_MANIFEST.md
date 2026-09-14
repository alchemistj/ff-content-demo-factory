# Approved-copy source manifest

Provenance for the Springfield reference set. Source repositories were not modified. A git clone of the client repositories was **not** performed.

Copy was captured from the named rendered build or reviewed Preview. Repository + SHA identify the site lineage.

## Lineage

| Business | Repository | Branch / ref | Identity SHA | Capture | Notes |
| --- | --- | --- | --- | --- | --- |
| Window Dudes | `alchemistj/window-dudes` | canonical `main` | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | Canonical rendered build `https://www.windowdudesllc.com` | Page HTML `ff-source-sha` matches this SHA. No special new-copy branch. |
| SRA Roofing & Gutters | `alchemistj/sra-roofing-website` | `reconcile/sra-local-recovery-2026-09-09` | Preview SHA `fde339ca62488e61f99d4a855aafe9bad5cab1c0` | Reviewed Preview `https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app` | Copy-equivalent to reviewed head `f3f22a8154555cc762593c41947a5f2c6d4a2832` (the only commit between them adds `docs/sra-release-runbook-20260914.md`). Live production was not used. |
| Greene Planet | `alchemistj/greene-planet-website` | canonical `main` | `f9047501d167bd4977a61012d519ae06e9a169c8` | Canonical rendered build `https://greene-planet-website.vercel.app` | Not the live Duda site. Rendered HTML does not embed a source SHA. No special new-copy branch. |

## Page captures

| ID | Business | Page | Route | Capture URL | SHA | Status |
| --- | --- | --- | --- | --- | --- | --- |
| wd-home | Window Dudes | Homepage | `/` | https://www.windowdudesllc.com/ | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | complete |
| wd-glass | Window Dudes | Glass repair | `/springfield/glass-repair/` | https://www.windowdudesllc.com/springfield/glass-repair/ | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | complete |
| wd-replace | Window Dudes | Replacement window installation | `/springfield/replacement-window-installation/` | https://www.windowdudesllc.com/springfield/replacement-window-installation/ | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | complete |
| wd-contact | Window Dudes | Contact | `/contact/` | https://www.windowdudesllc.com/contact/ | `5a3019ac2f9c89e588ff03bb916aca3b4476a2e5` | complete |
| sra-home | SRA | Springfield homepage | `/springfield/` | https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app/springfield/ | `fde339ca62488e61f99d4a855aafe9bad5cab1c0` | complete |
| sra-replace | SRA | Roof replacement | `/springfield/roof-replacement/` | https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app/springfield/roof-replacement/ | `fde339ca62488e61f99d4a855aafe9bad5cab1c0` | complete |
| sra-maint | SRA | Roof maintenance / The SRA Advantage | `/springfield/roof-maintenance/` | https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app/springfield/roof-maintenance/ | `fde339ca62488e61f99d4a855aafe9bad5cab1c0` | complete |
| sra-contact | SRA | Springfield contact | `/springfield/contact/` | https://sra-roofing-website-mlulb84dr-josh-lenzs-projects.vercel.app/springfield/contact/ | `fde339ca62488e61f99d4a855aafe9bad5cab1c0` | complete |
| gp-home | Greene Planet | Homepage | `/` | https://greene-planet-website.vercel.app/ | `f9047501d167bd4977a61012d519ae06e9a169c8` | complete |
| gp-inspect | Greene Planet | Mold inspection & testing | `/springfield/mold-inspection-testing/` | https://greene-planet-website.vercel.app/springfield/mold-inspection-testing/ | `f9047501d167bd4977a61012d519ae06e9a169c8` | complete |
| gp-black | Greene Planet | Black mold remediation | `/springfield/black-mold-remediation/` | https://greene-planet-website.vercel.app/springfield/black-mold-remediation/ | `f9047501d167bd4977a61012d519ae06e9a169c8` | complete |
| gp-contact | Greene Planet | Contact | `/springfield/contact/` | https://greene-planet-website.vercel.app/springfield/contact/ | `f9047501d167bd4977a61012d519ae06e9a169c8` | complete |

Limitation for every page: customer-facing Markdown was extracted from the captured HTML. Shared chrome lives in each business’s `_chrome.md`. This is not a claim that the client git repositories were cloned.

Window Dudes glass repair is the repair-side service example. The homepage is not counted twice. SRA statewide `/` and live `www.sraroofs.com` were not used.
