// FY 2026 DPWH GAA Program - Malolos line items and citizen verification links
(function () {
  'use strict';

  const CONFIG = { initialRows: 8, loadMoreRows: 8, truncateLength: 88 };
  const container = document.getElementById('dpwh-projects-2026-container');
  if (!container) return;

  let allProjects = [];
  let filteredProjects = [];
  let displayedCount = 0;
  let currentFilter = 'all';

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function truncateText(text, maxLength) {
    return text.length <= maxLength ? text : text.substring(0, maxLength).trim() + '…';
  }

  function categoryKey(category) {
    if (category.includes('Bridge')) return 'bridges';
    if (category.includes('Water')) return 'water';
    if (category.includes('Building')) return 'buildings';
    return 'roads';
  }

  function categoryLabel(category) {
    return category.replace(' and Drainage', '');
  }

  function reportHref(project) {
    const subject = `FY 2026 project status report: ${project.id}`;
    const body = [
      'I am reporting a field observation for this BetterMalolos project listing:',
      '',
      `Reference: ${project.id}`,
      `Project: ${project.name}`,
      `Location: ${project.location}`,
      '',
      'Observed status (keep one):',
      '[ ] Completed',
      '[ ] Ongoing',
      '[ ] Not started / no visible work',
      '[ ] Possible ghost project - needs further verification',
      '',
      'Date observed:',
      'What I saw:',
      'Evidence link (photos/video/public documents):',
      '',
      'Please do not include private personal data. Reports are community observations and will be reviewed before publication.',
    ].join('\n');
    return `mailto:info@bettermalolos.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function countsByCategory(projects) {
    const counts = { all: projects.length, roads: 0, bridges: 0, buildings: 0, water: 0 };
    projects.forEach((project) => counts[categoryKey(project.category)]++);
    return counts;
  }

  function renderSection(data) {
    const counts = countsByCategory(allProjects);
    container.innerHTML = `
      <div class="dpwh-summary-bar">
        <div class="dpwh-summary-item">
          <span class="dpwh-summary-value">${data.summary.totalProjects}</span>
          <span class="dpwh-summary-label">Malolos-linked line items</span>
        </div>
        <div class="dpwh-summary-item">
          <span class="dpwh-summary-value">₱${(data.summary.totalCost / 1000000).toFixed(3)}M</span>
          <span class="dpwh-summary-label">Programmed amount</span>
        </div>
        <div class="dpwh-summary-item">
          <span class="dpwh-summary-value">GAA 2026</span>
          <span class="dpwh-summary-label">Budget basis</span>
        </div>
        <div class="dpwh-summary-item">
          <span class="dpwh-summary-value">Citizen check</span>
          <span class="dpwh-summary-label">Status not yet verified</span>
        </div>
      </div>

      <div class="dpwh-citizen-note" role="note">
        <i class="bi bi-binoculars" aria-hidden="true"></i>
        <div>
          <strong>Help verify projects near you.</strong>
          Use “Report status” to send an observation as completed, ongoing, not started, or a possible ghost project. Reports should include a date and evidence and are reviewed before publication.
        </div>
      </div>

      <div class="dpwh-controls">
        <div class="dpwh-filter-group" role="tablist" aria-label="Filter FY 2026 projects by category">
          <button class="dpwh-tab active" type="button" data-filter="all" role="tab" aria-selected="true">All <span class="dpwh-tab-count">${counts.all}</span></button>
          <button class="dpwh-tab" type="button" data-filter="roads" role="tab" aria-selected="false">Roads <span class="dpwh-tab-count">${counts.roads}</span></button>
          <button class="dpwh-tab" type="button" data-filter="bridges" role="tab" aria-selected="false">Bridges <span class="dpwh-tab-count">${counts.bridges}</span></button>
          <button class="dpwh-tab" type="button" data-filter="buildings" role="tab" aria-selected="false">Buildings <span class="dpwh-tab-count">${counts.buildings}</span></button>
          <button class="dpwh-tab" type="button" data-filter="water" role="tab" aria-selected="false">Water <span class="dpwh-tab-count">${counts.water}</span></button>
        </div>
      </div>

      <div class="dpwh-table-wrap">
        <table class="dpwh-table dpwh-table-2026">
          <caption class="visually-hidden">FY 2026 DPWH infrastructure program line items in Malolos</caption>
          <thead>
            <tr>
              <th scope="col" class="col-desc">Project</th>
              <th scope="col" class="col-contractor">Program / Office</th>
              <th scope="col" class="col-cost">Programmed amount</th>
              <th scope="col" class="col-status">Community status</th>
              <th scope="col" class="col-report">Citizen report</th>
            </tr>
          </thead>
          <tbody class="dpwh-table-body"></tbody>
        </table>
        <div class="dpwh-load-more"></div>
      </div>`;

    container.querySelectorAll('.dpwh-tab').forEach((tab) => {
      tab.addEventListener('click', () => changeFilter(tab.dataset.filter));
    });
    renderMore();
  }

  function rowMarkup(project) {
    const key = categoryKey(project.category);
    const safeName = escapeHtml(project.name);
    return `
      <tr class="dpwh-row">
        <td class="col-desc">
          <div class="dpwh-desc-wrap">
            <span class="dpwh-proj-id">${escapeHtml(project.id)}</span>
            <span class="dpwh-cat-badge ${key === 'bridges' ? 'roads' : key}">${escapeHtml(categoryLabel(project.category))}</span>
          </div>
          <span class="dpwh-proj-title" title="${safeName}">${escapeHtml(truncateText(project.name, CONFIG.truncateLength))}</span>
          <span class="dpwh-proj-location"><i class="bi bi-geo-alt" aria-hidden="true"></i>${escapeHtml(project.location)}</span>
        </td>
        <td class="col-contractor">
          <span class="dpwh-contractor">${escapeHtml(project.program)}</span>
          <span class="dpwh-contractor-id">${escapeHtml(project.implementingOffice)} · Source p. ${project.sourcePage}</span>
        </td>
        <td class="col-cost">${formatCurrency(project.cost)}</td>
        <td class="col-status"><span class="dpwh-badge unverified">Awaiting verification</span></td>
        <td class="col-report">
          <a class="dpwh-report-btn" href="${escapeHtml(reportHref(project))}" aria-label="Report citizen-observed status for ${safeName}">
            <i class="bi bi-flag" aria-hidden="true"></i> Report status
          </a>
        </td>
      </tr>`;
  }

  function renderMore() {
    const body = container.querySelector('.dpwh-table-body');
    const start = displayedCount;
    const size = displayedCount === 0 ? CONFIG.initialRows : CONFIG.loadMoreRows;
    const end = Math.min(start + size, filteredProjects.length);
    body.insertAdjacentHTML(
      'beforeend',
      filteredProjects.slice(start, end).map(rowMarkup).join('')
    );
    displayedCount = end;
    updateLoadMore();
  }

  function updateLoadMore() {
    const area = container.querySelector('.dpwh-load-more');
    const remaining = filteredProjects.length - displayedCount;
    if (!remaining) {
      area.innerHTML = `<span class="dpwh-end-msg">Showing all ${filteredProjects.length} projects</span>`;
      return;
    }
    area.innerHTML = `<button class="dpwh-load-btn" type="button">Load More <span class="dpwh-remaining">(${remaining} remaining)</span></button>`;
    area.querySelector('button').addEventListener('click', renderMore);
  }

  function changeFilter(filter) {
    currentFilter = filter;
    filteredProjects =
      currentFilter === 'all'
        ? [...allProjects]
        : allProjects.filter((project) => categoryKey(project.category) === currentFilter);
    displayedCount = 0;
    container.querySelector('.dpwh-table-body').innerHTML = '';
    container.querySelectorAll('.dpwh-tab').forEach((tab) => {
      const active = tab.dataset.filter === currentFilter;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    renderMore();
  }

  async function loadProjects() {
    try {
      const response = await fetch('../data/dpwh-projects-2026.json?v=2026-gaa-20260826');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      allProjects = data.projects;
      filteredProjects = [...allProjects];
      renderSection(data);
    } catch (error) {
      console.error('Failed to load FY 2026 DPWH projects:', error);
      container.innerHTML =
        '<p class="dpwh-load-error" role="alert">The FY 2026 project table could not be loaded. Please try again later.</p>';
    }
  }

  loadProjects();
})();
