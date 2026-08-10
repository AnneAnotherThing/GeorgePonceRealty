/* Renders the trusted-network directory from /data/network.json,
   grouped by trade (the per-language category field). One file drives
   both the EN and ES pages; language comes from <html lang>. */
(function () {
  var lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  var root = document.getElementById('net-grid');
  if (!root) return;

  var T = lang === 'es'
    ? { call: 'Llamar', site: 'Sitio web', demo: 'Demo' }
    : { call: 'Call', site: 'Website', demo: 'Demo' };

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

  fetch('/data/network.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var sections = data.sections || [];
      var byId = {};
      sections.forEach(function (s) { byId[s.id] = { def: s, items: [] }; });
      var fallback = { def: { id: '_other', label: { en: 'More of the circle', es: 'Más del círculo' } }, items: [] };
      (data.businesses || []).forEach(function (b) {
        (byId[b.section] || fallback).items.push(b);
      });

      /* net-grid becomes the container of curated sections */
      root.classList.remove('net-grid');
      var list = sections.map(function (s) { return byId[s.id]; }).concat([fallback]);
      list.forEach(function (g) {
        if (!g.items.length) return;
        var group = el('section', 'net-group');
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
        g.items.forEach(function (b) { grid.appendChild(card(b)); });
        group.appendChild(grid);
        root.appendChild(group);
      });
    })
    .catch(function () {
      root.appendChild(el('p', 'body-md', lang === 'es'
        ? 'No se pudo cargar la lista. Llame a George al (623) 853-5241 y él lo conecta.'
        : "Couldn't load the list. Call George at (623) 853-5241 and he'll connect you."));
    });
})();
