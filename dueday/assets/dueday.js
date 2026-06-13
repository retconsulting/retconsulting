// dueday pages — theme toggle with a short colour fade (the pre-paint theme script stays inline in each page)
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var root = document.documentElement;
  var allowMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fadeTimer;
  var sync = function () {
    btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark' ? 'true' : 'false');
  };
  sync();
  btn.addEventListener('click', function () {
    if (allowMotion) {
      root.classList.add('theme-fade');
      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(function () { root.classList.remove('theme-fade'); }, 260);
    }
    if (root.getAttribute('data-theme') === 'dark') {
      root.removeAttribute('data-theme');
      try { localStorage.setItem('ret-theme', 'light'); } catch (e) {}
    } else {
      root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('ret-theme', 'dark'); } catch (e) {}
    }
    sync();
  });
})();
