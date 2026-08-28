/**
 * BetterMalolos - Safe DOM Builder Utility
 * Provides XSS-safe DOM element creation and manipulation without raw innerHTML sinks.
 * 
 * @module DOMBuilder
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DOMBuilder = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ALLOWED_PROTOCOLS = /^(https?|tel|mailto|#|\/|\.\/|\.\.\/)/i;

  /**
   * Sanitizes a URL to prevent javascript: or data: XSS vectors.
   * @param {string} url 
   * @returns {string} Safe URL or '#' fallback
   */
  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    var trimmed = url.trim();
    if (ALLOWED_PROTOCOLS.test(trimmed)) {
      return trimmed;
    }
    // Relative URLs without protocol
    if (!trimmed.includes(':') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    console.warn('[DOMBuilder] Blocked potentially unsafe URL:', url);
    return '#';
  }

  /**
   * Safely creates an HTML element with attributes and children.
   * 
   * @param {string} tag - HTML tag name (e.g., 'div', 'button', 'a')
   * @param {Object} [attributes] - Key-value pairs of element attributes
   * @param {Node|string|number|Array<Node|string|number>} [children] - Child elements or text
   * @returns {HTMLElement} The created DOM element
   */
  function createEl(tag, attributes, children) {
    if (!tag || typeof tag !== 'string') {
      throw new Error('[DOMBuilder] Valid tag name is required.');
    }

    var el = document.createElement(tag);

    if (attributes && typeof attributes === 'object') {
      Object.keys(attributes).forEach(function (key) {
        var val = attributes[key];
        if (val === null || val === undefined) return;

        if (key === 'className' || key === 'class') {
          el.className = String(val);
        } else if (key === 'textContent' || key === 'text') {
          el.textContent = String(val);
        } else if (key === 'href' || key === 'src') {
          el.setAttribute(key, sanitizeUrl(String(val)));
        } else if (key === 'style' && typeof val === 'object') {
          Object.assign(el.style, val);
        } else if (key === 'events' && typeof val === 'object') {
          Object.keys(val).forEach(function (evt) {
            if (typeof val[evt] === 'function') {
              el.addEventListener(evt, val[evt]);
            }
          });
        } else if (key.startsWith('on') && typeof val === 'function') {
          var evtName = key.slice(2).toLowerCase();
          el.addEventListener(evtName, val);
        } else if (key === 'dataset' && typeof val === 'object') {
          Object.keys(val).forEach(function (dataKey) {
            if (val[dataKey] !== undefined && val[dataKey] !== null) {
              el.dataset[dataKey] = String(val[dataKey]);
            }
          });
        } else {
          el.setAttribute(key, String(val));
        }
      });
    }

    if (children !== undefined && children !== null) {
      appendChildren(el, children);
    }

    return el;
  }

  /**
   * Safely appends children (Nodes, strings, numbers, arrays) to a parent element.
   * 
   * @param {HTMLElement} parent 
   * @param {Node|string|number|Array} children 
   */
  function appendChildren(parent, children) {
    if (!parent) return;

    if (Array.isArray(children)) {
      children.forEach(function (child) {
        appendChildren(parent, child);
      });
      return;
    }

    if (children instanceof Node) {
      parent.appendChild(children);
    } else if (typeof children === 'string' || typeof children === 'number') {
      parent.appendChild(document.createTextNode(String(children)));
    }
  }

  /**
   * Safely removes all child elements from a container.
   * @param {HTMLElement} container 
   */
  function empty(container) {
    if (!container) return;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }

  /**
   * Safely creates an icon element (Bootstrap Icons or custom).
   * @param {string} iconClass - CSS classes e.g. 'bi bi-file-earmark-text'
   * @param {string} [ariaLabel] - Optional accessible label
   * @returns {HTMLElement}
   */
  function createIcon(iconClass, ariaLabel) {
    var attrs = {
      class: iconClass,
    };
    if (ariaLabel) {
      attrs['aria-label'] = ariaLabel;
    } else {
      attrs['aria-hidden'] = 'true';
    }
    return createEl('i', attrs);
  }

  return {
    createEl: createEl,
    appendChildren: appendChildren,
    empty: empty,
    createIcon: createIcon,
    sanitizeUrl: sanitizeUrl,
  };
});
