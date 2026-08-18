(function () {
  'use strict';

  var STORAGE_KEY = 'bs-vol-popup-v1';
  var SHOW_DELAY_MS = 800;
  // Must be >= longest CSS exit duration (card: 220ms, overlay: 300ms)
  var EXIT_DURATION_MS = 340;

  var _dismissed = false;
  var _previousFocus = null;
  var _scrollbarWidth = 0;
  var _scrollY = 0;
  var _onKeyDown = null;

  // ─── Scroll lock ──────────────────────────────────────────────────────────

  function measureScrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  /**
   * iOS Safari ignores `overflow: hidden` on <body> for touch scrolling, so the
   * page used to keep scrolling underneath the dialog on iPhones and iPads.
   * Pinning the body with position:fixed at a negative offset is the technique
   * that actually holds on every engine; the offset is replayed on unlock so
   * the reading position survives.
   */
  function lockScroll() {
    _scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    _scrollbarWidth = measureScrollbarWidth();

    var body = document.body;
    body.style.position = 'fixed';
    body.style.top = -_scrollY + 'px';
    body.style.left = '0';
    // Holding the right edge off by the scrollbar width keeps the content box
    // exactly as wide as it was, so nothing reflows when the bar disappears.
    body.style.right = _scrollbarWidth > 0 ? _scrollbarWidth + 'px' : '0';
    body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    var body = document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.overflow = '';
    // Unpinning drops the page back to the top, so put the reading position
    // back in the same frame.
    window.scrollTo(0, _scrollY);
  }

  // ─── Focus trap ───────────────────────────────────────────────────────────

  function getFocusable(modal) {
    return Array.prototype.slice
      .call(
        modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      )
      .filter(function (el) {
        // Skip anything not actually rendered — a hidden control would become a
        // dead stop in the cycle.
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
  }

  /**
   * Drives Tab movement entirely from script rather than intercepting only the
   * first/last boundary.
   *
   * Two engine behaviours make the boundary-only approach unreliable:
   *   - Safari's default keyboard policy skips buttons and links in the native
   *     Tab order, so a dialog built from them leaks focus straight out on the
   *     very first Tab, never reaching a boundary we could catch.
   *   - Safari and Firefox do not focus a control when it is clicked, leaving
   *     activeElement on <body>, which matches neither boundary either.
   *
   * Computing the next index ourselves makes the cycle identical everywhere.
   */
  function trapFocus(modal, e) {
    var focusable = getFocusable(modal);
    if (!focusable.length) return;

    e.preventDefault();

    var index = focusable.indexOf(document.activeElement);
    var step = e.shiftKey ? -1 : 1;
    var next;

    if (index === -1) {
      // Focus sat outside the dialog — re-enter from the matching end.
      next = e.shiftKey ? focusable[focusable.length - 1] : focusable[0];
    } else {
      next = focusable[(index + step + focusable.length) % focusable.length];
    }

    next.focus();
  }

  // ─── Dismiss ──────────────────────────────────────────────────────────────

  function dismiss(overlay) {
    // Guard: only ever execute once regardless of which trigger fired.
    if (_dismissed) return;
    _dismissed = true;

    // Persist across all future visits before any async work.
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}

    // Remove keyboard listener immediately so no further key events fire.
    if (_onKeyDown) {
      document.removeEventListener('keydown', _onKeyDown);
      _onKeyDown = null;
    }

    var modal = overlay.querySelector('.vol-popup');

    // Play card exit animation, then fade backdrop.
    if (modal) modal.classList.add('is-closing');
    overlay.classList.remove('vol-popup-overlay--visible');
    overlay.setAttribute('aria-hidden', 'true');

    // Restore page state immediately — scroll unlock and focus happen before
    // the overlay finishes fading so the page feels responsive at once.
    unlockScroll();
    if (_previousFocus && typeof _previousFocus.focus === 'function') {
      try {
        _previousFocus.focus();
      } catch (e) {}
    }

    // Purge from DOM only after all CSS transitions have finished.
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, EXIT_DURATION_MS);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  function init() {
    var overlay = document.getElementById('vol-popup-overlay');
    if (!overlay) return;

    var alreadySeen = false;
    try {
      alreadySeen = !!localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    // Returning visitor: drop the markup entirely rather than leaving a hidden
    // dialog parked in the document on every page view.
    if (alreadySeen) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      return;
    }

    var modal = overlay.querySelector('.vol-popup');
    if (!modal) return;

    var reducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var delay = reducedMotion ? 0 : SHOW_DELAY_MS;

    // ── Event wiring (before show — pointer-events:none prevents accidental triggers) ──

    var closeBtn = overlay.querySelector('.vol-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        dismiss(overlay);
      });
    }

    var skipBtn = overlay.querySelector('.vol-popup-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', function (e) {
        e.preventDefault();
        dismiss(overlay);
      });
    }

    // CTA: let the mailto: open first, then dismiss so the popup doesn't
    // linger after the user has clearly taken action.
    var ctaBtn = overlay.querySelector('.vol-popup-cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', function () {
        setTimeout(function () {
          dismiss(overlay);
        }, 150);
      });
    }

    // Backdrop tap/click — only fires when the raw overlay is the target,
    // not when clicking inside the card.
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss(overlay);
    });

    setTimeout(function () {
      // Capture focused element now, before scroll lock shifts layout.
      _previousFocus = document.activeElement;

      // Double requestAnimationFrame, with the scroll lock deliberately split into
      // the FIRST frame and the reveal into the SECOND:
      //
      //   Frame 1 — lockScroll() mutates body layout (scrollbar removal +
      //     paddingRight compensation) while the overlay is still invisible. Doing
      //     this here lets the layout settle a full frame BEFORE the backdrop-filter
      //     ever samples the page. If the lock ran in the same frame as the reveal,
      //     the filter would snapshot a shifting backdrop and flash.
      //   Frame 2 — apply the reveal atomically over the now-stable layout, so the
      //     card's entry animation starts from its committed from-state and the
      //     (already-promoted) backdrop-filter layer simply turns opaque.
      requestAnimationFrame(function () {
        lockScroll();

        requestAnimationFrame(function () {
          overlay.classList.add('vol-popup-overlay--visible');
          overlay.removeAttribute('aria-hidden');

          // Release the card's GPU-layer hint once the entry animation finishes so
          // it doesn't stay permanently promoted after it has served its purpose.
          var releaseLayer = function () {
            modal.style.willChange = 'auto';
          };
          modal.addEventListener('animationend', releaseLayer, { once: true });
          // Under reduced motion there is no animation, so animationend never
          // fires and the hint would stay promoted for the life of the page.
          if (reducedMotion) releaseLayer();

          var focusTarget = modal.querySelector('.vol-popup-close');
          // preventScroll: true stops the browser from triggering a scroll-into-view
          // on focus, which would cause a mid-animation layout recalculation.
          if (focusTarget) focusTarget.focus({ preventScroll: true });

          // Keyboard listener attached only now — popup is visible and interactive.
          // Attaching earlier would let Escape dismiss the popup before the user
          // ever saw it, permanently writing the "seen" flag to localStorage.
          _onKeyDown = function (e) {
            var key = e.key || e.keyCode;
            if (key === 'Escape' || key === 'Esc' || key === 27) {
              dismiss(overlay);
              return;
            }
            if ((key === 'Tab' || key === 9) && modal) {
              trapFocus(modal, e);
            }
          };
          document.addEventListener('keydown', _onKeyDown);
        });
      });
    }, delay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
