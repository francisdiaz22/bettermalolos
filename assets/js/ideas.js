(function () {
  'use strict';

  var submissionType = document.getElementById('submission-type');
  var requestedType = new URLSearchParams(window.location.search).get('submissionType');
  var allowedTypes = ['problem', 'idea', 'source', 'feature', 'volunteer'];

  if (submissionType && allowedTypes.includes(requestedType)) {
    submissionType.value = requestedType;
  }

  var anonymous = document.getElementById('is-anonymous');
  var contactFields = document.getElementById('contact-fields');
  if (!anonymous || !contactFields) return;

  var inputs = contactFields.querySelectorAll('input');

  function syncAnonymousState() {
    contactFields.hidden = anonymous.checked;
    contactFields.setAttribute('aria-hidden', String(anonymous.checked));

    inputs.forEach(function (input) {
      input.disabled = anonymous.checked;
      if (anonymous.checked) input.value = '';
    });
  }

  anonymous.addEventListener('change', syncAnonymousState);
  syncAnonymousState();
})();
