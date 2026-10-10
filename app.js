import {
  GLASSES, TIME_LIMIT, RIM, beerById,
  dayKey, dayGame, orderText, pour, emptyGlass, wrongBeer, glassScore, totalScore, glassEmoji, shareText,
  msUntilNextDay, updateStats,
} from "./game.js";
import { PATRONS } from "./patrons.js";
import { GLASS_SHAPES } from "./glasses.js";

const KEY = dayKey();
const GAME = dayGame(KEY);
const PATRON = PATRONS[GAME.patron];
const DAY_STORE = "fillle:day:" + KEY;
const STATS_STORE = "fillle:stats";
const HELP_STORE = "fillle:seen-help";
const SHARE_URL = location.origin + location.pathname;
const TAP_KEYS = "qwert";
const MIXED_COLOR = "#7a6248";

const $ = (id) => document.getElementById(id);
const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: play still works */ }
  },
};

const state = {
  glasses: Array.from({ length: GLASSES }, emptyGlass),
  tap: null, // index into GAME.taps
  started: false,
  finished: false,
  endAt: 0,
  pouring: null, // { glass, beer, since }
};
const glassEls = [];
const tapEls = [];

// --- Taps

function tapSVG(beer) {
  const shape = GLASS_SHAPES[beer.glass];
  const size = beer.label.length > 8 ? 8 : beer.label.length > 6 ? 10 : 12;
  return `
    <svg viewBox="0 0 60 176" aria-hidden="true">
      <rect class="tap-body" x="22" y="96" width="16" height="30" rx="3"/>
      <path class="tap-body" d="M26,126 L34,126 L33,142 L27,142 Z"/>
      <g class="handle">
        <rect x="10" y="4" width="40" height="92" rx="12" fill="${beer.tap}" class="handle-face"/>
        <text x="30" y="50" fill="${beer.ink}" font-size="${size}" transform="rotate(-90 30 50)" text-anchor="middle" dominant-baseline="central">${beer.label}</text>
      </g>
      <g transform="translate(19 128) scale(0.22)" class="mini">
        <path d="${shape.outline}"/>
      </g>
    </svg>`;
}

function buildTap(i) {
  const beer = beerById[GAME.taps[i]];
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tap";
  el.style.setProperty("--delay", `${i * 90}ms`);
  el.setAttribute("aria-pressed", "false");
  el.setAttribute("aria-label", `${beer.name} tap`);
  el.innerHTML = `${tapSVG(beer)}<span class="name">${beer.name}</span><span class="key">${TAP_KEYS[i].toUpperCase()}</span>`;
  el.addEventListener("click", (e) => selectTap(i, e.timeStamp));
  tapEls.push(el);
  return el;
}

function selectTap(i, t) {
  if (state.finished || $("help").open || state.pouring) return;
  start(t);
  state.tap = i;
  tapEls.forEach((el, j) => {
    el.classList.toggle("selected", j === i);
    el.setAttribute("aria-pressed", String(j === i));
  });
  $("hint").textContent = `Pouring ${beerById[GAME.taps[i]].name}`;
}

// --- Glasses

function buildGlass(i) {
  const shape = GLASS_SHAPES[beerById[GAME.glasses[i]].glass];
  const lineY = shape.bottom - (shape.bottom - shape.top) / RIM;
  const el = document.createElement("button");
  el.type = "button";
  el.className = "glass";
  el.setAttribute("aria-label", `Glass ${i + 1}`);
  el.innerHTML = `
    <svg viewBox="0 -44 100 244" aria-hidden="true">
      <defs><clipPath id="bowl-${i}"><path d="${shape.bowl}"/></clipPath></defs>
      <rect class="stream" x="47.5" y="-44" width="5" height="${shape.top + 44}" rx="2.5"/>
      ${shape.stand ? `<path class="stand" d="${shape.stand}"/>` : ""}
      <path class="outline" d="${shape.outline}"/>
      <g clip-path="url(#bowl-${i})">
        <rect class="beer" x="0" width="100" y="${shape.bottom}" height="0"/>
        <rect class="head" x="0" width="100" y="${shape.bottom}" height="0"/>
      </g>
      ${shape.facets ? `<path class="facets" d="${shape.facets}"/>` : ""}
      <path class="line" d="M10,${lineY} L90,${lineY}"/>
      <rect class="drip" x="4" y="186" width="5" height="10" rx="2.5"/>
      <rect class="drip" x="91" y="186" width="5" height="10" rx="2.5"/>
    </svg>
    <span class="key">${i + 1}</span>
    <span class="out"></span>`;
  glassEls.push({
    el, shape,
    beer: el.querySelector(".beer"),
    head: el.querySelector(".head"),
    stream: el.querySelector(".stream"),
    out: el.querySelector(".out"),
  });
  el.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    if (startPour(i, e.timeStamp)) el.setPointerCapture(e.pointerId);
  });
  const release = (e) => {
    if (state.pouring?.glass === i) stopPour(e.timeStamp);
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("lostpointercapture", release);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  return el;
}

