/**
 * News Module - Fetches and renders curated news from data/news.json
 * Used on both homepage (home-news-grid) and news page (news-grid).
 *
 * Data is maintained through the curation tool at /admin/news-editor.html,
 * which writes a validated data/news.json. Each item supports:
 *   id, title, date (YYYY-MM-DD), category, badge (info|success|warning),
 *   summary, url (optional outbound link), source (optional link label).
 */
(function () {
  'use strict';

  var SUPPORTED_BADGES = { info: 1, success: 1, warning: 1 };

  var NEWS_DATA_URL = (function () {
    var path = window.location.pathname;
    if (path.indexOf('/news') !== -1) {
      return '../data/news.json';
    }
    return 'data/news.json';
  })();

  // Escape untrusted strings before they touch innerHTML. Curated copy is
  // generally trusted, but escaping keeps the renderer safe if a future
  // automated source (e.g. a Facebook sync) feeds in raw post text.
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  // Newest first; items without a valid date sink to the bottom.
  function sortByDateDesc(articles) {
    return articles.slice().sort(function (a, b) {
      var ta = new Date((a.date || '') + 'T00:00:00').getTime();
      var tb = new Date((b.date || '') + 'T00:00:00').getTime();
      if (isNaN(ta)) ta = -Infinity;
      if (isNaN(tb)) tb = -Infinity;
      return tb - ta;
    });
  }

  function renderHomeNews(articles) {
    var grid = document.getElementById('home-news-grid');
    if (!grid) return;

    var items = sortByDateDesc(articles).slice(0, 3);
    if (!items.length) return; // leave the static placeholder in place

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var badge = safeBadge(a.badge);
      var href = safeUrl(a.url) || 'news/';
      var external = href !== 'news/';
      html += '<article class="home-news-card">';
      html += '<div class="home-news-meta">';
      html +=
        '<span class="home-news-badge home-news-badge--' +
        badge +
        '">' +
        esc(a.category) +
        '</span>';
      html += '<span class="home-news-date">' + formatDate(a.date) + '</span>';
      html += '</div>';
      html +=
        '<h3><a href="' +
        href +
        '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
        '>' +
        esc(a.title) +
        '</a></h3>';
      html += '<p>' + esc(a.summary) + '</p>';
      html += '</article>';
    }
    grid.innerHTML = html;
  }

  function renderNewsPage(articles) {
    var grid = document.getElementById('news-grid');
    if (!grid) return;

    var items = sortByDateDesc(articles);
    if (!items.length) {
      grid.innerHTML =
        '<article class="news-card"><div class="news-card-body">' +
        '<h3 class="news-card-title">No updates yet</h3>' +
        '<p class="news-card-desc">Check back soon for the latest news and advisories from Solano.</p>' +
        '</div></article>';
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      var badge = safeBadge(a.badge);
      var url = safeUrl(a.url);
      var title = esc(a.title);
      html += '<article class="news-card" aria-label="' + title + '">';
      html += '<div class="news-card-header">';
      html += '<span class="badge badge-' + badge + '">' + esc(a.category) + '</span>';
      html += '<span class="news-card-date">' + formatDate(a.date) + '</span>';
      html += '</div>';
      html += '<div class="news-card-body">';
      html += '<h3 class="news-card-title">';
      html += url
        ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + '</a>'
        : title;
      html += '</h3>';
      html += '<p class="news-card-desc">' + esc(a.summary) + '</p>';
      html += '</div>';
      if (url) {
        var label = esc(a.source) || 'Read more';
        html += '<div class="news-card-footer">';
        html +=
          '<a class="news-card-source" href="' +
          url +
          '" target="_blank" rel="noopener noreferrer">' +
          label +
          ' <i class="bi bi-arrow-right" aria-hidden="true"></i></a>';
        html += '</div>';
      }
      html += '</article>';
    }
    grid.innerHTML = html;
  }

  function loadNews() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', NEWS_DATA_URL, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            var articles = (data && data.news) || [];
            renderHomeNews(articles);
            renderNewsPage(articles);
          } catch (e) {
            // Silent fail - placeholder content remains
          }
        }
      }
    };
    xhr.send();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNews);
  } else {
    loadNews();
  }
})();
