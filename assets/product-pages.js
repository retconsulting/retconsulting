// In the static page every view has an anchor and remains readable.
for (const selector of ['.filmchoices', '.foliochoices']) {
  const nav = document.querySelector(selector);
  if (!nav) continue;
  const links = [...nav.querySelectorAll('a')];
  function selectView() {
    const selected = links.find(link => link.hash === location.hash) || links[0];
    for (const link of links) {
      const active = link === selected;
      document.querySelector(link.hash).hidden = !active;
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }
  nav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.replaceState(null, '', link.hash);
    selectView();
  });
  window.addEventListener('hashchange', selectView);
  selectView();
}
const period = document.querySelector('.period');
if (period) {
  period.hidden = false;
  period.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    document.querySelector('.amount output').textContent = button.dataset.total;
    const available = document.querySelector('#available');
    if (available && button.dataset.available) available.textContent = button.dataset.available;
    for (const choice of period.children) choice.setAttribute('aria-pressed', String(choice === button));
  });
}
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const appear = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in-view');
      appear.unobserve(entry.target);
    }
  });
  document.querySelectorAll('main h1, main h2, main p, main img, main video, main output, main nav, footer strong').forEach(element => appear.observe(element));
}
