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
      try { var sellSum = localStorage.getItem('gp-sqc-summary'); if (sellSum) data.sell_summary = sellSum; } catch (err) {}
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

  /* ---------- Home-Worth Checker (listing page interactive walkthrough) ----------
     The seller sibling of the Qualify / Ready-to-Buy checkers: five questions,
     one at a time, "later" always an answer, never a verdict. The equity step
     does live walk-away math from the seller's own guess. Results ride to
     George as sell_summary on the get-started form. */
  var sqcHost = document.getElementById('sqc');
  var sqcLaunch = document.getElementById('sqc-launch');
  if (sqcHost && sqcLaunch) {
    var ST = LANG === 'es' ? {
      title: '¿Cuánto Vale Su Casa?',
      later: 'Lo reviso después',
      back: '← Atrás',
      kickers: { owned: 'Paso 1 · Tiempo con la casa', equity: 'Paso 2 · La cuenta del capital', condition: 'Paso 3 · Condición', timeline: 'Paso 4 · Calendario', next: 'Paso 5 · Siguiente paso' },
      ownedQ: '¿Cuánto tiempo lleva con la casa?',
      ownedSub: 'El tiempo construye capital. No hay respuesta mala aquí.',
      ownedA: 'Menos de 2 años', ownedAH: 'Vale la pena revisar tiempos e impuestos antes de listar.',
      ownedB: '2–5 años', ownedC: '5–15 años', ownedD: 'Más de 15 años',
      eqQ: 'Hagamos la cuenta que importa',
      eqSub: 'Su instinto sobre el valor está bien &mdash; el número real sale de los comparables de George, y ese análisis es gratis. Números aproximados funcionan.',
      eqLabel1: '¿En cuánto cree que se vendería hoy?', eqPh1: '$400,000',
      eqLabel2: '¿Cuánto queda de la hipoteca? (0 si está pagada)', eqPh2: '$220,000',
      eqBtn: 'Haga la cuenta',
      eqMath: function (net, worth) { return 'Con su cálculo de <strong>' + worth + '</strong>, después de pagar la hipoteca y los costos típicos de venta (~8%), usted saldría con alrededor de <strong>' + net + '</strong>.'; },
      eqTight: 'Con su cálculo, los costos de venta se comerían el capital. No lo tome como final &mdash; su cifra es el número más débil de esta cuenta, y los comparables muchas veces la superan. George ha navegado ventas con capital apretado.',
      eqMore: 'Más de lo que pensaba', eqExpected: 'Más o menos lo que calculaba',
      eqLess: 'Menos de lo que esperaba', eqLessH: 'Su cifra es el número más débil aquí &mdash; los comparables suelen dar sorpresas buenas.',
      condQ: '¿Cómo está la casa hoy?',
      condSub: 'Sea honesto &mdash; cada condición tiene su estrategia de venta.',
      condReady: 'Lista para estrenar', condLove: 'Le falta un poco de cariño', condLoveH: 'George solo recomienda arreglos que se pagan solos.',
      condWork: 'Necesita trabajo de verdad', condWorkH: 'Vender tal como está es una opción real.',
      condTenant: 'Tiene inquilinos ahora', condTenantH: 'Se puede vender &mdash; el calendario solo necesita coreografía.',
      timeQ: '¿Para cuándo lo está pensando?',
      timeSub: '«Solo curiosidad» es una respuesta excelente. De este lado no hay presión.',
      timeNow: 'Listo ya', timeSix: 'En los próximos 6 meses',
      timeCur: 'Solo curiosidad', timeCurH: 'La curiosidad es el mejor momento para planear.',
      nextQ: '¿A dónde iría después?',
      nextSub: 'La respuesta cambia el plan más de lo que la gente cree.',
      nextBigger: 'Comprar la siguiente casa aquí', nextBiggerH: 'Vender y comprar a la vez es la especialidad de George &mdash; una conversación cubre las dos.',
      nextSmaller: 'Algo más pequeño', nextLeaving: 'Salir de Arizona', nextUnsure: 'Todavía no sé',
      resultKicker: 'Su lectura', resultQ: 'Así se ve su venta hoy',
      resultSub: 'Esto no es un avalúo &mdash; es el punto de partida de la conversación con George.',
      labels: { owned: 'Tiempo', equity: 'Capital', condition: 'Condición', timeline: 'Calendario', next: 'Siguiente paso' },
      laterV: 'Lo revisará después &mdash; sin problema, no es un requisito para hablar con George.',
      ownedV: { under2: 'Menos de 2 años &mdash; revise tiempos e impuestos antes de listar; George lo camina con usted.', '2to5': '2–5 años &mdash; el capital ha tenido tiempo de crecer.', '5to15': '5–15 años &mdash; territorio primo de capital.', '15plus': 'Más de 15 años &mdash; esta venta probablemente es un momento financiero grande. Hay que tratarla así.' },
      eqV: { more: 'Más capital del que pensaba &mdash; un buen problema.', expected: 'Más o menos lo que calculaba &mdash; pulso firme.', less: 'Menos de lo que esperaba &mdash; recuerde: su cifra es el número más débil; los comparables suelen superarla.' },
      eqShort: function (net) { return ' (~' + net + ' suyos, según su cálculo)'; },
      eqShortTight: ' (apretado según su cálculo &mdash; los comparables deciden)',
      condV: { ready: 'Lista para estrenar &mdash; las fotos harán el trabajo pesado.', love: 'Un poco de cariño &mdash; George solo recomienda arreglos que se pagan solos.', work: 'Trabajo de verdad &mdash; vender tal como está es una opción real; el precio lo toma en cuenta.', tenant: 'Con inquilinos &mdash; se vende; el calendario solo necesita coreografía.' },
      timeV: { now: 'Listo ya &mdash; el análisis de comparables es el trabajo de las próximas 48 horas.', six: 'A seis meses &mdash; la ventana perfecta de preparación.', curious: 'Solo curiosidad &mdash; el mejor tipo de conversación de venta. Sin presión de este lado.' },
      nextV: { bigger: 'Vender y comprar aquí &mdash; un solo plan cubre los dos lados.', smaller: 'Algo más pequeño &mdash; liberar capital para el siguiente capítulo.', leaving: 'Salir de Arizona &mdash; George coordina con un agente donde usted aterrice.', unsure: 'Todavía no sabe &mdash; los números normalmente ayudan a decidir.' },
      promise: '“El número real no sale de un sitio web — sale de los comparables. El mío es gratis, y viene sin presión para listar.” — George',
      cta: 'Llevar mis respuestas a George →',
      restart: 'Empezar de nuevo',
      sumLabels: { later: 'lo revisa después' }
    } : {
      title: 'Home-Worth Checker',
      later: "I'll check that later",
      back: '← Back',
      kickers: { owned: 'Step 1 · Time owned', equity: 'Step 2 · The equity math', condition: 'Step 3 · Condition', timeline: 'Step 4 · Timeline', next: 'Step 5 · Next move' },
      ownedQ: 'How long have you owned the home?',
      ownedSub: 'Time builds equity. There are no wrong answers here.',
      ownedA: 'Less than 2 years', ownedAH: 'Worth a look at timing and taxes before listing.',
      ownedB: '2–5 years', ownedC: '5–15 years', ownedD: '15+ years',
      eqQ: "Let's do the math that matters",
      eqSub: 'Your gut number for the value is fine &mdash; the real one comes from George’s comps, and that analysis is free. Rough numbers work.',
      eqLabel1: 'What do you think it would sell for today?', eqPh1: '$400,000',
      eqLabel2: "What's left on the mortgage? (0 if it's paid off)", eqPh2: '$220,000',
      eqBtn: 'Do the math',
      eqMath: function (net, worth) { return 'At your <strong>' + worth + '</strong> guess, after paying off the mortgage and typical selling costs (~8%), you’d walk away with around <strong>' + net + '</strong>.'; },
      eqTight: 'By your guess, selling costs would eat the equity. Don’t take that as final &mdash; your guess is the weakest number in this math, and comps often beat it. George has navigated tight-equity sales before.',
      eqMore: 'More than I thought', eqExpected: 'About what I figured',
      eqLess: 'Less than I hoped', eqLessH: 'Your guess is the weakest number here &mdash; comps usually surprise people in a good way.',
      condQ: "How's the house doing these days?",
      condSub: 'Be honest &mdash; every condition has a selling strategy.',
      condReady: 'Move-in ready', condLove: 'Needs a little love', condLoveH: 'George only recommends fixes that pay for themselves.',
      condWork: 'Needs real work', condWorkH: 'Selling as-is is a real option.',
      condTenant: 'It has tenants right now', condTenantH: 'Sellable &mdash; the timing just needs choreography.',
      timeQ: 'When are you thinking?',
      timeSub: '“Just curious” is a great answer. There’s no pressure at this end.',
      timeNow: 'Ready now', timeSix: 'In the next 6 months',
      timeCur: 'Just curious', timeCurH: 'Curious is the best time to plan.',
      nextQ: 'Where would you go next?',
      nextSub: 'The answer changes the plan more than people think.',
      nextBigger: 'Buying our next home here', nextBiggerH: 'Selling and buying at once is George’s specialty &mdash; one conversation covers both.',
      nextSmaller: 'Something smaller', nextLeaving: 'Leaving Arizona', nextUnsure: 'Not sure yet',
      resultKicker: 'Your readout', resultQ: "Here's how your sale looks today",
      resultSub: 'This is not an appraisal &mdash; it’s the starting point of your conversation with George.',
      labels: { owned: 'Time owned', equity: 'Equity', condition: 'Condition', timeline: 'Timeline', next: 'Next move' },
      laterV: "You'll check this later &mdash; no problem, it's not required to talk to George.",
      ownedV: { under2: 'Under two years &mdash; look at timing and taxes before listing; George walks it with you.', '2to5': '2–5 years in &mdash; equity has had time to build.', '5to15': '5–15 years &mdash; prime equity territory.', '15plus': '15+ years &mdash; this sale is likely a big financial moment. Treat it like one.' },
      eqV: { more: 'More equity than you thought &mdash; a good problem to have.', expected: 'About what you figured &mdash; steady hands.', less: 'Less than you hoped &mdash; remember, your guess is the weakest number; comps often beat it.' },
      eqShort: function (net) { return ' (~' + net + ' walk-away by your guess)'; },
      eqShortTight: ' (tight by your guess &mdash; comps decide)',
      condV: { ready: 'Move-in ready &mdash; the photos will do the heavy lifting.', love: 'A little love needed &mdash; George only recommends fixes that pay for themselves.', work: 'Real work needed &mdash; as-is is a real option; the price accounts for it.', tenant: 'Tenant-occupied &mdash; sellable; the timing just needs choreography.' },
      timeV: { now: 'Ready now &mdash; the comp analysis is the next 48 hours’ work.', six: 'Six months out &mdash; the perfect prep window.', curious: 'Just curious &mdash; the best kind of seller conversation. No pressure at this end.' },
      nextV: { bigger: 'Selling and buying here &mdash; one plan covers both sides.', smaller: 'Downsizing &mdash; unlocking equity for the next chapter.', leaving: 'Leaving Arizona &mdash; George coordinates with an agent wherever you land.', unsure: 'Not sure yet &mdash; the numbers usually help decide.' },
      promise: '“The real number doesn’t come from a website — it comes from comps. Mine is free, and it comes with no pressure to list.” — George',
      cta: 'Take my answers to George →',
      restart: 'Start over',
      sumLabels: { later: 'checking later' }
    };

    var SQC_KEY = 'gp-sqc-answers';
    var SQC_SUM_KEY = 'gp-sqc-summary';
    var sAns = {};
    try { sAns = JSON.parse(localStorage.getItem(SQC_KEY) || '{}') || {}; } catch (e) { sAns = {}; }
    var S_ORDER = ['owned', 'equity', 'condition', 'timeline', 'next'];
    var sScreen = 'owned';

    function sSave() { try { localStorage.setItem(SQC_KEY, JSON.stringify(sAns)); } catch (e) {} }
    function sMoney(n) { return '$' + Math.round(n).toLocaleString(LANG === 'es' ? 'es-US' : 'en-US'); }
    function sNet() {
      if (!sAns.worth_guess) return null;
      return sAns.worth_guess - (sAns.payoff_left || 0) - sAns.worth_guess * 0.08;
    }

    function sDots() {
      var s = sScreen === 'result' ? 5 : S_ORDER.indexOf(sScreen);
      var h = '';
      for (var i = 0; i < 5; i++) {
        h += '<span class="' + (i < s ? 'done' : i === s ? 'now' : '') + '"></span>';
      }
      return h;
    }

    function sOpt(action, label, hint) {
      return '<button class="qc-opt" type="button" data-act="' + action + '">' + label + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</button>';
    }
    function sLaterBtn(step) { return '<button class="qc-later" type="button" data-act="later:' + step + '">' + ST.later + '</button>'; }
    function sBackBtn() { return sScreen === 'owned' ? '' : '<button class="qc-back" type="button" data-act="back">' + ST.back + '</button>'; }

    function sEqChips() {
      return '<div class="qc-opts">' + sOpt('equity:more', ST.eqMore) + sOpt('equity:expected', ST.eqExpected) + sOpt('equity:less', ST.eqLess, ST.eqLessH) + '</div>';
    }
    function sEqMathHtml() {
      var net = sNet();
      if (net == null) return '';
      var line = net > 0 ? ST.eqMath(sMoney(Math.round(net / 1000) * 1000), sMoney(sAns.worth_guess)) : ST.eqTight;
      return '<div class="qc-math">' + line + '</div>' + sEqChips();
    }

    function sScreenHtml() {
      var kicker = ST.kickers[sScreen] || '';
      var body = '';
      if (sScreen === 'owned') {
        body = '<p class="qc-q">' + ST.ownedQ + '</p><p class="qc-sub">' + ST.ownedSub + '</p><div class="qc-opts">'
          + sOpt('owned:under2', ST.ownedA, ST.ownedAH) + sOpt('owned:2to5', ST.ownedB)
          + sOpt('owned:5to15', ST.ownedC) + sOpt('owned:15plus', ST.ownedD)
          + '</div>' + sLaterBtn('owned');
      } else if (sScreen === 'equity') {
        body = '<p class="qc-q">' + ST.eqQ + '</p><p class="qc-sub">' + ST.eqSub + '</p>'
          + '<p class="qc-sub" style="margin: 0 0 6px">' + ST.eqLabel1 + '</p>'
          + '<div class="qc-input-row"><input id="sqc-worth" type="text" inputmode="numeric" placeholder="' + ST.eqPh1 + '" value="' + (sAns.worth_guess ? sMoney(sAns.worth_guess) : '') + '"></div>'
          + '<p class="qc-sub" style="margin: 8px 0 6px">' + ST.eqLabel2 + '</p>'
          + '<div class="qc-input-row"><input id="sqc-payoff" type="text" inputmode="numeric" placeholder="' + ST.eqPh2 + '" value="' + (sAns.payoff_left != null && sAns.worth_guess ? sMoney(sAns.payoff_left) : '') + '"><button class="btn btn-navy" type="button" data-act="eqmath">' + ST.eqBtn + '</button></div>'
          + '<div id="sqc-eq-out">' + sEqMathHtml() + '</div>'
          + sLaterBtn('equity');
      } else if (sScreen === 'condition') {
        body = '<p class="qc-q">' + ST.condQ + '</p><p class="qc-sub">' + ST.condSub + '</p><div class="qc-opts">'
          + sOpt('condition:ready', ST.condReady) + sOpt('condition:love', ST.condLove, ST.condLoveH)
          + sOpt('condition:work', ST.condWork, ST.condWorkH) + sOpt('condition:tenant', ST.condTenant, ST.condTenantH)
          + '</div>' + sLaterBtn('condition');
      } else if (sScreen === 'timeline') {
        body = '<p class="qc-q">' + ST.timeQ + '</p><p class="qc-sub">' + ST.timeSub + '</p><div class="qc-opts">'
          + sOpt('timeline:now', ST.timeNow) + sOpt('timeline:six', ST.timeSix)
          + sOpt('timeline:curious', ST.timeCur, ST.timeCurH)
          + '</div>' + sLaterBtn('timeline');
      } else if (sScreen === 'next') {
        body = '<p class="qc-q">' + ST.nextQ + '</p><p class="qc-sub">' + ST.nextSub + '</p><div class="qc-opts">'
          + sOpt('next:bigger', ST.nextBigger, ST.nextBiggerH) + sOpt('next:smaller', ST.nextSmaller)
          + sOpt('next:leaving', ST.nextLeaving) + sOpt('next:unsure', ST.nextUnsure)
          + '</div>' + sLaterBtn('next');
      } else if (sScreen === 'result') {
        body = sResultHtml();
        kicker = ST.resultKicker;
      }
      return '<div class="qc-head"><span class="t">' + ST.title + '</span><div class="qc-dots">' + sDots() + '</div></div>'
        + '<div class="qc-body"><div class="qc-step">'
        + '<p class="qc-kicker">' + kicker + '</p>'
        + body + sBackBtn() + '</div></div>';
    }

    function sVerdict(key) {
      var v = sAns[key];
      if (v === 'later' || v == null) return { cls: 'later', txt: ST.laterV };
      if (key === 'owned') return { cls: v === 'under2' ? 'work' : 'good', txt: ST.ownedV[v] };
      if (key === 'equity') {
        var net = sNet();
        var extra = net == null ? '' : net > 0 ? ST.eqShort(sMoney(Math.round(net / 1000) * 1000)) : ST.eqShortTight;
        return { cls: v === 'less' ? 'work' : 'good', txt: ST.eqV[v] + extra };
      }
      if (key === 'condition') return { cls: v === 'ready' ? 'good' : 'work', txt: ST.condV[v] };
      if (key === 'timeline') return { cls: 'good', txt: ST.timeV[v] };
      if (key === 'next') return { cls: 'good', txt: ST.nextV[v] };
      return { cls: 'later', txt: ST.laterV };
    }

    function sBadge(cls) {
      if (cls === 'good') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C08A3E" stroke-width="3.2"><path d="M20 6L9 17l-5-5"/></svg>';
      if (cls === 'work') return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10203D" stroke-width="3"><path d="M5 12h14"/></svg>';
      return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A93A1" stroke-width="2.6"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5l3 1.8"/></svg>';
    }

    function sResultHtml() {
      var rows = '';
      S_ORDER.forEach(function (k) {
        var v = sVerdict(k);
        rows += '<div class="row"><div class="badge ' + v.cls + '">' + sBadge(v.cls) + '</div><div><div class="rl">' + ST.labels[k] + '</div><div class="rv">' + v.txt + '</div></div></div>';
      });
      return '<p class="qc-q">' + ST.resultQ + '</p><p class="qc-sub">' + ST.resultSub + '</p>'
        + '<div class="qc-result">' + rows + '</div>'
        + '<p class="qc-promise">' + ST.promise + '</p>'
        + '<div class="qc-cta-row"><button class="btn btn-gold" type="button" data-act="tostart">' + ST.cta + '</button>'
        + '<button class="qc-restart" type="button" data-act="restart">' + ST.restart + '</button></div>';
    }

    function sSummaryText() {
      var parts = [];
      var plain = function (html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      S_ORDER.forEach(function (k) {
        var v = sAns[k];
        if (v == null) return;
        parts.push(plain(ST.labels[k]) + ': ' + (v === 'later' ? ST.sumLabels.later : plain(sVerdict(k).txt)));
      });
      return parts.join(' | ');
    }

    function sStoreSummary() {
      var s = sSummaryText();
      try { if (s) localStorage.setItem(SQC_SUM_KEY, s); } catch (e) {}
    }

    function sNext(after) {
      var i = S_ORDER.indexOf(after);
      sScreen = i >= 0 && i < S_ORDER.length - 1 ? S_ORDER[i + 1] : 'result';
      if (sScreen === 'result') { sStoreSummary(); }
      sRender();
    }

    function sRender() {
      sqcHost.innerHTML = sScreenHtml();
      ['sqc-worth', 'sqc-payoff'].forEach(function (id) {
        var el = sqcHost.querySelector('#' + id);
        if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sDoEqMath(); } });
      });
    }

    function sDoEqMath() {
      var worthEl = sqcHost.querySelector('#sqc-worth');
      var payoffEl = sqcHost.querySelector('#sqc-payoff');
      var worth = parseFloat((worthEl.value || '').replace(/[^0-9.]/g, '')) || 0;
      var payoff = parseFloat((payoffEl.value || '').replace(/[^0-9.]/g, '')) || 0;
      if (worth <= 0) { worthEl.focus(); return; }
      sAns.worth_guess = worth;
      sAns.payoff_left = payoff;
      sSave();
      sqcHost.querySelector('#sqc-eq-out').innerHTML = sEqMathHtml();
    }

    sqcHost.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'eqmath') { sDoEqMath(); return; }
      if (act === 'back') {
        if (sScreen === 'result') { sScreen = 'next'; }
        else { var i = S_ORDER.indexOf(sScreen); sScreen = S_ORDER[Math.max(0, i - 1)]; }
        sRender(); return;
      }
      if (act === 'restart') {
        sAns = {}; sSave();
        try { localStorage.removeItem(SQC_SUM_KEY); } catch (err) {}
        sScreen = 'owned'; sRender(); return;
      }
      if (act === 'tostart') {
        sStoreSummary();
        window.location.href = LANG === 'es' ? '/es/#start' : '/#start';
        return;
      }
      var m = act.split(':');
      if (m[0] === 'later') { sAns[m[1]] = 'later'; sSave(); sNext(m[1]); return; }
      sAns[m[0]] = m[1];
      sSave();
      sNext(m[0]);
    });

    sqcLaunch.addEventListener('click', function () {
      sqcHost.hidden = false;
      sqcLaunch.style.display = 'none';
      sScreen = 'owned';
      sRender();
      sqcHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    /* Finished on an earlier visit: quietly re-arm the summary for the form. */
    if (Object.keys(sAns).length) sStoreSummary();
  }

  /* ---------- Affordability calculator (buying page) ---------- */
  var calc = document.getElementById('afford-calc');
  if (calc) {
    var out = document.getElementById('calc-out');
    var tight = document.getElementById('calc-tight');
    calc.addEventListener('submit', function (e) {
      e.preventDefault();
      var income = parseFloat(calc.income.value.replace(/[^0-9.]/g, '')) || 0;
      var debts = parseFloat(calc.debts.value.replace(/[^0-9.]/g, '')) || 0;
      var down = parseFloat(calc.down.value.replace(/[^0-9.]/g, '')) || 0;
      if (income <= 0) { out.style.display = 'none'; if (tight) tight.style.display = 'none'; return; }

      /* Classic 28/36 guideline, 30-yr fixed at an assumed rate, taxes+insurance ~1.6%/yr. */
      var RATE = 0.0675 / 12, N = 360, TI = 0.016 / 12;
      var maxHousing = Math.min(income * 0.28, Math.max(income * 0.36 - debts, 0));
      if (maxHousing <= 0) {
        /* Debts eat the whole 36% guideline. Never fail silently — this is
           exactly the visitor George most wants to hear from. */
        out.style.display = 'none';
        if (tight) tight.style.display = 'block';
        return;
      }
      if (tight) tight.style.display = 'none';
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
