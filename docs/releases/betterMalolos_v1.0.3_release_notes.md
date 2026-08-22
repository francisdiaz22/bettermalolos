# BetterMalolos v1.0.3 — Release Notes

Release date: 2026-08-22

## Community-first homepage

- Reframed BetterMalolos as an independent, community-built civic platform.
- Reordered the homepage around resident needs, placing community tools and participation before the existing government-services directory.
- Added clear paths to explore the roadmap, suggest an idea, and volunteer for concrete civic-tech roles.
- Preserved government services, emergency information, city information, transparency resources, and the bilingual experience.

## Community roadmap

- Added a versioned eight-item roadmap shared by the homepage and `/ideas`.
- Labels every not-yet-built tool as `Proposed`; no card claims that a live flood, road, water, barangay, project, commute, or opportunities service exists.
- Keeps the documented priority order and routes unavailable tools to a contextual contribution path instead of a dead page.

## Ideas intake

- Added the accessible `/ideas` page with prescribed idea, problem, source, feature, and volunteer fields.
- Supports anonymous mode and includes privacy and emergency-use guidance.
- Deliberately keeps submission paused because no production receiver, moderation owner, retention wording owner, or approved fallback has been confirmed. The page sends no resident data and cannot display a false success state.

## Navigation and quality

- Migrated all 52 standard public static pages to one resident-focused navigation architecture with root-safe links, matching active states, and revised breadcrumbs.
- Added focused Playwright coverage for the homepage, ideas page, accessibility, responsive behavior, and site-wide navigation.
- Updated the sitemap, manifest, service-worker cache, metadata, and clean-route production output for `/ideas`.

## Deferred

Live civic data integrations, public submissions or voting, barangay pages, attachments, and a production ideas receiver remain deferred until their data, privacy, moderation, security, ownership, and maintenance requirements are approved.

## Verification summary

- Full production build with `npm run build -- --no-bump`: passed.
- Supported non-Edge focused browser matrix: 140 checks passed across Chrome, Firefox, desktop WebKit, mobile WebKit, and mobile Chromium.
- Microsoft Edge was not installed on the verification host, so its configured project could not launch.
- Repository-wide formatting still reports documented pre-existing files outside this release; all touched feature files pass focused formatting checks.
- Reviewer screenshots are stored in `docs/review/v1.0.3/`.
