const node = document.getElementById('siblings');
const siblings = node ? JSON.parse(node.textContent) : {};
const keys = Object.keys(siblings);

const style = (list, want) => list.find((image) => image.style === want) ?? list[0];

const size = (url, width) => `${url}${url.includes('?') ? '&' : '?'}width=${width}&format=auto`;

const money = (amount) => `$${Number(amount).toFixed(2)}`;

function art(key, name) {
  return `/art/${key}/${name}.png`;
}

function swap(key) {
  const one = siblings[key];
  if (!one) return;
  const was = document.querySelector('[data-add]');
  const old = was ? was.dataset.key : '';
  for (const image of document.querySelectorAll('[data-mockups] img[data-style]')) {
    const found = style(one.images, image.dataset.style);
    if (!found) continue;
    image.src = size(found.url, 1000);
    image.alt = found.alt;
    const link = image.closest('a');
    if (link) link.href = size(found.url, 2000);
  }
  for (const image of document.querySelectorAll('[data-strip] img[data-tile]')) {
    image.src = art(key, `${key}-${image.dataset.tile}`);
    image.alt = `${key} ${image.dataset.tile}x${image.dataset.tile}`;
    const link = image.closest('a');
    if (link) link.href = image.src;
  }
  const downloads = document.querySelector('[data-downloads]');
  if (downloads) {
    const list = [...one.files.map((name) => [name, art(key, name)])];
    for (const tile of document.querySelectorAll('[data-strip] a')) list.push([`${tile.dataset.tile}x${tile.dataset.tile}`, tile.href]);
    list.push(['og', art(key, `${key}-og`)]);
    downloads.replaceChildren(Object.assign(document.createElement('span'), { textContent: 'download ' }));
    for (const [name, href] of list) {
      const link = document.createElement('a');
      link.href = href;
      link.download = '';
      link.textContent = name;
      downloads.append(link);
    }
  }
  const buttons = [...document.querySelectorAll('.sizes button')];
  buttons.forEach((button, i) => {
    const variant = one.variants[i];
    if (!variant) return;
    button.dataset.variant = variant.id;
    button.dataset.price = variant.price;
    button.dataset.size = variant.size;
  });
  const add = document.querySelector('[data-add]');
  if (add) {
    add.dataset.key = key;
    add.dataset.variant = one.variants[0] ? one.variants[0].id : '';
    add.dataset.price = one.price;
    add.dataset.size = one.variants[0] ? one.variants[0].size : '';
    add.disabled = !one.available;
  }
  const price = document.querySelector('[data-price]');
  if (price) price.textContent = money(one.price);
  const count = document.querySelector('[data-expiry]');
  if (count) count.dataset.expiry = String(new Date(one.created).getTime() + Number(count.dataset.live || 0));
  const at = keys.indexOf(key);
  const index = document.querySelector('[data-index]');
  if (index) index.textContent = `${at + 1} / ${keys.length}`;
  for (const tile of document.querySelectorAll('[data-siblings] a[data-key]')) {
    if (tile.dataset.key === key) tile.setAttribute('aria-current', 'page');
    else tile.removeAttribute('aria-current');
  }
  const fine = document.querySelector('.lede .fine');
  if (fine) fine.textContent = `design ${key}`;
  if (old !== key) history.pushState({ key }, '', `/products/${key}/`);
  window.dispatchEvent(new CustomEvent('flip', { detail: key }));
}

function step(by) {
  const add = document.querySelector('[data-add]');
  const at = keys.indexOf(add ? add.dataset.key : '');
  if (at < 0 || keys.length < 2) return;
  swap(keys[(at + by + keys.length) % keys.length]);
}

async function share() {
  const url = location.href;
  const title = document.title;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch {}
  }
  try {
    await navigator.clipboard.writeText(url);
  } catch {}
  const button = document.querySelector('[data-share]');
  if (!button) return;
  button.textContent = 'copied!';
  setTimeout(() => {
    button.textContent = 'share';
  }, 1500);
}

if (keys.length) {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('[data-share]')) return void share();
    if (target.closest('[data-prev]')) return step(-1);
    if (target.closest('[data-next]')) return step(1);
    const tile = target.closest('[data-siblings] a[data-key]');
    if (tile) {
      event.preventDefault();
      swap(tile.dataset.key);
    }
  });
  window.addEventListener('popstate', () => {
    const key = location.pathname.split('/').filter(Boolean).pop();
    if (siblings[key]) swap(key);
  });
}
