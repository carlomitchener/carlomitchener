const KEY = 'cm-cart';
const SHOP = '{{SHOP}}';

/* STORE */

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function save(items) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent('cart', { detail: items }));
  return items;
}

export function add(line) {
  const items = load();
  const found = items.find((item) => item.id === line.id);
  if (found) found.qty += 1;
  else items.push({ ...line, qty: 1 });
  return save(items);
}

export const remove = (id) => save(load().filter((item) => item.id !== id));

export function setQty(id, qty) {
  if (qty < 1) return remove(id);
  const items = load();
  const found = items.find((item) => item.id === id);
  if (found) found.qty = qty;
  return save(items);
}

export const clear = () => save([]);

export const count = (items) => items.reduce((sum, item) => sum + item.qty, 0);

export const total = (items) => items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0).toFixed(2);

export const checkoutUrl = (items) =>
  items.length ? `https://${SHOP}/cart/${items.map((item) => `${item.id}:${item.qty}`).join(',')}` : '';

const money = (amount) => `$${Number(amount).toFixed(2)}`;

/* BAG */

function bag() {
  const badge = document.querySelector('[data-bag] .n');
  if (badge) badge.textContent = String(count(load()));
}

/* PRODUCT */

function stock() {
  const button = document.querySelector('[data-add]');
  if (!button) return;
  const buy = document.querySelector('[data-buy]');
  const price = document.querySelector('[data-price]');
  const picked = document.querySelector('.sizes button[aria-pressed="true"]');
  if (picked) {
    button.dataset.variant = picked.dataset.variant;
    button.dataset.price = picked.dataset.price;
    button.dataset.size = picked.dataset.size;
  }
  if (price) price.textContent = money(button.dataset.price);
  if (buy) buy.href = SHOP ? `https://${SHOP}/cart/${button.dataset.variant}:1` : '/cart/';
}

function pick(button) {
  for (const other of document.querySelectorAll('.sizes button')) other.setAttribute('aria-pressed', String(other === button));
  stock();
}

function shot() {
  const image = document.querySelector('[data-mockups] img');
  return image ? image.currentSrc || image.src : '';
}

function drop(button) {
  if (button.disabled) return;
  add({
    id: button.dataset.variant,
    key: button.dataset.key,
    title: button.dataset.title,
    size: button.dataset.size,
    price: button.dataset.price,
    image: shot(),
  });
  button.classList.add('added');
  button.textContent = 'added!';
  setTimeout(() => {
    button.classList.remove('added');
    button.textContent = 'add to cart';
  }, 1500);
}

/* CART PAGE */

function lines() {
  const host = document.querySelector('[data-cart-lines]');
  const sum = document.querySelector('[data-cart-sum]');
  if (!host || !sum) return;
  const items = load();
  host.replaceChildren();
  sum.replaceChildren();
  if (!items.length) {
    const lead = document.createElement('p');
    lead.className = 'lead';
    lead.textContent = 'your cart is empty.';
    const back = document.createElement('a');
    back.href = '/';
    back.textContent = 'go to the shop';
    sum.append(lead, back);
    return;
  }
  const template = document.getElementById('line');
  for (const item of items) {
    const node = template.content.cloneNode(true);
    const link = node.querySelector('[data-href]');
    link.href = `/products/${item.key}/`;
    const image = node.querySelector('img');
    image.src = item.image;
    image.alt = item.key;
    const title = node.querySelector('[data-title]');
    title.href = `/products/${item.key}/`;
    title.textContent = `${item.title} (${item.key})`;
    node.querySelector('[data-size]').textContent = `${String(item.size).toLowerCase()} · ${money(item.price)}`;
    node.querySelector('[data-qty]').textContent = String(item.qty);
    node.querySelector('[data-total]').textContent = money(Number(item.price) * item.qty);
    node.querySelector('[data-dec]').dataset.id = item.id;
    node.querySelector('[data-inc]').dataset.id = item.id;
    node.querySelector('[data-remove]').dataset.id = item.id;
    node.querySelector('[data-dec]').dataset.qty = String(item.qty - 1);
    node.querySelector('[data-inc]').dataset.qty = String(item.qty + 1);
    host.append(node);
  }
  const price = document.createElement('p');
  price.className = 'num';
  price.textContent = `${count(items)} item${count(items) === 1 ? '' : 's'} · ${money(total(items))}`;
  const go = document.createElement('a');
  go.className = 'buy primary';
  go.href = checkoutUrl(items);
  go.dataset.checkout = '';
  go.textContent = 'checkout';
  const wipe = document.createElement('button');
  wipe.type = 'button';
  wipe.dataset.clear = '';
  wipe.textContent = 'clear cart';
  const back = document.createElement('a');
  back.href = '/';
  back.textContent = 'continue shopping';
  sum.append(price, go, wipe, back);
}

/* WIRE */

function paint() {
  bag();
  lines();
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const size = target.closest('.sizes button');
  if (size) return pick(size);
  const drops = target.closest('[data-add]');
  if (drops) return drop(drops);
  const dec = target.closest('[data-dec], [data-inc]');
  if (dec) return void setQty(dec.dataset.id, Number(dec.dataset.qty));
  const gone = target.closest('[data-remove]');
  if (gone) return void remove(gone.dataset.id);
  const wipe = target.closest('[data-clear]');
  if (wipe) return void clear();
});

window.addEventListener('cart', paint);
window.addEventListener('flip', stock);
window.addEventListener('storage', paint);
stock();
paint();
