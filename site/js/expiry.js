const pad = (n) => String(n).padStart(2, '0');

function label(left) {
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (s < 3600) return `${pad(m)}m ${pad(s % 60)}s left`;
  if (d) return `${d}d ${pad(h)}h ${pad(m)}m left`;
  return `${h}h ${pad(m)}m left`;
}

function expired() {
  for (const button of document.querySelectorAll('[data-add]')) button.disabled = true;
  for (const buy of document.querySelectorAll('[data-buy]')) {
    buy.removeAttribute('href');
    buy.setAttribute('aria-disabled', 'true');
  }
}

function tick() {
  const node = document.querySelector('[data-expiry]');
  if (!node) return true;
  const left = Number(node.dataset.expiry) - Date.now();
  if (left <= 0) {
    node.textContent = 'expired';
    expired();
    return true;
  }
  node.textContent = label(left);
  node.dataset.ttl = String(left);
  return false;
}

let timer = 0;

function run() {
  clearInterval(timer);
  if (document.hidden) return;
  if (tick()) return;
  timer = setInterval(() => {
    if (tick()) clearInterval(timer);
  }, 1000);
}

document.addEventListener('visibilitychange', run);
window.addEventListener('flip', run);
run();
