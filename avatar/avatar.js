const Avatar = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const rad = (deg) => (deg * Math.PI) / 180;
  const dir = (deg) => [Math.cos(rad(deg)), -Math.sin(rad(deg))];
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const el = (tag, attrs = {}, parent = null) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.appendChild(node);
    return node;
  };
  const num = (v) => Math.round(v * 100) / 100;

  /* GEOMETRY */

  function flatten(cubics, n = 8) {
    const out = [];
    for (const [p0, p1, p2, p3] of cubics) {
      for (let i = 0; i < n; i++) {
        const t = i / n, u = 1 - t;
        const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
        out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
      }
    }
    return out;
  }

  function width(recipe) {
    return Math.max(...recipe.outline.cubics.flat().map((p) => p[0]));
  }

  function place(recipe, [x, y], dx = 0, dy = 0) {
    const h = recipe.bird.height, [cx, cy] = recipe.bird.center;
    return [cx + dx + (x - width(recipe) / 2) * h, cy + dy + (y - 0.5) * h];
  }

  function cubicPath(recipe) {
    const seg = recipe.outline.cubics;
    const P = (p) => place(recipe, p).map(num).join(",");
    return "M" + P(seg[0][0]) + seg.map(([, p1, p2, p3]) => "C" + P(p1) + " " + P(p2) + " " + P(p3)).join("") + "Z";
  }

  function pointsPath(recipe, points) {
    return "M" + points.map((p) => place(recipe, p).map(num).join(",")).join("L") + "Z";
  }

  function fringeOffsets(recipe) {
    const [ux, uy] = dir(recipe.fringe.angle);
    return recipe.fringe.colors.map((_, k) => [-(k + 1) * recipe.fringe.step * ux, -(k + 1) * recipe.fringe.step * uy]);
  }

  /* COLOR */

  const hexOf = (palette, name) => palette[name] || name;
  const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const format = (rgb) => "#" + rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

  function conicColor(recipe, palette, angle) {
    const names = recipe.gradient.colors, n = names.length;
    const pos = ((((angle - recipe.gradient.start) % 360) + 360) % 360) / (360 / n);
    const i = Math.floor(pos) % n, t = pos - Math.floor(pos);
    const a = parse(hexOf(palette, names[i])), b = parse(hexOf(palette, names[(i + 1) % n]));
    return format(a.map((v, k) => v + (b[k] - v) * t));
  }

  /* BUILD */

  function options(recipe, opts) {
    return {
      id: "a", theme: "dark", bird: null, background: null,
      layers: { background: true, glow: true, fringe: true, bird: true },
      glow: recipe.glow.map(() => true),
      wedges: 360, crop: false, margin: 0.05, hover: false,
      width: recipe.canvas, height: recipe.canvas,
      ...opts,
    };
  }

  function box(recipe, o) {
    if (!o.crop) return [0, 0, o.width, o.height];
    const h = recipe.bird.height, w = width(recipe) * h, [cx, cy] = recipe.bird.center;
    const offs = [[0, 0], ...fringeOffsets(recipe)];
    const xs = offs.map((d) => d[0]), ys = offs.map((d) => d[1]);
    const m = o.margin * h;
    const x0 = cx - w / 2 + Math.min(...xs) - m, x1 = cx + w / 2 + Math.max(...xs) + m;
    const y0 = cy - h / 2 + Math.min(...ys) - m, y1 = cy + h / 2 + Math.max(...ys) + m;
    return [x0, y0, x1 - x0, y1 - y0].map(num);
  }

  function build(recipe, palette, opts = {}) {
    const o = options(recipe, opts);
    const id = o.id;
    const [vx, vy, vw, vh] = box(recipe, o);
    const theme = recipe.themes[o.theme];
    const svg = el("svg", { xmlns: NS, viewBox: `${vx} ${vy} ${vw} ${vh}` });
    const defs = el("defs", {}, svg);
    el("path", { id: `${id}-bird`, d: cubicPath(recipe) }, defs);
    const [gx, gy] = recipe.gradient.center;
    const conic = el("g", { id: `${id}-conic` }, defs);
    const R = Math.hypot(vw, vh) + Math.hypot(gx - vx, gy - vy);
    const w = 360 / o.wedges;
    for (let i = 0; i < o.wedges; i++) {
      const [x0, y0] = dir(i * w), [x1, y1] = dir((i + 1.5) * w);
      el("path", { d: `M${gx},${gy}L${num(gx + R * x0)},${num(gy + R * y0)}L${num(gx + R * x1)},${num(gy + R * y1)}Z`, fill: conicColor(recipe, palette, (i + 0.5) * w) }, conic);
    }
    recipe.glow.forEach((g, i) => {
      const clip = el("clipPath", { id: `${id}-clip-${i}` }, defs);
      if (g.shape === "disc") el("circle", { cx: g.center ? g.center[0] : gx, cy: g.center ? g.center[1] : gy, r: g.radius }, clip);
      else el("use", { href: `#${id}-bird` }, clip);
      const filter = el("filter", { id: `${id}-blur-${i}`, filterUnits: "userSpaceOnUse", x: vx, y: vy, width: vw, height: vh, "color-interpolation-filters": "sRGB" }, defs);
      el("feGaussianBlur", { stdDeviation: g.sigma }, filter);
    });
    if (o.layers.background) el("rect", { id: `${id}-background`, x: vx, y: vy, width: vw, height: vh, fill: hexOf(palette, o.background || theme.background) }, svg);
    if (o.layers.glow) {
      const glow = el("g", { id: `${id}-glow` }, svg);
      recipe.glow.forEach((g, i) => {
        if (!o.glow[i]) return;
        const outer = el("g", { filter: `url(#${id}-blur-${i})` }, glow);
        const inner = el("g", { "clip-path": `url(#${id}-clip-${i})` }, outer);
        el("use", { href: `#${id}-conic` }, inner);
      });
    }
    if (o.layers.fringe) {
      const fringe = el("g", { id: `${id}-fringe` }, svg);
      const offs = fringeOffsets(recipe);
      for (let k = recipe.fringe.colors.length - 1; k >= 0; k--) {
        const [dx, dy] = offs[k].map(num);
        const attrs = { href: `#${id}-bird`, fill: hexOf(palette, recipe.fringe.colors[k]) };
        if (o.hover) attrs.style = `--dx:${dx}px;--dy:${dy}px`;
        else attrs.transform = `translate(${dx} ${dy})`;
        el("use", attrs, fringe);
      }
    }
    if (o.layers.bird) el("use", { id: `${id}-top`, href: `#${id}-bird`, fill: hexOf(palette, o.bird || theme.bird) }, svg);
    return svg;
  }

  function setBird(svg, id, d, transform) {
    const path = svg.querySelector(`#${id}-bird`);
    if (d !== undefined) path.setAttribute("d", d);
    if (transform !== undefined) path.setAttribute("transform", transform);
  }

  /* RIG */

  function deform(points, pose, rig) {
    const { flap = 0, bend = 0, sweep = 0 } = pose;
    const { axis, shoulder, blend } = rig;
    return points.map(([x, y]) => {
      const s = y - axis, d = Math.abs(s) - shoulder;
      if (d <= 0) return [x, y];
      const w = smooth(d / blend);
      const L = Math.abs(bend) < 1e-6 ? d * Math.cos(flap) : (Math.sin(flap + bend * d) - Math.sin(flap)) / bend;
      const yy = axis + Math.sign(s) * (shoulder + L);
      const xx = x + sweep * d * d * Math.sin(flap);
      return [x + w * (xx - x), y + w * (yy - y)];
    });
  }

  /* EXPORT */

  function serialize(svg, px) {
    const copy = svg.cloneNode(true);
    if (px) {
      const [, , vw, vh] = svg.getAttribute("viewBox").split(" ").map(Number);
      const s = px / Math.max(vw, vh);
      copy.setAttribute("width", Math.round(vw * s));
      copy.setAttribute("height", Math.round(vh * s));
    }
    return new XMLSerializer().serializeToString(copy);
  }

  async function toPNG(svg, px) {
    const url = URL.createObjectURL(new Blob([serialize(svg, px)], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d").drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return new Promise((res) => canvas.toBlob(res, "image/png"));
  }

  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return { flatten, width, place, cubicPath, pointsPath, fringeOffsets, conicColor, hexOf, options, box, build, setBird, deform, serialize, toPNG, download, dir, smooth };
})();
