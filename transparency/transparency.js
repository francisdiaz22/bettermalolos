(() => {
  'use strict';
  const SNAPSHOT_URL = '../data/bettergov/hgab-2027.json';
  const scopes = {
    'bulacan-province': { label: 'Bulacan Province', note: 'Includes DPWH project rows assigned to the three published Bulacan district engineering offices. These office records are not municipality-level locations.' },
    'malolos-city': { label: 'Malolos City', note: 'Combines rows assigned to the shared Bulacan 1st District Engineering Office with API title-search matches for “Malolos.” This is not a complete inventory of projects physically located in the city.' },
  };
  const notices = document.getElementById('api-notices');
  const status = document.getElementById('snapshot-status');
  const switchButtons = [...document.querySelectorAll('[data-scope]')];
  let snapshot = null;
  let activeScope = 'bulacan-province';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const number = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const formatPhp = (value) => value === null ? 'Not stated' : new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
  function updateUrl(scope, push = true) {
    const url = new URL(window.location.href);
    url.searchParams.set('scope', scope);
    window.history[push ? 'pushState' : 'replaceState']({ scope }, '', url);
  }
  function selectScope(scope, push = true) {
    if (!scopes[scope]) scope = 'bulacan-province';
    activeScope = scope;
    switchButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.scope === scope)));
    document.getElementById('scope-note').textContent = scopes[scope].note;
    document.querySelector('.transparency-heading h1').textContent = `FY2027 budget projects · ${scopes[scope].label}`;
    updateUrl(scope, push);
    render();
  }
  function projectList() {
    const group = snapshot?.scopes?.[activeScope];
    return Array.isArray(group?.projects) ? group.projects : [];
  }
  function render() {
    if (!snapshot) return;
    const group = snapshot.scopes?.[activeScope];
    if (!group || !Array.isArray(group.projects)) {
      status.hidden = false; status.dataset.state = 'unavailable';
      status.removeAttribute('aria-busy');
      status.textContent = 'Reviewed data for this view is unavailable. No project count or amount is being reported.';
      document.getElementById('project-browser').hidden = true; return;
    }
    const stale = snapshot.retrieved_at && Date.now() - Date.parse(snapshot.retrieved_at) > 180 * 86400000;
    status.hidden = false; status.dataset.state = stale ? 'stale' : 'ready';
    status.removeAttribute('aria-busy');
    const retrieved = snapshot.retrieved_at ? new Date(snapshot.retrieved_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'not stated';
    status.innerHTML = `${stale ? '<strong>Snapshot is stale.</strong> ' : '<strong>Reviewed snapshot.</strong> '}Retrieved ${escape(retrieved)}. Source release: ${escape(snapshot.source_release || 'Not stated by source')}. Currency and scale: ${escape(snapshot.currency || 'PHP')} ${escape(snapshot.unit || 'pesos')}.${stale ? ' Figures are retained for context and should not be treated as current.' : ''}`;
    document.getElementById('project-browser').hidden = false;
    const projects = projectList();
    const sum = (key) => projects.reduce((total, project) => total + (number(project.amounts?.[key]) ?? 0), 0);
    const countKnown = (key) => projects.filter((project) => number(project.amounts?.[key]) !== null).length;
    document.getElementById('summary').innerHTML = [
      ['Project rows', projects.length.toLocaleString('en-PH'), 'In this selected scope'],
      ['2027 NEP · PHP', formatPhp(countKnown('nep_php') ? sum('nep_php') : null), `${countKnown('nep_php')} rows with stated amounts`],
      ['House Bill 10858 · PHP', formatPhp(countKnown('house_php') ? sum('house_php') : null), `${countKnown('house_php')} rows with stated amounts`],
    ].map(([label, value, detail]) => `<div class="summary-card"><span>${escape(label)}</span><strong>${escape(value)}</strong><span>${escape(detail)}</span></div>`).join('');
    const sourceNotices = [...(snapshot.notices || []), ...(snapshot.disclaimers || [])];
    if (sourceNotices.length) notices.innerHTML = [...new Map(sourceNotices.map((item) => {
      const value = typeof item === 'string' ? item : [item.title, item.body].filter(Boolean).join(' ');
      return [value, typeof item === 'string' ? value : { ...item, displayText: value }];
    }))].map(([key, item]) => {
      const value = typeof item === 'string' ? item : item.displayText;
      const link = typeof item === 'object' && /^https:\/\//.test(item.url || '') ? ` <a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer">Source notice</a>` : '';
      return `<p>${escape(value)}${link}</p>`;
    }).join('');
    renderProjects();
  }
  function renderProjects() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    const filter = document.getElementById('version-filter').value;
    const sort = document.getElementById('sort').value;
    let projects = projectList().filter((project) => {
      const hasNep = number(project.amounts?.nep_php) !== null;
      const hasHouse = number(project.amounts?.house_php) !== null;
      const matchesVersion = filter === 'all' || (filter === 'both' ? hasNep && hasHouse : filter === 'nep' ? hasNep : hasHouse);
      return matchesVersion && `${project.title || ''} ${project.source_project_id || ''}`.toLowerCase().includes(query);
    });
    projects.sort((a, b) => sort === 'title' ? String(a.title).localeCompare(String(b.title)) : sort === 'amount-desc' ? (number(b.amounts?.nep_php) ?? -Infinity) - (number(a.amounts?.nep_php) ?? -Infinity) : (number(a.amounts?.nep_php) ?? Infinity) - (number(b.amounts?.nep_php) ?? Infinity));
    document.getElementById('result-count').textContent = `${projects.length.toLocaleString('en-PH')} project rows shown`;
    document.getElementById('project-list').innerHTML = projects.length ? projects.map((project) => {
      const amounts = project.amounts || {};
      const reasons = (project.inclusion_reasons || []).map((reason) => `<li>${escape(reason.label || reason.reason || 'Scope inclusion')}</li>`).join('');
      const sourceLabels = { nep: '2027 NEP', hgab2: 'House Bill 10858 · second reading', hgab3: 'House Bill 10858 · third reading' };
      const links = Object.entries(project.pdf_url || {}).map(([version, href]) => typeof href === 'string' && /^https:\/\//.test(href) ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(sourceLabels[version] || version)} source PDF/page</a>` : '').filter(Boolean).join(' · ');
      const projectLink = typeof project.source_project_url === 'string' && /^https:\/\//.test(project.source_project_url) ? `<a href="${escape(project.source_project_url)}" target="_blank" rel="noopener noreferrer">BetterGov project record</a>` : '';
      const onlyOne = (number(amounts.nep_php) === null) !== (number(amounts.house_php) === null);
      return `<article class="project-card"><h3>${escape(project.title || 'Untitled project')}</h3><div class="project-meta"><span>${escape(project.dataset || 'Dataset not stated')} · ${escape(project.source_project_id || project.id || 'ID not stated')}</span><span>${escape(project.match_status || 'Match status not stated')}</span></div><div class="project-amounts"><span>2027 NEP: <strong>${escape(formatPhp(number(amounts.nep_php)))}</strong></span><span>House Bill 10858: <strong>${escape(formatPhp(number(amounts.house_php)))}</strong></span></div>${onlyOne ? '<p><strong>Candidate for further review:</strong> a published amount is present in only one version. This is not a conclusive finding.</p>' : ''}<details><summary>Inclusion and source details</summary><p>Included in ${escape(scopes[activeScope].label)} because:</p><ul class="inclusion-reasons">${reasons || '<li>Inclusion reason not supplied in snapshot.</li>'}</ul><p>${escape(project.source_row?.notes || project.source_row?.note || 'No additional source note supplied.')}</p><p>${[projectLink, links].filter(Boolean).join(' · ') || 'Source links are not available in this snapshot.'}</p></details></article>`;
    }).join('') : '<p>No project rows match these filters in the reviewed snapshot.</p>';
  }
  switchButtons.forEach((button) => button.addEventListener('click', () => selectScope(button.dataset.scope)));
  ['search', 'version-filter', 'sort'].forEach((id) => document.getElementById(id).addEventListener(id === 'search' ? 'input' : 'change', renderProjects));
  window.addEventListener('popstate', () => selectScope(new URLSearchParams(location.search).get('scope') || 'bulacan-province', false));
  const initialScope = new URLSearchParams(window.location.search).get('scope') || 'bulacan-province';
  selectScope(initialScope, false);
  fetch(SNAPSHOT_URL, { cache: 'no-store' }).then((response) => { if (!response.ok) throw new Error('snapshot unavailable'); return response.json(); }).then((data) => {
    if (!data || data.fiscal_year !== 2027 || data.review_status !== 'reviewed' || !data.scopes) throw new Error('No reviewed FY2027 snapshot');
    snapshot = data; render();
  }).catch(() => {
    status.hidden = false; status.dataset.state = 'unavailable';
    status.removeAttribute('aria-busy');
    status.innerHTML = '<strong>Reviewed FY2027 project data is not available yet.</strong> This page will show figures only after a complete snapshot has passed source validation and review. No data is presented as a successful empty result.';
    document.getElementById('project-browser').hidden = true;
  });
})();
