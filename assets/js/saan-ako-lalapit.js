/**
 * Better Malolos - Saan Ako Lalapit? (Concern-Routing Directory Engine)
 * Pure vanilla JavaScript with safe DOM manipulation, fuzzy matching, category filters, and i18n support.
 */
(function () {
  'use strict';

  const DATA_URL = '/data/saan-ako-lalapit.json';

  let rawData = null;
  let activeCategory = 'all';
  let activeQuery = '';
  let officesMap = new Map();

  // Helper for i18n text resolution
  function getLang() {
    if (window.TranslationEngine && typeof window.TranslationEngine.getLanguage === 'function') {
      return window.TranslationEngine.getLanguage();
    }
    return document.documentElement.lang || 'en';
  }

  function translate(key, fallback) {
    if (window.TranslationEngine && typeof window.TranslationEngine.hasTranslation === 'function') {
      if (window.TranslationEngine.hasTranslation(key)) {
        return window.TranslationEngine.t(key);
      }
    }
    return fallback;
  }

  // Tokenize string into searchable words
  function tokenize(str) {
    if (!str || typeof str !== 'string') return [];
    return str
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u024F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }

  // Levenshtein distance for fuzzy matching
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function isFuzzyMatch(term, target) {
    if (!term || !target) return false;
    const t = target.toLowerCase();
    const q = term.toLowerCase();

    if (t.includes(q) || q.includes(t)) return true;
    if (t.startsWith(q) || q.startsWith(t)) return true;

    const maxLen = Math.max(q.length, t.length);
    if (maxLen <= 3) return false;

    const dist = levenshtein(q, t);
    return dist <= (maxLen > 6 ? 2 : 1);
  }

  // Load and validate data
  async function loadData() {
    if (rawData) return rawData;
    try {
      const response = await fetch(DATA_URL, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Failed to load Saan Ako Lalapit data');
      const data = await response.json();

      if (!data || !Array.isArray(data.categories) || !Array.isArray(data.concerns)) {
        throw new Error('Invalid data schema for Saan Ako Lalapit');
      }

      rawData = data;
      officesMap.clear();
      (data.offices || []).forEach((office) => {
        officesMap.set(office.id, office);
      });

      return data;
    } catch (err) {
      console.error('[SaanAkoLalapit] Error loading data:', err);
      throw err;
    }
  }

  // Match score calculation
  function calculateScore(concern, queryTerms) {
    if (!queryTerms || queryTerms.length === 0) return 1;

    let score = 0;
    const isFil = getLang() === 'fil';
    const title = (isFil && concern.titleFil ? concern.titleFil : concern.title).toLowerCase();
    const keywords = (concern.keywords || []).map((k) => k.toLowerCase());
    const stepSummary = (
      isFil && concern.stepSummaryFil ? concern.stepSummaryFil : concern.stepSummary || ''
    ).toLowerCase();
    const note = (concern.note || '').toLowerCase();

    // Check matching against offices attached to this concern
    const officeNames = (concern.officeIds || [])
      .map((oid) => officesMap.get(oid))
      .filter(Boolean)
      .map((o) => (isFil && o.nameFil ? o.nameFil : o.name).toLowerCase())
      .join(' ');

    queryTerms.forEach((term) => {
      // Direct exact keyword match
      if (keywords.includes(term)) {
        score += 25;
      } else if (keywords.some((k) => isFuzzyMatch(term, k))) {
        score += 15;
      }

      // Title match
      if (title.includes(term)) {
        score += 20;
      } else {
        const titleTokens = tokenize(title);
        if (titleTokens.some((t) => isFuzzyMatch(term, t))) {
          score += 10;
        }
      }

      // Office name match
      if (officeNames.includes(term)) {
        score += 18;
      }

      // Steps/Note text match
      if (stepSummary.includes(term)) {
        score += 8;
      }
      if (note.includes(term)) {
        score += 5;
      }
    });

    return score;
  }

  // Filter and rank concerns
  function getFilteredConcerns() {
    if (!rawData || !rawData.concerns) return [];

    let list = rawData.concerns;

    // Filter by category
    if (activeCategory && activeCategory !== 'all') {
      list = list.filter((c) => c.category === activeCategory);
    }

    // Filter and score by search query
    const query = activeQuery.trim();
    if (query.length > 0) {
      const queryTerms = tokenize(query);
      if (queryTerms.length > 0) {
        list = list
          .map((concern) => ({
            concern: concern,
            score: calculateScore(concern, queryTerms),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.concern);
      }
    }

    return list;
  }

  // Create an Office Card DOM element safely without innerHTML XSS sinks
  function createOfficeCard(office) {
    const isFil = getLang() === 'fil';
    const card = document.createElement('div');
    card.className = 'sal-office-card';

    // Top Bar (Name + Badge)
    const topBar = document.createElement('div');
    topBar.className = 'sal-office-top';

    const name = document.createElement('h4');
    name.className = 'sal-office-name';
    name.textContent = isFil && office.nameFil ? office.nameFil : office.name;

    const badge = document.createElement('span');
    badge.className = 'sal-badge sal-badge--' + (office.type || 'lgu');
    let badgeText = 'LGU Office';
    if (office.type === 'national') badgeText = 'National Agency';
    else if (office.type === 'emergency') badgeText = 'Emergency 24/7';
    else if (office.type === 'utility') badgeText = 'Public Utility';
    badge.textContent = badgeText;

    topBar.append(name, badge);

    // Office Info List (Address, Phone, Hours)
    const infoGrid = document.createElement('div');
    infoGrid.className = 'sal-office-info';

    if (office.address) {
      const addrItem = document.createElement('div');
      addrItem.className = 'sal-info-item';
      const addrIcon = document.createElement('i');
      addrIcon.className = 'bi bi-geo-alt-fill';
      addrIcon.setAttribute('aria-hidden', 'true');
      const addrText = document.createElement('span');
      addrText.textContent = office.address;
      addrItem.append(addrIcon, addrText);
      infoGrid.append(addrItem);
    }

    if (office.phone) {
      const phoneItem = document.createElement('div');
      phoneItem.className = 'sal-info-item';
      const phoneIcon = document.createElement('i');
      phoneIcon.className = 'bi bi-telephone-fill';
      phoneIcon.setAttribute('aria-hidden', 'true');
      const phoneLink = document.createElement('a');
      const cleanPhone = office.phone
        .split('/')[0]
        .trim()
        .replace(/[^\d+]/g, '');
      phoneLink.href = 'tel:' + cleanPhone;
      phoneLink.textContent = office.phone;
      phoneItem.append(phoneIcon, phoneLink);
      infoGrid.append(phoneItem);
    }

    if (office.hours) {
      const hoursItem = document.createElement('div');
      hoursItem.className = 'sal-info-item';
      const hoursIcon = document.createElement('i');
      hoursIcon.className = 'bi bi-clock-fill';
      hoursIcon.setAttribute('aria-hidden', 'true');
      const hoursText = document.createElement('span');
      hoursText.textContent = office.hours;
      hoursItem.append(hoursIcon, hoursText);
      infoGrid.append(hoursItem);
    }

    card.append(topBar, infoGrid);

    // Deep-link Action Button (if serviceDetailUrl exists)
    if (office.serviceDetailUrl) {
      const actions = document.createElement('div');
      actions.className = 'sal-office-actions';

      const guideLink = document.createElement('a');
      guideLink.className = 'sal-guide-btn';
      guideLink.href = office.serviceDetailUrl;

      const guideIcon = document.createElement('i');
      guideIcon.className = 'bi bi-arrow-right-circle-fill';
      guideIcon.setAttribute('aria-hidden', 'true');

      const guideText = document.createElement('span');
      guideText.textContent = isFil ? 'Tingnan ang Kumpletong Gabay' : 'View Full Service Guide';

      guideLink.append(guideText, guideIcon);
      actions.append(guideLink);
      card.append(actions);
    }

    return card;
  }

  // Create Concern Card DOM element
  function createConcernCard(concern) {
    const isFil = getLang() === 'fil';
    const card = document.createElement('article');
    card.className = 'sal-concern-card';
    card.id = 'concern-' + concern.id;

    // Header (Title + Category Badge)
    const header = document.createElement('div');
    header.className = 'sal-concern-header';

    const title = document.createElement('h3');
    title.className = 'sal-concern-title';
    title.textContent = isFil && concern.titleFil ? concern.titleFil : concern.title;

    const catBadge = document.createElement('span');
    catBadge.className = 'sal-concern-category';

    const catObj = (rawData.categories || []).find((c) => c.id === concern.category);
    if (catObj) {
      const catIcon = document.createElement('i');
      catIcon.className = 'bi ' + (catObj.icon || 'bi-folder2');
      catIcon.setAttribute('aria-hidden', 'true');
      catBadge.append(
        catIcon,
        document.createTextNode(' ' + (isFil && catObj.nameFil ? catObj.nameFil : catObj.name))
      );
    } else {
      catBadge.textContent = concern.category;
    }

    header.append(title, catBadge);

    // Summary / Action Steps
    const steps = document.createElement('div');
    steps.className = 'sal-concern-steps';
    const stepLabel = document.createElement('strong');
    stepLabel.textContent = isFil ? 'Gagawin: ' : 'Next Step: ';
    steps.append(
      stepLabel,
      document.createTextNode(
        isFil && concern.stepSummaryFil ? concern.stepSummaryFil : concern.stepSummary
      )
    );

    card.append(header, steps);

    // Contextual Note
    if (concern.note) {
      const note = document.createElement('div');
      note.className = 'sal-concern-note';
      const noteIcon = document.createElement('i');
      noteIcon.className = 'bi bi-info-circle-fill';
      noteIcon.setAttribute('aria-hidden', 'true');
      const noteText = document.createElement('span');
      noteText.textContent = concern.note;
      note.append(noteIcon, noteText);
      card.append(note);
    }

    // Offices Attached
    const officesGroup = document.createElement('div');
    officesGroup.className = 'sal-offices-group';

    const offHeading = document.createElement('div');
    offHeading.className = 'sal-offices-heading';
    offHeading.textContent = isFil ? 'Saan Pupunta / Lalapit:' : 'Where to Go / Contact:';
    officesGroup.append(offHeading);

    (concern.officeIds || []).forEach((officeId) => {
      const officeObj = officesMap.get(officeId);
      if (officeObj) {
        officesGroup.append(createOfficeCard(officeObj));
      }
    });

    card.append(officesGroup);
    return card;
  }

  // Render results list
  function renderResults() {
    const listContainer = document.getElementById('sal-results-list');
    const countContainer = document.getElementById('sal-results-count');
    if (!listContainer) return;

    const filtered = getFilteredConcerns();
    const isFil = getLang() === 'fil';

    // Update count indicator
    if (countContainer) {
      countContainer.textContent =
        filtered.length === 1
          ? isFil
            ? '1 nahanap na paksa'
            : '1 concern found'
          : filtered.length + (isFil ? ' nahanap na paksa' : ' concerns found');
    }

    listContainer.replaceChildren();

    if (filtered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'sal-empty-state';

      const icon = document.createElement('i');
      icon.className = 'bi bi-search sal-empty-icon';
      icon.setAttribute('aria-hidden', 'true');

      const title = document.createElement('h3');
      title.textContent = isFil ? 'Walang Katugmang Opisina o Paksa' : 'No Matching Concerns Found';

      const desc = document.createElement('p');
      desc.textContent = isFil
        ? 'Subukang maghanap gamit ang ibang salita, o pumili ng kategorya sa gilid.'
        : 'Try searching with different keywords, or pick a category from the sidebar.';

      const btn = document.createElement('a');
      btn.className = 'btn btn-primary btn-sm';
      btn.href = '/ideas/?submissionType=feature#submission-type';
      btn.textContent = isFil ? 'Magmungkahi ng Paksa / Opisina' : 'Suggest an Office or Concern';

      emptyState.append(icon, title, desc, btn);
      listContainer.append(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((concern) => {
      fragment.append(createConcernCard(concern));
    });
    listContainer.append(fragment);
  }

  // Render category sidebar buttons
  function renderCategories() {
    const categoryContainer = document.getElementById('sal-category-list');
    if (!categoryContainer || !rawData || !rawData.categories) return;

    const isFil = getLang() === 'fil';
    const query = activeQuery.trim();
    const queryTerms = query.length > 0 ? tokenize(query) : [];

    // Calculate match count per category under current search query
    const categoryCounts = new Map();
    let totalMatchingConcerns = 0;

    (rawData.concerns || []).forEach((c) => {
      let matchesQuery = true;
      if (queryTerms.length > 0) {
        matchesQuery = calculateScore(c, queryTerms) > 0;
      }
      if (matchesQuery) {
        totalMatchingConcerns++;
        categoryCounts.set(c.category, (categoryCounts.get(c.category) || 0) + 1);
      }
    });

    categoryContainer.replaceChildren();

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'sal-cat-btn' + (activeCategory === 'all' ? ' active' : '');
    allBtn.dataset.category = 'all';

    const allIcon = document.createElement('i');
    allIcon.className = 'bi bi-grid-fill';
    allIcon.setAttribute('aria-hidden', 'true');

    const allLabel = document.createElement('span');
    allLabel.textContent = isFil ? 'Lahat ng Kategorya' : 'All Categories';

    const allCount = document.createElement('span');
    allCount.className = 'sal-cat-count';
    allCount.textContent = totalMatchingConcerns;

    allBtn.append(allIcon, allLabel, allCount);
    allBtn.addEventListener('click', () => {
      setCategory('all');
    });
    categoryContainer.append(allBtn);

    // Individual category buttons - show relevant categories (or all if no query)
    rawData.categories.forEach((cat) => {
      const matchCount = categoryCounts.get(cat.id) || 0;

      // If there's an active search query and this category has 0 matches, skip rendering it unless it's currently active
      if (queryTerms.length > 0 && matchCount === 0 && activeCategory !== cat.id) {
        return;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sal-cat-btn' + (activeCategory === cat.id ? ' active' : '');
      btn.dataset.category = cat.id;

      const icon = document.createElement('i');
      icon.className = 'bi ' + (cat.icon || 'bi-folder2');
      icon.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.textContent = isFil && cat.nameFil ? cat.nameFil : cat.name;

      const count = document.createElement('span');
      count.className = 'sal-cat-count';
      count.textContent = matchCount;

      btn.append(icon, label, count);
      btn.addEventListener('click', () => {
        setCategory(cat.id);
      });
      categoryContainer.append(btn);
    });
  }

  function setCategory(catId) {
    activeCategory = catId;
    renderCategories();
    renderResults();
    updateUrlParams();

    // Auto-scroll to results if on mobile/small screen
    if (window.innerWidth <= 1024) {
      const catList = document.getElementById('sal-category-list');
      const toggle = document.getElementById('sal-sidebar-toggle');
      if (catList && catList.classList.contains('sal-expanded')) {
        catList.classList.remove('sal-expanded');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
      const resultsHeader = document.querySelector('.sal-results-header');
      if (resultsHeader) {
        resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function setQuery(query, shouldScroll) {
    activeQuery = query || '';
    const input = document.getElementById('sal-search-input');
    const clearBtn = document.getElementById('sal-clear-btn');
    if (input && input.value !== activeQuery) {
      input.value = activeQuery;
    }
    if (clearBtn) {
      clearBtn.hidden = activeQuery.length === 0;
    }
    renderCategories();
    renderResults();
    updateUrlParams();

    if (shouldScroll) {
      const resultsHeader = document.querySelector('.sal-results-header');
      if (resultsHeader) {
        resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function updateUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (activeQuery) {
      params.set('q', activeQuery);
    } else {
      params.delete('q');
    }

    if (activeCategory && activeCategory !== 'all') {
      params.set('category', activeCategory);
    } else {
      params.delete('category');
    }

    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newUrl);
  }

  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const cat = params.get('category');
    if (q) activeQuery = q;
    if (cat) activeCategory = cat;
  }

  let listenersInitialized = false;

  // Setup DOM Event Listeners
  function setupEventListeners() {
    if (listenersInitialized) return;
    listenersInitialized = true;

    const searchInput = document.getElementById('sal-search-input');
    const clearBtn = document.getElementById('sal-clear-btn');
    const resetFilterBtn = document.getElementById('sal-reset-filter');
    const sidebarToggle = document.getElementById('sal-sidebar-toggle');
    const categoryList = document.getElementById('sal-category-list');
    const backToTopBtn = document.getElementById('sal-back-to-top');

    // Mobile Sidebar Collapsible Toggle
    if (sidebarToggle && categoryList) {
      sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isExpanded = categoryList.classList.toggle('sal-expanded');
        sidebarToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      });
    }

    // Back to Top Button
    if (backToTopBtn) {
      window.addEventListener(
        'scroll',
        () => {
          if (window.scrollY > 320) {
            backToTopBtn.classList.add('visible');
          } else {
            backToTopBtn.classList.remove('visible');
          }
        },
        { passive: true }
      );

      backToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (searchInput) searchInput.focus({ preventScroll: true });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (clearBtn) clearBtn.hidden = val.length === 0;
        activeQuery = val;
        if (rawData) {
          renderCategories();
          renderResults();
          updateUrlParams();
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          setQuery('');
        } else if (e.key === 'Enter') {
          activeQuery = e.target.value;
          if (rawData) {
            renderCategories();
            renderResults();
            updateUrlParams();
            const resultsHeader = document.querySelector('.sal-results-header');
            if (resultsHeader) {
              resultsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        setQuery('');
        if (searchInput) searchInput.focus();
      });
    }

    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        activeQuery = '';
        activeCategory = 'all';
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.hidden = true;
        if (rawData) {
          renderCategories();
          renderResults();
          updateUrlParams();
        }
      });
    }

    // Quick Tag Buttons
    document.querySelectorAll('.sal-tag-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query || btn.textContent.trim();
        setQuery(query, true);
      });
    });

    // Listen for language changes via TranslationEngine if available
    window.addEventListener('languageChanged', () => {
      if (rawData) {
        renderCategories();
        renderResults();
      }
    });
  }

  // Initialization
  async function init() {
    parseUrlParams();
    const searchInput = document.getElementById('sal-search-input');
    const clearBtn = document.getElementById('sal-clear-btn');
    if (searchInput && searchInput.value) {
      activeQuery = searchInput.value;
    }
    if (searchInput && activeQuery) {
      searchInput.value = activeQuery;
    }
    if (clearBtn && activeQuery) {
      clearBtn.hidden = false;
    }
    setupEventListeners();

    try {
      await loadData();
      // Re-read current input value in case the user typed while loading
      if (searchInput && searchInput.value) {
        activeQuery = searchInput.value;
      }
      renderCategories();
      renderResults();
    } catch (err) {
      const listContainer = document.getElementById('sal-results-list');
      if (listContainer) {
        listContainer.replaceChildren();
        const errP = document.createElement('p');
        errP.className = 'sal-error';
        errP.textContent = 'Unable to load office directory. Please refresh or try again later.';
        listContainer.append(errP);
      }
    }
  }

  window.SaanAkoLalapit = {
    init: init,
    setCategory: setCategory,
    setQuery: setQuery,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
