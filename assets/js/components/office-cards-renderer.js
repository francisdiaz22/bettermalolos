/**
 * BetterMalolos - Reusable Office Cards Renderer Component
 * Dynamically renders "Responsible Office" cards with accessible links and icons.
 * 
 * @module OfficeCardsRenderer
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['../utils/dom-builder'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../utils/dom-builder'));
  } else {
    root.OfficeCardsRenderer = factory(root.DOMBuilder);
  }
})(typeof self !== 'undefined' ? self : this, function (DOMBuilder) {
  'use strict';

  var dom = DOMBuilder || (typeof window !== 'undefined' && window.DOMBuilder);

  var OFFICE_CATALOG = {
    'municipal-civil-registrar': {
      id: 'municipal-civil-registrar',
      title: 'Municipal Civil Registrar',
      desc: 'Birth, death, marriage registration, corrections, and certified copies',
      icon: 'bi bi-building',
      url: '../service-details/civil-registrar',
      i18nTitle: 'cert-office-mcr',
      i18nDesc: 'cert-office-mcr-desc',
    },
    'human-resource-management': {
      id: 'human-resource-management',
      title: 'Human Resource Management',
      desc: 'Service records, employment certificates, leave credits for LGU employees',
      icon: 'bi bi-people',
      url: '../service-details/human-resource-management',
      i18nTitle: 'cert-office-hrm',
      i18nDesc: 'cert-office-hrm-desc',
    },
    'municipal-agriculture': {
      id: 'municipal-agriculture',
      title: 'City Agriculture Office',
      desc: 'Seedlings, farm equipment rental, and agricultural livelihood programs',
      icon: 'bi bi-tree',
      url: '../service-details/municipal-agriculture',
      i18nTitle: 'office-agriculture-title',
      i18nDesc: 'office-agriculture-desc',
    },
    'mswdo': {
      id: 'mswdo',
      title: 'City Social Welfare & Development (CSWDO)',
      desc: 'Assistance for individuals in crisis, PWD affairs, senior citizen benefits',
      icon: 'bi bi-heart',
      url: '../service-details/mswdo',
      i18nTitle: 'office-mswdo-title',
      i18nDesc: 'office-mswdo-desc',
    },
    'mswdo-services': {
      id: 'mswdo-services',
      title: 'MSWDO Services',
      desc: 'Social case studies, indigency certificates, AICS, PWD & senior citizen assistance',
      icon: 'bi bi-heart-fill',
      url: '../service-details/mswdo-services',
      i18nTitle: 'social-mswdo-services',
      i18nDesc: 'social-social-case-studies-indigency-certificates-aics',
    },
    'business-permits-licensing': {
      id: 'business-permits-licensing',
      title: 'Business Permits and Licensing Office (BPLO)',
      desc: 'New business applications, Mayor’s permit renewals, and commercial clearances',
      icon: 'bi bi-briefcase',
      url: '../service-details/business-permits-licensing',
      i18nTitle: 'office-bplo-title',
      i18nDesc: 'office-bplo-desc',
    },
    'municipal-treasurer': {
      id: 'municipal-treasurer',
      title: 'City Treasurer’s Office',
      desc: 'Real property tax (amilyar), business tax collection, and community tax certificates',
      icon: 'bi bi-cash-coin',
      url: '../service-details/municipal-treasurer',
      i18nTitle: 'office-treasurer-title',
      i18nDesc: 'office-treasurer-desc',
    },
    'municipal-assessor': {
      id: 'municipal-assessor',
      title: 'City Assessor’s Office',
      desc: 'Property declarations, tax assessments, and appraisal records',
      icon: 'bi bi-file-earmark-spreadsheet',
      url: '../service-details/municipal-assessor',
      i18nTitle: 'office-assessor-title',
      i18nDesc: 'office-assessor-desc',
    },
    'municipal-engineering': {
      id: 'municipal-engineering',
      title: 'City Engineering Office',
      desc: 'Building permits, electrical & plumbing permits, and infrastructure oversight',
      icon: 'bi bi-tools',
      url: '../service-details/municipal-engineering',
      i18nTitle: 'office-engineering-title',
      i18nDesc: 'office-engineering-desc',
    },
    'municipal-planning': {
      id: 'municipal-planning',
      title: 'Municipal Planning & Development',
      desc: 'Zoning clearance, locational clearance, and land use services',
      icon: 'bi bi-building-gear',
      url: '../service-details/municipal-planning',
      i18nTitle: 'infra-municipal-planning-development',
      i18nDesc: 'infra-zoning-clearance-locational-clearance-and-land',
    },
    'municipal-general-services': {
      id: 'municipal-general-services',
      title: 'Municipal General Services Office',
      desc: 'Property custodianship, supplies management, vehicle services, and utilities',
      icon: 'bi bi-gear-wide-connected',
      url: '../service-details/municipal-general-services',
      i18nTitle: 'infra-municipal-general-services-office',
      i18nDesc: 'infra-property-custodianship-supplies-management',
    },
    'general-services': {
      id: 'general-services',
      title: 'General Services Office',
      desc: 'City asset management, procurement, and administrative property support',
      icon: 'bi bi-box-seam',
      url: '../service-details/general-services',
      i18nTitle: 'office-gso-title',
      i18nDesc: 'office-gso-desc',
    },
    'seedo-public-market': {
      id: 'seedo-public-market',
      title: 'SEEDO - Public Market Administration',
      desc: 'Market stall rentals, vendor permits, and public market operations',
      icon: 'bi bi-shop',
      url: '../service-details/seedo-public-market',
      i18nTitle: 'office-market-title',
      i18nDesc: 'office-market-desc',
    },
    'seedo-slaughterhouse': {
      id: 'seedo-slaughterhouse',
      title: 'SEEDO - City Slaughterhouse',
      desc: 'Meat inspection services, abattoir operations, and sanitary food clearance',
      icon: 'bi bi-clipboard-check',
      url: '../service-details/seedo-slaughterhouse',
      i18nTitle: 'office-slaughterhouse-title',
      i18nDesc: 'office-slaughterhouse-desc',
    },
    'municipal-budget': {
      id: 'municipal-budget',
      title: 'Municipal Budget Office',
      desc: 'Obligation requests, barangay budget review, and SEF budget preparation',
      icon: 'bi bi-wallet2',
      url: '../service-details/municipal-budget',
      i18nTitle: 'tax-municipal-budget-office',
      i18nDesc: 'tax-obligation-requests-barangay-budget-review-and',
    },
    'municipal-accounting': {
      id: 'municipal-accounting',
      title: 'Municipal Accounting Office',
      desc: 'Pre-audit of disbursements, payroll, check issuance, and financial reporting',
      icon: 'bi bi-calculator',
      url: '../service-details/municipal-accounting',
      i18nTitle: 'tax-municipal-accounting-office',
      i18nDesc: 'tax-preaudit-of-disbursements-payroll-check-issuance',
    },
    'tricycle-franchising': {
      id: 'tricycle-franchising',
      title: 'Tricycle Franchising & Regulatory Board',
      desc: 'Motorized Tricycle Operator’s Permit (MTOP) issuance and route franchising',
      icon: 'bi bi-bicycle',
      url: '../service-details/tricycle-franchising',
      i18nTitle: 'office-tfrb-title',
      i18nDesc: 'office-tfrb-desc',
    },
  };

  /**
   * Creates an accessible, interactive Office Card element.
   * 
   * @param {Object} office 
   * @returns {HTMLElement}
   */
  function createOfficeCard(office) {
    var iconBox = dom.createEl('div', { class: 'office-card-icon' }, [
      dom.createEl('i', { class: office.icon || 'bi bi-building', 'aria-hidden': 'true' })
    ]);

    var titleEl = dom.createEl('h3', {
      class: 'office-card-title',
      text: office.title,
      'data-i18n': office.i18nTitle || ('office-' + office.id + '-title')
    });

    var descEl = dom.createEl('p', {
      class: 'office-card-desc',
      text: office.desc,
      'data-i18n': office.i18nDesc || ('office-' + office.id + '-desc')
    });

    var contentBox = dom.createEl('div', { class: 'office-card-content' }, [titleEl, descEl]);

    var arrowBox = dom.createEl('div', { class: 'office-card-arrow', 'aria-hidden': 'true' }, [
      dom.createEl('i', { class: 'bi bi-arrow-right' })
    ]);

    return dom.createEl('a', {
      href: office.url || '#',
      class: 'office-card',
      'aria-label': office.title + ' — View office details and services'
    }, [iconBox, contentBox, arrowBox]);
  }

  /**
   * Renders office cards for a specified list of office IDs.
   * 
   * @param {HTMLElement|string} containerOrSelector 
   * @param {Array<string>|string} [officeIds] 
   */
  function renderOffices(containerOrSelector, officeIds) {
    var container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;

    if (!container) return;

    var ids = officeIds || container.dataset.offices || container.dataset.officeIds;
    if (typeof ids === 'string') {
      ids = ids.split(',').map(function (s) { return s.trim(); });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      ids = Object.keys(OFFICE_CATALOG);
    }

    dom.empty(container);
    var fragment = document.createDocumentFragment();

    ids.forEach(function (id) {
      var office = OFFICE_CATALOG[id];
      if (office) {
        fragment.appendChild(createOfficeCard(office));
      }
    });

    container.appendChild(fragment);
  }

  function autoHydrate() {
    var containers = document.querySelectorAll('[data-offices], [data-office-grid], .office-cards-grid[data-offices]');
    containers.forEach(function (el) {
      renderOffices(el);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoHydrate);
    } else {
      autoHydrate();
    }
  }

  return {
    createOfficeCard: createOfficeCard,
    renderOffices: renderOffices,
    OFFICE_CATALOG: OFFICE_CATALOG,
    autoHydrate: autoHydrate,
  };
});
