(function () {
  'use strict';

  var grid = document.getElementById('wishlist-grid');
  if (!grid) return;
  var category = document.getElementById('wishlist-category');
  var barangay = document.getElementById('wishlist-barangay');
  var sort = document.getElementById('wishlist-sort');
  var count = document.getElementById('wishlist-count');
  var statIdeas = document.getElementById('wishlist-stat-ideas');
  var statSupporters = document.getElementById('wishlist-stat-supporters');
  var statBarangays = document.getElementById('wishlist-stat-barangays');
  var statPriorities = document.getElementById('wishlist-stat-priorities');
  var categoryNames = {
    'transport-mobility': 'Transport & Mobility', environment: 'Environment', 'public-spaces': 'Public Spaces',
    accessibility: 'Accessibility', livelihood: 'Livelihood', 'digital-services': 'Digital Services'
  };
  var items = [];
  var apiBase = window.COMMUNITY_WISHLIST_API_BASE_URL || '/api/v1/wishlist';

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }); }
  function render() {
    var filtered = items.filter(function (item) { return (!category.value || item.category === category.value) && (!barangay.value || item.barangay === barangay.value); });
    filtered.sort(function (a, b) { return sort.value === 'newest' ? b.submitted.localeCompare(a.submitted) : b.supportCount - a.supportCount; });
    count.textContent = filtered.length + (filtered.length === 1 ? ' idea' : ' ideas');
    grid.innerHTML = filtered.length ? filtered.map(function (item) {
      return '<article class="wishlist-card"><div class="wishlist-card__meta"><span class="wishlist-tag">' + escapeHtml(categoryNames[item.category] || 'Other') + '</span><span>' + escapeHtml(item.barangay) + '</span></div><h2>' + escapeHtml(item.title) + '</h2><details class="wishlist-details"><summary>Read the idea</summary><p>' + escapeHtml(item.description) + '</p></details><div class="wishlist-card__footer"><span class="wishlist-support"><i class="bi bi-heart" aria-hidden="true"></i> ' + item.supportCount + ' supporters</span><span>' + escapeHtml(item.id) + '</span></div></article>';
    }).join('') : '<div class="wishlist-empty"><h2>No ideas match these filters</h2><p>Try another category or barangay.</p></div>';
  }
  function loadStats() {
    return fetch(apiBase + '/stats').then(function (response) { if (!response.ok) throw new Error('Wishlist stats unavailable'); return response.json(); }).then(function (payload) {
      var stats = payload.data;
      statIdeas.textContent = stats.ideas;
      statSupporters.textContent = stats.supporters;
      statBarangays.textContent = stats.barangaysRepresented;
      statPriorities.textContent = stats.communityPriorities;
    });
  }
  function loadApiItems() { return fetch(apiBase + '?page=1&pageSize=100&sort=popular').then(function (response) { if (!response.ok) throw new Error('Wishlist API unavailable'); return response.json(); }).then(function (payload) { return payload.data; }); }
  function loadFixtureItems() { return fetch('/data/community-wishlist.json').then(function (response) { if (!response.ok) throw new Error('Wishlist data unavailable'); return response.json(); }); }
  loadApiItems().catch(loadFixtureItems).then(function (data) { items = data; render(); }).catch(function () { count.textContent = 'Unable to load ideas'; grid.innerHTML = '<div class="wishlist-empty"><h2>The wishlist is taking a short break</h2><p>Please try again later.</p></div>'; });
  loadStats().catch(function () { /* Fixture values remain visible until the API is deployed. */ });
  [category, barangay, sort].forEach(function (control) { control.addEventListener('change', render); });
})();
