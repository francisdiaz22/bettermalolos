/**
 * Hybrid "Latest Updates" feed for the homepage.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Facebook Page Plugin (the embedded timeline iframe) is fundamentally
 * unreliable for most visitors in modern browsers: it depends on third-party
 * cookies / partitioned storage (blocked by default in current Chrome, Safari
 * and Firefox) and is routinely stripped by ad/tracker blockers. When that
 * happens it renders a blank white box — which is exactly what was reported on
 * the live cPanel site even though the page is public and the CSP fully allows
 * Facebook.
 *
 * STRATEGY (progressive enhancement, graceful degradation)
 * --------------------------------------------------------
 *   1. Immediately render a self-hosted feed from data/news.json — the same
 *      file scripts/sync-facebook.js writes Facebook posts into. This always
 *      works (same-origin, no cookies, unblockable) and is the base layer.
 *   2. Lazily probe the live Facebook Page Plugin. We can't read a cross-origin
 *      iframe's contents, but a working plugin postMessages its parent for
 *      sizing. If we receive a message FROM OUR iframe within a timeout, the
 *      plugin genuinely hydrated → reveal it and hide the self-hosted list.
 *      Otherwise we discard the iframe and the reliable feed stays in place.
 *
 * The section therefore can never be empty, and visitors whose browsers still
 * support the embed continue to get the live Facebook timeline.
 */
