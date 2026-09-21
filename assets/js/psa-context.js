(() => {
  const module = document.querySelector('[data-psa-context]');
  if (!module) return;

  const snapshotPath = module.dataset.snapshot || '../data/psa-malolos-context.json';
  const unavailable = () => {
    module.innerHTML = '<p class="psa-context-unavailable"><strong>Data context unavailable.</strong> The last approved context could not be loaded. Existing statistics remain available.</p>';
  };

  const text = (value) => document.createTextNode(String(value));
  const addText = (parent, className, value) => {
    const node = document.createElement('span');
    node.className = className;
    node.appendChild(text(value));
    parent.appendChild(node);
    return node;
  };

  fetch(snapshotPath, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
      return response.json();
    })
    .then((snapshot) => {
      if (snapshot.review_status !== 'reviewed' || !Array.isArray(snapshot.indicators)) throw new Error('Unreviewed or invalid context snapshot');

      const grid = module.querySelector('[data-psa-indicators]');
      const meta = module.querySelector('[data-psa-meta]');
      snapshot.indicators.forEach((indicator) => {
        const card = document.createElement('article');
        card.className = 'psa-context-card';
        const heading = document.createElement('h3');
        heading.appendChild(text(indicator.topic));
        card.appendChild(heading);
        addText(card, 'psa-context-value', indicator.value.toLocaleString?.() ?? indicator.value);
        addText(card, 'psa-context-detail', `${indicator.period} · ${indicator.unit}`);
        addText(card, 'psa-context-scope', indicator.scope);
        const explanation = document.createElement('p');
        explanation.appendChild(text(indicator.explanation));
        card.appendChild(explanation);
        const source = document.createElement('a');
        source.href = indicator.source_url;
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.appendChild(text(`${indicator.dataset_id} · ${indicator.source_release}`));
        card.appendChild(source);
        grid.appendChild(card);
      });

      const psgc = snapshot.psgc;
      meta.innerHTML = '';
      meta.appendChild(text(`PSGC: ${psgc.region.name} (${psgc.region.code}) → ${psgc.province.name} (${psgc.province.code}) → ${psgc.city.name} (${psgc.city.code})`));
      meta.appendChild(document.createElement('br'));
      meta.appendChild(text(`Reviewed ${snapshot.reviewed_at}; retrieved ${new Date(snapshot.retrieved_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}.`));
      module.classList.add('is-loaded');
    })
    .catch(unavailable);
})();