// --- Playing

function start(t) {
  if (state.started) return;
  state.started = true;
  state.endAt = t + TIME_LIMIT * 1000;
  $("done").hidden = false;
  save();
}

function startPour(i, t) {
  if (state.finished || state.pouring || $("help").open) return false;
  if (state.tap === null) {
    $("hint").textContent = "Pick a tap first";
    $("taps").classList.remove("nudge");
    void $("taps").offsetWidth; // restart the animation
    $("taps").classList.add("nudge");
    return false;
  }
  if (state.started && t >= state.endAt) return false;
  start(t);
  const beer = GAME.taps[state.tap];
  const g = state.glasses[i];
  if (g.beer === null) g.beer = beer;
  else if (g.beer !== beer) g.mixed = true;
  state.pouring = { glass: i, beer, since: t };
  glassEls[i].stream.style.fill = beerById[beer].color;
  glassEls[i].el.classList.add("pouring");
  return true;
}

function stopPour(t) {
  const p = state.pouring;
  if (!p) return;
  const end = Math.min(t, state.endAt);
  const g = state.glasses[p.glass];
  g.level = pour(g.level, GAME.times[p.glass], (end - p.since) / 1000);
  state.pouring = null;
  glassEls[p.glass].el.classList.remove("pouring");
  save();
}

function currentLevel(i, now) {
  const p = state.pouring;
  const g = state.glasses[i];
  if (p?.glass !== i) return g.level;
  return pour(g.level, GAME.times[i], (Math.min(now, state.endAt) - p.since) / 1000);
}

function draw(now) {
  for (let i = 0; i < GLASSES; i++) {
    const g = state.glasses[i];
    const { shape, beer, head, el } = glassEls[i];
    const level = currentLevel(i, now);
    const y = shape.bottom - (Math.min(level, RIM) / RIM) * (shape.bottom - shape.top);
    const info = g.beer && beerById[g.beer];
    beer.setAttribute("y", y);
    beer.setAttribute("height", shape.bottom - y);
    beer.style.fill = g.mixed ? MIXED_COLOR : info ? info.color : "transparent";
    head.setAttribute("y", y);
    head.setAttribute("height", level > 0.04 ? 5 : 0);
    head.style.fill = g.mixed ? "#cdbb9f" : info ? info.head : "transparent";
    el.classList.toggle("spilled", level >= RIM);
  }
  const left = state.started ? Math.max(0, state.endAt - now) / 1000 : TIME_LIMIT;
  $("clock").textContent = state.finished ? "0.0" : left.toFixed(1);
  $("track").style.transform = `scaleX(${state.finished ? 0 : left / TIME_LIMIT})`;
  document.querySelector(".timer").classList.toggle("low", state.started && !state.finished && left <= 3);
}

function tick() {
  const now = performance.now();
  if (state.started && !state.finished && now >= state.endAt) {
    stopPour(state.endAt);
    finish();
  }
  draw(now);
  if (!state.finished) requestAnimationFrame(tick);
}

function save() {
  store.set(DAY_STORE, { glasses: state.glasses, started: state.started, finished: state.finished });
}

function finish() {
  if (state.finished) return;
  stopPour(performance.now());
  state.finished = true;
  save();
  const stats = updateStats(store.get(STATS_STORE), KEY, totalScore(state.glasses, GAME.glasses));
  store.set(STATS_STORE, stats);
  showResult(stats);
}

// --- Results

function reaction(score) {
  if (state.glasses.some((g, i) => wrongBeer(g, GAME.glasses[i]))) return "That's not what I ordered.";
  if (score === 500) return "Proost! Perfect pours.";
  if (score >= 475) return "Proost! Lovely.";
  if (score >= 425) return "Cheers, that'll do nicely.";
  if (score >= 350) return "A bit uneven, but cheers.";
  if (score >= 250) return "Did you learn to pour today?";
  return "I'll take my business elsewhere.";
}

