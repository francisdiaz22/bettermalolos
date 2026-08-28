/**
 * BetterMalolos - Reusable Service Cards Renderer Component
 * Dynamically renders service cards from data/services.json with accessibility and i18n support.
 * 
 * @module ServicesRenderer
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['../utils/dom-builder'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../utils/dom-builder'));
  } else {
    root.ServicesRenderer = factory(root.DOMBuilder);
  }
})(typeof self !== 'undefined' ? self : this, function (DOMBuilder) {
  'use strict';

  var dom = DOMBuilder || (typeof window !== 'undefined' && window.DOMBuilder);
  var cachedServices = null;
  var servicesPromise = null;

  // Icon mapping for known services / categories
  var SERVICE_ICONS = {
    'birth-certificate': 'bi bi-file-earmark-text',
    'marriage-certificate': 'bi bi-heart',
    'death-certificate': 'bi bi-file-earmark-x',
    'barangay-clearance': 'bi bi-house-check',
    'barangay-id': 'bi bi-person-badge',
    'police-clearance': 'bi bi-shield-check',
    'business-permit-new': 'bi bi-briefcase',
    'business-permit-renew': 'bi bi-arrow-repeat',
    'sanitary-permit': 'bi bi-clipboard2-pulse',
    'fire-safety-inspection': 'bi bi-fire',
    'zoning-clearance': 'bi bi-map',
    'real-property-tax': 'bi bi-building',
    'business-tax': 'bi bi-cash-coin',
    'community-tax-certificate': 'bi bi-card-heading',
    'transfer-tax': 'bi bi-arrow-left-right',
    'seedling-distribution': 'bi bi-flower1',
    'farm-equipment': 'bi bi-tools',
    'livelihood-programs': 'bi bi-graph-up',
    'health-certificate': 'bi bi-heart-pulse',
    'medical-consultation': 'bi bi-hospital',
    'vaccination': 'bi bi-shield-plus',
    'pwd-id': 'bi bi-person-wheelchair',
    'senior-citizen-id': 'bi bi-person-heart',
    'burial-assistance': 'bi bi-heartbreak',
    'educational-assistance': 'bi bi-mortarboard',
  };

  var CATEGORY_FALLBACK_ICONS = {
    'certificates': 'bi bi-file-earmark-text',
    'business': 'bi bi-briefcase',
    'tax-payments': 'bi bi-cash-stack',
    'social-services': 'bi bi-people',
    'health': 'bi bi-heart-pulse',
    'education': 'bi bi-mortarboard',
    'agriculture': 'bi bi-tree',
    'environment': 'bi bi-droplet',
    'public-safety': 'bi bi-shield-lock',
    'infrastructure': 'bi bi-cone-striped',
  };

  /**
   * Resolves the correct relative/absolute URL to services.json.
   */
  function getDataUrl() {
    return '/data/services.json';
  }

  /**
   * Fetches and caches services from data/services.json
   * @returns {Promise<Array>}
   */
  function loadServices() {
    if (cachedServices) {
      return Promise.resolve(cachedServices);
    }
    if (servicesPromise) {
      return servicesPromise;
    }

    servicesPromise = fetch(getDataUrl())
      .then(function (res) {
        if (!res.ok) {
          // Fallback to relative path if absolute failed
          return fetch('../data/services.json');
        }
        return res;
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load services data');
        return res.json();
      })
      .then(function (data) {
        cachedServices = data.services || [];
        return cachedServices;
      })
      .catch(function (err) {
        console.error('[ServicesRenderer] Error loading services:', err);
        servicesPromise = null;
        throw err;
      });

    return servicesPromise;
  }

  /**
   * Creates a single Service Item Card DOM element safely.
   * 
   * @param {Object} service - Service data object
   * @returns {HTMLElement}
   */
  function createServiceCard(service) {
    var iconClass = SERVICE_ICONS[service.id] ||
                    CATEGORY_FALLBACK_ICONS[service.categoryId] ||
                    'bi bi-file-earmark-text';

    var cardTag = service.url ? 'a' : 'div';
    var cardAttrs = {
      class: 'service-item-card' + (service.url ? ' service-item-link' : ''),
    };

    if (service.url) {
      cardAttrs.href = service.url;
    }

    // Title element
    var iconEl = dom.createEl('i', { class: iconClass, 'aria-hidden': 'true' });
    var titleSpan = dom.createEl('span', {
      text: service.title,
      'data-i18n': service.i18nKey || ('svc-' + service.id),
    });
    var titleEl = dom.createEl('h3', { class: 'service-item-title' }, [iconEl, titleSpan]);

    // Description element
    var descEl = dom.createEl('p', {
      class: 'service-item-desc',
      text: service.description,
      'data-i18n': service.i18nDescKey || ('svc-' + service.id + '-desc'),
    });

    // Metadata footer (Fee & Time)
    var feeLabel = dom.createEl('strong', { text: 'Fee: ', 'data-i18n': 'label-fee' });
    var feeVal = dom.createEl('span', { text: ' ' + (service.fee || 'Free') });
    var feeSpan = dom.createEl('span', {}, [feeLabel, feeVal]);

    var timeLabel = dom.createEl('strong', { text: 'Time: ', 'data-i18n': 'label-time' });
    var timeVal = dom.createEl('span', { text: ' ' + (service.processingTime || 'Varies') });
    var timeSpan = dom.createEl('span', {}, [timeLabel, timeVal]);

    var metaEl = dom.createEl('div', { class: 'service-item-meta' }, [feeSpan, timeSpan]);

    return dom.createEl(cardTag, cardAttrs, [titleEl, descEl, metaEl]);
  }

  /**
   * Renders service cards into a target container.
   * 
   * @param {HTMLElement|string} containerOrSelector 
   * @param {Object} [options]
   * @param {string} [options.category] - Category ID filter (e.g., 'certificates')
   * @param {string} [options.query] - Search query filter
   * @param {number} [options.limit] - Max number of cards
   */
  function renderServices(containerOrSelector, options) {
    var container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;

    if (!container) return Promise.resolve();

    options = options || {};
    var category = options.category || container.dataset.category || container.dataset.serviceCategory;
    var query = (options.query || '').trim().toLowerCase();
    var limit = options.limit || Infinity;

    return loadServices().then(function (services) {
      var filtered = services;

      if (category && category !== 'all') {
        filtered = filtered.filter(function (s) {
          return s.categoryId === category || s.category === category;
        });
      }

      if (query) {
        filtered = filtered.filter(function (s) {
          var titleMatch = s.title && s.title.toLowerCase().includes(query);
          var descMatch = s.description && s.description.toLowerCase().includes(query);
          var kwMatch = Array.isArray(s.keywords) && s.keywords.some(function (k) {
            return k.toLowerCase().includes(query);
          });
          return titleMatch || descMatch || kwMatch;
        });
      }

      if (limit < filtered.length) {
        filtered = filtered.slice(0, limit);
      }

      dom.empty(container);

      if (filtered.length === 0) {
        var emptyEl = dom.createEl('div', { class: 'empty-state text-center text-muted p-4' }, [
          dom.createEl('p', { text: 'No services found matching your criteria.', 'data-i18n': 'services-no-results' })
        ]);
        container.appendChild(emptyEl);
        return;
      }

      var fragment = document.createDocumentFragment();
      filtered.forEach(function (service) {
        fragment.appendChild(createServiceCard(service));
      });

      container.appendChild(fragment);
    });
  }

  /**
   * Auto-discovers and hydrates all service card containers in the document.
   */
  function autoHydrate() {
    var targets = document.querySelectorAll(
      '[data-service-grid], .service-grid[data-category], [data-service-category], #service-grid[data-category]'
    );

    targets.forEach(function (container) {
      renderServices(container);
    });
  }

  // Initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoHydrate);
    } else {
      autoHydrate();
    }
  }

  return {
    createServiceCard: createServiceCard,
    renderServices: renderServices,
    loadServices: loadServices,
    autoHydrate: autoHydrate,
  };
});
