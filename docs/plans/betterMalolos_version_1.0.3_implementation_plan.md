# BetterMalolos v1.0.3 — Implementation Plan

> Companion to [the v1.0.3 product direction](betterMalolos_version_1.0.3.md). This is an implementation checklist for an agent working one phase at a time.

## Release outcome

Ship a community-first homepage and a safe, usable `/ideas` intake page. A visitor must quickly understand that BetterMalolos is an independent, community-built civic platform; be able to discover the eight project priorities; and be able to suggest an idea or volunteer.

This release **does not** claim that Bantay Baha, RoadWatch, Tubig Malolos, or the other proposed tools are live. They are represented only as accurately labelled roadmap/tool cards unless an independently verified implementation is already available.

## Delivery strategy and constraints

- Implement the static site at the repository root first, because the current production branch is the static HTML version. Do not silently implement only `react-app/`.
- Preserve existing service, government, transparency, accessibility, PWA, and language-switching functionality.
- Reuse the global colour tokens in `assets/css/style.css`; do not introduce one-off brand colours.
- Keep the release fully useful without a backend. A real submission endpoint is a release gate, not something a client-side page can safely fake.
- Do not add factual project, flood, traffic, water, or barangay claims without a source and last-verified date.
- Existing uncommitted files are outside this work unless specifically named below.

## Scope map

| Area              | v1.0.3 deliverable                                                                                                | Deferred                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Homepage          | Community-first order, new hero, tool cards, barangay/project teasers, services lower on page, contribution CTAs  | Live operational data tools                                                        |
| Community roadmap | Static/data-driven eight-item roadmap with status badges                                                          | Voting, supporter counts, public moderation workflow                               |
| Ideas portal      | Accessible form, privacy notice, explicit submission handling, success/error states                               | Public idea listings, attachments unless endpoint supports secure scanning/storage |
| Navigation        | Shared resident-focused header and matching breadcrumbs across every public static page; only routes that resolve | Empty future pages                                                                 |
| Data              | Small, versioned local JSON for roadmap display                                                                   | Unverified community reports and third-party feeds                                 |

## Required decisions before implementation begins

Complete these before Phase 3 or before exposing a live submission form. Do not make a guess that changes how residents' personal data is handled.

- [ ] Confirm the production submission service for `/ideas` (for example, a managed form provider, serverless endpoint, or a reviewed email workflow).
- [ ] Confirm who receives submissions and the expected response/moderation process.
- [ ] Confirm whether attachments are in scope. Default to **no attachments** for v1.0.3.
- [ ] Confirm the legal wording owner for the privacy notice and retention period.
- [ ] Confirm the intended `/volunteer` destination. The current volunteer modal may be retained as the destination until a dedicated route exists.
- [x] Propagate the navigation redesign to every public static page in this release. A homepage-only header is not acceptable because changing navigation architecture between routes creates an inconsistent resident experience.

If any decision is unavailable, implement all display work but leave the form unsubmitted and clearly label it as awaiting a submission channel. Never show a false success message.

## Phase 0 — Baseline and implementation contract

**Goal:** establish a clean, observable starting point and lock the release boundaries.

### Tasks

- [ ] Read `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/detected_vulnerabilities.md`, and the product-direction document.
- [ ] Inspect `index.html`, `assets/css/style.css`, `assets/css/responsive.css`, `assets/js/main.js`, `assets/js/translations.js`, `sitemap.xml`, `sw.js`, and the current Playwright configuration.
- [ ] Record the current homepage desktop and mobile screenshots for visual comparison.
- [ ] Run `npm run format:check` and the relevant existing Playwright suite; record failures that pre-date this work.
- [ ] Create a feature branch using the repository convention, such as `feature/community-first-homepage`.
- [ ] Create a short implementation log in the PR description: phase, files touched, behaviour changed, tests run, known follow-ups.

### Exit criteria

