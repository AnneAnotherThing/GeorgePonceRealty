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
      /* If they worked the Ready-to-Buy Checker on the buying page, their
         readout rides along to George. */
      try { var buySum = localStorage.getItem('gp-bqc-summary'); if (buySum) data.buy_summary = buySum; } catch (err) {}
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

  /* ---------- Qualify Checker (renting page interactive walkthrough) ----------
     Five questions, one at a time. Every step has an "I'll check that later"
     escape hatch; the result is a friendly readout, never a pass/fail. Results
     pre-fill the questionnaire and ride along to George as qualify_summary. */
  var qcHost = document.getElementById('qc');
  var qcLaunch = document.getElementById('qc-launch');
  if (qcHost && qcLaunch) {
    var QT = LANG === 'es' ? {
      title: 'Verificador de Requisitos',
      later: 'Lo reviso después',
      back: '← Atrás',
      kickers: ['Paso 1 · Crédito', 'Paso 1 · Crédito', 'Paso 1 · Crédito', 'Paso 2 · Antecedentes', 'Paso 3 · Ingresos', 'Paso 4 · Historial', 'Paso 5 · Mascotas'],
      creditQ: '¿Conoce su puntaje de crédito?',
      creditSub: 'La mayoría de los listados piden 580 o más. No saberlo es completamente normal.',
      creditKnow: 'Sí, lo conozco', creditKnowH: 'Elija su rango en la siguiente pantalla.',
      creditHelp: 'No &mdash; ayúdeme a revisarlo', creditHelpH: 'Le doy dos lugares gratis. No afecta su puntaje.',
      checkQ: 'Revíselo gratis, ahora mismo',
      checkSub: 'Cualquiera de los dos funciona, es gratis, y revisar NO baja su puntaje. Tome una captura de pantalla &mdash; George se la pedirá después. Luego regrese a esta pestaña.',
      gotIt: 'Ya tengo mi número →',
      rangeQ: '¿En qué rango está?',
      rangeSub: 'Un rango es suficiente &mdash; nadie le pedirá el número exacto hoy.',
      ranges: ['700 o más', '640–699', '580–639', 'Menos de 580'],
      bgQ: 'En los últimos 5 años, ¿algún desalojo, delito grave, bancarrota o juicio?',
      bgSub: 'Los listados revisan 5 años hacia atrás. Lo más viejo va desapareciendo.',
      bgClear: 'No, nada de eso', bgHave: 'Sí, hay algo', bgHaveH: 'No es el final &mdash; casi siempre hay un camino. George lo ha visto todo.',
      bgUnsure: 'No estoy seguro',
      incQ: '¿Qué renta mensual tiene en mente?',
      incSub: 'Los listados quieren ver un ingreso familiar de 3 veces la renta. Hagamos la cuenta.',
      incPh: '$1,800', incBtn: 'Haga la cuenta',
      incMath: function (need, rent) { return 'Para una renta de <strong>' + rent + '</strong>, el hogar necesita mostrar cerca de <strong>' + need + '</strong> al mes en ingreso bruto (todos los adultos juntos, antes de impuestos).'; },
      incThere: 'Ahí estamos', incClose: 'Estamos cerca', incCloseH: 'Algunos listados son flexibles, y George sabe cuáles.',
      incNot: 'Todavía no', incNotH: 'Eso define el presupuesto, no la respuesta.',
      hisQ: '¿Sus últimos dos años de renta hablan bien de usted?',
      hisSub: 'Llamarán a sus propietarios actuales y anteriores: ¿pagó a tiempo, hubo daños, le rentarían de nuevo?',
      hisSolid: 'Sí, pagué a tiempo', hisMostly: 'Casi siempre', hisComplicated: 'Es complicado', hisComplicatedH: 'Familia, primer alquiler, o una mala racha &mdash; cuénteselo a George.',
      petQ: '¿Tiene mascotas?',
      petSub: 'La mayoría acepta perros pero no gatos, y cada listado es diferente. Esto solo afina la búsqueda.',
      petNone: 'No, ninguna', petDogs: 'Sí &mdash; perro(s)', petCats: 'Sí &mdash; gato(s)', petMix: 'Sí &mdash; varios',
      resultKicker: 'Su lectura', resultQ: 'Así se ve usted hoy',
      resultSub: 'Esto no es una decisión &mdash; es el punto de partida de la conversación con George.',
      labels: { credit: 'Crédito', background: 'Antecedentes', income: 'Ingresos', history: 'Historial', pets: 'Mascotas' },
      laterV: 'Lo revisará después &mdash; sin problema, no es un requisito para hablar con George.',
      creditV: { '700+': '700 o más &mdash; los propietarios van a competir por usted.', '640': '640–699 &mdash; sólido; casi todos los listados se abren.', '580': '580–639 &mdash; funciona; ese es gran parte del mercado.', 'low': 'Menos de 580 hoy &mdash; está empezando, no está fuera. George construye esto con clientes todos los días.' },
      creditLater: 'Pendiente: revisarlo gratis en Credit Karma o CreditWise (no baja su puntaje).',
      bgV: { clear: 'Limpio en los últimos 5 años.', have: 'Hay algo en los últimos 5 años &mdash; dígaselo a George; casi siempre hay un camino.', unsure: 'No está seguro &mdash; George puede ayudarle a leer su propio historial.' },
      incV: { there: 'El ingreso del hogar cubre 3 veces la renta.', close: 'Cerca de 3 veces &mdash; algunos listados son flexibles, y George sabe cuáles.', notyet: 'Aún no llega a 3 veces &mdash; eso define el presupuesto, no la respuesta.' },
      incMathShort: function (need, rent) { return ' (~' + need + '/mes para una renta de ' + rent + ')'; },
      hisV: { solid: 'Dos años pagando a tiempo &mdash; eso es oro para un propietario.', mostly: 'Casi siempre a tiempo &mdash; prepare la historia; George le ayuda a contarla.', complicated: 'Historial complicado &mdash; George empareja situaciones con propietarios flexibles.' },
      petV: { none: 'Sin mascotas &mdash; todos los listados están abiertos.', dogs: 'Perro(s) &mdash; la mayoría dice que sí; George filtra por usted.', cats: 'Gato(s) &mdash; hay menos listados, pero existen. George los busca.', mix: 'Varias mascotas &mdash; búsqueda más fina, pero se puede. Deles los detalles a George.' },
      promise: '“No se preocupe si no cumple con todo. Todavía puedo ayudarle — solo necesito hablar con usted primero.” — George',
      cta: 'Llevar mis resultados al cuestionario ↓',
      restart: 'Empezar de nuevo',
      sumLabels: { later: 'lo revisa después' }
    } : {
      title: 'Qualify Checker',
      later: "I'll check that later",
      back: '← Back',
      kickers: ['Step 1 · Credit', 'Step 1 · Credit', 'Step 1 · Credit', 'Step 2 · Background', 'Step 3 · Income', 'Step 4 · Rental history', 'Step 5 · Pets'],
      creditQ: 'Do you know your credit score?',
      creditSub: 'Most listings want 580 or better. Not knowing yours is completely normal.',
      creditKnow: 'Yes, I know it', creditKnowH: 'Pick your range on the next screen.',
      creditHelp: 'No &mdash; help me check it', creditHelpH: "I'll point you to two free places. No hit to your score.",
      checkQ: 'Check it free, right now',
      checkSub: "Either one works, both are free, and checking does NOT lower your score. Grab a screenshot &mdash; George will ask for it later. Then come back to this tab.",
      gotIt: "I've got my number →",
      rangeQ: 'Which range are you in?',
      rangeSub: 'A range is plenty &mdash; nobody needs your exact number today.',
      ranges: ['700 or above', '640–699', '580–639', 'Below 580'],
      bgQ: 'In the last 5 years: any evictions, felonies, bankruptcies, or judgments?',
      bgSub: 'Listings look back 5 years. Older than that keeps aging off.',
      bgClear: 'No, none of that', bgHave: 'Yes, there’s something', bgHaveH: "Not the end &mdash; there's almost always a path. George has seen it all.",
      bgUnsure: "I'm not sure",
      incQ: 'What monthly rent do you have in mind?',
      incSub: 'Listings want to see household income of 3 times the rent. Let’s do the math.',
      incPh: '$1,800', incBtn: 'Do the math',
      incMath: function (need, rent) { return 'For <strong>' + rent + '</strong> rent, the household needs to show about <strong>' + need + '</strong> a month in gross income (every adult combined, before taxes).'; },
      incThere: "We're there", incClose: "We're close", incCloseH: 'Some listings flex, and George knows which ones.',
      incNot: 'Not yet', incNotH: 'That sets the budget, not the answer.',
      hisQ: 'Will your last two years of renting speak well of you?',
      hisSub: "They'll call your current and past landlords: paid on time, any damages, would they rent to you again?",
      hisSolid: 'Yes, paid on time', hisMostly: 'Mostly', hisComplicated: "It's complicated", hisComplicatedH: 'Family, first rental, or a rough patch &mdash; tell George the story.',
      petQ: 'Do you have pets?',
      petSub: 'Most listings take dogs but not cats, and every one is different. This just sharpens the search.',
      petNone: 'No pets', petDogs: 'Yes &mdash; dog(s)', petCats: 'Yes &mdash; cat(s)', petMix: 'Yes &mdash; a mix',
      resultKicker: 'Your readout', resultQ: "Here's how you look today",
      resultSub: 'This is not a decision &mdash; it’s the starting point of your conversation with George.',
      labels: { credit: 'Credit', background: 'Background', income: 'Income', history: 'History', pets: 'Pets' },
      laterV: "You'll check this later &mdash; no problem, it's not required to talk to George.",
      creditV: { '700+': '700 or above &mdash; landlords will compete for you.', '640': '640–699 &mdash; solid; nearly every listing opens up.', '580': '580–639 &mdash; workable; that’s a big part of the market.', 'low': 'Below 580 today &mdash; you’re early, not out. George builds this with clients every day.' },
      creditLater: 'To do: check it free at Credit Karma or CreditWise (no hit to your score).',
      bgV: { clear: 'Clear for the last 5 years.', have: 'Something in the last 5 years &mdash; tell George; there’s almost always a path.', unsure: 'Not sure &mdash; George can help you read your own record.' },
      incV: { there: 'Household income covers 3 times the rent.', close: 'Close to 3 times &mdash; some listings flex, and George knows which.', notyet: 'Not at 3 times yet &mdash; that sets the budget, not the answer.' },
      incMathShort: function (need, rent) { return ' (~' + need + '/mo for ' + rent + ' rent)'; },
      hisV: { solid: 'Two years of on-time rent &mdash; that’s gold to a landlord.', mostly: 'Mostly on time &mdash; have the story ready; George helps you tell it.', complicated: 'Complicated history &mdash; George matches situations to flexible landlords.' },
      petV: { none: 'No pets &mdash; every listing is open.', dogs: 'Dog(s) &mdash; most listings say yes; George filters for you.', cats: 'Cat(s) &mdash; fewer listings, but they exist. George hunts them down.', mix: 'A mix of pets &mdash; a finer search, but doable. Give George the details.' },
      promise: '“Don’t worry if you don’t meet every requirement. I can still help you — I just need to talk to you first.” — George',
      cta: 'Take my results into the questionnaire ↓',
      restart: 'Start over',
      sumLabels: { later: 'checking later' }
    };

    var QC_KEY = 'gp-qc-answers';
    var qcAns = {};
    try { qcAns = JSON.parse(localStorage.getItem(QC_KEY) || '{}') || {}; } catch (e) { qcAns = {}; }
    var qcScreen = 'credit_know';
    var STEP_OF = { credit_know: 0, credit_check: 0, credit_range: 0, background: 1, income: 2, history: 3, pets: 4, result: 4 };
    var ORDER = ['credit_know', 'background', 'income', 'history', 'pets'];

    function qcSave() { try { localStorage.setItem(QC_KEY, JSON.stringify(qcAns)); } catch (e) {} }

    function money(n) { return '$' + Math.round(n).toLocaleString(LANG === 'es' ? 'es-US' : 'en-US'); }

    function dots() {
      var s = STEP_OF[qcScreen];
      var h = '';
      for (var i = 0; i < 5; i++) {
        h += '<span class="' + (qcScreen === 'result' ? 'done' : i < s ? 'done' : i === s ? 'now' : '') + '"></span>';
      }
      return h;
    }

    function opt(action, label, hint) {
      return '<button class="qc-opt" type="button" data-act="' + action + '">' + label + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</button>';
    }
    function laterBtn(step) { return '<button class="qc-later" type="button" data-act="later:' + step + '">' + QT.later + '</button>'; }
    function backBtn() { return qcScreen === 'credit_know' ? '' : '<button class="qc-back" type="button" data-act="back">' + QT.back + '</button>'; }

    function screenHtml() {
      var kicker = QT.kickers[{ credit_know: 0, credit_check: 1, credit_range: 2, background: 3, income: 4, history: 5, pets: 6 }[qcScreen]] || '';
      var body = '';
      if (qcScreen === 'credit_know') {
        body = '<p class="qc-q">' + QT.creditQ + '</p><p class="qc-sub">' + QT.creditSub + '</p><div class="qc-opts">'
          + opt('go:credit_range', QT.creditKnow, QT.creditKnowH)
          + opt('go:credit_check', QT.creditHelp, QT.creditHelpH)
          + '</div>' + laterBtn('credit');
      } else if (qcScreen === 'credit_check') {
        body = '<p class="qc-q">' + QT.checkQ + '</p><p class="qc-sub">' + QT.checkSub + '</p>'
          + '<div class="qc-links"><a href="https://www.creditkarma.com" target="_blank" rel="noopener">Credit Karma ↗</a><a href="https://www.creditwise.com" target="_blank" rel="noopener">CreditWise ↗</a></div>'
          + '<div class="qc-opts">' + opt('go:credit_range', QT.gotIt) + '</div>' + laterBtn('credit');
      } else if (qcScreen === 'credit_range') {
        body = '<p class="qc-q">' + QT.rangeQ + '</p><p class="qc-sub">' + QT.rangeSub + '</p><div class="qc-opts">'
          + opt('credit:700+', QT.ranges[0]) + opt('credit:640', QT.ranges[1]) + opt('credit:580', QT.ranges[2]) + opt('credit:low', QT.ranges[3])
          + '</div>' + laterBtn('credit');
      } else if (qcScreen === 'background') {
        body = '<p class="qc-q">' + QT.bgQ + '</p><p class="qc-sub">' + QT.bgSub + '</p><div class="qc-opts">'
          + opt('background:clear', QT.bgClear) + opt('background:have', QT.bgHave, QT.bgHaveH) + opt('background:unsure', QT.bgUnsure)
          + '</div>' + laterBtn('background');
      } else if (qcScreen === 'income') {
        var rent = qcAns.rent_aim || '';
        body = '<p class="qc-q">' + QT.incQ + '</p><p class="qc-sub">' + QT.incSub + '</p>'
          + '<div class="qc-input-row"><input id="qc-rent" type="text" inputmode="numeric" placeholder="' + QT.incPh + '" value="' + (rent ? money(rent) : '') + '"><button class="btn btn-navy" type="button" data-act="math">' + QT.incBtn + '</button></div>'
          + '<div id="qc-math-out">' + (rent ? '<div class="qc-math">' + QT.incMath(money(rent * 3), money(rent)) + '</div><div class="qc-opts">' + opt('income:there', QT.incThere) + opt('income:close', QT.incClose, QT.incCloseH) + opt('income:notyet', QT.incNot, QT.incNotH) + '</div>' : '') + '</div>'
          + laterBtn('income');
      } else if (qcScreen === 'history') {
        body = '<p class="qc-q">' + QT.hisQ + '</p><p class="qc-sub">' + QT.hisSub + '</p><div class="qc-opts">'
          + opt('history:solid', QT.hisSolid) + opt('history:mostly', QT.hisMostly) + opt('history:complicated', QT.hisComplicated, QT.hisComplicatedH)
          + '</div>' + laterBtn('history');
      } else if (qcScreen === 'pets') {
        body = '<p class="qc-q">' + QT.petQ + '</p><p class="qc-sub">' + QT.petSub + '</p><div class="qc-opts">'
          + opt('pets:none', QT.petNone) + opt('pets:dogs', QT.petDogs) + opt('pets:cats', QT.petCats) + opt('pets:mix', QT.petMix)
          + '</div>';
      } else if (qcScreen === 'result') {
        body = resultHtml();
        kicker = QT.resultKicker;
      }
      return '<div class="qc-head"><span class="t">' + QT.title + '</span><div class="qc-dots">' + dots() + '</div></div>'
        + '<div class="qc-body"><div class="qc-step">'
        + (kicker && qcScreen !== 'result' ? '<p class="qc-kicker">' + kicker + '</p>' : qcScreen === 'result' ? '<p class="qc-kicker">' + QT.resultKicker + '</p>' : '')
        + body + backBtn() + '</div></div>';
    }

    function verdict(key) {
      var v = qcAns[key];
      if (v === 'later' || v == null) {
        if (key === 'credit') return { cls: 'later', txt: QT.creditLater };
        return { cls: 'later', txt: QT.laterV };
      }
      if (key === 'credit') return { cls: v === 'low' ? 'work' : 'good', txt: QT.creditV[v] };
      if (key === 'background') return { cls: v === 'clear' ? 'good' : v === 'have' ? 'work' : 'later', txt: QT.bgV[v] };
      if (key === 'income') {
        var extra = qcAns.rent_aim ? QT.incMathShort(money(qcAns.rent_aim * 3), money(qcAns.rent_aim)) : '';
        return { cls: v === 'there' ? 'good' : 'work', txt: QT.incV[v] + extra };
      }
      if (key === 'history') return { cls: v === 'solid' ? 'good' : 'work', txt: QT.hisV[v] };
      if (key === 'pets') return { cls: v === 'none' || v === 'dogs' ? 'good' : 'work', txt: QT.petV[v] };
      return { cls: 'later', txt: QT.laterV };
    }

    function badge(cls) {
      if (cls === 'good') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C08A3E" stroke-width="3.2"><path d="M20 6L9 17l-5-5"/></svg>';
      if (cls === 'work') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10203D" stroke-width="3"><path d="M5 12h14"/></svg>';
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A93A1" stroke-width="2.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5l3 1.8"/></svg>';
    }

    function resultHtml() {
      var rows = '';
      ['credit', 'background', 'income', 'history', 'pets'].forEach(function (k) {
        var v = verdict(k);
        rows += '<div class="row"><div class="badge ' + v.cls + '">' + badge(v.cls) + '</div><div><div class="rl">' + QT.labels[k] + '</div><div class="rv">' + v.txt + '</div></div></div>';
      });
      return '<p class="qc-q">' + QT.resultQ + '</p><p class="qc-sub">' + QT.resultSub + '</p>'
        + '<div class="qc-result">' + rows + '</div>'
        + '<p class="qc-promise">' + QT.promise + '</p>'
        + '<div class="qc-cta-row"><button class="btn btn-gold" type="button" data-act="tofrm">' + QT.cta + '</button>'
        + '<button class="qc-restart" type="button" data-act="restart">' + QT.restart + '</button></div>';
    }

    function summaryText() {
      var parts = [];
      var plain = function (html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      ['credit', 'background', 'income', 'history', 'pets'].forEach(function (k) {
        var v = qcAns[k];
        if (v == null) return;
        parts.push(plain(QT.labels[k]) + ': ' + (v === 'later' ? QT.sumLabels.later : plain(verdict(k).txt)));
      });
      return parts.join(' | ');
    }

    function fillForm() {
      var form = document.getElementById('rq-form');
      if (!form) return;
      var hid = form.querySelector('[name="qualify_summary"]');
      if (hid) hid.value = summaryText();
      var creditSel = form.querySelector('[name="credit"]');
      var map = { '700+': QT.ranges[0], '640': QT.ranges[1], '580': QT.ranges[2], 'low': QT.ranges[3] };
      if (creditSel && !creditSel.value && map[qcAns.credit]) {
        var want = map[qcAns.credit].replace('–', '–');
        for (var i = 0; i < creditSel.options.length; i++) {
          if (creditSel.options[i].text.replace(/\s/g, '') === want.replace(/\s/g, '')) { creditSel.selectedIndex = i; break; }
        }
      }
      var budget = form.querySelector('[name="budget"]');
      if (budget && !budget.value && qcAns.rent_aim) budget.value = money(qcAns.rent_aim);
      var pets = form.querySelector('[name="pets"]');
      var petTxt = { none: LANG === 'es' ? 'Ninguna' : 'None', dogs: LANG === 'es' ? 'Perro(s)' : 'Dog(s)', cats: LANG === 'es' ? 'Gato(s)' : 'Cat(s)', mix: LANG === 'es' ? 'Varias' : 'A mix' };
      if (pets && !pets.value && qcAns.pets && qcAns.pets !== 'later') pets.value = petTxt[qcAns.pets] || '';
    }

    function next(after) {
      var i = ORDER.indexOf(after === 'credit' ? 'credit_know' : after);
      qcScreen = i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : 'result';
      if (qcScreen === 'result') { fillForm(); }
      render();
    }

    function render() {
      qcHost.innerHTML = screenHtml();
      var input = qcHost.querySelector('#qc-rent');
      if (input) {
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doMath(); } });
      }
    }

    function doMath() {
      var input = qcHost.querySelector('#qc-rent');
      var rent = parseFloat((input.value || '').replace(/[^0-9.]/g, '')) || 0;
      if (rent <= 0) { input.focus(); return; }
      qcAns.rent_aim = rent;
      qcSave();
      var out = qcHost.querySelector('#qc-math-out');
      out.innerHTML = '<div class="qc-math">' + QT.incMath(money(rent * 3), money(rent)) + '</div><div class="qc-opts">'
        + opt('income:there', QT.incThere) + opt('income:close', QT.incClose, QT.incCloseH) + opt('income:notyet', QT.incNot, QT.incNotH) + '</div>';
    }

    qcHost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'math') { doMath(); return; }
      if (act === 'back') {
        if (qcScreen === 'credit_check' || qcScreen === 'credit_range') { qcScreen = 'credit_know'; }
        else if (qcScreen === 'result') { qcScreen = 'pets'; }
        else { var i = ORDER.indexOf(qcScreen); qcScreen = ORDER[Math.max(0, i - 1)]; }
        render(); return;
      }
      if (act === 'restart') { qcAns = {}; qcSave(); qcScreen = 'credit_know'; render(); return; }
      if (act === 'tofrm') {
        fillForm();
        var target = document.getElementById('questionnaire');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        var nameInput = document.getElementById('rq-name');
        if (nameInput) setTimeout(function () { nameInput.focus({ preventScroll: true }); }, 700);
        return;
      }
      var m = act.split(':');
      if (m[0] === 'go') { qcScreen = m[1]; render(); return; }
      if (m[0] === 'later') { qcAns[m[1]] = 'later'; qcSave(); next(m[1]); return; }
      /* answer:value */
      qcAns[m[0]] = m[1];
      qcSave();
      next(m[0]);
    });

    qcLaunch.addEventListener('click', function () {
      qcHost.hidden = false;
      qcLaunch.style.display = 'none';
      qcScreen = 'credit_know';
      render();
      qcHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* If they finished the checker on an earlier visit, quietly re-arm the
       summary so it still reaches George when they submit the form. */
    if (Object.keys(qcAns).length) fillForm();
  }

  /* ---------- Ready-to-Buy Checker (buying page interactive walkthrough) ----------
     Same spirit as the renting Qualify Checker: five lender questions, one at
     a time, "later" always an answer, friendly readout, never pass/fail. If
     they did the renting checker, their credit answer greets them here.
     Results pre-fill and run the affordability calculator, and ride to George
     as buy_summary on the get-started form. */
  var bqcHost = document.getElementById('bqc');
  var bqcLaunch = document.getElementById('bqc-launch');
  if (bqcHost && bqcLaunch) {
    var BT = LANG === 'es' ? {
      title: 'Verificador para Comprar',
      later: 'Lo reviso después',
      back: '← Atrás',
      kickers: ['Paso 1 · Crédito', 'Paso 1 · Crédito', 'Paso 1 · Crédito', 'Paso 2 · Enganche', 'Paso 3 · Ingresos y deudas', 'Paso 4 · Trabajo', 'Paso 5 · Prestamista'],
      confirmQ: function (range) { return 'Cuando la meta era rentar, usted puso su crédito cerca de <strong>' + range + '</strong>. ¿Sigue igual?'; },
      confirmSub: 'Comprar es el siguiente escalón de la misma escalera — sus respuestas de renta nos dan ventaja.',
      confirmYes: 'Sí, sigue igual', confirmNo: 'Ya cambió', confirmNoH: 'Elija el rango nuevo.',
      creditQ: '¿Conoce su puntaje de crédito?',
      creditSub: 'Los préstamos convencionales piden 620 o más; FHA funciona desde 580 con 3.5% de enganche. No saberlo es completamente normal.',
      creditKnow: 'Sí, lo conozco', creditKnowH: 'Elija su rango en la siguiente pantalla.',
      creditHelp: 'No &mdash; ayúdeme a revisarlo', creditHelpH: 'Le doy dos lugares gratis. No afecta su puntaje.',
      checkQ: 'Revíselo gratis, ahora mismo',
      checkSub: 'Cualquiera de los dos funciona, es gratis, y revisar NO baja su puntaje. Tome una captura de pantalla &mdash; George se la pedirá después. Luego regrese a esta pestaña.',
      gotIt: 'Ya tengo mi número →',
      rangeQ: '¿En qué rango está?',
      rangeSub: 'Un rango es suficiente &mdash; nadie le pedirá el número exacto hoy.',
      ranges: ['700 o más', '640–699', '580–639', 'Menos de 580'],
      downQ: '¿Cuánto ha ahorrado para el enganche hasta hoy?',
      downSub: 'Cada dólar cuenta más de lo que la gente cree &mdash; los préstamos FHA empiezan en solo 3.5% de enganche. Ponga lo que tiene y mire.',
      downPh: '$10,000', downBtn: 'Haga la cuenta',
      downMath: function (price, saved) { return 'Con <strong>' + saved + '</strong> ahorrados, un enganche de 3.5% abre casas de alrededor de <strong>' + price + '</strong>. Los costos de cierre agregan 2&ndash;3%, y hay programas de ayuda que suman a su favor &mdash; George los conoce.'; },
      downLow: function (saved) { return 'Con <strong>' + saved + '</strong> ahorrados hoy, el enganche es la parte que hay que construir &mdash; y los programas de ayuda y los prestamistas de George son exactamente las herramientas para eso.'; },
      downThere: 'Eso cubre lo que queremos', downClose: 'Estamos cerca', downCloseH: 'Los programas de ayuda cierran brechas así todo el tiempo.',
      downNot: 'Todavía estamos ahorrando', downNotH: 'Eso define el calendario, no la respuesta.',
      incQ: '¿Qué entra y qué sale cada mes?',
      incSub: 'Los prestamistas mantienen el pago de la casa cerca del 28% del ingreso bruto, con todas las deudas debajo de más o menos el 36%. Números aproximados están bien.',
      incLabel1: 'Ingreso mensual del hogar, antes de impuestos', incPh1: '$5,000',
      incLabel2: 'Pagos de deudas al mes (carros, tarjetas, préstamos &mdash; no la renta)', incPh2: '$450',
      incBtn: 'Haga la cuenta',
      incMath: function (pay, inc) { return 'Con <strong>' + inc + '</strong> entrando, los prestamistas van a dimensionar su pago de casa cerca de <strong>' + pay + '</strong> al mes &mdash; impuestos y seguro incluidos.'; },
      incTight: 'Ahora mismo las deudas ocupan toda la guía. Eso es una conversación de plan, no un callejón sin salida &mdash; los prestamistas de George desenredan esto cada semana.',
      incThere: 'Eso suena manejable', incClose: 'Más apretado de lo que esperaba', incCloseH: 'El programa de préstamo correcto lo puede estirar.',
      incNot: 'No estoy seguro', incNotH: 'Veinte minutos con un prestamista lo hace real.',
      workQ: '¿Dos años de trabajo estable?',
      workSub: 'A los prestamistas les gustan dos años en la misma línea de trabajo. Cambiar de empleo dentro del mismo campo está bien.',
      workSolid: 'Sí, estable', workNewer: 'Menos que eso', workNewerH: 'Algunos programas trabajan con menos &mdash; traiga los detalles.',
      workSelf: 'Trabajo por mi cuenta', workSelfH: 'Muy posible &mdash; planee dos años de declaraciones de impuestos.',
      workComp: 'Es complicado', workCompH: 'Cuéntele la historia a George. Los prestamistas tienen más caminos de los que la gente cree.',
      lenderQ: '¿Ya habló con un prestamista?',
      lenderSub: 'La preaprobación es gratis, no compromete nada, y nos dice el presupuesto real. Es la Etapa 1 del camino de abajo.',
      lenderPre: 'Ya estoy preaprobado', lenderPreH: 'Mándele la carta a George &mdash; puede buscar casa hoy mismo.',
      lenderTalk: 'Ya empezamos a hablar',
      lenderNot: 'Todavía no', lenderNotH: 'George le presenta prestamistas bilingües de confianza &mdash; gratis, sin compromiso.',
      resultKicker: 'Su lectura', resultQ: 'Así se ve usted hoy',
      resultSub: 'Esto no es una decisión &mdash; es el punto de partida de la conversación con George.',
      labels: { credit: 'Crédito', down: 'Enganche', income: 'Ingresos y deudas', work: 'Trabajo', lender: 'Prestamista' },
      laterV: 'Lo revisará después &mdash; sin problema, no es un requisito para hablar con George.',
      creditLater: 'Pendiente: revisarlo gratis en Credit Karma o CreditWise (no baja su puntaje).',
      creditV: { '700+': '700 o más &mdash; va a ver las mejores tasas del tablero.', '640': '640–699 &mdash; los préstamos convencionales están a su alcance; piso firme.', '580': '580–639 &mdash; territorio FHA: 3.5% de enganche y muy comprable.', 'low': 'Menos de 580 hoy &mdash; está construyendo, no bloqueado. George y un prestamista trazan la subida.' },
      downV: { there: 'El ahorro cubre el enganche para el rango que quiere.', close: 'Cerca &mdash; los programas de ayuda cierran brechas como esta.', notyet: 'Todavía ahorrando &mdash; eso define el calendario, no la respuesta.' },
      downShort: function (saved) { return ' (' + saved + ' ahorrados hasta hoy)'; },
      incV: { there: 'Hay espacio para el pago de una casa en el panorama mensual.', close: 'Apretado pero manejable &mdash; el programa correcto lo estira.', notyet: 'Aún no está claro &mdash; una llamada con un prestamista lo hace real.' },
      incShort: function (pay) { return ' (~' + pay + '/mes de zona de pago)'; },
      workV: { solid: 'Dos años estables &mdash; exactamente lo que quieren ver los prestamistas.', newer: 'Poco tiempo en el empleo &mdash; algunos programas trabajan con eso; traiga los detalles.', selfemp: 'Por su cuenta &mdash; muy posible con dos años de declaraciones.', complicated: 'Historial complicado &mdash; cuénteselo a George; hay más caminos de los que la gente cree.' },
      lenderV: { preapproved: 'Preaprobado &mdash; puede buscar casa hoy. Mándele la carta a George.', talking: 'Conversación iniciada &mdash; bien; George lo lleva hasta la carta.', notyet: 'Sin prestamista aún &mdash; George le presenta prestamistas bilingües de confianza, gratis y sin compromiso.' },
      promise: '“No se preocupe si no cumple con todo. Todavía puedo ayudarle — solo necesito hablar con usted primero.” — George',
      cta: 'Ver mi rango de precio en la calculadora ↑',
      restart: 'Empezar de nuevo',
      sumLabels: { later: 'lo revisa después' }
    } : {
      title: 'Ready-to-Buy Checker',
      later: "I'll check that later",
      back: '← Back',
      kickers: ['Step 1 · Credit', 'Step 1 · Credit', 'Step 1 · Credit', 'Step 2 · Down payment', 'Step 3 · Income & debts', 'Step 4 · Work history', 'Step 5 · Lender'],
      confirmQ: function (range) { return 'When renting was the goal, you put your credit around <strong>' + range + '</strong>. Still about right?'; },
      confirmSub: 'Buying is the next rung on the same ladder — your renting answers give us a head start.',
      confirmYes: 'Yes, still there', confirmNo: "It's different now", confirmNoH: 'Pick the new range.',
      creditQ: 'Do you know your credit score?',
      creditSub: 'Conventional loans like 620 or better; FHA works from 580 with 3.5% down. Not knowing yours is completely normal.',
      creditKnow: 'Yes, I know it', creditKnowH: 'Pick your range on the next screen.',
      creditHelp: 'No &mdash; help me check it', creditHelpH: "I'll point you to two free places. No hit to your score.",
      checkQ: 'Check it free, right now',
      checkSub: "Either one works, both are free, and checking does NOT lower your score. Grab a screenshot &mdash; George will ask for it later. Then come back to this tab.",
      gotIt: "I've got my number →",
      rangeQ: 'Which range are you in?',
      rangeSub: 'A range is plenty &mdash; nobody needs your exact number today.',
      ranges: ['700 or above', '640–699', '580–639', 'Below 580'],
      downQ: 'What have you saved for the down payment so far?',
      downSub: 'Every dollar counts more than people think &mdash; FHA loans start at just 3.5% down. Put in what you have and watch.',
      downPh: '$10,000', downBtn: 'Do the math',
      downMath: function (price, saved) { return 'With <strong>' + saved + '</strong> saved, a 3.5% down payment opens homes around <strong>' + price + '</strong>. Closing costs add 2&ndash;3%, and down-payment help programs can add to your pile &mdash; George knows them.'; },
      downLow: function (saved) { return 'With <strong>' + saved + '</strong> saved today, the down payment is the part to build &mdash; and assistance programs plus George’s lenders are exactly the tools for it.'; },
      downThere: 'That covers what we want', downClose: "We're close", downCloseH: 'Assistance programs bridge gaps like this all the time.',
      downNot: 'Still saving', downNotH: 'That sets the timeline, not the answer.',
      incQ: "What's coming in and going out each month?",
      incSub: 'Lenders keep the house payment near 28% of gross income, with all debts together under about 36%. Rough numbers are fine.',
      incLabel1: 'Household income each month, before taxes', incPh1: '$5,000',
      incLabel2: 'Monthly debt payments (cars, cards, loans &mdash; not rent)', incPh2: '$450',
      incBtn: 'Do the math',
      incMath: function (pay, inc) { return 'With <strong>' + inc + '</strong> coming in, lenders will size your house payment around <strong>' + pay + '</strong> a month &mdash; taxes and insurance included.'; },
      incTight: 'Right now debts take up the whole guideline. That’s a plan conversation, not a dead end &mdash; George’s lenders untangle this every week.',
      incThere: 'That sounds workable', incClose: 'Tighter than I hoped', incCloseH: 'The right loan program can stretch it.',
      incNot: "I'm not sure", incNotH: 'Twenty minutes with a lender makes it real.',
      workQ: 'Two years of steady work history?',
      workSub: 'Lenders like two years in the same line of work. Changing jobs inside the same field is fine.',
      workSolid: 'Yes, steady', workNewer: 'Newer than that', workNewerH: 'Some programs work with less &mdash; bring the details.',
      workSelf: "I'm self-employed", workSelfH: 'Very doable &mdash; plan on two years of tax returns.',
      workComp: "It's complicated", workCompH: 'Tell George the story. Lenders have more paths than people think.',
      lenderQ: 'Have you talked to a lender yet?',
      lenderSub: "Pre-approval is free, locks nothing in, and tells us the real budget. It's Stage 1 of the journey below.",
      lenderPre: 'Pre-approved already', lenderPreH: 'Send George the letter &mdash; you can shop today.',
      lenderTalk: "We've started talking",
      lenderNot: 'Not yet', lenderNotH: 'George introduces trusted bilingual lenders &mdash; free, no obligation.',
      resultKicker: 'Your readout', resultQ: "Here's how you look today",
      resultSub: 'This is not a decision &mdash; it’s the starting point of your conversation with George.',
      labels: { credit: 'Credit', down: 'Down payment', income: 'Income & debts', work: 'Work history', lender: 'Lender' },
      laterV: "You'll check this later &mdash; no problem, it's not required to talk to George.",
      creditLater: 'To do: check it free at Credit Karma or CreditWise (no hit to your score).',
      creditV: { '700+': '700 or above &mdash; you’ll see the best rates on the board.', '640': '640–699 &mdash; conventional loans are in reach; solid footing.', '580': '580–639 &mdash; FHA territory: 3.5% down and very buyable.', 'low': 'Below 580 today &mdash; you’re building, not blocked. George and a lender can map the climb.' },
      downV: { there: 'Savings cover the down payment for the range you want.', close: 'Close &mdash; assistance programs bridge gaps like this.', notyet: 'Still saving &mdash; that sets the timeline, not the answer.' },
      downShort: function (saved) { return ' (' + saved + ' saved so far)'; },
      incV: { there: 'Room for a house payment in the monthly picture.', close: 'Tight but workable &mdash; the right program can stretch it.', notyet: 'Not sure yet &mdash; a lender call makes it real.' },
      incShort: function (pay) { return ' (~' + pay + '/mo payment zone)'; },
      workV: { solid: 'Two steady years &mdash; exactly what lenders want to see.', newer: 'Newer on the job &mdash; some programs work with that; bring the details.', selfemp: 'Self-employed &mdash; very doable with two years of tax returns.', complicated: 'Complicated history &mdash; tell George; lenders have more paths than people think.' },
      lenderV: { preapproved: 'Pre-approved &mdash; ready to shop today. Send George the letter.', talking: 'Conversation started &mdash; good; George can get you to the letter.', notyet: 'No lender yet &mdash; George introduces trusted bilingual lenders, free, no obligation.' },
      promise: '“Don’t worry if you don’t meet every requirement. I can still help you — I just need to talk to you first.” — George',
      cta: 'See my price range in the calculator ↑',
      restart: 'Start over',
      sumLabels: { later: 'checking later' }
    };

    var BQC_KEY = 'gp-bqc-answers';
    var BQC_SUM_KEY = 'gp-bqc-summary';
    var bAns = {};
    try { bAns = JSON.parse(localStorage.getItem(BQC_KEY) || '{}') || {}; } catch (e) { bAns = {}; }

    /* The bridge from the renting checker: greet them with their own answer. */
    var rentCredit = null;
    try {
      var rqc = JSON.parse(localStorage.getItem('gp-qc-answers') || '{}') || {};
      if (rqc.credit && rqc.credit !== 'later') rentCredit = rqc.credit;
    } catch (e) {}
    var bEntry = rentCredit ? 'credit_confirm' : 'credit_know';
    var bScreen = bEntry;
    var B_STEP_OF = { credit_confirm: 0, credit_know: 0, credit_check: 0, credit_range: 0, down: 1, income: 2, work: 3, lender: 4, result: 4 };
    var B_ORDER = ['credit', 'down', 'income', 'work', 'lender'];
    var B_RANGE_LABEL = { '700+': 0, '640': 1, '580': 2, 'low': 3 };

    function bSave() { try { localStorage.setItem(BQC_KEY, JSON.stringify(bAns)); } catch (e) {} }
    function bMoney(n) { return '$' + Math.round(n).toLocaleString(LANG === 'es' ? 'es-US' : 'en-US'); }

    function bDots() {
      var s = B_STEP_OF[bScreen];
      var h = '';
      for (var i = 0; i < 5; i++) {
        h += '<span class="' + (bScreen === 'result' ? 'done' : i < s ? 'done' : i === s ? 'now' : '') + '"></span>';
      }
      return h;
    }

    function bOpt(action, label, hint) {
      return '<button class="qc-opt" type="button" data-act="' + action + '">' + label + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</button>';
    }
    function bLaterBtn(step) { return '<button class="qc-later" type="button" data-act="later:' + step + '">' + BT.later + '</button>'; }
    function bBackBtn() { return bScreen === bEntry ? '' : '<button class="qc-back" type="button" data-act="back">' + BT.back + '</button>'; }

    function bIncChips() {
      return '<div class="qc-opts">' + bOpt('income:there', BT.incThere) + bOpt('income:close', BT.incClose, BT.incCloseH) + bOpt('income:notyet', BT.incNot, BT.incNotH) + '</div>';
    }
    function bDownChips() {
      return '<div class="qc-opts">' + bOpt('down:there', BT.downThere) + bOpt('down:close', BT.downClose, BT.downCloseH) + bOpt('down:notyet', BT.downNot, BT.downNotH) + '</div>';
    }
    function bDownPrice() {
      return Math.round((bAns.down_saved || 0) / 0.035 / 5000) * 5000;
    }
    function bDownMathHtml() {
      if (!bAns.down_saved) return '';
      var price = bDownPrice();
      var line = price >= 100000 ? BT.downMath(bMoney(price), bMoney(bAns.down_saved)) : BT.downLow(bMoney(bAns.down_saved));
      return '<div class="qc-math">' + line + '</div>' + bDownChips();
    }
    function bIncMathHtml() {
      if (!bAns.income_amt) return '';
      var line = bAns.pay_zone > 0 ? BT.incMath(bMoney(bAns.pay_zone), bMoney(bAns.income_amt)) : BT.incTight;
      return '<div class="qc-math">' + line + '</div>' + bIncChips();
    }

    function bScreenHtml() {
      var kicker = BT.kickers[{ credit_confirm: 0, credit_know: 0, credit_check: 1, credit_range: 2, down: 3, income: 4, work: 5, lender: 6 }[bScreen]] || '';
      var body = '';
      if (bScreen === 'credit_confirm') {
        body = '<p class="qc-q">' + BT.confirmQ(BT.ranges[B_RANGE_LABEL[rentCredit]]) + '</p><p class="qc-sub">' + BT.confirmSub + '</p><div class="qc-opts">'
          + bOpt('credit:' + rentCredit, BT.confirmYes)
          + bOpt('go:credit_range', BT.confirmNo, BT.confirmNoH)
          + bOpt('go:credit_check', BT.creditHelp, BT.creditHelpH)
          + '</div>' + bLaterBtn('credit');
      } else if (bScreen === 'credit_know') {
        body = '<p class="qc-q">' + BT.creditQ + '</p><p class="qc-sub">' + BT.creditSub + '</p><div class="qc-opts">'
          + bOpt('go:credit_range', BT.creditKnow, BT.creditKnowH)
          + bOpt('go:credit_check', BT.creditHelp, BT.creditHelpH)
          + '</div>' + bLaterBtn('credit');
      } else if (bScreen === 'credit_check') {
        body = '<p class="qc-q">' + BT.checkQ + '</p><p class="qc-sub">' + BT.checkSub + '</p>'
          + '<div class="qc-links"><a href="https://www.creditkarma.com" target="_blank" rel="noopener">Credit Karma ↗</a><a href="https://www.creditwise.com" target="_blank" rel="noopener">CreditWise ↗</a></div>'
          + '<div class="qc-opts">' + bOpt('go:credit_range', BT.gotIt) + '</div>' + bLaterBtn('credit');
      } else if (bScreen === 'credit_range') {
        body = '<p class="qc-q">' + BT.rangeQ + '</p><p class="qc-sub">' + BT.rangeSub + '</p><div class="qc-opts">'
          + bOpt('credit:700+', BT.ranges[0]) + bOpt('credit:640', BT.ranges[1]) + bOpt('credit:580', BT.ranges[2]) + bOpt('credit:low', BT.ranges[3])
          + '</div>' + bLaterBtn('credit');
      } else if (bScreen === 'down') {
        body = '<p class="qc-q">' + BT.downQ + '</p><p class="qc-sub">' + BT.downSub + '</p>'
          + '<div class="qc-input-row"><input id="bqc-down" type="text" inputmode="numeric" placeholder="' + BT.downPh + '" value="' + (bAns.down_saved ? bMoney(bAns.down_saved) : '') + '"><button class="btn btn-navy" type="button" data-act="downmath">' + BT.downBtn + '</button></div>'
          + '<div id="bqc-down-out">' + bDownMathHtml() + '</div>'
          + bLaterBtn('down');
      } else if (bScreen === 'income') {
        body = '<p class="qc-q">' + BT.incQ + '</p><p class="qc-sub">' + BT.incSub + '</p>'
          + '<p class="qc-sub" style="margin: 0 0 6px">' + BT.incLabel1 + '</p>'
          + '<div class="qc-input-row"><input id="bqc-inc" type="text" inputmode="numeric" placeholder="' + BT.incPh1 + '" value="' + (bAns.income_amt ? bMoney(bAns.income_amt) : '') + '"></div>'
          + '<p class="qc-sub" style="margin: 8px 0 6px">' + BT.incLabel2 + '</p>'
          + '<div class="qc-input-row"><input id="bqc-debt" type="text" inputmode="numeric" placeholder="' + BT.incPh2 + '" value="' + (bAns.debts_amt ? bMoney(bAns.debts_amt) : '') + '"><button class="btn btn-navy" type="button" data-act="incmath">' + BT.incBtn + '</button></div>'
          + '<div id="bqc-inc-out">' + bIncMathHtml() + '</div>'
          + bLaterBtn('income');
      } else if (bScreen === 'work') {
        body = '<p class="qc-q">' + BT.workQ + '</p><p class="qc-sub">' + BT.workSub + '</p><div class="qc-opts">'
          + bOpt('work:solid', BT.workSolid) + bOpt('work:newer', BT.workNewer, BT.workNewerH)
          + bOpt('work:selfemp', BT.workSelf, BT.workSelfH) + bOpt('work:complicated', BT.workComp, BT.workCompH)
          + '</div>' + bLaterBtn('work');
      } else if (bScreen === 'lender') {
        body = '<p class="qc-q">' + BT.lenderQ + '</p><p class="qc-sub">' + BT.lenderSub + '</p><div class="qc-opts">'
          + bOpt('lender:preapproved', BT.lenderPre, BT.lenderPreH) + bOpt('lender:talking', BT.lenderTalk)
          + bOpt('lender:notyet', BT.lenderNot, BT.lenderNotH)
          + '</div>' + bLaterBtn('lender');
      } else if (bScreen === 'result') {
        body = bResultHtml();
      }
      return '<div class="qc-head"><span class="t">' + BT.title + '</span><div class="qc-dots">' + bDots() + '</div></div>'
        + '<div class="qc-body"><div class="qc-step">'
        + '<p class="qc-kicker">' + (bScreen === 'result' ? BT.resultKicker : kicker) + '</p>'
        + body + bBackBtn() + '</div></div>';
    }

    function bVerdict(key) {
      var v = bAns[key];
      if (v === 'later' || v == null) {
        if (key === 'credit') return { cls: 'later', txt: BT.creditLater };
        return { cls: 'later', txt: BT.laterV };
      }
      if (key === 'credit') return { cls: v === 'low' ? 'work' : 'good', txt: BT.creditV[v] };
      if (key === 'down') {
        var extra = bAns.down_saved ? BT.downShort(bMoney(bAns.down_saved)) : '';
        return { cls: v === 'there' ? 'good' : 'work', txt: BT.downV[v] + extra };
      }
      if (key === 'income') {
        var extra2 = bAns.pay_zone > 0 ? BT.incShort(bMoney(bAns.pay_zone)) : '';
        return { cls: v === 'there' ? 'good' : 'work', txt: BT.incV[v] + extra2 };
      }
      if (key === 'work') return { cls: v === 'solid' || v === 'selfemp' ? 'good' : 'work', txt: BT.workV[v] };
      if (key === 'lender') return { cls: v === 'notyet' ? 'work' : 'good', txt: BT.lenderV[v] };
      return { cls: 'later', txt: BT.laterV };
    }

    function bBadge(cls) {
      if (cls === 'good') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C08A3E" stroke-width="3.2"><path d="M20 6L9 17l-5-5"/></svg>';
      if (cls === 'work') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10203D" stroke-width="3"><path d="M5 12h14"/></svg>';
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A93A1" stroke-width="2.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5l3 1.8"/></svg>';
    }

    function bResultHtml() {
      var rows = '';
      B_ORDER.forEach(function (k) {
        var v = bVerdict(k);
        rows += '<div class="row"><div class="badge ' + v.cls + '">' + bBadge(v.cls) + '</div><div><div class="rl">' + BT.labels[k] + '</div><div class="rv">' + v.txt + '</div></div></div>';
      });
      return '<p class="qc-q">' + BT.resultQ + '</p><p class="qc-sub">' + BT.resultSub + '</p>'
        + '<div class="qc-result">' + rows + '</div>'
        + '<p class="qc-promise">' + BT.promise + '</p>'
        + '<div class="qc-cta-row"><button class="btn btn-gold" type="button" data-act="tocalc">' + BT.cta + '</button>'
        + '<button class="qc-restart" type="button" data-act="restart">' + BT.restart + '</button></div>';
    }

    function bSummaryText() {
      var parts = [];
      var plain = function (html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      B_ORDER.forEach(function (k) {
        var v = bAns[k];
        if (v == null) return;
        parts.push(plain(BT.labels[k]) + ': ' + (v === 'later' ? BT.sumLabels.later : plain(bVerdict(k).txt)));
      });
      return parts.join(' | ');
    }

    function bStoreSummary() {
      var s = bSummaryText();
      try { if (s) localStorage.setItem(BQC_SUM_KEY, s); } catch (e) {}
    }

    function bFillCalc() {
      var calc = document.getElementById('afford-calc');
      if (!calc) return;
      if (bAns.income_amt) calc.income.value = bMoney(bAns.income_amt);
      if (bAns.income_amt) calc.debts.value = bAns.debts_amt ? bMoney(bAns.debts_amt) : '$0';
      if (bAns.down_saved) calc.down.value = bMoney(bAns.down_saved);
      if (bAns.income_amt) {
        if (typeof calc.requestSubmit === 'function') calc.requestSubmit();
        else calc.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }

    function bNext(after) {
      var i = B_ORDER.indexOf(after);
      bScreen = i >= 0 && i < B_ORDER.length - 1 ? B_ORDER[i + 1] : 'result';
      if (bScreen === 'result') { bStoreSummary(); }
      bRender();
    }

    function bRender() {
      bqcHost.innerHTML = bScreenHtml();
      var down = bqcHost.querySelector('#bqc-down');
      if (down) down.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); bDoDownMath(); } });
      var debt = bqcHost.querySelector('#bqc-debt');
      if (debt) debt.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); bDoIncMath(); } });
      var inc = bqcHost.querySelector('#bqc-inc');
      if (inc) inc.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); bDoIncMath(); } });
    }

    function bDoDownMath() {
      var input = bqcHost.querySelector('#bqc-down');
      var saved = parseFloat((input.value || '').replace(/[^0-9.]/g, '')) || 0;
      if (saved <= 0) { input.focus(); return; }
      bAns.down_saved = saved;
      bSave();
      bqcHost.querySelector('#bqc-down-out').innerHTML = bDownMathHtml();
    }

    function bDoIncMath() {
      var incEl = bqcHost.querySelector('#bqc-inc');
      var debtEl = bqcHost.querySelector('#bqc-debt');
      var inc = parseFloat((incEl.value || '').replace(/[^0-9.]/g, '')) || 0;
      var debts = parseFloat((debtEl.value || '').replace(/[^0-9.]/g, '')) || 0;
      if (inc <= 0) { incEl.focus(); return; }
      bAns.income_amt = inc;
      bAns.debts_amt = debts;
      var maxHousing = Math.min(inc * 0.28, Math.max(inc * 0.36 - debts, 0));
      bAns.pay_zone = Math.round(maxHousing / 10) * 10;
      bSave();
      bqcHost.querySelector('#bqc-inc-out').innerHTML = bIncMathHtml();
    }

    bqcHost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'downmath') { bDoDownMath(); return; }
      if (act === 'incmath') { bDoIncMath(); return; }
      if (act === 'back') {
        if (bScreen === 'credit_check' || bScreen === 'credit_range' || bScreen === 'credit_know') { bScreen = bEntry; }
        else if (bScreen === 'result') { bScreen = 'lender'; }
        else if (bScreen === 'down') { bScreen = bEntry; }
        else { var i = B_ORDER.indexOf(bScreen); bScreen = B_ORDER[Math.max(1, i - 1)]; }
        bRender(); return;
      }
      if (act === 'restart') {
        bAns = {}; bSave();
        try { localStorage.removeItem(BQC_SUM_KEY); } catch (err) {}
        bScreen = bEntry; bRender(); return;
      }
      if (act === 'tocalc') {
        bFillCalc();
        var calc = document.getElementById('afford-calc');
        if (calc) calc.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var m = act.split(':');
      if (m[0] === 'go') { bScreen = m[1]; bRender(); return; }
      if (m[0] === 'later') { bAns[m[1]] = 'later'; bSave(); bNext(m[1]); return; }
      bAns[m[0]] = m[1];
      bSave();
      bNext(m[0]);
    });

    bqcLaunch.addEventListener('click', function () {
      bqcHost.hidden = false;
      bqcLaunch.style.display = 'none';
      bScreen = bEntry;
      bRender();
      bqcHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* Finished on an earlier visit: quietly re-arm the summary for the form. */
    if (Object.keys(bAns).length) bStoreSummary();
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
