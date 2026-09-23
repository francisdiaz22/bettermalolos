(() => {
  const module = document.querySelector('[data-malolos-budget]');
  if (!module) return;

  const snapshotPath = module.dataset.snapshot || '../data/bettergov/budget-sample.json';
  const status = module.querySelector('[data-budget-status]');
  const results = module.querySelector('[data-budget-results]');
  const metadata = module.querySelector('[data-budget-metadata]');
  const progress = module.querySelector('[data-budget-progress]');
  const progressLabel = module.querySelector('[data-budget-progress-label]');
  const progressWrap = module.querySelector('[data-budget-progress-wrap]');
  const isLocalPreview =
    module.dataset.localPreview === 'true' &&
    (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) ||
      window.location.protocol === 'file:');

  const showStatus = (title, message, className = 'budget-context-status') => {
    status.className = className;
    status.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    status.appendChild(strong);
    status.appendChild(document.createTextNode(` ${message}`));
  };

  const setProgress = (value, label) => {
    if (!progress) return;
    progress.setAttribute('aria-valuenow', String(value));
    progress.firstElementChild.style.width = `${value}%`;
    if (progressLabel) progressLabel.textContent = label;
  };

  const formatPesos = (amount) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (value) =>
    new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'long',
      timeZone: 'Asia/Manila',
    }).format(new Date(value));

  const addText = (parent, className, value) => {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  };

  const renderCard = (record, snapshot) => {
    const row = document.createElement('tr');
    row.className = 'budget-explorer-row';

    const programCell = document.createElement('th');
    programCell.scope = 'row';
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = record.program;
    details.appendChild(summary);
    const recordId = document.createElement('span');
    recordId.className = 'budget-explorer-record-id';
    recordId.textContent = `Record ID: ${record.source_record_id || record.id}`;
    details.appendChild(recordId);
    programCell.appendChild(details);
    row.appendChild(programCell);

    const departmentCell = document.createElement('td');
    departmentCell.textContent = record.department || 'Not specified';
    row.appendChild(departmentCell);

    const amountCell = document.createElement('td');
    amountCell.className = 'budget-explorer-amount';
    amountCell.textContent = formatPesos(record.amount);
    row.appendChild(amountCell);

    const periodCell = document.createElement('td');
    periodCell.textContent = record.year ? `FY ${record.year}` : 'Not specified';
    row.appendChild(periodCell);

    const stageCell = document.createElement('td');
    const stage = document.createElement('span');
    stage.className = 'budget-stage-badge';
    stage.textContent = record.stage || 'Not specified';
    stageCell.appendChild(stage);
    row.appendChild(stageCell);

    return row;
  };

  const renderExplorer = (snapshot) => {
    const records = snapshot.data;
    const departments = [...new Set(records.map((record) => record.department).filter(Boolean))].sort();
    const totalAmount = records.reduce((total, record) => total + record.amount, 0);

    const explorer = document.createElement('div');
    explorer.className = 'budget-explorer';

    const summary = document.createElement('div');
    summary.className = 'budget-explorer-summary';
    const metrics = [
      ['Records', records.length],
      ['Total amount', formatPesos(totalAmount)],
      ['Agencies', departments.length],
      ['Fiscal year', `FY ${records[0]?.year || '—'}`],
    ];
    metrics.forEach(([label, value]) => {
      const metric = document.createElement('div');
      metric.className = 'budget-explorer-metric';
      addText(metric, 'budget-explorer-metric-label', label);
      addText(metric, 'budget-explorer-metric-value', value);
      summary.appendChild(metric);
    });
    explorer.appendChild(summary);

    const controls = document.createElement('div');
    controls.className = 'budget-explorer-controls';
    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Search records';
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Search by program or agency';
    searchLabel.appendChild(search);
    controls.appendChild(searchLabel);

    const departmentLabel = document.createElement('label');
    departmentLabel.textContent = 'Agency';
    const departmentSelect = document.createElement('select');
    const allDepartments = document.createElement('option');
    allDepartments.value = '';
    allDepartments.textContent = 'All agencies';
    departmentSelect.appendChild(allDepartments);
    departments.forEach((department) => {
      const option = document.createElement('option');
      option.value = department;
      option.textContent = department;
      departmentSelect.appendChild(option);
    });
    departmentLabel.appendChild(departmentSelect);
    controls.appendChild(departmentLabel);
    explorer.appendChild(controls);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'budget-explorer-table-wrap';
    const table = document.createElement('table');
    table.className = 'budget-explorer-table';
    const caption = document.createElement('caption');
    caption.textContent = 'Reviewed BetterGov budget records returned for Malolos';
    table.appendChild(caption);
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Program or project', 'Agency', 'Amount', 'Period', 'Stage'].forEach((heading) => {
      const cell = document.createElement('th');
      cell.scope = 'col';
      cell.textContent = heading;
      headerRow.appendChild(cell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    explorer.appendChild(tableWrap);

    const empty = document.createElement('p');
    empty.className = 'budget-explorer-empty';
    empty.hidden = true;
    empty.textContent = 'No records match the selected filters.';
    explorer.appendChild(empty);

    const provenance = document.createElement('aside');
    provenance.className = 'budget-explorer-provenance';
    provenance.innerHTML = '<strong>About this snapshot</strong>';
    const provenanceText = document.createElement('p');
    provenanceText.textContent = `${snapshot.scope_note} Retrieved ${formatDate(snapshot.retrieved_at)}.`;
    provenance.appendChild(provenanceText);
    const source = document.createElement('a');
    source.href = snapshot.source_url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = `${snapshot.source_name} · ${snapshot.source_release}`;
    provenance.appendChild(source);
    explorer.appendChild(provenance);

    const updateRows = () => {
      const query = search.value.trim().toLowerCase();
      const department = departmentSelect.value;
      const filtered = records.filter((record) => {
        const matchesQuery = !query || `${record.program} ${record.department || ''}`.toLowerCase().includes(query);
        const matchesDepartment = !department || record.department === department;
        return matchesQuery && matchesDepartment;
      });
      tbody.replaceChildren(...filtered.map((record) => renderCard(record, snapshot)));
      empty.hidden = filtered.length > 0;
    };
    search.addEventListener('input', updateRows);
    departmentSelect.addEventListener('change', updateRows);
    updateRows();

    return explorer;
  };

  setProgress(10, 'Connecting to the approved snapshot…');

  const timeout = new Promise((_, reject) =>
    window.setTimeout(() => reject(new Error('Snapshot request timed out')), 10000)
  );

  Promise.race([fetch(snapshotPath, { cache: 'no-cache' }), timeout])
    .then((response) => {
      if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
      setProgress(55, 'Snapshot received. Reading records…');
      return response.json();
    })
    .then((snapshot) => {
      setProgress(80, 'Checking source and geographic scope…');
      if (
        !snapshot ||
        !Array.isArray(snapshot.data) ||
        !snapshot.source_url ||
        !snapshot.retrieved_at ||
        !snapshot.source_release ||
        !snapshot.scope_note ||
        !snapshot.scope_note.toLowerCase().includes('malolos') ||
        snapshot.currency !== 'PHP' ||
        snapshot.unit !== 'pesos'
      ) {
        throw new Error('Invalid budget snapshot');
      }

      if (
        snapshot.review_status !== 'reviewed' &&
        snapshot.review_status !== 'verified' &&
        !isLocalPreview
      ) {
        showStatus(
          'Malolos budget data is awaiting review.',
          'The existing City Government financial information remains available. Collected partner data is not shown until a maintainer confirms its source, geographic scope, fiscal year, and amount.',
          'budget-context-status budget-context-status--pending'
        );
        return;
      }

      const invalidRecord = snapshot.data.some(
        (record) =>
          !record ||
          typeof record.amount !== 'number' ||
          !record.year ||
          !record.program
      );
      if (invalidRecord) throw new Error('Invalid budget record');

      results.appendChild(renderExplorer(snapshot));

      metadata.textContent = `Source: ${snapshot.source_url} · Retrieved ${formatDate(snapshot.retrieved_at)} · Query: ${Object.entries(snapshot.parameters ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`;
      module.classList.add('is-loaded');
      setProgress(100, 'Snapshot loaded.');
      if (progressWrap) progressWrap.hidden = true;
      if (isLocalPreview && snapshot.review_status !== 'reviewed' && snapshot.review_status !== 'verified') {
        showStatus(
          'Local preview only.',
          'These fixture records demonstrate the Malolos budget interface. They are not approved for publication and are hidden on the public site until reviewed.',
          'budget-context-status budget-context-status--preview'
        );
      } else {
        status.hidden = true;
      }
    })
    .catch(() => {
      if (progressWrap) progressWrap.hidden = true;
      showStatus(
        'Malolos budget data unavailable.',
        'The last approved snapshot could not be loaded. City Government financial information and local project records remain available.',
        'budget-context-status budget-context-status--unavailable'
      );
    });
})();