function showResult(stats) {
  draw(performance.now());
  $("done").hidden = true;
  $("hint").textContent = "";
  tapEls.forEach((el) => { el.disabled = true; el.classList.remove("selected"); });
  const total = totalScore(state.glasses, GAME.glasses);
  for (let i = 0; i < GLASSES; i++) {
    const g = state.glasses[i];
    const expected = beerById[GAME.glasses[i]];
    const c = glassEls[i];
    c.el.disabled = true;
    c.el.querySelector(".key").hidden = true;
    let html, label;
    if (wrongBeer(g, GAME.glasses[i])) {
      const what = g.mixed ? "Mixed" : beerById[g.beer].name;
      html = `<span class="pts bad">Wrong</span><span class="pct">${what}</span>`;
      label = `Glass ${i + 1}: wanted ${expected.name}, got ${g.mixed ? "a mix" : beerById[g.beer].name}, 0 points`;
    } else {
      const score = glassScore(g, GAME.glasses[i]);
      const cls = score >= 95 ? "good" : score >= 80 ? "ok" : score >= 50 ? "meh" : "bad";
      html = `<span class="pts ${cls}">${score}</span><span class="pct">${(g.level * 100).toFixed(1)}%</span>`;
      label = `Glass ${i + 1}, ${expected.name}: filled to ${(g.level * 100).toFixed(1)}% of the line, ${score} points`;
    }
    c.out.innerHTML = `${html}<span class="beer-name">${expected.name}</span>`;
    c.el.setAttribute("aria-label", label);
  }
  $("bubble-text").textContent = reaction(total);
  $("score").textContent = total;
  $("squares").textContent = state.glasses.map((g, i) => glassEmoji(g, GAME.glasses[i])).join("");
  const s = stats || store.get(STATS_STORE) || {};
  $("st-played").textContent = s.played ?? 1;
  $("st-streak").textContent = s.streak ?? 1;
  $("st-best").textContent = s.best ?? total;
  $("st-avg").textContent = s.played ? Math.round(s.total / s.played) : total;
  $("result").hidden = false;
  countdown();
  setInterval(countdown, 1000);
}

function countdown() {
  const ms = msUntilNextDay();
  if (ms <= 0) return location.reload();
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  $("next").textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function share() {
  const text = shareText(GAME, state.glasses, SHARE_URL);
  const toast = (msg) => { $("toast").textContent = msg; };
  if (navigator.share && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? "Copied to clipboard" : "Couldn't copy; select the squares above instead");
  }
}

// --- Setup

function init() {
  const label = new Date(KEY + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  $("day").textContent = `#${GAME.number} · ${label}`;
  $("patron-art").textContent = PATRON.art;
  $("patron-name").textContent = PATRON.name;
  $("bubble-text").textContent = orderText(GAME.order);
  GAME.taps.forEach((_, i) => $("taps").append(buildTap(i)));
  GAME.glasses.forEach((_, i) => $("glasses").append(buildGlass(i)));

  $("done").addEventListener("click", finish);
  $("share").addEventListener("click", share);
  $("help-open").addEventListener("click", () => $("help").showModal());
  $("help").addEventListener("close", () => store.set(HELP_STORE, true));

  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tap = TAP_KEYS.indexOf(e.key.toLowerCase());
    if (tap >= 0 && tap < GAME.taps.length) {
      selectTap(tap, e.timeStamp);
      return;
    }
    const glass = "12345".indexOf(e.key);
    if (glass >= 0 && startPour(glass, e.timeStamp)) e.preventDefault();
  });
  addEventListener("keyup", (e) => {
    if (state.pouring && state.pouring.glass === "12345".indexOf(e.key)) stopPour(e.timeStamp);
  });
  // Don't keep pouring if the window loses focus mid-pour.
  addEventListener("blur", () => stopPour(performance.now()));

  // One go a day: a game started earlier today counts as it was left.
  const saved = store.get(DAY_STORE);
  if (saved?.started && Array.isArray(saved.glasses)) {
    state.glasses = saved.glasses.map((g) => ({ ...emptyGlass(), ...g }));
    state.started = true;
    document.body.classList.add("served");
    if (saved.finished) {
      state.finished = true;
      showResult();
    } else {
      finish();
    }
    return;
  }

  if (!store.get(HELP_STORE)) $("help").showModal();
  requestAnimationFrame(tick);
}

init();
