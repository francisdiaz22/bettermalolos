/**
 * BetterMalolos - Reusable Officials Renderer Component
 * Renders Mayor, Vice Mayor, and City Councilors safely from data/officials.json
 * 
 * @module OfficialsRenderer
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['../utils/dom-builder'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../utils/dom-builder'));
  } else {
    root.OfficialsRenderer = factory(root.DOMBuilder);
  }
})(typeof self !== 'undefined' ? self : this, function (DOMBuilder) {
  'use strict';

  var dom = DOMBuilder || (typeof window !== 'undefined' && window.DOMBuilder);

  function loadOfficialsData() {
    return fetch('/data/officials.json')
      .then(function (res) {
        if (!res.ok) return fetch('../data/officials.json');
        return res;
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load officials data');
        return res.json();
      });
  }

  /**
   * Safely creates an Official Card DOM element.
   * 
   * @param {Object} official 
   * @param {string} [defaultRole] 
   * @param {string} [cardType] - 'executive' or 'councilor'
   * @returns {HTMLElement}
   */
  function createOfficialCard(official, defaultRole, cardType) {
    var isExecutive = cardType === 'executive' || official.title === 'City Mayor' || official.title === 'Vice Mayor';
    var cardClass = isExecutive ? 'official-card card' : 'councilor-card card text-center';

    var avatarBox = dom.createEl('div', { class: 'official-avatar' });
    if (official.image) {
      var imgEl = dom.createEl('img', {
        src: '/' + official.image.replace(/^\//, ''),
        alt: official.name,
        loading: 'lazy'
      });
      imgEl.onerror = function () {
        dom.empty(avatarBox);
        avatarBox.appendChild(dom.createEl('i', {
          class: isExecutive ? 'bi bi-person-circle' : 'bi bi-person-badge',
          'aria-hidden': 'true'
        }));
      };
      avatarBox.appendChild(imgEl);
    } else {
      avatarBox.appendChild(dom.createEl('i', {
        class: isExecutive ? 'bi bi-person-circle' : 'bi bi-person-badge',
        'aria-hidden': 'true'
      }));
    }

    var nameEl = dom.createEl('h4', {
      class: 'official-name',
      text: official.name
    });

    var roleText = official.title || defaultRole || 'City Councilor';
    var roleBadge = dom.createEl('span', {
      class: isExecutive ? 'official-role-badge' : 'badge badge-info',
      text: roleText
    });

    var children = [avatarBox, nameEl, roleBadge];

    if (isExecutive && official.email) {
      var emailLink = dom.createEl('a', {
        href: 'mailto:' + official.email,
        class: 'd-block text-muted mt-2'
      }, [
        dom.createEl('i', { class: 'bi bi-envelope me-1', 'aria-hidden': 'true' }),
        dom.createEl('span', { text: ' ' + official.email })
      ]);
      children.push(emailLink);
    }

    return dom.createEl('div', { class: cardClass }, children);
  }

  /**
   * Renders officials into container elements.
   * 
   * @param {HTMLElement|string} containerOrSelector 
   */
  function renderOfficials(containerOrSelector) {
    var container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : containerOrSelector;

    if (!container) return Promise.resolve();

    return loadOfficialsData().then(function (data) {
      dom.empty(container);

      // Render Executive Branch
      var execHeading = dom.createEl('h3', {
        class: 'text-center mb-4',
        text: 'Executive Branch',
        'data-i18n': 'officials-executive-branch'
      });
      container.appendChild(execHeading);

      var execGrid = dom.createEl('div', { class: 'grid grid-2 mb-5' });
      if (data.mayor) {
        execGrid.appendChild(createOfficialCard(data.mayor, 'City Mayor', 'executive'));
      }
      if (data.vice_mayor) {
        execGrid.appendChild(createOfficialCard(data.vice_mayor, 'Vice Mayor', 'executive'));
      }
      container.appendChild(execGrid);

      // Render City Councilors
      if (Array.isArray(data.councilors) && data.councilors.length > 0) {
        var councilHeading = dom.createEl('h3', {
          class: 'text-center mt-5 mb-4',
          text: 'City Council Members',
          'data-i18n': 'officials-city-council-members'
        });
        container.appendChild(councilHeading);

        var councilGrid = dom.createEl('div', { class: 'grid grid-4' });
        data.councilors.forEach(function (c) {
          councilGrid.appendChild(createOfficialCard(c, 'City Councilor', 'councilor'));
        });
        container.appendChild(councilGrid);
      }
    }).catch(function (err) {
      console.error('[OfficialsRenderer] Error:', err);
      dom.empty(container);
      container.appendChild(dom.createEl('p', {
        class: 'text-center text-danger',
        text: 'Failed to load elected officials information.'
      }));
    });
  }

  function autoHydrate() {
    var targets = document.querySelectorAll('#officials-container, [data-officials-grid]');
    targets.forEach(function (el) {
      renderOfficials(el);
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
    createOfficialCard: createOfficialCard,
    renderOfficials: renderOfficials,
    autoHydrate: autoHydrate,
  };
});