- [ ] The implementer can identify the current homepage sections, header/mobile-menu behaviour, translation mechanism, and build process.
- [ ] The team has explicitly selected an ideas-submission transport or recorded that the form cannot go live yet.
- [ ] No source-data or live-tool claim has been added to the release scope.

## Phase 1 — Content model, routes, and reusable status UI

**Goal:** create the smallest data model required to render the roadmap consistently and make future tools honest about maturity.

### Tasks

- [x] Add `data/community-tools.json` with exactly these items in this order: Bantay Baha, RoadWatch, Saan Ako Lalapit?, Tubig Malolos, Barangay Hub, Project Tracker, Commute Guide, Opportunities Hub.
- [x] Give each item a stable `id`, `name`, `route`, one-sentence resident benefit, `status`, `priority`, and optional `availabilityNote`.
- [x] Start all not-yet-built tools at `Proposed` (or `Researching` only when evidence supports it). Never use `Live` for a card with no working tool.
- [x] Define the allowed statuses once: `Proposed`, `Researching`, `In Development`, `Beta`, `Live`.
- [x] Add a reusable badge/card CSS pattern with text labels in addition to colour. Ensure status contrast meets WCAG AA.
- [x] Decide whether cards with unavailable routes are non-link cards or link to `/ideas` with a contextual “help shape this” CTA. Do not create dead links.
- [x] Add a small renderer in a dedicated JavaScript file (for example `assets/js/community-tools.js`) rather than duplicating eight cards across the homepage and `/ideas`.
- [x] Add English and Filipino translation keys for all new visible UI, including statuses, section titles, labels, errors, and success messages.

### Data contract

```json
{
  "id": "bantay-baha",
  "priority": 1,
  "name": "Bantay Baha",
  "route": "/bantay-baha",
  "summary": "Flood conditions, evacuation information, passable roads, and flood-control projects.",
  "status": "Proposed",
  "availabilityNote": "Help us research and build this tool."
}
```

### Exit criteria

- [x] The JSON validates and preserves the required order without relying on display text sorting.
- [x] Status rendering has a visible text label, keyboard focus is clear, and no unavailable link returns a 404.
- [x] New content is available in both supported languages.

## Phase 2 — Homepage information architecture and hero

**Goal:** reshape the homepage around resident needs without removing useful service content.

### Required order

1. Hero
2. Top citizen tools
3. Suggest an idea/community input
4. Barangay Hub teaser
5. Project transparency teaser
6. More community tools
7. Government services
8. Volunteer/contribute
9. Existing informational/footer content

### Tasks

- [x] Replace the LGU-service-led hero copy with the approved community-first headline and independent/community-built supporting copy.
- [x] Make “Explore Community Tools” the primary hero CTA and “Suggest an Idea” the secondary CTA; retain a clear Volunteer path.
- [x] Preserve search only if its scope remains clear. A service-only search must be labelled as such rather than implying it searches the new tools.
- [x] Add the four priority cards immediately after the hero, rendered from `community-tools.json`.
- [x] Add a prominent suggestion block that links to `/ideas` and explains what residents can submit.
- [x] Add the Barangay Hub teaser; it must not imply that per-barangay pages are already live.
- [x] Add the Project Tracker teaser using only sourced existing project data, or show it as a proposed roadmap item with no invented project cards.
- [x] Add a “More Community Tools” section for priorities 5–8, preserving roadmap order.
- [x] Move the current government-services grid below community-focused sections; retain its existing links and search/discovery paths.
- [x] Replace or adapt the existing volunteer prompt so its wording explains concrete contribution roles and has one reliable destination.
- [x] Update homepage title, meta description, Open Graph description, JSON-LD description, and visible footer tagline so they no longer call BetterMalolos an official LGU portal.
- [x] Check that all in-page anchors, clean URLs, skip link, and mobile-menu focus behaviour still work after reordering. In-page anchors, the skip link, existing clean URLs, and `/ideas` were verified.

