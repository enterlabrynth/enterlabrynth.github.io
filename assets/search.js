/* EnterLabrynth search: a Search button on every page, a box that finds modules, parts, steps,
   cards and key terms, and a jump that opens the right part, tab and term on arrival. */
(function () {
  var CSS = [
    '.elx-btn{position:fixed;left:14px;bottom:14px;z-index:45;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;background:rgba(14,21,36,0.94);border:1.5px solid #8FB0FF;color:#E8EEF8;font:700 14px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,0.5)}',
    '.elx-btn kbd{font:600 11px/1 ui-monospace,monospace;padding:3px 6px;border-radius:5px;border:1px solid #3A4A68;color:#93A2BC}',
    '@media (max-width:760px){.elx-btn kbd{display:none}}',
    '.elx-btn:focus-visible,.elx-r:focus-visible,.elx-x:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
    '.elx-ov{position:fixed;inset:0;z-index:70;display:none;justify-content:center;align-items:flex-start;padding:6vh 14px 14px;background:rgba(3,6,12,0.86)}',
    '.elx-ov.on{display:flex}',
    '.elx-box{width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;border-radius:18px;background:#0B1120;border:1px solid #22304A;box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#E8EEF8}',
    '.elx-top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #22304A}',
    '.elx-in{flex:1;min-width:0;min-height:44px;padding:0 6px;border:0;background:transparent;color:#E8EEF8;font-size:18px;outline:none}',
    '.elx-in::placeholder{color:#6B7A96}',
    '.elx-x{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #3A4A68;background:transparent;color:#C9D3E4;font-size:13px;font-weight:700;cursor:pointer}',
    '.elx-list{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px}',
    '.elx-r{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;text-decoration:none;color:#E8EEF8;border:1px solid transparent}',
    '.elx-r:hover,.elx-r.sel{background:#0E1524;border-color:#22304A}',
    '.elx-k{align-self:flex-start;padding:2px 8px;border-radius:999px;font:700 10.5px/1.4 ui-monospace,monospace;letter-spacing:0.08em;text-transform:uppercase}',
    '.elx-t{font-weight:700;font-size:15.5px;line-height:1.35}',
    '.elx-c{font-size:12.5px;color:#93A2BC;line-height:1.4}',
    '.elx-s{font-size:13.5px;color:#B7C3D8;line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
    '.elx-r mark{background:rgba(57,229,140,0.22);color:#FFFFFF;border-radius:3px;padding:0 1px}',
    '.elx-msg{padding:18px 14px;color:#93A2BC;font-size:14.5px;line-height:1.5}',
    '.elx-hit{outline:3px solid #39E58C!important;outline-offset:6px;border-radius:12px}',
    'h3[id],details[id]{scroll-margin-top:90px}'
  ].join('\n');
  var KIND = {Term: ['Key term', '#8FF2C0', 'rgba(57,229,140,0.14)'], Step: ['Step', '#B9CCFF', 'rgba(91,140,255,0.16)'], Card: ['Card', '#FFD67A', 'rgba(255,194,61,0.14)'],
              Part: ['Part', '#FF9DB4', 'rgba(255,107,143,0.14)'], Page: ['Page', '#D9C2FF', 'rgba(177,140,255,0.16)']};
  var BONUS = {Term: 5, Step: 4, Part: 3, Page: 3, Card: 1};
  var here = location.pathname.split('/').pop() || 'index.html';
  var data = null, loading = null, sel = -1, shown = [];

  function norm(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[₀-₉]/g, function (c) { return String(c.charCodeAt(0) - 8320); })
      .replace(/[⁰¹²³⁴-⁹]/g, function (c) { return String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)); })
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) {
      loading = fetch('assets/search-index.json').then(function (r) { return r.json(); }).then(function (d) {
        d.forEach(function (e) { e.nt = ' ' + norm(e.t) + ' '; e.nc = ' ' + norm(e.c) + ' '; e.nx = ' ' + norm(e.x) + ' '; });
        data = d;
        return d;
      });
    }
    return loading;
  }

  function score(e, words, whole) {
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], sw = ' ' + w;
      if (e.nt.indexOf(sw) >= 0) s += 10;
      else if (e.nt.indexOf(w) >= 0) s += 6;
      else if (e.nc.indexOf(sw) >= 0) s += 3;
      else if (e.nx.indexOf(sw) >= 0) s += 1.5;
      else if (e.nx.indexOf(w) >= 0) s += 0.5;
      else return 0;
    }
    var t = e.nt.trim();
    if (t === whole) s += 30;
    else if (t.indexOf(whole) === 0) s += 14;
    else if (e.nt.indexOf(' ' + whole) >= 0) s += 8;
    return s + BONUS[e.k] + (e.p === here ? 0.5 : 0);
  }

  function mark(text, words) {
    var out = esc(text);
    words.forEach(function (w) {
      if (w.length < 2) return;
      out = out.replace(new RegExp('(^|[^a-z0-9])(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '$1<mark>$2</mark>');
    });
    return out;
  }

  function render(q) {
    var list = ov.querySelector('.elx-list');
    var whole = norm(q), words = whole ? whole.split(' ') : [];
    if (!words.length) {
      list.innerHTML = '<p class="elx-msg">Type a topic, a step or a key term: <b>trophic cascade</b>, <b>denitrification</b>, <b>NPP</b>, <b>mycorrhizae</b>, <b>Module 2.4</b>.</p>';
      shown = []; sel = -1; return;
    }
    if (!data) { list.innerHTML = '<p class="elx-msg">Loading…</p>'; return; }
    var hits = [];
    for (var i = 0; i < data.length; i++) {
      var s = score(data[i], words, whole);
      if (s > 0) hits.push([s, data[i]]);
    }
    hits.sort(function (a, b) { return b[0] - a[0]; });
    shown = hits.slice(0, 40).map(function (h) { return h[1]; });
    if (!shown.length) { list.innerHTML = '<p class="elx-msg">Nothing found for <b>' + esc(q) + '</b>. Try a shorter word.</p>'; sel = -1; return; }
    list.innerHTML = shown.map(function (e, n) {
      var k = KIND[e.k];
      return '<a class="elx-r" data-n="' + n + '" href="' + e.p + (e.a ? '#' + e.a : '') + '">' +
        '<span class="elx-k" style="color:' + k[1] + ';background:' + k[2] + '">' + k[0] + '</span>' +
        '<span class="elx-t">' + mark(e.t, words) + '</span>' +
        (e.c ? '<span class="elx-c">' + esc(e.c) + '</span>' : '') +
        (e.x && (e.k === 'Term' || e.k === 'Step' || e.k === 'Page' || e.k === 'Part') ? '<span class="elx-s">' + mark(e.x.slice(0, 200), words) + '</span>' : '') + '</a>';
    }).join('');
    sel = 0; paint();
  }

  function paint() {
    [].forEach.call(ov.querySelectorAll('.elx-r'), function (r, n) { r.classList.toggle('sel', n === sel); });
    var cur = ov.querySelector('.elx-r.sel');
    if (cur) cur.scrollIntoView({block: 'nearest'});
  }

  function go(e) {
    var same = e.p === here;
    close();
    if (!same) { location.href = e.p + (e.a ? '#' + e.a : ''); return; }
    if (!e.a) { window.scrollTo({top: 0, behavior: 'smooth'}); return; }
    if (location.hash === '#' + e.a) jump(e.a, true);
    else location.hash = e.a;
  }

  /* ---------- arriving at a result ---------- */
  function jump(id, smooth) {
    var el = id && document.getElementById(id);
    if (!el) return false;
    var part = el.closest('.pt-p');
    if (part) { var pr = document.getElementById('pt-' + part.getAttribute('data-part')); if (pr && !pr.checked) pr.checked = true; }
    var panel = el.closest('.mtab-p');
    if (panel) {
      var panels = [].slice.call(panel.parentNode.querySelectorAll(':scope > .mtab-p'));
      var radios = document.querySelectorAll('.mtabs input.mtab-r');
      var r = radios[panels.indexOf(panel)];
      if (r && !r.checked) r.checked = true;
    }
    for (var d = el; d; d = d.parentElement) { if (d.tagName === 'DETAILS') d.open = true; }
    requestAnimationFrame(function () {
      var bar = document.querySelector('.mtab-bar'), off = 20;
      if (bar && getComputedStyle(bar).position === 'sticky') off += bar.getBoundingClientRect().height;
      var box = el.tagName === 'H3' ? (el.parentElement || el) : el;
      window.scrollTo({top: box.getBoundingClientRect().top + window.pageYOffset - off, behavior: smooth ? 'smooth' : 'auto'});
      box.classList.add('elx-hit');
      setTimeout(function () { box.classList.remove('elx-hit'); }, 2200);
    });
    return true;
  }
  function fromHash(smooth) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id || ['notes', 'infographics', 'slides', 'videos', 'quiz', 'cards', 'questions', 'tools'].indexOf(id) >= 0) return;
    var tries = 0;
    (function retry() { if (!jump(id, smooth) && tries++ < 20) setTimeout(retry, 100); })();
  }
  window.addEventListener('hashchange', function () { fromHash(true); });

  /* ---------- the box ---------- */
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'elx-btn';
  btn.setAttribute('aria-label', 'Search the site');
  btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.6-3.6"></path></svg>Search <kbd>/</kbd>';
  var ov = document.createElement('div');
  ov.className = 'elx-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Search EnterLabrynth');
  ov.innerHTML = '<div class="elx-box"><div class="elx-top"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8FB0FF" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.6-3.6"></path></svg>' +
    '<input class="elx-in" type="search" placeholder="Search every module, step and key term" aria-label="Search" autocomplete="off" spellcheck="false">' +
    '<button type="button" class="elx-x">Close</button></div><div class="elx-list" role="listbox"></div></div>';
  var input = ov.querySelector('.elx-in');

  function open() {
    ov.classList.add('on');
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    render('');
    setTimeout(function () { input.focus(); }, 30);
    load().then(function () { if (input.value) render(input.value); });
  }
  function close() {
    ov.classList.remove('on');
    document.documentElement.style.overflow = '';
    btn.focus({preventScroll: true});
  }

  btn.addEventListener('click', open);
  ov.querySelector('.elx-x').addEventListener('click', close);
  ov.addEventListener('click', function (ev) { if (ev.target === ov) close(); });
  input.addEventListener('input', function () { render(input.value); });
  ov.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('.elx-r');
    if (!a) return;
    ev.preventDefault();
    go(shown[+a.getAttribute('data-n')]);
  });
  ov.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'ArrowDown' && shown.length) { ev.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); paint(); }
    else if (ev.key === 'ArrowUp' && shown.length) { ev.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
    else if (ev.key === 'Enter' && shown.length && ev.target === input) { ev.preventDefault(); go(shown[Math.max(0, sel)]); }
  });
  document.addEventListener('keydown', function (ev) {
    var t = ev.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (ov.classList.contains('on') || typing) return;
    if (ev.key === '/' || ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k')) { ev.preventDefault(); open(); }
  });

  function mount() {
    document.body.appendChild(btn);
    document.body.appendChild(ov);
    fromHash(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
