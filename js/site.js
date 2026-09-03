/* George Ponce Real Estate — site.js
   Nav drawer, language persistence, 3-step intake form with local drafts,
   affordability calculator. No dependencies. */

(function () {
  var LANG = document.documentElement.lang === 'es' ? 'es' : 'en';

  /* Remember the visitor's language from the page they're on. */
  try { localStorage.setItem('gp-lang', LANG); } catch (e) {}

  /* First visit to the EN homepage: honor a saved or browser Spanish preference. */
  if (document.body.dataset.autolang === '1') {
    try {
      var saved = localStorage.getItem('gp-lang-visited');
      if (!saved) {
        localStorage.setItem('gp-lang-visited', '1');
        var pref = (navigator.language || '').toLowerCase();
        if (LANG === 'en' && pref.indexOf('es') === 0) {
          window.location.replace('/es/');
          return;
        }
      }
    } catch (e) {}
  }

  /* Mobile drawer */
  var burger = document.querySelector('.nav-burger');
  var nav = document.querySelector('.site-nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Intake form ---------- */
  var form = document.getElementById('lead-form');
  if (form) {
    var steps = form.querySelectorAll('.form-step');
    var stepLabel = form.querySelector('.step-label');
    var fill = form.querySelector('.fill');
    var pct = form.querySelector('.pct');
    var msg = form.querySelector('.form-msg');
    var current = 0;
    var T = LANG === 'es' ? {
      step: function (n, t) { return 'Paso ' + n + ' de ' + t; },
      saved: 'Guardado. Puede cerrar esta página y regresar cuando quiera.',
      sending: 'Enviando…',
      ok: '¡Listo! George recibió su información y le responde pronto, normalmente el mismo día.',
      err: 'No se pudo enviar en este momento. Llámeme o envíeme un texto al (623) 853-5241, o escriba a george@georgeponcerealty.com.'
    } : {
      step: function (n, t) { return 'Step ' + n + ' of ' + t; },
      saved: 'Saved. You can close this page and come back anytime.',
      sending: 'Sending…',
      ok: 'Done! George has your info and will get back to you soon, usually the same day.',
      err: 'That didn’t go through. Call or text me at (623) 853-5241, or email george@georgeponcerealty.com.'
    };

    var DRAFT_KEY = 'gp-lead-draft';

    function fieldsOf(step) {
      return step.querySelectorAll('input, select, textarea');
    }

    function saveDraft() {
      var data = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (el.name) data[el.name] = el.value;
      });
      data._step = current;
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {}
    }

    function restoreDraft() {
      var raw = null;
      try { raw = localStorage.getItem(DRAFT_KEY); } catch (e) {}
      if (!raw) return;
      try {
        var data = JSON.parse(raw);
        form.querySelectorAll('input, select, textarea').forEach(function (el) {
          if (el.name && data[el.name] != null) el.value = data[el.name];
        });
        if (data._step > 0 && data._step < steps.length) { current = data._step; }
      } catch (e) {}
    }

    function show(n) {
      current = n;
      steps.forEach(function (s, i) { s.classList.toggle('on', i === n); });
      var pc = Math.round(((n + 1) / steps.length) * 100);
      if (n === 0) pc = 34; /* design spec: step 1 shows 34% */
      if (stepLabel) stepLabel.textContent = T.step(n + 1, steps.length);
      if (fill) fill.style.width = pc + '%';
      if (pct) pct.textContent = pc + '%';
      var back = form.querySelector('.btn-back');
      if (back) back.style.display = n === 0 ? 'none' : 'inline';
      var next = form.querySelector('.btn-next');
      var submitLabels = LANG === 'es' ? ['Continuar', 'Continuar', 'Enviar a George'] : ['Continue', 'Continue', 'Send to George'];
      if (next) next.textContent = submitLabels[n] || submitLabels[0];
    }

    form.addEventListener('input', saveDraft);

    var saveBtn = form.querySelector('.save-note');
    if (saveBtn) {
      saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        saveDraft();
        if (msg) { msg.textContent = T.saved; msg.className = 'form-msg ok'; }
      });
    }

    var backBtn = form.querySelector('.btn-back');
    if (backBtn) backBtn.addEventListener('click', function (e) { e.preventDefault(); show(current - 1); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (msg) { msg.textContent = ''; msg.className = 'form-msg'; }
      if (current < steps.length - 1) { show(current + 1); saveDraft(); return; }

      /* Final submit */
      var data = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (el.name) data[el.name] = el.value;
      });
      data.lang = LANG;
      data.page = window.location.pathname;
      if (msg) { msg.textContent = T.sending; msg.className = 'form-msg'; }
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('bad status');
        if (msg) { msg.textContent = T.ok; msg.className = 'form-msg ok'; }
        form.querySelectorAll('.btn-next, .btn-back').forEach(function (b) { b.style.display = 'none'; });
        try { localStorage.removeItem(DRAFT_KEY); } catch (err) {}
      }).catch(function () {
        if (msg) { msg.textContent = T.err; msg.className = 'form-msg err'; }
      });
    });

    restoreDraft();
    show(current);
  }

  /* ---------- Renter questionnaire (renting page) ---------- */
  var rq = document.getElementById('rq-form');
  if (rq) {
    var rqMsg = rq.querySelector('.form-msg');
    var RT = LANG === 'es' ? {
      sending: 'Enviando…',
      ok: '¡Listo! George recibió sus respuestas y le contacta pronto, normalmente el mismo día.',
      err: 'No se pudo enviar en este momento. Llámeme o envíeme un texto al (623) 853-5241, o escriba a george@georgeponcerealty.com.',
      need: 'Déjeme un teléfono o un correo para poder responderle.'
    } : {
      sending: 'Sending…',
      ok: 'Done! George has your answers and will reach out soon, usually the same day.',
      err: 'That didn’t go through. Call or text me at (623) 853-5241, or email george@georgeponcerealty.com.',
      need: 'Leave a phone number or an email so I can get back to you.'
    };
    rq.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = { type: 'questionnaire' };
      rq.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (el.name) data[el.name] = el.value;
      });
      if (!data.phone && !data.email) {
        if (rqMsg) { rqMsg.textContent = RT.need; rqMsg.className = 'form-msg err'; }
        return;
      }
      data.lang = LANG;
      data.page = window.location.pathname;
      if (rqMsg) { rqMsg.textContent = RT.sending; rqMsg.className = 'form-msg'; }
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('bad status');
        if (rqMsg) { rqMsg.textContent = RT.ok; rqMsg.className = 'form-msg ok'; }
        var btn = rq.querySelector('button[type="submit"]');
        if (btn) btn.style.display = 'none';
      }).catch(function () {
        if (rqMsg) { rqMsg.textContent = RT.err; rqMsg.className = 'form-msg err'; }
      });
    });
  }

  /* ---------- Affordability calculator (buying page) ---------- */
  var calc = document.getElementById('afford-calc');
  if (calc) {
    var out = document.getElementById('calc-out');
    calc.addEventListener('submit', function (e) {
      e.preventDefault();
      var income = parseFloat(calc.income.value.replace(/[^0-9.]/g, '')) || 0;
      var debts = parseFloat(calc.debts.value.replace(/[^0-9.]/g, '')) || 0;
      var down = parseFloat(calc.down.value.replace(/[^0-9.]/g, '')) || 0;
      if (income <= 0) { out.style.display = 'none'; return; }

      /* Classic 28/36 guideline, 30-yr fixed at an assumed rate, taxes+insurance ~1.6%/yr. */
      var RATE = 0.0675 / 12, N = 360, TI = 0.016 / 12;
      var maxHousing = Math.min(income * 0.28, Math.max(income * 0.36 - debts, 0));
      if (maxHousing <= 0) { out.style.display = 'none'; return; }
      var f = Math.pow(1 + RATE, N);
      var perDollar = (RATE * f) / (f - 1); /* P&I per $1 of loan */
      var loan = maxHousing / (perDollar + TI);
      var price = loan + down;
      var lo = Math.round(price * 0.9 / 5000) * 5000;
      var hi = Math.round(price * 1.05 / 5000) * 5000;
      var fmt = function (n) { return '$' + n.toLocaleString(LANG === 'es' ? 'es-US' : 'en-US'); };
      document.getElementById('calc-range').textContent = fmt(lo) + ' – ' + fmt(hi);
      document.getElementById('calc-pay').textContent = fmt(Math.round(maxHousing / 10) * 10);
      out.style.display = 'block';
    });
  }
})();
