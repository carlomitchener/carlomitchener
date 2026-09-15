const host = document.querySelector<HTMLElement>("[data-player]");

if (host) {
  const video = host.querySelector("video")!;
  let steps: number[] = [];
  let rate = 32;
  fetch(host.dataset.manifest ?? "")
    .then((reply) => (reply.ok ? reply.json() : null))
    .then((manifest) => {
      if (!manifest) return;
      steps = Array.isArray(manifest.steps) ? manifest.steps.map(Number) : [];
      rate = Number(manifest.rate) || rate;
      const json = host.querySelector("[data-json]");
      const { steps: _steps, ...rest } = manifest;
      if (json) json.textContent = JSON.stringify(rest, null, 2);
    })
    .catch(() => {});

  const at = () => {
    const t = video.currentTime;
    let i = 0;
    while (i + 1 < steps.length && steps[i + 1] <= t + 0.002) i++;
    return i;
  };

  const go = (by: number) => {
    video.pause();
    if (!steps.length) {
      video.currentTime = Math.max(0, video.currentTime + by / rate);
      return;
    }
    const i = Math.max(0, Math.min(steps.length - 1, at() + by));
    video.currentTime = steps[i] + 0.5 / rate;
  };

  const typing = (target: EventTarget | null) => target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
    switch (event.key) {
      case " ":
        if (video.paused) video.play();
        else video.pause();
        break;
      case "ArrowLeft":
        go(-1);
        break;
      case "ArrowRight":
        go(1);
        break;
      case "ArrowUp":
        if (host.dataset.prev) location.href = host.dataset.prev;
        break;
      case "ArrowDown":
        if (host.dataset.next) location.href = host.dataset.next;
        break;
      default:
        return;
    }
    event.preventDefault();
  });
}