### Exit criteria

- [x] The first viewport communicates community-built, independent, and practical local help without claiming LGU affiliation.
- [x] The first four community tools precede government services on desktop and mobile.
- [x] All existing service cards still work and are discoverable lower on the page.
- [x] No proposed tool is represented as operational.

## Phase 3 — `/ideas` page and submission flow

**Goal:** provide a privacy-aware, accessible community intake path.

**Status (2026-08-22):** Display work is complete and `/ideas` resolves, but submission remains deliberately paused. No production receiver, moderation/response owner, retention wording owner, or approved email fallback has been confirmed. The form therefore has no action or endpoint, its submit control is disabled, and it cannot display a success state. Receiver-dependent tasks and tests remain unchecked below.

### Page and form tasks

- [x] Create `ideas/index.html` so the clean route `/ideas` resolves through the existing server/rewrite convention.
- [x] Reuse the site header, hotline/info bar, footer, PWA assets, language controls, and base styles.
- [x] Add the approved landing copy and make clear that BetterMalolos reviews submissions before public use.
- [x] Implement required fields: submission type, title, description, category.
- [x] Implement optional fields: barangay, general location, why it matters, suggested solution, source URL, name, email, volunteer interest, skills/expertise.
- [x] Provide the five prescribed submission types and all prescribed categories, including Other.
- [x] Include an explicit anonymous option. When selected, do not require, transmit, or display name/email fields.
- [x] Add a concise privacy notice: submissions are reviewed; personal information is private by default; public summaries may be created; residents should not submit sensitive personal data or emergency reports.
- [x] Add an emergency safety message with a link/number to existing emergency contacts; the ideas portal is not an emergency-reporting channel.
- [x] Use native semantic labels, `fieldset`/`legend` for related controls, visible required indicators, `aria-describedby` for help/errors, and a keyboard-reachable submit action. The action is keyboard-reachable but disabled while intake is paused.
- [ ] Add client-side validation only for user experience; enforce validation again at the approved server/form-provider endpoint.
- [ ] Include a honeypot and rate limiting/anti-spam protection in the submission service. A honeypot field is present in the draft form; server-side rate limiting remains blocked on the receiver decision. No credentials are present in HTML or JavaScript.
- [ ] Display success only after the service confirms receipt. Provide a retry-safe error state and a `mailto:info@bettermalolos.org` fallback only if approved.
- [x] Do not collect attachments in this release unless a storage, malware-scanning, retention, and moderation process has been approved.

### Submission payload contract

Use a versioned payload and send only fields actually completed by the resident:

```json
{
  "schemaVersion": 1,
  "submissionType": "idea",
  "title": "Example idea",
  "description": "What would help residents and why.",
  "category": "Flooding",
  "barangay": "",
  "location": "",
  "isAnonymous": true,
  "contact": null,
  "volunteerInterest": false,
  "sourceUrl": ""
}
```

The receiving service must validate allowed enum values, length limits, UTF-8 text, URL protocols, rate limits, and sanitize any future administrative display. Store no IP, analytics, or contact data beyond the documented service need and retention policy.

### Exit criteria

- [x] `/ideas` works with JavaScript enabled and has a usable non-JavaScript fallback or an explicit alternative contact method. Both modes clearly state that submissions are paused and send no data.
- [ ] Valid, anonymous, invalid, network-error, and duplicate-submit paths have been manually tested.
- [x] A submission cannot be reported as accepted unless it actually reached the approved receiver. With no approved receiver, submission and success reporting are disabled.
- [x] The form does not make personally identifiable information public.

### Phase 3 verification record (2026-08-22)

