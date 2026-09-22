(() => {
  const module = document.querySelector('[data-malolos-budget]');
  if (!module) return;

  const snapshotPath = module.dataset.snapshot || '../data/bettergov/budget-sample.json';
  const status = module.querySelector('[data-budget-status]');
  const results = module.querySelector('[data-budget-results]');
  const metadata = module.querySelector('[data-budget-metadata]');
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
    const card = document.createElement('article');
    card.className = 'budget-context-card';
    card.setAttribute('aria-labelledby', `budget-record-${record.id}`);

    const header = document.createElement('div');
    header.className = 'budget-context-card-header';
    const title = document.createElement('h3');
    title.id = `budget-record-${record.id}`;
    title.textContent = record.program;
    header.appendChild(title);
    if (record.stage) addText(header, 'budget-stage-badge', `${record.stage} · FY ${record.year}`);
    card.appendChild(header);

    addText(card, 'budget-context-amount', formatPesos(record.amount));
    if (record.department) addText(card, 'budget-context-department', record.department);

    const scope = document.createElement('p');
    scope.className = 'budget-context-scope';
    scope.textContent = snapshot.scope_note;
    card.appendChild(scope);

    const source = document.createElement('a');
    source.href = snapshot.source_url;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = `${snapshot.source_name} · ${snapshot.source_release}`;
    card.appendChild(source);
    return card;
  };

  fetch(snapshotPath, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
      return response.json();
    })
    .then((snapshot) => {
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

      const resultGrid = document.createElement('div');
      resultGrid.className = 'budget-context-grid';
      snapshot.data.forEach((record) => resultGrid.appendChild(renderCard(record, snapshot)));
      results.appendChild(resultGrid);

      metadata.textContent = `Source: ${snapshot.source_url} · Retrieved ${formatDate(snapshot.retrieved_at)} · Query: ${Object.entries(snapshot.parameters ?? {})
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}`;
      module.classList.add('is-loaded');
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
      showStatus(
        'Malolos budget data unavailable.',
        'The last approved snapshot could not be loaded. City Government financial information and local project records remain available.',
        'budget-context-status budget-context-status--unavailable'
      );
    });
})();
