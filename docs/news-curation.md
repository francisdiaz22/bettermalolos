# News Curation Workflow

How the **Latest Updates** (homepage) and **News** page are kept up to date.

## How it works

Both sections are rendered by [`assets/js/news.js`](../assets/js/news.js) from a single
file: [`data/news.json`](../data/news.json). The homepage shows the 3 most recent items;
the News page shows all of them, newest first. No backend is involved — it is a static
JSON file served from cPanel.

To avoid hand-editing JSON, use the curation tool:

```
admin/news-editor.html
```

This is an **internal tool**. It is excluded from the production build
([`build.sh`](../build.sh)), so it is never deployed publicly. You run it locally.

## Adding or editing an update

1. Start the local server from the project root:
   ```bash
   npm run dev          # serves on http://localhost:8000
   ```
2. Open **http://localhost:8000/admin/news-editor.html**. It loads the current
   `data/news.json` automatically.
3. Click **Add new update** (or **Edit** on an existing entry) and fill in:
   - **Title** (≤120 chars) and **Summary** (≤300 chars)
   - **Date**, **Category label**, and **Badge color** (`info` blue / `success` green
     / `warning` amber — common categories auto-pick a color)
   - **Link URL** (optional) — e.g. the original Facebook post; adds a "Read more" link
     on the News page card and makes the homepage title link out
   - **ID** auto-fills from the title and must be unique
     The live preview shows the resulting News-page card. Validation blocks bad entries.
4. Click **Save update**.
5. Click **Download news.json**.
6. Replace [`data/news.json`](../data/news.json) with the downloaded file, commit, and
   deploy (`npm run build` → upload `dist/`).

`Copy JSON` and `Import file…` are available if you prefer pasting, or want to resume
editing a file you saved earlier.

## Schema

```jsonc
{
  "news": [
    {
      "id": "unique-slug", // required, lowercase + dashes
      "title": "string", // required, ≤120 chars
      "date": "YYYY-MM-DD", // required
      "category": "Announcement", // required label shown on the badge
      "badge": "info", // required: info | success | warning
      "summary": "string", // required, ≤300 chars
      "url": "https://...", // optional outbound link (or null)
      "source": "View on Facebook", // optional link label (defaults to "Read more")
    },
  ],
}
```

`news.js` escapes all fields before rendering and ignores non-`http(s)` URLs, so the
feed is safe even if a future automated source (e.g. a Facebook Graph API sync) appends
items in the same shape. When that access becomes available, the sync writes
Facebook-sourced entries into the same array and they merge automatically with the
manually curated ones.