- `/ideas` returned HTTP 200 through `serve.py`; page title, heading, canonical route, five submission types, and 18 prescribed categories were present.
- At 320px, the page had no horizontal overflow or browser console errors.
- Anonymous mode was tested in Chrome: name/email are hidden and disabled by default, become available only after opting out, and are cleared and disabled when anonymous mode is restored.
- English and Filipino page keys were checked for full coverage; the live language switch updated the paused-submission notice.
- JavaScript-disabled rendering returned HTTP 200, retained a clear paused-submission notice, and kept submission disabled.
- No POST or other non-GET request occurred during the browser checks.
- `node --check` and focused Prettier checks passed for the new JavaScript, CSS, HTML, and translation changes.
- The existing Chrome Playwright suite reached 99 passed, 1 failed, and 1 did not run before termination after 4.4 minutes. The failure is a stale Phase 2 volunteer-modal copy assertion (`Be Part of Something Greater` expected; `Help build BetterMalolos` rendered), unrelated to Phase 3.
- Repository-wide `npm run format:check` still reports 67 pre-existing/unrelated files, including the already-modified homepage. Phase 3 files pass focused formatting checks.

## Phase 4 — Community roadmap presentation

**Goal:** make the eight priorities visible, understandable, and non-competitive.

**Status (2026-08-22):** Complete. `/ideas` now presents the full roadmap from the shared, validated data source. All items remain explicitly `Proposed`, and the intake channel remains paused as documented in Phase 3.

### Tasks

- [x] Add a compact roadmap section to `/ideas` or a clearly linked section on the homepage, using `community-tools.json`.
- [x] Show priority order, status, short benefit, and a context-appropriate CTA for each item.
- [x] Explain that prioritisation considers impact, feasibility, urgency, evidence, and underserved communities—not only popularity.
- [x] Do not add votes, supporter counts, comments, or public submissions without a moderation and abuse-prevention design.
- [x] Add a “Share data or a source” CTA that uses `/ideas` with the relevant submission type preselected, if the form supports query parameters accessibly.
- [x] Include a `last updated` field only when it can be maintained accurately. No date is shown because no maintenance owner or cadence has been established.

### Exit criteria

- [x] The roadmap preserves the product document’s exact priority order.
- [x] Each card is understandable without institutional knowledge.
- [x] The page makes no unsupported claim about community support or live data.

### Phase 4 verification record (2026-08-22)

- `/ideas` rendered all eight roadmap cards from `data/community-tools.json` in the product document's exact order, with visible priority, `Proposed` status, resident benefit, availability note, and CTA.
- “Share data or a source” selected `submissionType=source`; card CTAs selected `submissionType=feature`. Both paths retained the paused intake notice and disabled submission action.
- English and Filipino roadmap copy, priorities, statuses, and CTAs rendered through the shared translation mechanism.
- At 320px, all eight cards and the source CTA remained visible with no horizontal overflow.
- No votes, supporter counts, comments, public submissions, live-data claims, or unmaintainable last-updated date were introduced.
- Focused Prettier checks, `node --check`, JSON priority-order validation, and `git diff --check` passed.
- The browser reported the existing exchange-rate API error from `assets/js/info-bar.js`; no Phase 4 script error was present.

## Phase 5 — Navigation, SEO, PWA, and cross-page links

**Goal:** ensure residents can reach the new experience and crawlers/installations reflect it.

**Status (2026-08-22):** Complete. The resident-focused header now replaces the legacy header on all 52 standard public static pages. Root-absolute links keep nested routes safe, shared path-based state identifies the current resident-facing section, and revised breadcrumbs align Projects & Budget, City Information, and Get Involved pages with the new architecture. The deliberately minimal offline fallback remains header-free; it never exposed the legacy menu.

### Tasks

