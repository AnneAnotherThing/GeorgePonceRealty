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
