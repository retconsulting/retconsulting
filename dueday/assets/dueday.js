/* dueday site behaviour. No dependency, no request, nothing stored: choices stay on this page.
   Live thing: tap the costs you pay, and the month, the calendar and the breakdown recompute with
   the app's own rules (next due = soonest, then highest price; yearly and quarterly costs count
   in a month only when due, and are spread over 12 months in the average). Dudu follows the app's
   moods: party when a cost is added, worried when one is removed, happy when nothing is left to
   pay this month (dueday iOS/DuedayIOS/Sources/PlayfulStyle.swift, SummarySection.swift).
   The HTML already holds a complete November 2026 month, so the page reads fine without this file. */
(function () {
  'use strict';
  var root = document.getElementById('live');
  if (!root) return;
  var L = JSON.parse(document.getElementById('dueday-data').textContent);
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var money = new Intl.NumberFormat(L.locale, { style: 'currency', currency: 'EUR' });
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var Y = today.getFullYear(), M = today.getMonth();
  var lastDay = new Date(Y, M + 1, 0).getDate();
  var ICONS = {};
  document.querySelectorAll('#live .tile').forEach(function (t) { ICONS[t.dataset.id] = t.querySelector('.square').innerHTML; });

  function fmt(d) { return new Intl.DateTimeFormat(L.locale, { day: 'numeric', month: 'short' }).format(d); }
  function days(a, b) { return Math.round((a - b) / 864e5); }

  var costs = L.costs.map(function (c) {
    var due = new Date(Y, M, today.getDate() + c.offset);
    return { id: c.id, name: c.name, price: c.price, cycle: c.cycle, color: c.color, cat: c.cat, due: due, on: true };
  });

  // This month's occurrence, or null: a monthly cost always falls once in the month.
  function occurrence(c) {
    if (c.cycle === 1) return new Date(Y, M, Math.min(c.due.getDate(), lastDay));
    return c.due.getFullYear() === Y && c.due.getMonth() === M ? c.due : null;
  }
  function label(d) {
    var n = days(d, today);
    if (n === 0) return L.today;
    if (n > 0 && n < 8) return L.inDays.replace('%d', n);
    return fmt(d);
  }
  function nextDate(c) {
    if (c.cycle !== 1) return c.due;
    var d = new Date(Y, M, Math.min(c.due.getDate(), lastDay));
    return d < today ? new Date(Y, M + 1, c.due.getDate()) : d;
  }

  var selected = today.getDate();

  function renderCard() {
    var left = 0, past = 0, nextC = null, nextD = null;
    costs.forEach(function (c) {
      if (!c.on) return;
      var d = occurrence(c);
      if (d) { if (d < today) past += c.price; else left += c.price; }
      var n = nextDate(c);
      if (!nextD || n < nextD || (+n === +nextD && c.price > nextC.price)) { nextD = n; nextC = c; }
    });
    var total = left + past;
    document.getElementById('c-head').textContent = L.stillDue.replace('%m', new Intl.DateTimeFormat(L.locale, { month: 'long' }).format(today));
    document.getElementById('c-amount').textContent = money.format(left);
    document.getElementById('c-past').textContent = money.format(past);
    document.getElementById('c-total').textContent = money.format(total);
    document.getElementById('c-track').style.width = (total ? past / total * 100 : 0) + '%';
    var box = document.getElementById('c-next');
    if (nextC) {
      var lbl = label(nextD), isToday = days(nextD, today) === 0;
      box.innerHTML = '<span class="square" style="--c:' + nextC.color + '">' + ICONS[nextC.id] + '</span><div><small>' + L.nextDue + '</small><b>' + nextC.name + '</b></div><span>' + money.format(nextC.price) + '<br><em class="pill' + (isToday ? ' today' : '') + '" style="font-style:normal">' + lbl + '</em></span>';
    } else {
      box.innerHTML = '<div><b>' + L.nothing + '</b></div>';
    }
    return left;
  }
  function renderTiles() {
    root.querySelectorAll('.tile').forEach(function (t) {
      var c = costs.filter(function (x) { return x.id === t.dataset.id; })[0];
      t.setAttribute('aria-pressed', c.on ? 'true' : 'false');
      t.querySelector('em').textContent = label(nextDate(c));
    });
  }

  /* ---------- Calendar ---------- */
  var calBox = document.getElementById('cal');
  function onDay(d) { return costs.filter(function (c) { if (!c.on) return false; var o = occurrence(c); return o && o.getDate() === d; }); }
  function square(c) { return '<span class="square" style="--c:' + c.color + '">' + ICONS[c.id] + '</span>'; }
  function renderCal() {
    if (!calBox) return;
    var first = (new Date(Y, M, 1).getDay() + 6) % 7, prevLast = new Date(Y, M, 0).getDate();
    var html = '';
    for (var i = first - 1; i >= 0; i--) html += '<span class="day other"><span class="n">' + (prevLast - i) + '</span></span>';
    var sum = 0;
    for (var d = 1; d <= lastDay; d++) {
      var list = onDay(d);
      list.forEach(function (c) { sum += c.price; });
      var cls = 'day' + (list.length ? ' has' : '') + (d === today.getDate() ? ' today' : '') + (d === selected ? ' sel' : '');
      html += '<button type="button" class="' + cls + '" data-d="' + d + '" aria-label="' + fmtDay(d) + (list.length ? ', ' + list.length + ' ' + L.dueWord : '') + '"><span class="n">' + d + '</span>' +
        list.slice(0, 2).map(square).join('') + (d === L.payday ? '<span class="paid">' + L.payWord + '</span>' : '') + '</button>';
    }
    var cells = first + lastDay, trail = (7 - cells % 7) % 7;
    for (var k = 1; k <= trail; k++) html += '<span class="day other"><span class="n">' + k + '</span></span>';
    document.getElementById('cal-days').innerHTML = html;
    document.getElementById('cal-month').textContent = new Intl.DateTimeFormat(L.locale, { month: 'long', year: 'numeric' }).format(today);
    document.getElementById('cal-total').textContent = L.monthTotal + ' ' + money.format(sum);
    renderDay();
  }
  function fmtDay(d) { return new Intl.DateTimeFormat(L.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Y, M, d)); }
  function renderDay() {
    var box = document.getElementById('day-card'), list = onDay(selected);
    var sum = list.reduce(function (s, c) { return s + c.price; }, 0);
    var title = fmtDay(selected);
    var inner = '<b class="dtitle">' + title.charAt(0).toUpperCase() + title.slice(1) + '</b>';
    if (list.length) {
      inner += '<div class="sum"><span>' + L.dueThisDay + '</span><b>' + money.format(sum) + '</b></div><ul>' +
        list.map(function (c) { return '<li>' + square(c) + c.name + '<span>' + money.format(c.price) + '</span></li>'; }).join('') + '</ul>';
    } else {
      inner += '<p class="none">' + (selected === L.payday ? L.paydayLine : L.freeDay) + '</p>';
    }
    box.innerHTML = inner;
  }
  document.getElementById('cal-days') && document.getElementById('cal-days').addEventListener('click', function (e) {
    var b = e.target.closest('button.day');
    if (!b) return;
    selected = +b.dataset.d;
    renderCal();
    var again = document.querySelector('#cal-days button[data-d="' + selected + '"]');
    if (again) again.focus({ preventScroll: true });
  });

  /* ---------- Breakdown: monthly equivalents, like the app's average ---------- */
  function renderDonut() {
    var svg = document.getElementById('donut');
    if (!svg) return;
    var cats = {}, total = 0;
    costs.forEach(function (c) {
      if (!c.on) return;
      var m = c.price / c.cycle;
      total += m;
      cats[c.cat] = cats[c.cat] || { name: L.cats[c.cat], color: c.color, v: 0 };
      cats[c.cat].v += m;
    });
    var rows = Object.keys(cats).map(function (k) { return cats[k]; }).sort(function (a, b) { return b.v - a.v; });
    // As in the app: categories under 3 % share one grey part, so the ring stays readable.
    var big = rows.filter(function (r) { return r.v / total >= 0.03; });
    var small = rows.filter(function (r) { return r.v / total < 0.03; });
    if (small.length > 1) {
      big.push({ name: L.smallCats.replace('%d', small.length), color: '#8C95A1', v: small.reduce(function (s, r) { return s + r.v; }, 0) });
      rows = big;
    }
    var C = 2 * Math.PI * 42, off = 0, html = '';
    rows.forEach(function (r) {
      var share = r.v / total, gap = rows.length > 1 ? 0.035 : 0;
      var len = Math.max(0.0001, share - gap);
      html += '<circle cx="50" cy="50" r="42" stroke="' + r.color + '" stroke-dasharray="' + (len * C).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off * C).toFixed(2) + '"></circle>';
      off += share;
    });
    svg.innerHTML = total ? html : '<circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,.25)"></circle>';
    var top = rows[0];
    document.getElementById('d-share').textContent = top ? new Intl.NumberFormat(L.locale, { style: 'percent', maximumFractionDigits: 1 }).format(top.v / total) : money.format(0);
    document.getElementById('d-cat').textContent = top ? top.name : L.nothingShort;
    document.getElementById('y-total').textContent = money.format(total * 12);
    document.getElementById('toplist').innerHTML = rows.slice(0, 4).map(function (r) {
      return '<li><i style="background:' + r.color + '"></i>' + r.name + '<span>' + money.format(r.v) + '</span></li>';
    }).join('');
  }

  /* ---------- Dudu ---------- */
  var dudu = document.getElementById('dudu'), says = document.getElementById('dudu-says'), timer;
  function mood(m, line, back) {
    if (!dudu) return;
    dudu.dataset.mood = m;
    if (says && line) says.textContent = line;
    clearTimeout(timer);
    if (back) timer = setTimeout(rest, reduced ? 2400 : 1700);
  }
  function rest() {
    var anyLeft = costs.some(function (c) { var o = c.on && occurrence(c); return o && o >= today; });
    if (anyLeft) mood('neutral', L.sayNeutral);
    else mood('happy', L.sayHappy);
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('.tile');
    if (!t) return;
    var c = costs.filter(function (x) { return x.id === t.dataset.id; })[0];
    c.on = !c.on;
    renderAll();
    if (c.on) mood('party', L.sayAdded, true);
    else {
      var anyLeft = costs.some(function (x) { var o = x.on && occurrence(x); return o && o >= today; });
      if (anyLeft) mood('worried', L.sayRemoved.replace('%s', c.name), true);
      else mood('happy', L.sayHappy);
    }
    if (navigator.vibrate) navigator.vibrate(6);
  });

  function renderAll() { renderCard(); renderTiles(); renderCal(); renderDonut(); }
  renderAll();
  rest();

  /* ---------- Spaces recolour the whole site, as each space has its colour in the app ---------- */
  var spaces = document.querySelectorAll('.space');
  spaces.forEach(function (b) {
    b.addEventListener('click', function () {
      spaces.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (b.dataset.space === 'solo') document.documentElement.removeAttribute('data-space');
      else document.documentElement.setAttribute('data-space', b.dataset.space);
    });
  });

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
