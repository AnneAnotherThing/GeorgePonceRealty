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

  fetch('/data/network.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var groups = {};
      var order = [];
      (data.businesses || []).forEach(function (b) {
        var cat = (b.category && b.category[lang]) || (lang === 'es' ? 'Otros' : 'Other');
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(b);
      });
      order.sort(function (a, b) { return a.localeCompare(b, lang); });

      /* net-grid becomes the container of trade groups */
      root.classList.remove('net-grid');
      order.forEach(function (cat) {
        var group = el('section', 'net-group');
        var head = el('div', 'net-group-head');
        head.appendChild(el('span', 't', cat));
        head.appendChild(el('div', 'rule'));
        group.appendChild(head);
        var grid = el('div', 'net-grid');
        groups[cat].forEach(function (b) { grid.appendChild(card(b)); });
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