(function () {
  'use strict';

  var MAX_ITEMS = 4; // posts shown in the self-hosted feed
  var PROBE_TIMEOUT_MS = 4500; // how long to wait for the FB plugin to prove it hydrated
  var SUPPORTED_BADGES = { info: 1, success: 1, warning: 1 };

  // The feed only exists on the homepage (root), but mirror news.js's path guard
  // so it keeps working if the markup is ever reused under a sub-path.
  var NEWS_DATA_URL =
    window.location.pathname.indexOf('/news') !== -1 ? '../data/news.json' : 'data/news.json';

  // --- small, self-contained sanitizers (kept local so this file has no deps) ---

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeBadge(badge) {
    return SUPPORTED_BADGES[badge] ? badge : 'info';
  }

  // Only allow http(s) and site-relative URLs through to href attributes.
  function safeUrl(url) {
    if (!url) return '';
    var u = String(url).trim();
    if (/^https?:\/\//i.test(u) || u.charAt(0) === '/' || u.charAt(0) === '#') {
      return esc(u);
    }
    return '';
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return esc(dateStr);
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function sortByDateDesc(articles) {
    return articles.slice().sort(function (a, b) {
      var ta = new Date((a.date || '') + 'T00:00:00').getTime();
      var tb = new Date((b.date || '') + 'T00:00:00').getTime();
      if (isNaN(ta)) ta = -Infinity;
      if (isNaN(tb)) tb = -Infinity;
      return tb - ta;
    });
  }

  // --- self-hosted feed rendering -------------------------------------------

  // Resolve the avatar path relative to where the page lives.
  var AVATAR_SRC =
    window.location.pathname.indexOf('/news') !== -1
      ? '../assets/images/logo/favicon.svg'
      : 'assets/images/logo/favicon.svg';

  function renderLocalFeed(container, articles, pageUrl) {
    var items = sortByDateDesc(articles).slice(0, MAX_ITEMS);
    var safePage = safeUrl(pageUrl) || 'https://www.facebook.com';

    var html = '<div class="fb-feed-local" data-fb-local>';

    if (!items.length) {
      html +=
        '<article class="fb-post fb-post--empty">' +
        '<p class="fb-post-text">No updates to show right now.</p>' +
        '<a class="fb-post-link" href="' + safePage + '" target="_blank" rel="noopener noreferrer">' +
        'See the latest on Facebook <i class="bi bi-arrow-right" aria-hidden="true"></i></a>' +
        '</article>';
    } else {
      for (var i = 0; i < items.length; i++) {
        var a = items[i];
        var badge = safeBadge(a.badge);
        var title = esc(a.title);
        var url = safeUrl(a.url);

        html += '<article class="fb-post">';

        // Author row — avatar + page name + date + category badge
        html += '<div class="fb-post-author">';
        html +=
          '<img src="' + AVATAR_SRC + '" class="fb-post-avatar" ' +
          'width="36" height="36" alt="" aria-hidden="true" loading="lazy">';
        html += '<div class="fb-post-author-info">';
        html += '<span class="fb-post-page-name">LGU Solano</span>';
        html += '<time class="fb-post-date">' + formatDate(a.date) + '</time>';
        html += '</div>';
        if (a.category) {
          html +=
            '<span class="fb-post-badge fb-post-badge--' + badge + '">' +
            esc(a.category) + '</span>';
        }
        html += '</div>';

        // Post body
        html += '<div class="fb-post-body">';
        if (title) {
          html += '<h4 class="fb-post-title">';
          html += url
            ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + '</a>'
            : title;
          html += '</h4>';
        }
        if (a.summary) {
          html += '<p class="fb-post-text">' + esc(a.summary) + '</p>';
        }
        html += '</div>';

        if (url) {
          var label = esc(a.source) || 'Read more';
          html +=
            '<a class="fb-post-link" href="' + url + '" target="_blank" rel="noopener noreferrer">' +
            label + ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>';
        }

        html += '</article>';
      }
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // --- live Facebook plugin probe -------------------------------------------

  function buildPluginIframe(pageUrl) {
    var href = encodeURIComponent(pageUrl);
    var src =
      'https://www.facebook.com/plugins/page.php?href=' +
      href +
      '&tabs=timeline&width=500&height=700&small_header=false' +
      '&adapt_container_width=true&hide_cover=false&show_facepile=true';

    var iframe = document.createElement('iframe');
    iframe.title = 'Latest posts from the Official LGU Solano Facebook Page';
    iframe.src = src;
    iframe.width = '500';
    iframe.height = '700';
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'encrypted-media; clipboard-write; web-share');
    iframe.className = 'fb-live-frame';
    return iframe;
  }

  /**
   * Loads the FB plugin off-screen and only reveals it if it proves it hydrated.
   * Detection: a working plugin postMessages its parent window for sizing. We
   * accept the message only when event.source is our own iframe's window, so
   * other embeds (maps, etc.) can't trigger a false positive.
   */
  function probeLiveFeed(container, pageUrl) {
    var iframe = buildPluginIframe(pageUrl);
    // Off-screen but fully laid out, so the plugin can measure and render.
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100%';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');
    container.appendChild(iframe);

    var settled = false;
    var timer = null;

    function cleanup() {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('error', fail);
      if (timer) clearTimeout(timer);
    }

    function onMessage(e) {
      if (settled || !iframe.contentWindow) return;
      var fromOurIframe = e.source === iframe.contentWindow;
      var fromFacebook = typeof e.origin === 'string' && /\.facebook\.com$/.test(e.origin);
      if (fromOurIframe && fromFacebook) succeed();
    }

    function succeed() {
      if (settled) return;
      settled = true;
      cleanup();
      var list = container.querySelector('[data-fb-local]');
      if (list) list.hidden = true;
      // Promote the iframe into normal flow.
      iframe.style.position = '';
      iframe.style.top = '';
      iframe.style.left = '';
      iframe.style.opacity = '';
      iframe.style.pointerEvents = '';
      iframe.removeAttribute('aria-hidden');
      iframe.removeAttribute('tabindex');
      container.setAttribute('data-fb-live', 'true');
    }

    function fail() {
      if (settled) return;
      settled = true;
      cleanup();
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      container.setAttribute('data-fb-live', 'false');
    }

    window.addEventListener('message', onMessage);
    iframe.addEventListener('error', fail);
    timer = setTimeout(fail, PROBE_TIMEOUT_MS);
  }

  // Defer the (heavy, third-party) probe until the feed is near the viewport so
  // it never competes with the initial page load.
  function scheduleProbe(container, pageUrl) {
    function start() {
      probeLiveFeed(container, pageUrl);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              io.disconnect();
              start();
              return;
            }
          }
        },
        { rootMargin: '300px 0px' }
      );
      io.observe(container);
    } else {
      setTimeout(start, 1200);
    }
  }

  // --- bootstrap -------------------------------------------------------------

  function init() {
    var container = document.getElementById('fb-feed');
    if (!container) return;
    var pageUrl = container.getAttribute('data-fb-page') || 'https://www.facebook.com';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', NEWS_DATA_URL, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var articles = [];
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          articles = (data && data.news) || [];
        } catch (e) {
          articles = [];
        }
      }
      // Always render the reliable base layer (empty-state included), then probe.
      renderLocalFeed(container, articles, pageUrl);
      scheduleProbe(container, pageUrl);
    };
    xhr.onerror = function () {
      renderLocalFeed(container, [], pageUrl);
      scheduleProbe(container, pageUrl);
    };
    xhr.send();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
