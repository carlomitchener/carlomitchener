const typing = (target: EventTarget | null) => target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

function mount(host: HTMLElement) {
  const stage = host.querySelector<HTMLImageElement>("[data-stage]");
  const link = host.querySelector<HTMLAnchorElement>("[data-stage-link]");
  const count = host.querySelector<HTMLElement>("[data-count]");
  const thumbs = [...host.querySelectorAll<HTMLButtonElement>("[data-thumb]")];
  const section = host.parentElement;
  const button = section?.querySelector<HTMLAnchorElement>("[data-download]") ?? null;
  const name = section?.querySelector<HTMLElement>("[data-download-name]") ?? null;
  let index = 0;

  const show = (i: number, scroll = true) => {
    if (!thumbs.length || !stage) return;
    index = ((i % thumbs.length) + thumbs.length) % thumbs.length;
    const image = thumbs[index].querySelector("img")!;
    stage.src = image.dataset.full ?? image.src;
    stage.alt = image.dataset.alt ?? "";
    stage.dataset.style = image.dataset.style;
    if (link) link.href = image.dataset.link ?? stage.src;
    if (button) button.href = image.dataset.link ?? stage.src;
    if (name) name.textContent = image.dataset.name ?? "";
    if (count) count.textContent = `${index + 1} / ${thumbs.length}`;
    thumbs.forEach((thumb, n) => thumb.setAttribute("aria-pressed", String(n === index)));
    if (scroll) thumbs[index].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  };

  host.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("[data-prev]")) return show(index - 1);
    if (target.closest("[data-next]")) return show(index + 1);
    const thumb = target.closest<HTMLElement>("[data-thumb]");
    if (thumb) show(Number(thumb.dataset.thumb));
  });

  let x0 = 0;
  let y0 = 0;
  let swiped = false;
  const stageBox = host.querySelector(".stage");
  stageBox?.addEventListener("pointerdown", (event) => {
    const e = event as PointerEvent;
    x0 = e.clientX;
    y0 = e.clientY;
    swiped = false;
  });
  stageBox?.addEventListener("pointerup", (event) => {
    const e = event as PointerEvent;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - y0)) {
      swiped = true;
      show(index + (dx < 0 ? 1 : -1));
    }
  });
  link?.addEventListener("click", (event) => {
    if (swiped) event.preventDefault();
  });

  if (host.dataset.keys !== undefined) {
    document.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key === "ArrowLeft") show(index - 1);
      else if (event.key === "ArrowRight") show(index + 1);
      else return;
      event.preventDefault();
    });
    const full = document.querySelector<HTMLDialogElement>("dialog[data-full]");
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest("[data-open-full]")) return full?.showModal();
      if (target.closest("[data-close-full]") || target === full) return full?.close();
      const jump = target.closest<HTMLElement>("[data-jump]");
      if (!jump || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      show(Number(jump.dataset.jump), false);
      if (full?.open) full.close();
      else host.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  window.addEventListener("flip", () => show(index, false));
}

for (const host of document.querySelectorAll<HTMLElement>("[data-gallery]")) mount(host);
