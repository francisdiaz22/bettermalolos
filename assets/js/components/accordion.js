/**
 * BetterMalolos - Unified Reusable Accordion Component
 * Accessible, WCAG 2.1 compliant accordion controller with keyboard navigation.
 * 
 * @module Accordion
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Accordion = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var instanceCounter = 0;

  /**
   * Initializes accordion items matching a selector or container.
   * 
   * @param {HTMLElement|string} [containerOrSelector] 
   * @param {Object} [options]
   * @param {boolean} [options.allowMultiple=false] - Whether multiple items can be open simultaneously
   */
  function init(containerOrSelector, options) {
    options = options || {};
    var allowMultiple = options.allowMultiple || false;

    var container = typeof containerOrSelector === 'string'
      ? document.querySelector(containerOrSelector)
      : (containerOrSelector || document);

    if (!container) return;

    // Support standard .accordion-item, .faq-item, and .edu-category-item
    var items = container.querySelectorAll('.accordion-item, .faq-item, .edu-category-item');

    items.forEach(function (item) {
      if (item.dataset.accordionInitialized) return;
      item.dataset.accordionInitialized = 'true';

      var trigger = item.querySelector('.accordion-trigger, .faq-question, .edu-category-header');
      var content = item.querySelector('.accordion-content, .faq-answer') ||
                    (trigger && trigger.nextElementSibling);

      if (!trigger || !content) return;

      instanceCounter++;
      var uniqueId = 'accordion-panel-' + instanceCounter;
      var triggerId = 'accordion-trigger-' + instanceCounter;

      if (!content.id) content.id = uniqueId;
      if (!trigger.id) trigger.id = triggerId;

      trigger.setAttribute('aria-controls', content.id);
      trigger.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
      if (trigger.tagName.toLowerCase() !== 'button') {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('tabindex', '0');
      }

      content.setAttribute('role', 'region');
      content.setAttribute('aria-labelledby', trigger.id);

      // Toggle action
      var toggle = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }

        var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        // If not allowing multiple, close siblings first
        if (!allowMultiple && !isExpanded) {
          var siblings = item.parentElement ? item.parentElement.children : [];
          for (var i = 0; i < siblings.length; i++) {
            var sibling = siblings[i];
            if (sibling !== item && (sibling.classList.contains('accordion-item') || sibling.classList.contains('faq-item'))) {
              sibling.classList.remove('active');
              var sTrigger = sibling.querySelector('.accordion-trigger, .faq-question, .edu-category-header');
              var sContent = sibling.querySelector('.accordion-content, .faq-answer');
              if (sTrigger) sTrigger.setAttribute('aria-expanded', 'false');
              if (sContent) sContent.hidden = true;
            }
          }
        }

        if (isExpanded) {
          item.classList.remove('active');
          trigger.setAttribute('aria-expanded', 'false');
          content.hidden = true;
        } else {
          item.classList.add('active');
          trigger.setAttribute('aria-expanded', 'true');
          content.hidden = false;
        }
      };

      trigger.addEventListener('click', toggle);

      // Keyboard support
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusNextTrigger(item);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          focusPrevTrigger(item);
        }
      });
    });
  }

  function focusNextTrigger(currentItem) {
    var nextItem = currentItem.nextElementSibling;
    while (nextItem) {
      var trigger = nextItem.querySelector('.accordion-trigger, .faq-question, .edu-category-header');
      if (trigger) {
        trigger.focus();
        return;
      }
      nextItem = nextItem.nextElementSibling;
    }
  }

  function focusPrevTrigger(currentItem) {
    var prevItem = currentItem.previousElementSibling;
    while (prevItem) {
      var trigger = prevItem.querySelector('.accordion-trigger, .faq-question, .edu-category-header');
      if (trigger) {
        trigger.focus();
        return;
      }
      prevItem = prevItem.previousElementSibling;
    }
  }

  // Auto-initialize on DOM ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        init();
      });
    } else {
      init();
    }
  }

  return {
    init: init,
  };
});
