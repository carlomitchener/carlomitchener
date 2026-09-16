const host = document.querySelector<HTMLElement>("[data-player]");

if (host) {
  fetch(host.dataset.manifest ?? "")
    .then((reply) => (reply.ok ? reply.json() : null))
    .then((manifest) => {
      if (!manifest) return;
      const json = host.querySelector("[data-json]");
      const { steps: _steps, ...rest } = manifest;
      if (json) json.textContent = JSON.stringify(rest, null, 2);
    })
    .catch(() => {});
}
