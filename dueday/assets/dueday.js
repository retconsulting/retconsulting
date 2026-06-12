// dueday pages — theme toggle (the pre-paint theme script stays inline in each page)
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;
  var sync = function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  };
  sync();
  btn.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('ret-theme', 'light'); } catch (e) {}
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('ret-theme', 'dark'); } catch (e) {}
    }
    sync();
  });
})();
