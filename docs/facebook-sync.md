# Automated Facebook → News Sync

Pulls the latest posts from the official LGU Solano Facebook Page, categorizes
them, and merges them into [`data/news.json`](../data/news.json) — which drives
both the homepage **Latest Updates** and the **News** page. Runs on a schedule
with no per-post manual work.

- Engine: [`scripts/sync-facebook.js`](../scripts/sync-facebook.js)
- Scheduler: [`.github/workflows/facebook-sync.yml`](../.github/workflows/facebook-sync.yml)
- Renderer: [`assets/js/news.js`](../assets/js/news.js) (unchanged — reads the merged file)

## The one prerequisite (activation gate)

Facebook only returns a page's posts to a caller holding a **Page access token**,
and that token requires a **role on the page**. No code can bypass this.

1. **Get an Editor role on the page.** Ask the LGU Solano page admin (via Meta
   Business Suite → Settings → People) to add the BetterSolano account/app as an
   **Editor**. Editor is enough for read access; full Admin is not required.
2. **Create a Meta app** at developers.facebook.com → add the **Facebook Login**
   / **Pages** products, request `pages_read_engagement`.
3. **Generate a long-lived Page access token.** Use Graph API Explorer to get a
   user token, exchange it for a long-lived one, then call `/me/accounts` to get
   the **Page** token. For a token that never expires, create a **System User**
   in Business Manager and generate its token. (A short-lived token works for
   testing but will stop the sync in ~1 hour.)
4. **Find the Page ID** — visible in the page's About section or via
   `/me/accounts`.

Until step 3 is done, the workflow runs but **stays dormant**: the engine logs
"skipping sync (dormant)" and never touches `news.json`. The curation tool
([news-curation.md](news-curation.md)) keeps the sections populated in the
meantime, and the two sources merge automatically once the token is added.

## Configure the repository

In **GitHub → Settings → Secrets and variables → Actions**:

| Name              | Type         | Value                                              |
| ----------------- | ------------ | -------------------------------------------------- |
| `FB_PAGE_ID`      | **Variable** | The page's numeric ID (public, safe as a variable) |
| `FB_ACCESS_TOKEN` | **Secret**   | The Page / System User access token                |

To auto-deploy the updated file to the live cPanel site, also add:

| Name              | Type         | Value                                               |
| ----------------- | ------------ | --------------------------------------------------- |
| `FTP_SERVER`      | Secret       | cPanel FTP host (e.g. `ftp.bettersolano.org`)       |
| `FTP_USERNAME`    | Secret       | FTP account username                                |
| `FTP_PASSWORD`    | Secret       | FTP account password                                |
| `FTP_REMOTE_PATH` | **Variable** | Path to the file, e.g. `public_html/data/news.json` |

The deploy step uses **FTPS** (`curl --ssl-reqd`). If your host only allows
**SFTP**, swap the deploy step for an SFTP/key-based action — the sync engine is
unchanged either way. If no FTP secrets are set, the workflow instead uploads the
updated `news.json` as a downloadable build artifact, so nothing is ever lost.

## How it behaves (reliability guarantees)

- **Schedule:** every ~20 min (`workflow_dispatch` lets you trigger a test run).
- **Categorization:** deterministic keyword + `#hashtag` rules map each post to
  Announcement / Advisory / Project / Event and a badge color
  (`info` / `success` / `warning`). Editors can force a category by adding e.g.
  `#advisory` or `#project` to the post.
- **Merge:** manually-curated entries (any item whose `id` does **not** start with
  `fb-`) are always kept; Facebook items (`fb-…`) are refreshed each run. The
  combined list is sorted newest-first.
- **Never blanks the feed:** on a fetch error, an empty result, or zero valid
  items, the engine leaves the existing `news.json` untouched and exits without
  deploying. Writes are atomic (temp file + rename).
- **Idempotent:** if nothing changed, no deploy happens.
- **Token expiry:** an expired/invalid token (Graph error 190) fails the run
  loudly so it shows red in the Actions tab — your signal to refresh the token.

## Test it locally (no token needed)

The engine accepts a saved Graph response via `FB_FIXTURE`, bypassing the network:

```bash
# Save a sample Graph /posts response to fixture.json, then:
FB_FIXTURE=fixture.json NEWS_JSON_PATH=/tmp/news.json node scripts/sync-facebook.js
```

Once a real token exists, dry-run against the live API without deploying:

```bash
FB_PAGE_ID=<id> FB_ACCESS_TOKEN=<token> NEWS_JSON_PATH=/tmp/news.json \
  node scripts/sync-facebook.js
```

## Optional upgrade: smarter categorization

The current categorizer is deterministic and dependency-free (the right default
for reliability). For cleaner headlines and more accurate categories on messy
posts, the transform step can call **Claude Haiku** (`claude-haiku-4-5`, ~pennies/
month at this volume) with structured output, falling back to the keyword rules if
the API is unavailable. Ask to enable Tier 2 if you want it.