- [x] Update the homepage header to use resident-focused navigation labels only where the destination exists.
- [x] Use these top-level labels as the target architecture: Community Tools, Barangays, Projects & Budget, Services, City Information, Get Involved.
- [x] For unavailable routes, use a roadmap/ideas destination with an explicit status instead of linking to a missing future route.
- [x] Keep the logo linked to home and make Get Involved visually distinct without changing expected keyboard/dropdown interaction.
- [x] Confirm mobile order: Community Tools, Barangays, Get Involved, Projects & Budget, Services, City Information.
- [x] Replace the legacy header on every public static page with the same resident-focused navigation architecture, desktop order, mobile order, dropdown contents, language behaviour, and accessibility semantics used by the homepage.
- [x] Use route-correct links from nested pages so every shared-navigation destination resolves from pages such as `/budget`, `/services`, `/government`, service-detail pages, and `/ideas`.
- [x] Update breadcrumbs wherever the old information architecture appears. Preserve useful page-specific trails, but make their parent labels and hierarchy agree with the new navigation—for example, `Home → Projects & Budget → Budget & Transparency` rather than treating `Transparency` as an unrelated top-level destination.
- [x] Verify that active states and `aria-current` identify both the current page and its correct new top-level section without making a proposed tool appear live.
- [x] Add `/ideas` to `sitemap.xml`; verify canonical, title, description, robots handling, social metadata, and structured data as applicable.
- [x] Add the ideas page and its required static assets to the service-worker cache strategy, then bump the cache version using the project convention.
- [x] Check production `.htaccess`/clean-route behaviour with `npm run dev` and the production build output.

### Exit criteria

- [x] Every public static page presents the same top-level navigation architecture; moving between routes never restores the legacy Home, Services, Government, Statistics, Legislative, Transparency, and Contact menu.
- [x] Breadcrumb labels, parent sections, active states, and links agree with the shared navigation and resolve correctly.
- [x] Desktop and mobile navigation work across representative top-level, nested, and service-detail pages with mouse, keyboard, touch, and screen-reader semantics.
- [x] `/ideas`, all displayed existing destinations, 404 page, sitemap, and offline fallback behave correctly.
- [x] A new PWA installation does not receive a stale homepage or omit the ideas page because of an old cache.

### Phase 5 verification record (2026-08-22)

The checks below record the completed homepage-only implementation. They remain useful baseline evidence but no longer satisfy the revised site-wide navigation acceptance criteria.

- At 1280px, the rendered top-level order was Community Tools, Barangays, Projects & Budget, Services, City Information, Get Involved; there was no horizontal overflow. Arrow-key interaction opened a dropdown and updated `aria-expanded`; the existing focus and escape handlers were preserved.
- At 390px, the menu opened from its labelled toggle, rendered the required mobile order, expanded Get Involved by touch/click, kept the participation action visually distinct, and had no horizontal overflow.
- English and Filipino navigation labels rendered through the shared translation engine. The logo remained a home link, and proposed tools linked only to the homepage teaser or `/ideas` roadmap with a visible `Proposed` label.
- `/ideas` exposed the expected canonical URL, title, description, `index, follow` robots value, Open Graph/Twitter metadata, and `WebPage` structured data. `sitemap.xml` is valid XML and includes the canonical ideas URL.
- The web-app manifest now describes the independent community-built platform and provides an Ideas shortcut instead of identifying the installation as an LGU portal.
- Service-worker cache version `v8` precaches `/ideas/`, its page CSS and JavaScript, the shared roadmap renderer, and `community-tools.json`; activation removes older cache generations. A versioned responsive stylesheet URL prevents an already-installed v7 cache from retaining the pre-Phase-5 mobile order.
- `npm run build -- --no-bump --no-react` completed successfully. The production output contained `/ideas`, its dependencies, sitemap, manifest, service worker, offline page, 404 page, and `.htaccess` without changing the release version.
- Through the production-output server, `/ideas` and `/ideas/` both returned HTTP 200. Every displayed local destination, `/404`, `sitemap.xml`, and `offline.html` returned HTTP 200; an unknown route returned HTTP 404.
- Focused Prettier checks, JavaScript syntax checks, manifest JSON parsing, sitemap XML validation, and `git diff --check` passed. The browser reported only the previously recorded exchange-rate API response error from `assets/js/info-bar.js`.

