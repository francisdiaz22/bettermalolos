#!/usr/bin/env node
/**
 * Facebook → news.json sync engine.
 *
 * Fetches the latest posts from the official LGU Solano Facebook Page via the
 * Graph API, derives a title/summary, categorizes each post, validates it, and
 * merges the result into data/news.json alongside any manually-curated entries.
 * The static front-end (assets/js/news.js) renders the merged file unchanged.
 *
 * Designed to run unattended on a schedule (see .github/workflows/facebook-sync.yml).
 *
 * REQUIRED ENV (to actually fetch):
 *   FB_PAGE_ID         numeric/short id of the page (public — safe as a repo var)
 *   FB_ACCESS_TOKEN    Page access token (SECRET; requires an Editor role on the page)
 *
 * OPTIONAL ENV:
 *   FB_API_VERSION     Graph API version (default v21.0)
 *   FB_LIMIT           posts to request per run (default 25)
 *   MAX_FB_ITEMS       max Facebook items kept in the feed (default 30)
 *   NEWS_JSON_PATH     output path (default <repo>/data/news.json)
 *   FB_FIXTURE         path to a saved Graph response JSON — bypasses the network
 *                      (for local testing / dry runs; no token needed)
 *
 * Behaviour when FB_ACCESS_TOKEN (and FB_FIXTURE) are absent: logs a notice and
 * exits 0 without touching news.json — the workflow is safe to enable before the
 * token exists. On fetch failure or an empty result it also leaves the existing
 * file untouched, so a bad run can never blank out the live news.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG = {
  pageId: process.env.FB_PAGE_ID || '',
  token: process.env.FB_ACCESS_TOKEN || '',
  apiVersion: process.env.FB_API_VERSION || 'v21.0',
  limit: parseInt(process.env.FB_LIMIT || '25', 10),
  maxFbItems: parseInt(process.env.MAX_FB_ITEMS || '30', 10),
  fixture: process.env.FB_FIXTURE || '',
  newsPath: process.env.NEWS_JSON_PATH || path.resolve(__dirname, '..', 'data', 'news.json'),
};

const BADGES = { info: 1, success: 1, warning: 1 };
const TITLE_MAX = 120;
const SUMMARY_MAX = 300;

// ---------------------------------------------------------------------------
// Categorization (Tier 1 — deterministic, dependency-free, never fails)
// ---------------------------------------------------------------------------

const CATEGORY_RULES = [
  {
    category: 'Advisory',
    badge: 'warning',
    keywords: [
      'power interruption',
      'water interruption',
      'brownout',
      'outage',
      'road closure',
      'closure',
      'suspension',
      'suspended',
      'cancel',
      'postpone',
      'typhoon',
      'storm',
      'signal no',
      'flood',
      'evacuat',
      'landslide',
      'warning',
      'advisory',
      'alert',
      'emergency',
      'disaster',
      'lockdown',
      'curfew',
    ],
  },
  {
    category: 'Project',
    badge: 'success',
    keywords: [
      'groundbreaking',
      'inaugurat',
      'ribbon',
      'turnover',
      'completed',
      'completion',
      'unveil',
      'project',
      'construction',
      'infrastructure',
      'rehabilitation',
      'improvement',
      'road concreting',
      'opened',
      'now open',
    ],
  },
  {
    category: 'Event',
    badge: 'info',
    keywords: [
      'invites',
      'invitation',
      'join us',
      'will be held',
      'schedule of activities',
      'fiesta',
      'festival',
      'celebration',
      'ceremony',
      'program',
      'seminar',
      'training',
      'webinar',
      'fun run',
      'medical mission',
      'event',
      'foundation day',
    ],
  },
  {
    category: 'Announcement',
    badge: 'info',
    keywords: [
      'announce',
      'deadline',
      'renewal',
      'registration',
      'enroll',
      'hiring',
      'vacancy',
      'job order',
      'notice',
      'reminder',
      'requirements',
      'application',
      'now accepting',
      'available',
    ],
  },
];

// Editors can force a category from the post itself with a hashtag.
const HASHTAG_MAP = {
  advisory: { category: 'Advisory', badge: 'warning' },
  alert: { category: 'Advisory', badge: 'warning' },
  project: { category: 'Project', badge: 'success' },
  event: { category: 'Event', badge: 'info' },
  announcement: { category: 'Announcement', badge: 'info' },
  notice: { category: 'Announcement', badge: 'info' },
};

function categorize(message) {
  const text = (message || '').toLowerCase();

  const hashtags = text.match(/#([a-z0-9_]+)/g) || [];
  for (const tag of hashtags) {
    const hit = HASHTAG_MAP[tag.slice(1)];
    if (hit) return hit;
  }

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (text.indexOf(kw) !== -1) {
        return { category: rule.category, badge: rule.badge };
      }
    }
  }
  return { category: 'Announcement', badge: 'info' };
}

// ---------------------------------------------------------------------------
// Transform a raw Graph post into a news.json item
// ---------------------------------------------------------------------------

function collapseWhitespace(s) {
  return String(s || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function truncate(s, max) {
  const str = collapseWhitespace(s);
  if (str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!-]+$/, '') + '…';
}

function deriveTitle(message, category) {
  const firstLine = String(message || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return category + ' Update';
  // Prefer the first sentence if it's a reasonable length.
  const sentence = firstLine.split(/(?<=[.!?])\s/)[0];
  const base = sentence && sentence.length <= TITLE_MAX ? sentence : firstLine;
  return truncate(base.replace(/#[a-z0-9_]+/gi, '').trim() || firstLine, TITLE_MAX);
}

function toDate(createdTime) {
  // Graph returns ISO 8601, e.g. "2026-06-10T08:30:00+0000"
  const d = new Date(createdTime);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function transformPost(post) {
  const message = post.message || post.story || '';
  const { category, badge } = categorize(message);
  return {
    id: 'fb-' + post.id,
    title: deriveTitle(message, category),
    date: toDate(post.created_time),
    category,
    badge,
    summary: message
      ? truncate(message, SUMMARY_MAX)
      : 'See the full post on the official Facebook page.',
    url: post.permalink_url || null,
    source: 'View on Facebook',
  };
}

// ---------------------------------------------------------------------------
// Validation — bad items are dropped, not written
// ---------------------------------------------------------------------------

function isValidItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.title || item.title.length > TITLE_MAX) return false;
  if (!item.date || isNaN(new Date(item.date + 'T00:00:00').getTime())) return false;
  if (!BADGES[item.badge]) return false;
  if (!item.category) return false;
  if (!item.summary || item.summary.length > SUMMARY_MAX) return false;
  if (item.url && !/^https?:\/\//i.test(item.url)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Merge: keep manual entries, replace Facebook entries with the fresh set
// ---------------------------------------------------------------------------

function mergeFeeds(existing, fbItems, maxFbItems) {
  const manual = (existing || []).filter((e) => !String(e.id || '').startsWith('fb-'));
  const fb = fbItems
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, maxFbItems);
  return manual.concat(fb).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// ---------------------------------------------------------------------------
// Graph API fetch with retry/backoff
// ---------------------------------------------------------------------------

const FIELDS = 'id,message,story,created_time,permalink_url,full_picture,status_type';

async function fetchWithRetry(url, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      const body = await res.json();
      if (body && body.error) {
        const code = body.error.code;
        // 190 = expired/invalid token; 10/200 = permission — all unrecoverable.
        if (code === 190 || code === 10 || code === 200) {
          throw new Error('FB auth/permission error (code ' + code + '): ' + body.error.message);
        }
        // 4/17/32/613 = rate limited — retryable.
        if ([4, 17, 32, 613].indexOf(code) !== -1) {
          throw Object.assign(new Error('rate limited (code ' + code + ')'), { retryable: true });
        }
        throw new Error('FB API error: ' + body.error.message);
      }
      if (!res.ok) {
        throw Object.assign(new Error('HTTP ' + res.status), { retryable: res.status >= 500 });
      }
      return body;
    } catch (err) {
      lastErr = err;
      const retryable = err.retryable || err.name === 'TypeError'; // TypeError ~ network
      if (!retryable || attempt === retries) break;
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`  retry ${attempt + 1}/${retries} after ${delay}ms (${err.message})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function fetchPosts() {
  if (CONFIG.fixture) {
    console.log('Using fixture:', CONFIG.fixture);
    return JSON.parse(fs.readFileSync(CONFIG.fixture, 'utf8'));
  }
  const url =
    `https://graph.facebook.com/${CONFIG.apiVersion}/${encodeURIComponent(CONFIG.pageId)}/posts` +
    `?fields=${encodeURIComponent(FIELDS)}&limit=${CONFIG.limit}` +
    `&access_token=${encodeURIComponent(CONFIG.token)}`;
  return fetchWithRetry(url);
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

function readExisting() {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG.newsPath, 'utf8'));
    return (data && data.news) || [];
  } catch (e) {
    return [];
  }
}

function serialize(news) {
  return JSON.stringify({ news }, null, 2) + '\n';
}

function writeAtomic(filePath, content) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

function reportChanged(changed) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed ? 'true' : 'false'}\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!CONFIG.fixture && (!CONFIG.token || !CONFIG.pageId)) {
    console.log('FB_ACCESS_TOKEN / FB_PAGE_ID not set — skipping sync (dormant). No changes made.');
    reportChanged(false);
    return;
  }

  console.log('Fetching posts from Facebook…');
  const response = await fetchPosts();
  const rawPosts = (response && response.data) || [];
  console.log(`  ${rawPosts.length} posts returned.`);

  if (rawPosts.length === 0) {
    console.log('No posts returned — leaving existing news.json untouched.');
    reportChanged(false);
    return;
  }

  const transformed = rawPosts.map(transformPost);
  const valid = transformed.filter(isValidItem);
  const dropped = transformed.length - valid.length;
  if (dropped > 0) console.warn(`  dropped ${dropped} invalid item(s).`);

  if (valid.length === 0) {
    console.warn('No valid items after validation — leaving existing news.json untouched.');
    reportChanged(false);
    return;
  }

  const existing = readExisting();
  const merged = mergeFeeds(existing, valid, CONFIG.maxFbItems);
  const next = serialize(merged);

  let current = '';
  try {
    current = fs.readFileSync(CONFIG.newsPath, 'utf8');
  } catch (e) {
    /* file may not exist yet */
  }

  if (next === current) {
    console.log('No changes — news.json already up to date.');
    reportChanged(false);
    return;
  }

  writeAtomic(CONFIG.newsPath, next);
  const fbCount = merged.filter((e) => String(e.id).startsWith('fb-')).length;
  const manualCount = merged.length - fbCount;
  console.log(
    `Wrote ${CONFIG.newsPath}: ${merged.length} items (${fbCount} Facebook, ${manualCount} manual).`
  );
  reportChanged(true);
}

// Export for tests; run when invoked directly.
module.exports = {
  categorize,
  deriveTitle,
  truncate,
  toDate,
  transformPost,
  isValidItem,
  mergeFeeds,
  serialize,
};

if (require.main === module) {
  main().catch((err) => {
    console.error('Sync failed:', err.message);
    process.exit(1);
  });
}
