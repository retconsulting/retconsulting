/* Emdee site behaviour. No dependency, no request, nothing stored.
   Live thing: what you type in the hero is parsed in the browser and set as a page, like the
   two panes of Modifier in the app. The parser is a small subset written for this page, not the
   app's engine: headings, emphasis, lists, tasks, quotes, code, highlight and project chips.
   Rendered headings use h2 to h4 with classes, so the site keeps a single h1.
   Source (or Command-E, the app's shortcut) reveals the Markdown of the whole site, by CSS only.
   The page stays complete without this file: the preview is already in the HTML. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Markdown subset ---------- */
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inline(raw) {
    var codes = [];
    var s = esc(raw).replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
         .replace(/\*([^*]+)\*/g, '<em>$1</em>')
         .replace(/~~([^~]+)~~/g, '<del>$1</del>')
         .replace(/==([^=]+)==/g, '<mark>$1</mark>')
         .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
         .replace(/(^|\s)(#[\p{L}\d_-]+)/gu, '$1<span class="chip">$2</span>')
         .replace(/(^|\s)(@[\p{L}\d_-]+)/gu, '$1<span class="chip">$2</span>')
         .replace(/(^|\s)(\d{4}-\d{2}-\d{2})/g, '$1<span class="chip">$2</span>')
         .replace(/\[!(TODO|DONE|P0|P1)\]/g, '<span class="chip">$1</span>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
  }
  function render(md) {
    var lines = md.replace(/\r/g, '').split('\n'), out = [], list = null, para = [], i, m;
    function flushP() { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } }
    function flushL() { if (list) { out.push('</' + list + '>'); list = null; } }
    function open(tag) { if (list !== tag) { flushL(); out.push('<' + tag + '>'); list = tag; } }
    for (i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^```/.test(l)) {
        flushP(); flushL();
        var code = [];
        for (i++; i < lines.length && !/^```/.test(lines[i]); i++) code.push(lines[i]);
        out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
      } else if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
        flushP(); flushL();
        var lvl = m[1].length;
        out.push('<div class="d' + lvl + '">' + inline(m[2]) + '</div>');
      } else if ((m = l.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
        flushP(); open('ul');
        var on = m[1] !== ' ';
        out.push('<li class="task' + (on ? ' done' : '') + '"><span class="box' + (on ? ' on' : '') + '"></span><span>' + inline(m[2]) + '</span></li>');
      } else if ((m = l.match(/^\s*[-*]\s+(.*)$/))) {
        flushP(); open('ul');
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if ((m = l.match(/^\s*\d+\.\s+(.*)$/))) {
        flushP(); open('ol');
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if ((m = l.match(/^>\s?(.*)$/))) {
        flushP(); flushL();
        out.push('<blockquote>' + inline(m[1]) + '</blockquote>');
      } else if (/^(---|\*\*\*)\s*$/.test(l)) {
        flushP(); flushL();
        out.push('<hr>');
      } else if (!l.trim()) {
        flushP(); flushL();
      } else {
        flushL(); para.push(l.trim());
      }
    }
    flushP(); flushL();
    return out.join('');
  }
  var src = document.getElementById('src'), page = document.getElementById('page');
  if (src && page) {
    var words = document.getElementById('words');
    var draw = function () {
      page.innerHTML = render(src.value);
      if (words) {
        var n = (page.textContent.match(/[\p{L}\d’'-]+/gu) || []).length;
        words.textContent = words.dataset.tpl.replace('%d', n);
      }
    };
    src.addEventListener('input', draw);
    draw();
  }

  /* ---------- Source mode ---------- */
  var root = document.documentElement;
  var toggles = document.querySelectorAll('[data-source]');
  function setSource(on) {
    root.classList.toggle('source', on);
    toggles.forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? b.dataset.off : b.dataset.on;
    });
  }
  toggles.forEach(function (b) { b.addEventListener('click', function () { setSource(!root.classList.contains('source')); }); });
  if (toggles.length) {
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e' && document.activeElement !== src) {
        e.preventDefault();
        setSource(!root.classList.contains('source'));
      }
    });
  }

  /* ---------- Accent colours: the app's presets ---------- */
  document.querySelectorAll('.swatch').forEach(function (s, _, all) {
    s.addEventListener('click', function () {
      root.style.setProperty('--accent', s.dataset.light);
      root.style.setProperty('--accent-dark', s.dataset.dark);
      all.forEach(function (x) { x.setAttribute('aria-pressed', x === s ? 'true' : 'false'); });
    });
  });

  /* ---------- Page turn by scroll (real curl frames), progress and Sommaire ---------- */
  var turn = document.querySelector('.turn'), frames = turn ? turn.querySelectorAll('.leaf img') : [];
  var bar = document.getElementById('progress');
  var links = Array.prototype.slice.call(document.querySelectorAll('.side a[href^="#"]'));
  var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var last = -1, ticking = false;
  function onScroll() {
    ticking = false;
    var y = scrollY, h = innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - h)).toFixed(4) + ')';
    if (turn && !root.classList.contains('source') && !reduced) {
      var r = turn.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - h)));
      var i = Math.round(p * (frames.length - 1));
      if (i !== last) {
        frames.forEach(function (f, k) { f.classList.toggle('on', k === i); });
        last = i;
      }
    }
    var cur = -1;
    targets.forEach(function (t, k) { if (t && t.getBoundingClientRect().top <= h * 0.35) cur = k; });
    links.forEach(function (a, k) { a.setAttribute('aria-current', k === cur ? 'true' : 'false'); });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Entrances ---------- */
  var risers = document.querySelectorAll('[data-rise]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    risers.forEach(function (n) { io.observe(n); });
  } else {
    risers.forEach(function (n) { n.classList.add('in'); });
  }
})();