### Phase 5 site-wide completion record (2026-08-22)

- Added one canonical navigation source in `scripts/sync-navigation.js`, applied it to all 52 standard public static pages, and added `npm run check:navigation` so future page edits cannot silently restore the legacy menu.
- All shared links are root-absolute. `/budget`, `/services`, `/government`, `/ideas`, and a nested service-detail route returned HTTP 200 with the same six-section architecture in source and in the minified production output.
- Shared path-based state marks the exact top-level page with `aria-current="page"`, nested sections with `aria-current="location"`, and exact dropdown destinations with `aria-current="page"` where applicable. Existing breadcrumbs retain the exact page marker.
- Revised the affected Projects & Budget, City Information, legislative, ideas, and contact breadcrumbs; reused shared English and Filipino translation keys and corrected old breadcrumb links that pointed to `/` instead of their actual parent.
- Proposed tools still resolve only to homepage roadmap sections or `/ideas` and retain explicit proposed-status wording.

## Phase 6 — Automated tests and accessibility verification

**Goal:** protect the new release behaviour and prevent regressions in the existing header/modal experience.

**Status (2026-08-22):** Site-wide navigation coverage is complete. The original homepage and `/ideas` baseline remains in place, and the new cross-page suite protects the canonical header, root-safe links, active states, translated breadcrumbs, and nested-page mobile behavior. Submission success, receiver failure, and duplicate-submit checks remain correctly deferred until Phase 3 has an approved production receiver; the release cannot send data or claim success in the meantime.

### Add or extend Playwright tests

- [x] Homepage smoke test: hero copy/CTAs, tool-section order, visible status labels, services below community sections, valid links.
- [x] Ideas page test: required fields, anonymous toggle behaviour, native validity, contextual preselection, and the safe paused state. Receiver success, network-error, and duplicate-submit paths are deferred with the Phase 3 receiver decision.
- [x] Navigation test: desktop dropdowns and mobile menu order/focus trapping remain usable.
- [x] Accessibility test: logical heading hierarchy, skip link, landmarks, focus order, labels, paused-status announcement, contrast, and no keyboard trap.
- [x] Responsive test at a narrow mobile viewport, tablet viewport, and desktop viewport; verify no horizontal overflow.
- [x] Test with JavaScript disabled where practical, especially `/ideas` fallback behaviour.
- [x] Extend navigation coverage to representative public routes, including `/budget`, `/services`, `/government`, `/ideas`, and at least one nested service-detail page; assert that the legacy top-level menu never returns.
- [x] Add breadcrumb assertions for each new top-level section and representative nested pages, including link destinations, translated labels, active state, and `aria-current`.

### Manual verification checklist

- [x] Chrome, Firefox, Safari/WebKit, mobile Safari/WebKit, and mobile Chrome/Chromium supported project matrix. Microsoft Edge is not installed on the verification host and is recorded separately below.
- [x] Keyboard interaction check for the header, dropdowns, mobile focus boundary, homepage actions, form controls, and footer links.
- [x] Assistive-technology semantics spot check for page title, landmarks, form legends/labels, required fields, and the paused submission status.
- [x] English and Filipino language switch after every new section/page is present.
- [x] 320px-wide mobile layout and reduced-motion preference.
- [x] No script errors, failed first-party requests, or mixed-content local resources in the focused release paths.
- [x] Repeat desktop, tablet, and mobile keyboard/touch checks on representative non-homepage pages after the shared header and breadcrumb migration.

### Exit criteria

- [x] New site-wide navigation and breadcrumb tests pass locally and existing tests have not regressed.
- [x] Known pre-existing failures and environment limitations are recorded separately rather than attributed to this release.

### Phase 6 verification record (2026-08-22)

