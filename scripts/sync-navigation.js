#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const excludedDirectories = new Set(['.git', 'admin', 'dist', 'node_modules', 'react-app']);
const checkOnly = process.argv.includes('--check');

const header = `    <header class="site-header">
      <div class="container header-inner">
        <div class="logo-container">
          <a href="/">
            <img
              src="/assets/images/logo/better-malolos-main.png"
              alt="Better Malolos Logo"
              class="logo-img"
            />
          </a>
        </div>

        <nav class="main-nav" aria-label="Main Navigation">
          <ul>
            <li class="has-dropdown nav-community-tools" data-nav-section="community-tools">
              <a
                href="/#community-tools"
                data-i18n="nav-community-tools"
                aria-haspopup="true"
                aria-expanded="false"
                >Community Tools</a
              >
              <ul class="dropdown-menu">
                <li><a href="/saan-ako-lalapit/" data-i18n="nav-saan-ako-lalapit">Saan Ako Lalapit?</a></li>
                <li><a href="/ideas/#community-roadmap" data-i18n="nav-bantay-baha-proposed">Bantay Baha — Proposed</a></li>
x                <li><a href="/ideas/#community-roadmap" data-i18n="nav-roadwatch-proposed">RoadWatch — Proposed</a></li>
                <li><a href="/ideas/#community-roadmap" data-i18n="nav-tubig-malolos-proposed">Tubig Malolos — Proposed</a></li>
                <li><a href="/#community-tools" data-i18n="nav-all-community-tools">All Community Tools</a></li>
              </ul>
            </li>
            <li class="has-dropdown nav-barangays" data-nav-section="barangays">
              <a
                href="/#barangay-hub"
                data-i18n="nav-barangays"
                aria-haspopup="true"
                aria-expanded="false"
                >Barangays</a
              >
              <ul class="dropdown-menu">
                <li><a href="/#barangay-hub" data-i18n="nav-barangay-hub-proposed">Barangay Hub — Proposed</a></li>
                <li><a href="/ideas/?submissionType=feature#community-roadmap" data-i18n="nav-help-shape-barangays">Help shape Barangay Hub</a></li>
              </ul>
            </li>
            <li class="has-dropdown nav-projects-budget" data-nav-section="projects-budget">
              <a
                href="/budget/"
                data-i18n="nav-projects-budget"
                aria-haspopup="true"
                aria-expanded="false"
                >Projects &amp; Budget</a
              >
              <ul class="dropdown-menu">
                <li><a href="/#project-tracker" data-i18n="nav-project-tracker-proposed">Project Tracker — Proposed</a></li>
                <li><a href="/budget/" data-i18n="nav-infrastructure-projects">Infrastructure Projects</a></li>
                <li><a href="/budget/" data-i18n="nav-city-budget">City Budget &amp; Transparency</a></li>
              </ul>
            </li>
            <li class="nav-services" data-nav-section="services"><a href="/services/" data-i18n="nav-services">Services</a></li>
            <li class="has-dropdown nav-city-information" data-nav-section="city-information">
              <a
                href="/government/"
                data-i18n="nav-city-information"
                aria-haspopup="true"
                aria-expanded="false"
                >City Information</a
              >
              <ul class="dropdown-menu dropdown-menu--end">
                <li><a href="/government/" data-i18n="nav-government-officials">Government &amp; Officials</a></li>
                <li><a href="/statistics/" data-i18n="nav-malolos-statistics">Malolos Statistics</a></li>
                <li><a href="/news/" data-i18n="nav-news">News</a></li>
                <li><a href="/legislative/" data-i18n="nav-ordinances-resolutions">Ordinances &amp; Resolutions</a></li>
              </ul>
            </li>
            <li class="has-dropdown nav-get-involved" data-nav-section="get-involved">
              <a
                href="/ideas/"
                data-i18n="nav-get-involved"
                aria-haspopup="true"
                aria-expanded="false"
                >Get Involved</a
              >
              <ul class="dropdown-menu dropdown-menu--end">
                <li><a href="/ideas/" data-i18n="nav-suggest-idea">Suggest an Idea</a></li>
                <li><a href="mailto:info@bettermalolos.org" data-i18n="nav-volunteer">Volunteer</a></li>
                <li><a href="/ideas/?submissionType=source#idea-form" data-i18n="nav-share-source">Share Data or a Source</a></li>
                <li><a href="/contact/" data-i18n="nav-contact-us">Contact Us</a></li>
              </ul>
            </li>
          </ul>
        </nav>

        <div class="header-actions">
          <div class="lang-selector">
            <button type="button" class="btn btn-secondary btn-sm lang-btn" data-lang="en" aria-label="Switch to English">EN</button>
            <button type="button" class="btn btn-secondary btn-sm lang-btn" data-lang="fil" aria-label="Switch to Filipino">FIL</button>
          </div>
        </div>
      </div>
    </header>`;

function publicHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) return [];
      return publicHtmlFiles(path.join(directory, entry.name));
    }
    return entry.name.endsWith('.html') ? [path.join(directory, entry.name)] : [];
  });
}

const outOfSync = [];

function normalizeMarkup(markup) {
  return markup
    .replace(/\s+/g, ' ')
    .replace(/\s+>/g, '>')
    .replace(/>\s+/g, '>')
    .replace(/\s+</g, '<')
    .trim();
}

for (const file of publicHtmlFiles(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('<header class="site-header">');
  if (start === -1) continue;

  const end = source.indexOf('</header>', start);
  if (end === -1) throw new Error(`Unclosed site header in ${path.relative(root, file)}`);

  const lineStart = source.lastIndexOf('\n', start) + 1;
  const currentHeader = source.slice(start, end + '</header>'.length);
  if (normalizeMarkup(currentHeader) === normalizeMarkup(header)) continue;

  outOfSync.push(path.relative(root, file));
  if (!checkOnly) {
    const updated = source.slice(0, lineStart) + header + source.slice(end + '</header>'.length);
    fs.writeFileSync(file, updated);
  }
}

if (outOfSync.length) {
  if (checkOnly) {
    console.error(`Shared navigation is out of sync in ${outOfSync.length} file(s):`);
    console.error(outOfSync.join('\n'));
    process.exit(1);
  }
  console.log(`Updated shared navigation in ${outOfSync.length} public page(s).`);
} else {
  console.log('Shared navigation is in sync.');
}
