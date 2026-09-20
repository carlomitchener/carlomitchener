const wide = matchMedia("(min-width: 1024px)");

const sync = () => {
  for (const one of document.querySelectorAll<HTMLDetailsElement>("[data-catalog] details")) one.open = wide.matches;
};

sync();
wide.addEventListener("change", sync);