- Added 20 focused tests covering the homepage release contract, ideas form and paused channel, navigation, accessibility semantics, responsive layouts, reduced motion, first-party request health, and the JavaScript-disabled fallback.
- The focused matrix completed with **100 passed** across Chrome, Firefox, desktop WebKit (Safari engine), mobile WebKit, and mobile Chromium. The configured Microsoft Edge project could not launch because Microsoft Edge is not installed at `/Applications/Microsoft Edge.app`; this was an environment-only failure before any test ran.
- The broader Chrome suite reached **120 passed, 1 did not run, 0 failed** before the runner was manually interrupted after its previously recorded termination hang. The updated volunteer-modal release-copy assertion passed.
- Verification found and fixed two accessibility regressions: desktop dropdown focus now waits until the menu is visible, and the mobile focus trap now ignores controls inside closed dropdowns. Footer headings were corrected so the homepage and ideas page do not skip heading levels.
- Live success, receiver/network failure, rate-limit, and duplicate-submit cases were not mocked into a false implementation. They remain blocked by the unchecked production receiver decisions and Phase 3 receiver-dependent tasks.

### Phase 6 site-wide verification record (2026-08-22)

- Added eight focused cross-page checks covering the canonical source invariant, `/budget`, `/services`, `/government`, `/ideas`, a nested birth-certificate route, active/`aria-current` state, translated budget breadcrumbs, and nested-page mobile order/dropdown behavior.
- The new suite passed 8/8 in Chrome, Firefox, desktop WebKit, mobile WebKit, and mobile Chromium (40 passing checks across the supported non-Edge matrix). The first combined run exposed only a test-artifact directory race in the source scanner; excluding generated Playwright directories fixed the harness, and the corrected mobile rerun passed 16/16.
- The existing Chrome navigation/accessibility suite passed alongside the new checks. The minified release-candidate output then passed the new Chrome suite 8/8 against the production clean-URL server.

## Phase 7 — Build, review, and release handoff

**Goal:** produce a reviewable, deployable release without accidental version or data changes.

**Status (2026-08-22):** Complete. The v1.0.3 source, release notes, reviewer screenshots, tests, and minified production build have been reviewed. The ideas intake remains intentionally paused, as required by the unresolved receiver and privacy-ownership decisions documented in Phase 3.

### Tasks

- [x] Run `npm run format:check` and address formatting only in files touched by the feature. The feature files pass focused checks; the repository-wide command still reports 16 unrelated/pre-existing files listed in the verification record below.
- [x] Run `npm test` (or document the focused suite if the full suite cannot run) and record results. The focused site-wide suite and the existing navigation/accessibility suite are recorded below; the earlier broader-suite termination behavior remains documented in Phase 6.
- [x] Run `npm run build -- --no-bump` for a release-candidate build; inspect the generated `/ideas` page, homepage, JSON files, sitemap, and service worker in `dist/`.
- [x] Verify clean URLs with the local server and confirm `/ideas` does not need `.html`.
- [x] Inspect representative top-level and nested pages in the release-candidate build to confirm the shared header, route-correct links, active states, and revised breadcrumbs survived the build.
- [x] Review the diff for accidental `dist/`, dependency-lock, version, or unrelated security-document changes.
- [x] Confirm all public statements distinguish BetterMalolos from the LGU and identify sources where factual data is presented.
- [x] Capture before/after desktop and mobile screenshots for reviewers.
- [x] Write release notes describing the community-first homepage, ideas intake, roadmap statuses, and intentionally deferred live civic tools.
- [x] Bump the release version only through the project’s established version/build workflow after approval.

### Final acceptance checklist

