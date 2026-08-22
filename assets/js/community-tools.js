/**
 * Shared community roadmap renderer.
 *
 * Proposed and otherwise unavailable tools intentionally render as non-link
 * cards. Their future routes remain in the data model without exposing dead
 * links to residents.
 */
(function () {
  'use strict';

  const DATA_URL = '/data/community-tools.json';

  let dataPromise = null;

  function statusSlug(status) {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  function translate(key, fallback) {
    if (window.TranslationEngine && window.TranslationEngine.hasTranslation(key)) {
      return window.TranslationEngine.t(key);
    }

    return fallback;
  }

  function setTranslatedText(element, key, fallback) {
    element.dataset.i18n = key;
    element.textContent = translate(key, fallback);
  }

  function validateData(data) {
    if (!data || !Array.isArray(data.allowedStatuses) || !Array.isArray(data.tools)) {
      throw new Error('Community tools data does not match the expected schema.');
    }

    const allowedStatuses = new Set(data.allowedStatuses);
    const ids = new Set();
    const priorities = new Set();

    data.tools.forEach(function (tool, index) {
      const requiredTextFields = ['id', 'name', 'route', 'summary', 'status'];
      const hasRequiredText = requiredTextFields.every(function (field) {
        return typeof tool[field] === 'string' && tool[field].trim().length > 0;
      });

      if (
        !hasRequiredText ||
        !Number.isInteger(tool.priority) ||
        tool.priority !== index + 1 ||
        !allowedStatuses.has(tool.status) ||
        ids.has(tool.id) ||
        priorities.has(tool.priority)
      ) {
        throw new Error('Community tools data contains an invalid item.');
      }

      ids.add(tool.id);
      priorities.add(tool.priority);
    });

    return data;
  }

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Unable to load community tools data.');
          }

          return response.json();
        })
        .then(validateData)
        .catch(function (error) {
          dataPromise = null;
          throw error;
        });
    }

    return dataPromise;
  }

  function createStatusBadge(tool) {
    const statusClass = statusSlug(tool.status);
    const status = document.createElement('span');
    status.className = 'community-status community-status--' + statusClass;

    const label = document.createElement('span');
    label.className = 'community-status__label';
    setTranslatedText(label, 'community-tools-status-label', 'Status:');

    const value = document.createElement('span');
    setTranslatedText(value, 'community-tools-status-' + statusClass, tool.status);

    status.append(label, document.createTextNode(' '), value);
    return status;
  }

  function createCard(tool) {
    const card = document.createElement('article');
    card.className = 'community-tool-card';
    card.dataset.communityToolId = tool.id;
    card.dataset.communityToolRoute = tool.route;

    const header = document.createElement('div');
    header.className = 'community-tool-card__header';

    const priority = document.createElement('span');
    priority.className = 'community-tool-card__priority';
    const priorityLabel = document.createElement('span');
    priorityLabel.className = 'sr-only';
    setTranslatedText(priorityLabel, 'community-tools-priority-label', 'Priority');
    priority.append(priorityLabel, document.createTextNode(' ' + tool.priority));

    header.append(priority, createStatusBadge(tool));

    const title = document.createElement('h3');
    title.className = 'community-tool-card__title';
    setTranslatedText(title, 'community-tools-' + tool.id + '-name', tool.name);

    const summary = document.createElement('p');
    summary.className = 'community-tool-card__summary';
    setTranslatedText(summary, 'community-tools-' + tool.id + '-summary', tool.summary);

    card.append(header, title, summary);

    if (tool.availabilityNote) {
      const availability = document.createElement('p');
      availability.className = 'community-tool-card__availability';
      setTranslatedText(
        availability,
        'community-tools-' + tool.id + '-availability-note',
        tool.availabilityNote
      );
      card.append(availability);
    }

    return card;
  }

  function addCardCta(card, container) {
    if (container.dataset.cardCta !== 'shape') return;

    const cta = document.createElement('a');
    cta.className = 'community-tool-card__cta';
    cta.href = '/ideas/?submissionType=feature#submission-type';
    setTranslatedText(cta, 'community-tools-help-shape', 'Help shape this tool');
    card.append(cta);
  }

  function requestedPriorities(container) {
    const value = container.dataset.priorities;
    if (!value) return null;

    const priorities = value
      .split(',')
      .map(function (priority) {
        return Number.parseInt(priority.trim(), 10);
      })
      .filter(Number.isInteger);

    return priorities.length ? new Set(priorities) : null;
  }

  function render(container, data) {
    const priorities = requestedPriorities(container);
    const tools = priorities
      ? data.tools.filter(function (tool) {
          return priorities.has(tool.priority);
        })
      : data.tools;

    container.replaceChildren();

    if (!tools.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'community-tools-message';
      setTranslatedText(emptyMessage, 'community-tools-empty', 'No community tools to show.');
      container.append(emptyMessage);
      return;
    }

    const fragment = document.createDocumentFragment();
    tools.forEach(function (tool) {
      const card = createCard(tool);
      addCardCta(card, container);
      fragment.append(card);
    });
    container.append(fragment);
  }

  function renderError(container) {
    const message = document.createElement('p');
    message.className = 'community-tools-message community-tools-message--error';
    message.setAttribute('role', 'alert');
    setTranslatedText(
      message,
      'community-tools-load-error',
      'Community tools could not be loaded. Please try again later.'
    );
    container.replaceChildren(message);
  }

  function renderAll() {
    const containers = Array.from(document.querySelectorAll('[data-community-tools]'));
    if (!containers.length) return Promise.resolve([]);

    containers.forEach(function (container) {
      container.setAttribute('aria-busy', 'true');
    });

    return loadData()
      .then(function (data) {
        containers.forEach(function (container) {
          render(container, data);
          container.removeAttribute('aria-busy');
        });
        return data.tools;
      })
      .catch(function (error) {
        console.error('[CommunityTools]', error);
        containers.forEach(function (container) {
          renderError(container);
          container.removeAttribute('aria-busy');
        });
        return [];
      });
  }

  window.CommunityTools = {
    load: loadData,
    render: renderAll,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
