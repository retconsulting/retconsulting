const dateList = document.querySelector('.datesheet');
const phoneLink = document.querySelector('.due-phone');
if (dateList && phoneLink) {
  const phoneImage = phoneLink.querySelector('img');
  const overview = { src: phoneImage.getAttribute('src'), alt: phoneImage.alt };
  const buttons = [...dateList.querySelectorAll('button')];
  for (const button of buttons) button.disabled = false;
  dateList.addEventListener('click', event => {
    const button = event.target.closest('button[data-screen]');
    if (!button) return;
    const close = button.getAttribute('aria-pressed') === 'true';
    for (const item of buttons) item.setAttribute('aria-pressed', String(!close && button === item));
    phoneImage.src = close ? overview.src : button.dataset.screen;
    phoneImage.alt = close ? overview.alt : button.getAttribute('aria-label');
    phoneLink.href = phoneImage.src;
    const detail = document.querySelector('#payment-proof-image');
    const detailLink = document.querySelector('#payment-proof-link');
    if (detail && detailLink) {
      detail.src = button.dataset.screen.replace('payment-', 'day-detail-');
      detail.alt = button.getAttribute('aria-label');
      detailLink.href = button.dataset.screen;
    }
  });
}