- [x] Homepage communicates the six success statements in section 21 of the product document within the first screenful/scroll.
- [x] Every public static page uses the shared resident-focused navigation; no route falls back to the legacy menu.
- [x] Breadcrumbs reflect the new information architecture and remain accurate, translated, keyboard-accessible, and free of dead links.
- [x] Community tool status is accurate everywhere it appears.
- [x] Government services remain functional and visibly available.
- [x] `/ideas` has a real, tested submission route or is deliberately not exposed as a live submission form.
- [x] Privacy, moderation, anti-spam, and emergency disclaimers are present and correct.
- [x] Accessibility, responsive behaviour, tests, build, PWA cache, SEO, and clean URLs have been verified.

### Navigation release-candidate record (2026-08-22)

- `npm run build -- --no-bump --no-react` completed successfully without changing the release version. The minified output passed all eight site-wide navigation checks in Chrome against the production clean-URL server.
- Focused Prettier checks, both JavaScript syntax checks, `npm run check:navigation`, and `git diff --check` passed. Repository-wide `npm run format:check` still reports 16 unrelated/pre-existing files: three legacy data scripts, three rollout/sync documents, seven React files, two popup test scripts, and `SECURITY.md`.
- `dist/`, dependency locks, version files, and generated Playwright artifacts were not added to the feature diff.

### Final Phase 7 release record (2026-08-22)

- The complete production workflow, including the React health route, passed with `npm run build -- --no-bump` at v1.0.3. The generated homepage, `/ideas`, roadmap JSON, sitemap, service worker, manifest, and footer versions were inspected in `dist/`; `dist/` remains ignored and uncommitted.
- The final focused Chrome run passed **47/47** checks across the community release, accessibility/navigation, responsive, site-wide navigation, and volunteer-modal suites. The runner was stopped only after it printed the complete passing result because of the previously documented termination hang.
- `npm run check:navigation`, JavaScript syntax checks, the roadmap schema/order/status check, generated artifact checks, and `git diff --check` passed. The repository-wide Prettier check now reports 16 unrelated pre-existing files; all release files pass focused formatting checks.
- The first viewport was compared at 1440 × 900 and 390 × 844 against the pre-v1.0.3 `main` commit. Four reviewer images are stored in `docs/review/v1.0.3/`.
- The public-statement review confirmed that BetterMalolos is described as independent and community-built. The stale package description was corrected; labels for external official LGU destinations remain explicit, and factual budget/statistics content retains source links.
- Release notes are available at `docs/releases/betterMalolos_v1.0.3_release_notes.md`. The established version workflow was extended to include `/ideas` and normalize stale footer versions, then applied so all 52 standard public pages and both version manifests report v1.0.3.
- No dependency lock, security document, generated test artifact, or unrelated civic-data change was added to the release diff.

## Explicitly deferred after v1.0.3

- Live flood, roadwork, water, transport, and opportunity data integrations.
- Citizen reports, map layers, photos, and location-based verification.
- Individual barangay pages and a complete Barangay Hub.
- Public project-detail records beyond source-verified data already published by the site.
- Public ideas, upvotes, supporters, comments, and volunteer matching.
- File uploads/attachments.
- A universal “Saan Ako Lalapit?” responsibility-routing engine.

Each deferred feature needs its own data-source inventory, owner, update cadence, source attribution, moderation/privacy assessment, and launch acceptance criteria before it can move to `Beta` or `Live`.

## Agent handoff template

Use this at the end of each phase so the next agent can safely continue:

```text
Phase completed:
Scope delivered:
Files changed:
Routes affected:
Data/schema changes:
Submission transport status:
Tests run and results:
Manual checks completed:
Known issues / pre-existing failures:
Decisions needed before next phase:
Suggested next phase:
```

## Recommended commit boundaries

1. `Docs: define v1.0.3 implementation contract`
2. `Add: community tools data and status components`
3. `Update: reorganize homepage around community tools`
4. `Add: community ideas portal`
5. `Update: community roadmap and navigation`
6. `Test: cover v1.0.3 homepage and ideas flow`

Keep each commit independently reviewable and do not mix generated production output, unrelated maintenance, or unverified civic content into feature commits.
