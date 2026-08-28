/**
 * BetterMalolos - Elected Officials Module
 * Safe delegation to OfficialsRenderer component.
 */

document.addEventListener('DOMContentLoaded', function () {
  var container = document.getElementById('officials-container');
  if (!container) return;

  if (window.OfficialsRenderer && typeof window.OfficialsRenderer.renderOfficials === 'function') {
    window.OfficialsRenderer.renderOfficials(container);
  }
});
