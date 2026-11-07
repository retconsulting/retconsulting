const poses = document.querySelector('.postures');
const pairImage = document.querySelector('#camera-pair');
const originalView = document.querySelector('#duo-original');
if (poses && pairImage && originalView) {
  const sources = {
    open: ['instruments-open.webp', 'duo-open.webp'],
    closed: ['instruments.webp', 'duo-film.webp']
  };
  poses.hidden = false;
  poses.addEventListener('click', event => {
    const selected = event.target.closest('button[data-pose]');
    if (!selected) return;
    const [pair, capture] = sources[selected.dataset.pose];
    pairImage.src = '/dials/assets/' + pair + '?v=front';
    originalView.href = '/dials/assets/' + capture;
    for (const button of poses.children) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
  });
}
