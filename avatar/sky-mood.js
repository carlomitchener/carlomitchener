const Mood = (() => {
  const { mix, rgba, clamp, lerp, P } = Core;

  /* PAINT BOX */

  const paper = mix(mix(P.green, P.indigo, 0.71), P.white, 0.93);
  const silver = mix(mix(P.white, P.indigo, 0.6), P.gray, 0.4);
  const warmOf = (t) => mix(mix(P.orange, P.pink, 0.35), P.white, t);
  const frost = mix(P.white, P.cyan, 0.25);
  const ash = mix(P.gray, P.white, 0.55);

  /* KEYFRAMES */

  const KF = {
    dawn: {
      zenith: mix(mix(P.indigo, P.blue, 0.4), P.black, 0.52),
      mid: mix(mix(P.blue, P.purple, 0.22), mix(P.white, P.orange, 0.3), 0.52),
      rim: warmOf(0.5),
      tintC: mix(P.orange, P.yellow, 0.3), tintA: 0.3,
      body: mix(mix(P.orange, P.pink, 0.3), P.white, 0.82),
      shade: mix(mix(P.indigo, P.orange, 0.28), P.white, 0.42),
      light: mix(P.white, P.yellow, 0.16),
      warm: warmOf(0.32),
      haze: 0.5, cover: 0.4, grain: 0.07, dark: 0.35, sunElev: 0.1, sun: true,
    },
    morning: {
      zenith: mix(mix(P.blue, P.indigo, 0.26), P.black, 0.14),
      mid: mix(mix(P.blue, P.cyan, 0.3), P.white, 0.44),
      rim: mix(P.cyan, P.white, 0.8),
      tintC: mix(P.yellow, P.white, 0.6), tintA: 0.3,
      body: mix(mix(P.cyan, P.white, 0.93), P.white, 0.55),
      shade: mix(mix(P.cyan, P.white, 0.44), P.gray, 0.36),
      light: mix(P.white, P.yellow, 0.04),
      warm: mix(P.white, P.yellow, 0.1),
      haze: 0.52, cover: 0.38, grain: 0.06, dark: 0.06, sunElev: 0.5, sun: true,
    },
    noon: {
      zenith: mix(mix(P.blue, P.indigo, 0.35), P.black, 0.12),
      mid: mix(P.blue, P.white, 0.42),
      rim: mix(P.cyan, P.white, 0.84),
      tintC: mix(P.yellow, P.white, 0.5), tintA: 0.35,
      body: paper,
      shade: mix(mix(P.blue, P.white, 0.38), P.gray, 0.4),
      light: mix(P.white, P.yellow, 0.05),
      warm: mix(P.white, P.yellow, 0.05),
      haze: 0.55, cover: 0.4, grain: 0.06, dark: 0, sunElev: 0.75, sun: true,
    },
    afternoon: {
      zenith: mix(mix(P.blue, P.indigo, 0.33), P.black, 0.1),
      mid: mix(mix(P.blue, P.orange, 0.09), P.white, 0.44),
      rim: mix(mix(P.cyan, P.yellow, 0.34), P.white, 0.78),
      tintC: mix(P.yellow, P.orange, 0.34), tintA: 0.34,
      body: mix(mix(P.orange, P.white, 0.93), P.white, 0.45),
      shade: mix(mix(P.blue, P.white, 0.4), P.brown, 0.24),
      light: mix(P.white, P.yellow, 0.12),
      warm: mix(mix(P.yellow, P.orange, 0.4), P.white, 0.45),
      haze: 0.55, cover: 0.4, grain: 0.06, dark: 0.08, sunElev: 0.6, sun: true,
    },
    dusk: {
      zenith: mix(mix(P.indigo, P.purple, 0.28), P.black, 0.58),
      mid: mix(mix(P.purple, P.indigo, 0.48), P.white, 0.28),
      rim: mix(mix(P.orange, P.pink, 0.32), P.white, 0.3),
      tintC: mix(P.orange, P.pink, 0.28), tintA: 0.4,
      body: mix(mix(P.purple, P.orange, 0.5), P.white, 0.52),
      shade: mix(mix(P.indigo, P.purple, 0.4), P.black, 0.36),
      light: mix(mix(P.orange, P.yellow, 0.42), P.white, 0.4),
      warm: mix(mix(P.orange, P.pink, 0.4), P.white, 0.18),
      haze: 0.5, cover: 0.42, grain: 0.07, dark: 0.5, sunElev: 0.1, sun: true,
    },
    night: {
      zenith: mix(mix(P.blue, P.indigo, 0.5), P.black, 0.9),
      mid: mix(P.indigo, P.black, 0.78),
      rim: mix(P.indigo, P.black, 0.6),
      tintC: mix(P.white, P.indigo, 0.3), tintA: 0.14,
      body: mix(mix(P.indigo, P.black, 0.72), P.gray, 0.3),
      shade: mix(P.indigo, P.black, 0.9),
      light: silver,
      warm: silver,
      haze: 0.4, cover: 0.4, grain: 0.09, dark: 1, sunElev: 0.6, sun: false,
    },
  };

  const THEMES = { light: KF.noon, dark: KF.night };

  const TIMES = ["dawn", "morning", "noon", "afternoon", "dusk", "night"];
  const SEASONS = ["spring", "summer", "autumn", "winter"];
  const WEATHERS = ["clear", "cloudy", "rain", "storm", "snow", "fog"];

  const RING = [["night", 0], ["dawn", 0.24], ["morning", 0.36], ["noon", 0.5], ["afternoon", 0.65], ["dusk", 0.8], ["night", 1]];
  const ANCHOR = { night: 0, dawn: 0.24, morning: 0.36, noon: 0.5, afternoon: 0.65, dusk: 0.8 };
  const ARC = { night: [0.72, 0.26], dawn: [0.1, 0.55], morning: [0.38, 0.36], noon: [0.72, 0.26], afternoon: [0.88, 0.33], dusk: [0.93, 0.58] };

  const HEXES = ["zenith", "mid", "rim", "body", "shade", "light", "warm", "tintC"];
  const NUMS = ["tintA", "haze", "cover", "grain", "dark"];

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

  function seasonPass(T, s) {
    if (s === "spring") {
      T.rim = mix(mix(T.rim, P.mint, 0.1), P.pink, 0.06);
      T.light = mix(T.light, P.pink, 0.05);
      T.warm = mix(T.warm, P.pink, 0.14);
      T.cover = 0.35; T.dust = 0.4;
    } else if (s === "summer") {
      T.dust = 0.2;
    } else if (s === "autumn") {
      T.tintC = mix(mix(P.yellow, P.orange, 0.4), P.white, 0.35);
      T.warm = mix(T.warm, mix(mix(P.yellow, P.orange, 0.45), P.white, 0.3), 0.75);
      T.mid = mix(T.mid, P.orange, 0.07);
      T.light = mix(T.light, P.yellow, 0.08);
      T.cover = 0.45; T.leaves = 0.6; T.windK *= 1.3;
    } else {
      T.rim = mix(T.rim, frost, 0.4);
      T.zenith = mix(T.zenith, P.gray, 0.14);
      T.mid = mix(T.mid, mix(P.white, P.cyan, 0.4), 0.16);
      T.light = mix(T.light, P.cyan, 0.05);
      T.cover = 0.5; T.windK *= 1.2; T.grain += 0.02;
    }
  }

  function weatherPass(T, k, w) {
    if (w <= 0.001 || k === "clear") return;
    if (k === "cloudy") {
      T.cover = lerp(T.cover, 0.75, w);
      T.haze = clamp(T.haze + 0.2 * w, 0, 1);
      T.body = mix(T.body, ash, 0.3 * w);
      T.shade = mix(T.shade, P.gray, 0.32 * w);
      T.light = mix(T.light, ash, 0.22 * w);
      T.mid = mix(T.mid, ash, 0.14 * w);
    } else if (k === "rain") {
      T.cover = lerp(T.cover, 0.85, w);
      T.rain = lerp(T.rain, 0.7, w);
      T.fog = lerp(T.fog, 0.2, w);
      T.haze = clamp(T.haze + 0.2 * w, 0, 1);
      T.body = mix(T.body, mix(P.gray, P.indigo, 0.2), 0.55 * w);
      T.shade = mix(T.shade, mix(P.gray, P.black, 0.45), 0.55 * w);
      T.light = mix(T.light, ash, 0.4 * w);
      T.mid = mix(T.mid, mix(P.gray, P.indigo, 0.18), 0.52 * w);
      T.rim = mix(T.rim, mix(P.gray, P.white, 0.25), 0.5 * w);
      T.zenith = mix(T.zenith, mix(P.indigo, P.black, 0.5), 0.35 * w);
      T.windK *= 1 + 0.4 * w;
      T.dark = clamp(T.dark + 0.12 * w, 0, 1);
    } else if (k === "storm") {
      T.cover = lerp(T.cover, 0.95, w);
      T.rain = lerp(T.rain, 1, w);
      T.storm = lerp(T.storm, 1, w);
      T.fog = lerp(T.fog, 0.25, w);
      T.haze = clamp(T.haze + 0.3 * w, 0, 1);
      T.body = mix(T.body, mix(mix(P.gray, P.indigo, 0.4), P.black, 0.42), 0.82 * w);
      T.shade = mix(T.shade, mix(mix(P.gray, P.indigo, 0.5), P.black, 0.68), 0.82 * w);
      T.light = mix(T.light, mix(P.gray, P.white, 0.3), 0.6 * w);
      T.warm = mix(T.warm, mix(P.gray, P.white, 0.45), 0.5 * w);
      T.zenith = mix(T.zenith, mix(mix(P.indigo, P.gray, 0.3), P.black, 0.72), 0.85 * w);
      T.mid = mix(T.mid, mix(mix(P.gray, P.indigo, 0.45), P.black, 0.46), 0.88 * w);
      T.rim = mix(T.rim, mix(mix(P.gray, P.indigo, 0.2), P.black, 0.24), 0.82 * w);
      T.tintA *= 1 - 0.6 * w;
      T.windK *= 1 + 1.3 * w;
      T.dark = clamp(T.dark + 0.3 * w, 0, 1);
    } else if (k === "snow") {
      T.cover = lerp(T.cover, 0.7, w);
      T.snow = lerp(T.snow, 0.8, w);
      T.haze = clamp(T.haze + 0.15 * w, 0, 1);
      T.body = mix(T.body, mix(P.white, P.cyan, 0.06), 0.4 * w);
      T.shade = mix(T.shade, mix(P.gray, P.cyan, 0.22), 0.45 * w);
      T.mid = mix(T.mid, mix(ash, P.cyan, 0.15), 0.35 * w);
      T.rim = mix(T.rim, frost, 0.3 * w);
      T.windK *= 1 + 0.1 * w;
    } else if (k === "fog") {
      const veil = mix(ash, T.mid, 0.25);
      T.fog = lerp(T.fog, 0.8, w);
      T.cover = lerp(T.cover, 0.5, w);
      T.haze = clamp(T.haze + 0.25 * w, 0, 1);
      for (const f of ["zenith", "mid", "rim", "body", "shade", "light", "warm"]) T[f] = mix(T[f], veil, 0.45 * w);
      T.tintA *= 1 - 0.5 * w;
    }
  }

  function resolve(st) {
    const s = st || state;
    const day = s.auto ? s.day : (ANCHOR[s.time] !== undefined ? ANCHOR[s.time] : 0.5);
    const [an, bn, u] = segment(day);
    const a = KF[an], b = KF[bn];
    const name = s.auto ? (u < 0.5 ? an : bn) : s.time;
    const T = { rain: 0, snow: 0, storm: 0, fog: 0, leaves: 0, dust: 0, windK: 1 };
    for (const f of HEXES) T[f] = an === bn ? a[f] : mix(a[f], b[f], u);
    for (const f of NUMS) T[f] = an === bn ? a[f] : lerp(a[f], b[f], u);
    const sa = a.sun ? a.sunElev : -a.sunElev, sb = b.sun ? b.sunElev : -b.sunElev;
    const solar = an === bn ? sa : lerp(sa, sb, u);
    T.sun = solar > 0;
    T.sunElev = clamp(Math.abs(solar), 0, 1);
    T.moon = s.moon;

    const nightW = (an === "night" ? 1 - u : 0) + (bn === "night" ? u : 0);
    if (nightW > 0) {
      const illum = 1 - Math.abs(s.moon * 2 - 1);
      const dn = (1 - illum) * nightW;
      T.body = mix(T.body, P.black, dn * 0.52);
      T.shade = mix(T.shade, P.black, dn * 0.5);
      T.light = mix(T.light, P.black, dn * 0.46);
      T.warm = mix(T.warm, P.black, dn * 0.46);
      T.tintA *= 1 - dn * 0.7;
      T.dark = clamp(T.dark - 0.15 * illum * nightW, 0, 1);
    }

    seasonPass(T, s.season);
    weatherPass(T, wx.from, 1 - wx.u);
    weatherPass(T, wx.to, wx.u);

    T.tint = rgba(T.tintC, clamp(T.tintA, 0, 1));
    T.bird = lum(T.mid) > 0.45 ? P.black : P.white;
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
    const [an, bn, u] = segment(day);
    const a = ARC[an], b = ARC[bn];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  }

  function sunAt() {
    const day = state.auto ? state.day : (ANCHOR[state.time] !== undefined ? ANCHOR[state.time] : 0.5);
    const p = arcAt(day);
    return [G.W * p[0], G.H * p[1]];
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

  /* STORE */

  function save() {
    try { localStorage.setItem("sky-mood", JSON.stringify({ time: state.time, season: state.season, weather: state.weather, moon: state.moon, auto: state.auto })); } catch (e) {}
  }

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
    save();
    G.rebuild();
    ui();
  }

  /* UI */

  const GLYPH = {
    time: { dawn: "◔", morning: "◑", noon: "☼", afternoon: "◕", dusk: "◒", night: "☾" },
    season: { spring: "❀", summer: "☘", autumn: "❦", winter: "❄" },
    weather: { clear: "○", cloudy: "☁", rain: "☂", storm: "⚡", snow: "❅", fog: "≋" },
  };

  let strip, idle = 0, wired = false;

  function css() {
    const line = rgba(P.white, 0.45), face = rgba(P.black, 0.14), hot = rgba(P.black, 0.3), ink = rgba(P.white, 0.92), halo = rgba(P.white, 0.7);
    return `#mood-ui{position:absolute;bottom:max(14px,env(safe-area-inset-bottom));right:max(14px,env(safe-area-inset-right));display:flex;gap:8px;z-index:9;opacity:0;transition:opacity .5s ease}
#mood-ui.show{opacity:.7}
#mood-ui:hover{opacity:1}
#mood-ui button{width:30px;height:30px;padding:0;border-radius:50%;border:1px solid ${line};background:${face};color:${ink};font:15px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:box-shadow .3s ease,background .3s ease}
#mood-ui button:hover{background:${hot}}
#mood-ui button.on{box-shadow:0 0 9px ${halo};border-color:${halo}}`;
  }

  function cycle(list, cur, d) { return list[(list.indexOf(cur) + (d || 1) + list.length) % list.length]; }

  function ui() {
    if (!document.body) return;
    if (!strip) {
      const st = document.createElement("style"); st.id = "mood-css"; st.textContent = css(); document.head.appendChild(st);
      strip = document.createElement("div"); strip.id = "mood-ui";
      for (const k of ["time", "season", "weather", "auto"]) {
        const b = document.createElement("button");
        b.id = "mood-" + k; b.setAttribute("aria-label", k);
        b.addEventListener("click", () => {
          if (k === "auto") set({ auto: !state.auto });
          else if (k === "time") set({ time: cycle(TIMES, state.time), auto: false });
          else if (k === "season") set({ season: cycle(SEASONS, state.season), auto: false });
          else set({ weather: cycle(WEATHERS, state.weather), auto: false });
        });
        strip.appendChild(b);
      }
      (G.canvas ? G.canvas.parentElement : document.body).appendChild(strip);
      const b0 = document.querySelector("#theme"); if (b0) b0.remove();
    }
    const now = state.auto ? (G.T ? G.T.time : state.time) : state.time;
    strip.children[0].textContent = GLYPH.time[now] || GLYPH.time.noon;
    strip.children[1].textContent = GLYPH.season[state.season];
    strip.children[2].textContent = GLYPH.weather[state.auto ? wx.to : state.weather];
    strip.children[3].textContent = "∞";
    strip.children[3].classList.toggle("on", !!state.auto);
  }

  function wake() { if (!strip) return; strip.classList.add("show"); idle = 0; }

  /* HOOKS */

  function monthSeason(d) { const m = d.getMonth(); return m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn"; }
  function moonAt(d) { return ((((d.getTime() - 947182440000) / 86400000) / 29.530588) % 1 + 1) % 1; }

  function init(q) {
    const now = new Date();
    state.season = monthSeason(now);
    state.moon = moonAt(now);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("sky-mood") || "null"); } catch (e) {}
    if (saved) for (const k of ["time", "season", "weather", "moon", "auto"]) if (saved[k] !== undefined) state[k] = saved[k];

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
    if (SEASONS.indexOf(state.season) < 0) state.season = monthSeason(now);
    if (WEATHERS.indexOf(state.weather) < 0) state.weather = "clear";
    if (!isFinite(state.moon)) state.moon = 0.5;
    state.moon = ((state.moon % 1) + 1) % 1;
    wx.from = wx.to = state.weather; wx.u = 1; wx.timer = 40 + (G.rnd ? G.rnd() : 0.5) * 80;
    if (!state.auto) state.day = ANCHOR[state.time];

    G.T = resolve(state);
    state.theme = G.T.dark < 0.5 ? "light" : "dark";
    ui();

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
      else return;
      wake();
    });
    const home = G.canvas ? G.canvas.parentElement : window;
    home.addEventListener("mousemove", wake);
    home.addEventListener("touchstart", wake, { passive: true });
    setInterval(() => { if (!strip) return; idle += 0.5; if (idle > 3) strip.classList.remove("show"); }, 500);
    setInterval(ui, 1000);
  }

  return { THEMES, state, theme, resolve, sunAt, set, step, init, ui, presets };
})();
