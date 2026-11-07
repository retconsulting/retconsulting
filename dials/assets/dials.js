/* Dials site behaviour. No dependency, no request to a third party, nothing stored.
   The live thing is the hero: two dials drive a real exposure calculation, using the same
   wording as the app's EV cell (Documentation/Functional/01-capture.md, CAP-002).
   The picture response is a browser simulation and the caption says so. Pages stay complete
   without this file: all panels stack and every text is in the HTML. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Exposure ---------- */
  // Reference exposure: 1/125 s at ISO 400 reads as ON TARGET for the demonstration photograph.
  var REF_T = 1 / 125, REF_ISO = 400;
  var SHUTTER = [null, 1/8000, 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4];
  var ISO = [null, 50, 100, 200, 400, 800, 1600, 3200, 6400, 12800];
  var state = { shutter: 7, iso: 4 };

  function tLabel(t) { return t >= 1 ? t + '"' : '1/' + Math.round(1 / t); }
  function nearest(list, v) {
    var best = null, d = Infinity;
    list.forEach(function (x) {
      if (x === null) return;
      var e = Math.abs(Math.log2(x / v));
      if (e < d) { d = e; best = x; }
    });
    return best;
  }
  function solve() {
    var t = SHUTTER[state.shutter], iso = ISO[state.iso], autoT = t === null, autoI = iso === null;
    if (autoT && autoI) { t = REF_T; iso = REF_ISO; }
    else if (autoT) { t = nearest(SHUTTER, REF_T * REF_ISO / iso); }
    else if (autoI) { iso = nearest(ISO, REF_T * REF_ISO / t); }
    var ev = Math.log2(t / REF_T) + Math.log2(iso / REF_ISO);
    return { t: t, iso: iso, ev: ev, autoT: autoT, autoI: autoI };
  }

  function render() {
    var r = solve();
    var set = function (id, v) { var n = document.getElementById(id); if (n) n.textContent = v; };
    set('ro-shutter', tLabel(r.t));
    set('ro-shutter-s', r.autoT ? 'AUTO' : 'MANUAL');
    set('ro-iso', String(r.iso));
    set('ro-iso-s', r.autoI ? 'AUTO' : 'MANUAL');
    var mag = Math.abs(r.ev).toFixed(1);
    var allAuto = r.autoT && r.autoI;
    if (allAuto) { set('ro-ev', '0.0'); set('ro-ev-s', 'AUTO'); }
    else if (Math.abs(r.ev) < 0.3) { set('ro-ev', '0.0'); set('ro-ev-s', 'ON TARGET'); }
    else if (r.ev < 0) { set('ro-ev', '-' + mag); set('ro-ev-s', 'UNDER ' + mag); }
    else { set('ro-ev', '+' + mag); set('ro-ev-s', 'OVER ' + mag); }

    var img = document.getElementById('vf-img');
    if (img) {
      // Brightness follows the stops. A slow shutter blurs a hand-held frame; high ISO adds noise.
      var b = Math.max(0.012, Math.min(16, Math.pow(2, r.ev * 0.72)));
      var blur = r.t > 1 / 30 ? Math.min(11, Math.log2(r.t * 30) * 2.1) : 0;
      img.style.filter = 'brightness(' + b.toFixed(3) + ')' + (blur ? ' blur(' + blur.toFixed(1) + 'px)' : '');
    }
    var grain = document.getElementById('vf-grain');
    if (grain) grain.style.opacity = r.iso <= 400 ? 0 : Math.min(0.62, (Math.log2(r.iso / 400)) * 0.125).toFixed(3);
    return r;
  }

  /* ---------- Dials ---------- */
  function dial(el, key) {
    var svg = el.querySelector('svg'), face = el.querySelector('.face');
    var labels = Array.prototype.slice.call(el.querySelectorAll('text[data-i]'));
    var count = labels.length, step = 360 / count;
    var rot = state[key] * step;

    function mark() {
      labels.forEach(function (t) { t.classList.toggle('on', +t.dataset.i === state[key] && t.dataset.i !== '0'); });
      var v = labels[state[key]].textContent;
      svg.setAttribute('aria-valuenow', String(state[key]));
      svg.setAttribute('aria-valuetext', state[key] === 0 ? 'Auto' : v);
    }
    function paint(r) { face.style.transform = 'rotate(' + r + 'deg)'; }
    function choose(i, buzz) {
      i = Math.max(0, Math.min(count - 1, i));
      if (i === state[key]) return;
      state[key] = i;
      mark();
      render();
      if (buzz && navigator.vibrate) navigator.vibrate(4);
    }

    var last = null;
    function angle(e) {
      var b = svg.getBoundingClientRect();
      return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
    }
    svg.addEventListener('pointerdown', function (e) {
      svg.setPointerCapture(e.pointerId);
      last = angle(e);
      face.classList.add('drag');
      e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (last === null) return;
      var a = angle(e), d = a - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      last = a;
      rot = Math.max(0, Math.min((count - 1) * step, rot + d));
      paint(rot);
      choose(Math.round(rot / step), true);
    });
    function end() {
      if (last === null) return;
      last = null;
      face.classList.remove('drag');
      rot = state[key] * step;
      paint(rot);
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', function (e) {
      var k = e.key, i = state[key];
      if (k === 'ArrowRight' || k === 'ArrowUp') i++;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') i--;
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = count - 1;
      else return;
      e.preventDefault();
      choose(i, false);
      rot = state[key] * step;
      paint(rot);
    });
    mark();
    // The dials start at the red A, then turn to their setting as the lens opens.
    if (reduced) { paint(rot); }
    else {
      face.classList.add('drag');
      paint(0);
      face.getBoundingClientRect();
      face.classList.remove('drag');
      face.style.transitionDuration = '1.1s';
      setTimeout(function () { paint(rot); }, 260);
      setTimeout(function () { face.style.transitionDuration = ''; }, 1500);
    }
  }
  var ds = document.getElementById('dial-shutter'), di = document.getElementById('dial-iso');
  if (ds) dial(ds, 'shutter');
  if (di) dial(di, 'iso');
  render();

  /* ---------- Shutter release: blackout length follows the exposure, up to 1.4 s ---------- */
  var rel = document.getElementById('release'), blade = document.getElementById('vf-blade');
  if (rel && blade) {
    rel.addEventListener('click', function () {
      var ms = Math.max(90, Math.min(1400, solve().t * 1000));
      blade.style.transition = 'none';
      blade.style.opacity = 1;
      if (navigator.vibrate) navigator.vibrate(10);
      setTimeout(function () {
        blade.style.transition = 'opacity .22s ease';
        blade.style.opacity = 0;
      }, reduced ? 60 : ms);
    });
  }

  /* ---------- Readout tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function pick(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls'));
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { pick(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      pick(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
  if (tabs.length) pick(tabs[0]);

  /* ---------- Film room: real renders from the app's film engine ---------- */
  var room = document.getElementById('film-room');
  if (room) {
    // Second layer is created here so the HTML never holds an image without a source.
    var printBox = room.querySelector('.print');
    var spare = document.createElement('img');
    spare.alt = ''; spare.width = 1280; spare.height = 853; spare.style.opacity = 0;
    printBox.appendChild(spare);
    var layers = printBox.querySelectorAll('img');
    var film = room.querySelector('.can[aria-pressed="true"]').dataset.film;
    var scene = room.querySelector('.chip[aria-pressed="true"]').dataset.scene;
    var front = 0;
    var nameOut = document.getElementById('film-name'), useOut = document.getElementById('film-use');
    var altFor = room.dataset.alt;
    function src() { return '/dials/assets/img/film/' + scene + '-' + film + '.webp'; }
    function show() {
      var next = new Image(), url = src();
      next.onload = function () {
        var back = layers[1 - front], cur = layers[front];
        back.src = url;
        back.alt = altFor.replace('%film', film.toUpperCase());
        back.style.opacity = 1;
        cur.style.opacity = 0;
        front = 1 - front;
      };
      next.src = url;
    }
    room.addEventListener('click', function (e) {
      var c = e.target.closest('.can'), s = e.target.closest('.chip');
      if (c) {
        film = c.dataset.film;
        room.querySelectorAll('.can').forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        nameOut.textContent = film.toUpperCase();
        useOut.textContent = c.querySelector('.sr').textContent;
        show();
        if (c.scrollIntoView && innerWidth < 860) c.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      } else if (s) {
        scene = s.dataset.scene;
        room.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === s ? 'true' : 'false'); });
        show();
      }
    });
  }

  /* ---------- Entrances, and the clip plays only while on screen ---------- */
  var risers = document.querySelectorAll('[data-rise]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    risers.forEach(function (n) { io.observe(n); });
  } else {
    risers.forEach(function (n) { n.classList.add('in'); });
  }
  var clip = document.getElementById('demo');
  if (clip && 'IntersectionObserver' in window && !reduced) {
    new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) clip.play().catch(function () {}); else clip.pause(); });
    }).observe(clip);
  }
})();
