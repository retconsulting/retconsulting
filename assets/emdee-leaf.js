// Frames are native renders of the same page turn in the iPad reader.
const turnButton = document.querySelector('.leaf-button[data-open]');
const leafImage = document.querySelector('#leaf-image');
if (turnButton && leafImage) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 6;
  let running = false;
  turnButton.hidden = false;
  turnButton.addEventListener('click', async () => {
    if (running) return;
    running = true;
    const target = frame === 8 ? 0 : 8;
    const step = Math.sign(target - frame);
    try {
      while (frame !== target) {
        const next = reducedMotion.matches ? target : frame + step;
        const image = new Image();
        image.src = '/emdee/assets/leaf-' + next + '.webp';
        await image.decode();
        leafImage.src = image.src;
        frame = next;
        if (frame !== target) await new Promise(resolve => setTimeout(resolve, 65));
      }
      turnButton.textContent = target === 8 ? '← ' + turnButton.dataset.close : turnButton.dataset.open + ' →';
    } finally {
      running = false;
    }
  });
}
