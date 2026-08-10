/* George's Circle of Trust: renders /data/network.json into curated sections
   with live search and section pills. One file drives EN and ES pages. */
(function () {
  var lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  var root = document.getElementById('net-grid');
  if (!root) return;

  var T = lang === 'es' ? {
    call: 'Llamar', site: 'Sitio web', demo: 'Demo', all: 'Todos',
    placeholder: 'Busque en el círculo… techos, plomero, préstamos',
    count: function (n, t) { return 'Mostrando ' + n + ' de ' + t + ' negocios'; },
    empty: 'Nada con ese nombre todavía. Llame a George al (623) 853-5241; si él no conoce a la persona indicada, conoce a alguien que sí.'
  } : {
    call: 'Call', site: 'Website', demo: 'Demo', all: 'All',
    placeholder: 'Search the circle… roofer, plumber, loans',
    count: function (n, t) { return 'Showing ' + n + ' of ' + t + ' businesses'; },
    empty: "Nobody by that name yet. Call George at (623) 853-5241; if he doesn't know the right person, he knows somebody who does."
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(b) {
    var c = el('article', 'net-card');
    var imgWrap = el('div', 'net-img');
    if (b.image) {
      var img = document.createElement('img');
      img.src = b.image; img.alt = b.name; img.loading = 'lazy';
      img.width = 800; img.height = 420;
      imgWrap.appendChild(img);
    } else {
      imgWrap.className = 'net-img placeholder';
      imgWrap.appendChild(el('span', null, (b.name || '?').charAt(0)));
    }
    c.appendChild(imgWrap);

    var body = el('div', 'net-body');
    body.appendChild(el('div', 'net-cat', (b.category && b.category[lang]) || ''));
    var name = el('div', 'net-name', b.name || '');
    if (b.demo) name.appendChild(el('span', 'net-badge', T.demo));
    body.appendChild(name);
    body.appendChild(el('p', 'net-blurb', (b.blurb && b.blurb[lang]) || ''));

    var links = el('div', 'net-links');
    if (b.phone) {
      var tel = document.createElement('a');
      tel.href = 'tel:+1' + b.phone.replace(/\D/g, '');
      tel.textContent = T.call + ' ' + b.phone;
      links.appendChild(tel);
    }
    if (b.website) {
      var site = document.createElement('a');
      site.href = b.website; site.target = '_blank'; site.rel = 'noopener';
      site.textContent = T.site + ' →';
      links.appendChild(site);
    }
    body.appendChild(links);
    c.appendChild(body);
    return c;
  }

  var STAR = 'M12 1.6l2.9 6.5 7.1.7-5.3 4.7 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 8.8l7.1-.7z';

  fetch('/data/network.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var sections = data.sections || [];
      var byId = {};
      sections.forEach(function (s) { byId[s.id] = { def: s, items: [] }; });
      var fallback = { def: { id: '_other', label: { en: 'More of the circle', es: 'Más del círculo' } }, items: [] };
      (data.businesses || []).forEach(function (b) {
        (byId[b.section] || fallback).items.push(b);
      });

      root.classList.remove('net-grid');
      var groups = [];
      var total = 0;

      sections.map(function (s) { return byId[s.id]; }).concat([fallback]).forEach(function (g) {
        if (!g.items.length) return;
        var group = el('section', 'net-group');
        group.dataset.section = g.def.id;
        var head = el('div', 'net-group-head');
        head.appendChild(el('span', 't', (g.def.label && g.def.label[lang]) || g.def.id));
        head.appendChild(el('div', 'rule'));
        var star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        star.setAttribute('width', '14'); star.setAttribute('height', '14');
        star.setAttribute('viewBox', '0 0 24 24'); star.setAttribute('fill', '#C08A3E');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', STAR);
        star.appendChild(path);
        head.appendChild(star);
        group.appendChild(head);
        var grid = el('div', 'net-grid');
        var cards = g.items.map(function (b) {
          var c = card(b);
          c.dataset.hay = [
            b.name, b.phone,
            b.category && b.category.en, b.category && b.category.es,
            b.blurb && b.blurb[lang]
          ].join(' ').toLowerCase();
          grid.appendChild(c);
          total++;
          return c;
        });
        group.appendChild(grid);
        root.appendChild(group);
        groups.push({ el: group, id: g.def.id, label: (g.def.label && g.def.label[lang]) || g.def.id, cards: cards });
      });

      /* ---------- Toolbar: search + section pills + count ---------- */
      var input = document.getElementById('net-search');
      var pillsWrap = document.getElementById('net-pills');
      var countEl = document.getElementById('net-count');
      var emptyEl = document.getElementById('net-empty');
      if (emptyEl) emptyEl.textContent = T.empty;
      if (input) input.placeholder = T.placeholder;

      var activeSection = 'all';

      function apply() {
        var term = (input && input.value || '').trim().toLowerCase();
        var shown = 0;
        groups.forEach(function (g) {
          var sectionOn = activeSection === 'all' || g.id === activeSection;
          var visible = 0;
          g.cards.forEach(function (c) {
            var hit = sectionOn && (!term || c.dataset.hay.indexOf(term) !== -1);
            c.hidden = !hit;
            if (hit) visible++;
          });
          g.el.hidden = visible === 0;
          shown += visible;
        });
        if (countEl) countEl.textContent = T.count(shown, total);
        if (emptyEl) emptyEl.hidden = shown !== 0;
      }

      if (pillsWrap) {
        var mkPill = function (id, label) {
          var b = el('button', 'tab-btn' + (id === 'all' ? ' on' : ''), label);
          b.type = 'button';
          b.dataset.section = id;
          b.addEventListener('click', function () {
            activeSection = id;
            pillsWrap.querySelectorAll('.tab-btn').forEach(function (p) {
              p.classList.toggle('on', p === b);
            });
            apply();
          });
          pillsWrap.appendChild(b);
        };
        mkPill('all', T.all);
        groups.forEach(function (g) { mkPill(g.id, g.label); });
      }
      if (input) input.addEventListener('input', apply);
      apply();
    })
    .catch(function () {
      root.appendChild(el('p', 'body-md', lang === 'es'
        ? 'No se pudo cargar la lista. Llame a George al (623) 853-5241 y él lo conecta.'
        : "Couldn't load the list. Call George at (623) 853-5241 and he'll connect you."));
    });
})();
