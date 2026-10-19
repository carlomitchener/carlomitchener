const Mood = (() => {
  const { mix, rgba, clamp, lerp, smooth, parse, format, P } = Core;
  const scheme = matchMedia("(prefers-color-scheme: light)");

  /* PAINT BOX */

  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const enc = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const luma = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  function tone(hex, tint, k, lift) {
    if (k <= 0) return hex;
    const c = parse(hex), t = parse(tint), s = (luma(c) * (1 + (lift || 0))) / Math.max(1e-5, luma(t));
    return mix(hex, format(t.map((v) => enc(Math.min(1, lin(v) * s)))), Math.min(1, k));
  }

  const MINT = "#bfeede", BLOSSOM = "#ffc4d2", AMBER = "#f0b878", FROST = "#e4f1fa", LEMON = "#fff0c8";
  const OVERCAST = "#b4c0d0", SLATE = "#76869e", STORMY = "#363b62", COPPER = "#e8a464", PEARL = "#e8e6ee", MILK = "#f4eee4";

  /* KEYFRAMES */

  const KF = {
    night: {
      zenith: "#0a1230", mid: "#141d44", rim: "#232d58", glow: "#c8806e", glowA: 0, belt: "#4a3d6c", beltA: 0,
      body: "#3b4161", shade: "#0d1126", light: "#9ea6d0", warm: "#959ec8",
      haze: 0.4, cover: 0.4, grain: 0.08, dark: 1,
    },
    predawn: {
      zenith: "#16204e", mid: "#34396f", rim: "#7f6688", glow: "#f19a7a", glowA: 0.55, belt: "#8a6f9c", beltA: 0.3,
      body: "#5d5778", shade: "#22234a", light: "#e9a48f", warm: "#f39478",
      haze: 0.45, cover: 0.4, grain: 0.08, dark: 0.8,
    },
    dawn: {
      zenith: "#6676c0", mid: "#b0a0d8", rim: "#f7c2ae", glow: "#ffc27e", glowA: 0.52, belt: "#e6b0c4", beltA: 0.28,
      body: "#ffe4da", shade: "#b4a2d0", light: "#fff4d4", warm: "#ffa27e",
      haze: 0.5, cover: 0.4, grain: 0.07, dark: 0.22,
    },
    early: {
      zenith: "#5277c6", mid: "#98aee2", rim: "#efd8d6", glow: "#ffe0b4", glowA: 0.48, belt: "#cdd2ee", beltA: 0.16,
      body: "#fff1ea", shade: "#a7aed2", light: "#fff6e2", warm: "#ffcf9e",
      haze: 0.52, cover: 0.39, grain: 0.065, dark: 0.1,
    },
    morning: {
      zenith: "#3d84d6", mid: "#76b2ea", rim: "#c0ddf6", glow: "#fff0d6", glowA: 0.24, belt: "#c4d8f2", beltA: 0.2,
      body: "#f8fcff", shade: "#93b4d0", light: "#fffcf2", warm: "#fff4dc",
      haze: 0.52, cover: 0.38, grain: 0.06, dark: 0.04,
    },
    noon: {
      zenith: "#2f72cc", mid: "#68a8e6", rim: "#c6e1f8", glow: "#fffbec", glowA: 0.32, belt: "#bfd6f2", beltA: 0.18,
      body: "#f4f7fc", shade: "#8aa8cb", light: "#fffdf4", warm: "#fffaea",
      haze: 0.55, cover: 0.4, grain: 0.06, dark: 0,
    },
    afternoon: {
      zenith: "#3272c6", mid: "#72ace2", rim: "#f0e2c4", glow: "#ffca72", glowA: 0.5, belt: "#c2d8f0", beltA: 0.38,
      body: "#fffaf3", shade: "#8ea6c8", light: "#fff6dc", warm: "#ffd98a",
      haze: 0.55, cover: 0.4, grain: 0.06, dark: 0.04,
    },
    golden: {
      zenith: "#3466b3", mid: "#88a6d2", rim: "#f1d6ae", glow: "#ffc87e", glowA: 0.62, belt: "#e3c2c6", beltA: 0.12,
      body: "#ffeedd", shade: "#9a98c0", light: "#ffe4b0", warm: "#ffba6c",
      haze: 0.55, cover: 0.4, grain: 0.06, dark: 0.1,
    },
    dusk: {
      zenith: "#55559c", mid: "#a67eb4", rim: "#f2a68c", glow: "#ffa65c", glowA: 0.82, belt: "#d48eb2", beltA: 0.34,
      body: "#f2b0c2", shade: "#61449a", light: "#ffcb78", warm: "#ff8660",
      haze: 0.5, cover: 0.42, grain: 0.07, dark: 0.45,
    },
    afterglow: {
      zenith: "#1a1d55", mid: "#433878", rim: "#ae677e", glow: "#f08458", glowA: 0.72, belt: "#86689c", beltA: 0.32,
      body: "#87607e", shade: "#2a2350", light: "#ff9c72", warm: "#ff7c5c",
      haze: 0.45, cover: 0.42, grain: 0.08, dark: 0.75,
    },
  };

  const THEMES = { light: KF.noon, dark: KF.night };

  const TIMES = ["dawn", "morning", "noon", "afternoon", "dusk", "night"];
  const SEASONS = ["spring", "summer", "autumn", "winter"];
  const WEATHERS = ["clear", "cloudy", "rain", "storm", "snow", "fog"];

  const NAME = { predawn: "dawn", early: "morning", golden: "afternoon", afterglow: "dusk" };
  const RING = [["night", 0], ["night", 0.11], ["predawn", 0.18], ["dawn", 0.24], ["early", 0.295], ["morning", 0.36], ["noon", 0.5], ["afternoon", 0.65], ["golden", 0.735], ["dusk", 0.8], ["afterglow", 0.86], ["night", 0.935], ["night", 1]];
  const ANCHOR = { night: 0, dawn: 0.24, morning: 0.36, noon: 0.5, afternoon: 0.65, dusk: 0.8 };
  const RISE = 0.21, SET = 0.83;
  const ARC = [[0.21, -1.06, 0.17], [0.24, -0.8, 0.1], [0.36, -0.24, -0.28], [0.5, 0.44, -0.48], [0.65, 0.76, -0.34], [0.8, 0.86, 0.16], [0.83, 1.06, 0.28]];
  const TAN = ARC.map((p, i) => { const a = ARC[Math.max(0, i - 1)], b = ARC[Math.min(ARC.length - 1, i + 1)], h = b[0] - a[0]; return [(b[1] - a[1]) / h, (b[2] - a[2]) / h]; });

  const HEXES = ["zenith", "mid", "rim", "glow", "belt", "body", "shade", "light", "warm"];
  const NUMS = ["glowA", "beltA", "haze", "cover", "grain", "dark"];

  const DAYLEN = 360;
  const MARKOV = {
    clear: [["clear", 0.5], ["cloudy", 0.35], ["fog", 0.15]],
    cloudy: [["clear", 0.3], ["cloudy", 0.25], ["rain", 0.3], ["fog", 0.15]],
    rain: [["cloudy", 0.4], ["rain", 0.25], ["storm", 0.25], ["fog", 0.1]],
    storm: [["rain", 0.6], ["cloudy", 0.4]],
    snow: [["cloudy", 0.45], ["snow", 0.4], ["fog", 0.15]],
    fog: [["clear", 0.4], ["cloudy", 0.4], ["fog", 0.2]],
  };

  const presets = {
    "dawn-spring": { time: "dawn", season: "spring", weather: "clear" },
    golden: { time: "afternoon", season: "autumn", weather: "clear" },
    "dusk-autumn": { time: "dusk", season: "autumn", weather: "clear" },
    storm: { time: "afternoon", season: "summer", weather: "storm" },
    rain: { time: "afternoon", season: "spring", weather: "rain" },
    fog: { time: "morning", season: "autumn", weather: "fog" },
    "winter-night": { time: "night", season: "winter", weather: "snow", moon: 0.25 },
    "snow-day": { time: "noon", season: "winter", weather: "snow" },
    "full-moon": { time: "night", season: "summer", weather: "clear", moon: 0.5 },
    "new-moon": { time: "night", season: "summer", weather: "clear", moon: 0 },
  };

  const state = { time: "morning", season: "summer", weather: "clear", moon: 0.5, auto: true, day: 0.42, theme: "light" };
  const wx = { from: "clear", to: "clear", u: 1, timer: 60 };

  /* RESOLVE */

  function segment(day) {
    const d = ((day % 1) + 1) % 1;
    for (let i = 0; i < RING.length - 1; i++) {
      const a = RING[i], b = RING[i + 1];
      if (d >= a[1] && d <= b[1]) return [a[0], b[0], (d - a[1]) / (b[1] - a[1])];
    }
    return ["night", "night", 0];
  }

  function lum(hex) { const c = Core.parse(hex); return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255; }

  function solarAt(day) {
    const d = ((day % 1) + 1) % 1;
    if (d >= RISE && d <= SET) return 0.75 * Math.sin(Math.PI * (d - RISE) / (SET - RISE));
    return -0.44 * Math.sin(Math.PI * ((((d - SET) % 1) + 1) % 1) / (1 - SET + RISE));
  }

  const moonDay = (day, p) => day + 0.5 - (p - 0.5) * 0.5;

  function seasonPass(T, s) {
    if (s === "spring") {
      T.rim = tone(T.rim, MINT, 0.24);
      T.mid = tone(T.mid, "#8fd0e6", 0.1);
      T.glow = tone(T.glow, BLOSSOM, 0.26);
      T.belt = tone(T.belt, BLOSSOM, 0.24);
      T.light = mix(T.light, P.pink, 0.04);
      T.warm = tone(T.warm, BLOSSOM, 0.22);
      T.cover = 0.35; T.dust = 0.4;
    } else if (s === "summer") {
      T.zenith = tone(T.zenith, "#1d5fd0", 0.2, -0.05);
      T.mid = tone(T.mid, "#4f9ae6", 0.1);
      T.glow = tone(T.glow, "#ffd890", 0.12);
      T.glowA *= 1.08;
      T.dust = 0.2;
    } else if (s === "autumn") {
      T.glow = tone(T.glow, AMBER, 0.4);
      T.glowA *= 1.15;
      T.rim = tone(T.rim, "#f4d8b4", 0.14);
      T.mid = tone(T.mid, AMBER, 0.05);
      T.warm = mix(T.warm, mix(mix(P.yellow, P.orange, 0.45), P.white, 0.3), 0.6);
      T.light = mix(T.light, P.yellow, 0.07);
      T.haze = clamp(T.haze + 0.06, 0, 1);
      T.cover = 0.45; T.leaves = 0.6; T.windK *= 1.3;
    } else {
      T.zenith = tone(T.zenith, "#7a9fd6", 0.26, 0.16);
      T.mid = tone(T.mid, FROST, 0.2, 0.05);
      T.rim = tone(T.rim, FROST, 0.45, 0.05);
      T.glow = tone(T.glow, LEMON, 0.36);
      T.glowA *= 0.9;
      T.belt = tone(T.belt, "#d8c8e6", 0.25);
      T.light = mix(T.light, P.cyan, 0.04);
      T.body = tone(T.body, FROST, 0.2);
      T.cover = 0.5; T.windK *= 1.2; T.grain += 0.01;
    }
  }

  function weatherPass(T, k, w) {
    if (w <= 0.001 || k === "clear") return;
    if (k === "cloudy") {
      T.cover = lerp(T.cover, 0.75, w);
      T.haze = clamp(T.haze + 0.2 * w, 0, 1);
      T.zenith = tone(T.zenith, OVERCAST, 0.6 * w, 0.36 * w);
      T.mid = tone(T.mid, OVERCAST, 0.5 * w, 0.04 * w);
      T.rim = tone(T.rim, OVERCAST, 0.34 * w);
      T.glowA *= 1 - 0.25 * w; T.beltA *= 1 - 0.6 * w;
      T.body = tone(T.body, "#eceef2", 0.45 * w, -0.08 * w);
      T.shade = tone(T.shade, "#97a2b4", 0.4 * w, 0.04 * w);
      T.light = tone(T.light, "#f4f3f0", 0.25 * w, -0.04 * w);
    } else if (k === "rain") {
      T.cover = lerp(T.cover, 0.85, w);
      T.rain = lerp(T.rain, 0.7, w);
      T.fog = lerp(T.fog, 0.2, w);
      T.haze = clamp(T.haze + 0.2 * w, 0, 1);
      T.zenith = tone(T.zenith, SLATE, 0.7 * w, -0.15 * w);
      T.mid = tone(T.mid, SLATE, 0.65 * w, -0.3 * w);
      T.rim = tone(T.rim, "#a7b1bf", 0.52 * w, -0.24 * w);
      T.glowA *= 1 - 0.5 * w; T.beltA *= 1 - 0.8 * w;
      T.body = tone(T.body, "#c4cad6", 0.64 * w, -0.5 * w);
      T.shade = tone(T.shade, "#5c6478", 0.62 * w, -0.45 * w);
      T.light = tone(T.light, "#dfe3ea", 0.45 * w, -0.14 * w);
      T.warm = tone(T.warm, "#dfe3ea", 0.4 * w);
      T.windK *= 1 + 0.4 * w;
      T.dark = clamp(T.dark + 0.12 * w, 0, 1);
    } else if (k === "storm") {
      T.cover = lerp(T.cover, 0.95, w);
      T.rain = lerp(T.rain, 1, w);
      T.storm = lerp(T.storm, 1, w);
      T.fog = lerp(T.fog, 0.25, w);
      T.haze = clamp(T.haze + 0.3 * w, 0, 1);
      T.zenith = tone(T.zenith, STORMY, 0.9 * w, -0.84 * w);
      T.mid = tone(T.mid, STORMY, 0.88 * w, -0.86 * w);
      T.rim = tone(T.rim, "#5a5f80", 0.84 * w, -0.8 * w);
      T.glow = tone(T.glow, COPPER, 0.7 * w);
      T.glowA = lerp(T.glowA, 0.55, w); T.beltA *= 1 - 0.9 * w;
      T.body = tone(T.body, "#62688a", 0.88 * w, -0.9 * w);
      T.shade = tone(T.shade, "#262a44", 0.86 * w, -0.88 * w);
      T.light = tone(T.light, "#c8c8d4", 0.62 * w, -0.58 * w);
      T.warm = tone(T.warm, COPPER, 0.5 * w, -0.3 * w);
      T.windK *= 1 + 1.3 * w;
      T.dark = clamp(T.dark + 0.3 * w, 0, 1);
    } else if (k === "snow") {
      T.cover = lerp(T.cover, 0.7, w);
      T.snow = lerp(T.snow, 0.8, w);
      T.haze = clamp(T.haze + 0.15 * w, 0, 1);
      T.zenith = tone(T.zenith, PEARL, 0.62 * w, 0.9 * w);
      T.mid = tone(T.mid, PEARL, 0.55 * w, 0.25 * w);
      T.rim = tone(T.rim, PEARL, 0.45 * w, 0.05 * w);
      T.glow = tone(T.glow, "#ffe2d6", 0.45 * w);
      T.glowA *= 1 - 0.3 * w; T.beltA *= 1 - 0.5 * w;
      T.body = mix(T.body, mix(P.white, P.cyan, 0.06), 0.4 * w);
      T.shade = tone(T.shade, "#a4b0c6", 0.45 * w, 0.06 * w);
      T.windK *= 1 + 0.1 * w;
    } else if (k === "fog") {
      T.fog = lerp(T.fog, 0.8, w);
      T.cover = lerp(T.cover, 0.5, w);
      T.haze = clamp(T.haze + 0.25 * w, 0, 1);
      T.zenith = tone(T.zenith, MILK, 0.84 * w, 1.6 * w);
      T.mid = tone(T.mid, MILK, 0.78 * w, 0.55 * w);
      T.rim = tone(T.rim, MILK, 0.66 * w, 0.1 * w);
      for (const f of ["body", "shade", "light", "warm"]) T[f] = tone(T[f], MILK, 0.42 * w, f === "shade" ? 0.25 * w : 0);
      T.glow = tone(T.glow, "#fff6e8", 0.5 * w);
      T.glowA *= 1 - 0.2 * w; T.beltA *= 1 - 0.7 * w;
    }
  }

  function resolve(st) {
    const s = st || state;
    const day = s.auto ? s.day : (ANCHOR[s.time] !== undefined ? ANCHOR[s.time] : 0.5);
    const [an, bn, u] = segment(day);
    const a = KF[an], b = KF[bn], near = u < 0.5 ? an : bn;
    const name = s.auto ? NAME[near] || near : s.time;
    const T = { rain: 0, snow: 0, storm: 0, fog: 0, leaves: 0, dust: 0, windK: 1 };
    for (const f of HEXES) T[f] = an === bn ? a[f] : mix(a[f], b[f], u);
    for (const f of NUMS) T[f] = an === bn ? a[f] : lerp(a[f], b[f], u);
    const solar = solarAt(day), lunar = solarAt(moonDay(day, s.moon)), tw = smooth(clamp(-solar / 0.14, 0, 1));
    T.sun = solar > 0;
    T.solar = solar;
    T.lunar = lunar;
    T.sunElev = solar >= 0 ? clamp(solar, 0, 1) : clamp(lunar, 0, 1) * tw;
    T.moon = s.moon;

    const nightW = smooth(clamp(-solar / 0.3, 0, 1)), illum = 1 - Math.abs(s.moon * 2 - 1);
    const ml = illum * smooth(clamp((lunar + 0.02) / 0.14, 0, 1));
    T.moonlight = ml * nightW;
    if (nightW > 0) {
      const dn = (1 - ml) * nightW;
      T.body = mix(T.body, P.black, dn * 0.5);
      T.shade = mix(T.shade, P.black, dn * 0.5);
      T.light = mix(T.light, P.black, dn * 0.45);
      T.warm = mix(T.warm, P.black, dn * 0.45);
      T.zenith = mix(T.zenith, P.black, dn * 0.3);
      T.mid = mix(T.mid, P.black, dn * 0.26);
      T.rim = mix(T.rim, P.black, dn * 0.2);
      T.dark = clamp(T.dark - 0.15 * ml * nightW, 0, 1);
    }

    seasonPass(T, s.season);
    weatherPass(T, wx.from, 1 - wx.u);
    weatherPass(T, wx.to, wx.u);

    T.tint = rgba(T.glow, clamp(T.glowA, 0, 1));
    T.bird = scheme.matches || lum(T.mid) <= 0.45 ? P.white : P.black;
    T.season = s.season;
    T.time = name;
    T.cover = clamp(T.cover, 0, 1);
    T.grain = clamp(T.grain, 0, 1);
    T.key = [name, s.season, wx.from, wx.to, T.sun ? "s" : "m", Math.floor(day * 720), Math.floor(s.moon * 32)].join("/");
    return T;
  }

  function theme() { return G.T; }

  /* SUN */

  function arcAt(day) {
    const d = ((day % 1) + 1) % 1, n = ARC.length - 1;
    if (d <= ARC[0][0] || d >= ARC[n][0]) {
      const ev = d >= ARC[n][0] || d < 0.02, i = ev ? n : 0, dt = ev ? (((d - ARC[n][0]) % 1) + 1) % 1 : d - ARC[0][0];
      return [ARC[i][1] + TAN[i][0] * dt, ARC[i][2] + TAN[i][1] * dt];
    }
    let i = 0;
    while (d > ARC[i + 1][0]) i++;
    const a = ARC[i], b = ARC[i + 1], h = b[0] - a[0], s = (d - a[0]) / h, s2 = s * s, s3 = s2 * s;
    const h0 = 2 * s3 - 3 * s2 + 1, h1 = (s3 - 2 * s2 + s) * h, h2 = 3 * s2 - 2 * s3, h3 = (s3 - s2) * h;
    return [h0 * a[1] + h1 * TAN[i][0] + h2 * b[1] + h3 * TAN[i + 1][0], h0 * a[2] + h1 * TAN[i][1] + h2 * b[2] + h3 * TAN[i + 1][1]];
  }

  const dayOf = () => (state.auto ? state.day : ANCHOR[state.time] !== undefined ? ANCHOR[state.time] : 0.5);
  const screen = (p) => [G.W * (0.5 + 0.5 * p[0]), G.H * (0.5 + 0.5 * p[1])];

  function sunPos() { return screen(arcAt(dayOf())); }

  function moonPos() { return screen(arcAt(moonDay(dayOf(), state.moon))); }

  function sunAt() {
    const day = dayOf(), s = arcAt(day), solar = solarAt(day);
    if (solar >= 0) return screen(s);
    const m = arcAt(moonDay(day, state.moon)), k = smooth(clamp(-solar / 0.14, 0, 1));
    return screen([lerp(s[0], m[0], k), lerp(s[1], m[1], k)]);
  }


  /* DRIFT */

  function pickWeather() {
    const table = MARKOV[state.season === "winter" && state.weather === "rain" ? "snow" : state.weather] || MARKOV.clear;
    let r = G.rnd();
    for (const [k, p] of table) { r -= p; if (r <= 0) return state.season === "winter" && (k === "rain" || k === "storm") ? "snow" : k; }
    return "clear";
  }

  let seasonT = 0;

  function step(dt) {
    if (!state.auto) { G.T = resolve(state); return; }
    state.day = (state.day + dt / DAYLEN) % 1;
    state.moon = (state.moon + dt / (DAYLEN * 30)) % 1;
    seasonT += dt;
    if (seasonT >= DAYLEN * 3) { seasonT = 0; state.season = SEASONS[(SEASONS.indexOf(state.season) + 1) % 4]; }
    wx.timer -= dt;
    if (wx.timer <= 0) { wx.from = wx.to; wx.to = pickWeather(); state.weather = wx.to; wx.u = 0; wx.timer = 40 + G.rnd() * 80; }
    if (wx.u < 1) wx.u = Math.min(1, wx.u + dt / 8);
    G.T = resolve(state);
    state.theme = G.T.dark < 0.5 ? "light" : "dark";
  }

  /* SHUFFLE */

  const HOURS = [["dawn", 0.2], ["morning", 0.11], ["noon", 0.09], ["afternoon", 0.18], ["dusk", 0.23], ["night", 0.19]];
  const SKIES = [["clear", 0.45], ["cloudy", 0.29], ["rain", 0.09], ["fog", 0.09], ["storm", 0.08]];
  const WINTER = [["clear", 0.36], ["cloudy", 0.23], ["snow", 0.32], ["fog", 0.09]];

  function draw(table) {
    let r = G.rnd();
    for (const [k, p] of table) { r -= p; if (r <= 0) return k; }
    return table[0][0];
  }

  function roll() {
    const time = draw(HOURS);
    state.auto = true;
    state.time = time;
    state.day = (((time === "night" ? (G.rnd() - 0.5) * 0.16 : ANCHOR[time] + (G.rnd() - 0.5) * 0.06) % 1) + 1) % 1;
    state.season = SEASONS[Math.floor(G.rnd() * 4)];
    state.weather = draw(state.season === "winter" ? WINTER : SKIES);
    state.moon = 0.15 + G.rnd() * 0.7;
    wx.from = wx.to = state.weather; wx.u = 1; wx.timer = 40 + G.rnd() * 80;
    seasonT = G.rnd() * DAYLEN * 3;
  }

  function shuffle() {
    roll();
    G.T = resolve(state);
    state.theme = G.T.dark < 0.5 ? "light" : "dark";
    G.rebuild(true);
  }

  /* SET */

  function set(patch) {
    if (patch.theme) { patch = Object.assign({}, patch, { time: patch.theme === "dark" ? "night" : "noon" }); }
    if (patch.time || patch.theme) patch.auto = patch.auto !== undefined ? patch.auto : false;
    Object.assign(state, patch);
    if (TIMES.indexOf(state.time) < 0) state.time = "noon";
    if (SEASONS.indexOf(state.season) < 0) state.season = "summer";
    if (WEATHERS.indexOf(state.weather) < 0) state.weather = "clear";
    state.moon = ((state.moon % 1) + 1) % 1;
    if (!state.auto) { wx.from = wx.to = state.weather; wx.u = 1; state.day = ANCHOR[state.time]; }
    else if (state.weather !== wx.to) { wx.from = wx.to; wx.to = state.weather; wx.u = 0; wx.timer = 60; }
    G.T = resolve(state);
    state.theme = G.T.dark < 0.5 ? "light" : "dark";
    G.rebuild();
  }

  function cycle(list, cur, d) { return list[(list.indexOf(cur) + (d || 1) + list.length) % list.length]; }

  /* HOOKS */

  let wired = false;

  function init(q) {
    roll();
    const mood = q.get("mood");
    if (mood && presets[mood]) Object.assign(state, presets[mood]);
    const th = q.get("theme");
    if (th) state.time = th === "dark" ? "night" : "noon";
    if (q.get("time")) state.time = q.get("time");
    if (q.get("season")) state.season = q.get("season");
    if (q.get("weather")) state.weather = q.get("weather");
    if (q.get("moon") !== null) state.moon = +q.get("moon");
    if (q.get("day") !== null) state.day = clamp(+q.get("day"), 0, 1);
    if (mood || th || q.get("time")) state.auto = false;
    if (q.get("auto") !== null) state.auto = q.get("auto") === "1" || q.get("auto") === "true";

    if (TIMES.indexOf(state.time) < 0) state.time = "noon";
    if (SEASONS.indexOf(state.season) < 0) state.season = "summer";
    if (WEATHERS.indexOf(state.weather) < 0) state.weather = "clear";
    if (!isFinite(state.moon)) state.moon = 0.5;
    state.moon = ((state.moon % 1) + 1) % 1;
    wx.from = wx.to = state.weather; wx.u = 1;
    if (!state.auto) state.day = ANCHOR[state.time];

    G.T = resolve(state);
    state.theme = G.T.dark < 0.5 ? "light" : "dark";

    if (wired) return;
    wired = true;
    addEventListener("keydown", (e) => {
      if (!G.visible || typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "d") set({ theme: state.theme === "light" ? "dark" : "light" });
      else if (k === "t") set({ time: cycle(TIMES, state.time), auto: false });
      else if (k === "s") set({ season: cycle(SEASONS, state.season), auto: false });
      else if (k === "w") set({ weather: cycle(WEATHERS, state.weather), auto: false });
      else if (k === "a") set({ auto: !state.auto });
      else if (k === "m") set({ moon: (state.moon + 0.125) % 1 });
    });
  }

  return { THEMES, state, theme, resolve, sunAt, sunPos, moonPos, solarAt, set, shuffle, step, init, presets };
})();
