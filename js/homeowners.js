/* Homeowners page: season tabs with persisted checklists + tip filters. */
(function () {
  var lang = document.documentElement.lang === 'es' ? 'es' : 'en';

  /* ---------- Season tabs + checklists ---------- */
  var tabs = document.getElementById('season-tabs');
  if (tabs) {
    var buttons = tabs.querySelectorAll('.tab-btn');
    var panels = document.querySelectorAll('.season-panel');
    var KEY = 'gp-ho-checks';

    /* Checkmarks reset each season: the store is keyed by season-of-year. */
    var m = new Date().getMonth(); /* 0-11 */
    var season = m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 8 ? 'summer' : m >= 9 && m <= 10 ? 'fall' : 'winter';
    var bucket = season + '-' + new Date().getFullYear();

    var store = {};
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (raw._bucket === bucket) store = raw;
      else store = { _bucket: bucket };
    } catch (e) { store = { _bucket: bucket }; }

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    }

    function updateProgress(panel) {
      var boxes = panel.querySelectorAll('input[type=checkbox]');
      var done = panel.querySelectorAll('input[type=checkbox]:checked').length;
      var p = panel.querySelector('.season-progress');
      if (!p) return;
      p.querySelector('.bar i').style.width = boxes.length ? Math.round(done / boxes.length * 100) + '%' : '0%';
      p.querySelector('.n').textContent = lang === 'es'
        ? done + ' de ' + boxes.length + ' listos'
        : done + ' of ' + boxes.length + ' done';
    }

    panels.forEach(function (panel) {
      panel.querySelectorAll('input[type=checkbox]').forEach(function (box) {
        var id = box.dataset.check;
        if (store[id]) { box.checked = true; box.closest('.check-item').classList.add('done'); }
        box.addEventListener('change', function () {
          store[id] = box.checked;
          box.closest('.check-item').classList.toggle('done', box.checked);
          save();
          updateProgress(panel);
        });
      });
      updateProgress(panel);
    });

    function show(name) {
      buttons.forEach(function (b) { b.classList.toggle('on', b.dataset.season === name); });
      panels.forEach(function (p) { p.classList.toggle('on', p.dataset.season === name); });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { show(b.dataset.season); });
    });
    show(season); /* open on the current season */
  }

  /* ---------- Tip filters ---------- */
  var filters = document.getElementById('tip-filters');
  if (filters) {
    var chips = filters.querySelectorAll('.tab-btn');
    var tipEls = document.querySelectorAll('.tip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.toggle('on', c === chip); });
        var topic = chip.dataset.topic;
        tipEls.forEach(function (t) {
          t.hidden = topic !== 'all' && t.dataset.topic !== topic;
        });
      });
    });
  }
})();
