import {
  GLASSES, TIME_LIMIT, READY_TIME, MAX_LEVEL, beerById,
  dayKey, dayGame, orderText, pour, froth, headShare, emptyGlass, wrongBeer, glassScore, totalScore, glassEmoji, shareText,
  msUntilNextDay, updateStats,
} from "./game.js";
import { PATRONS } from "./patrons.js";
import { GLASS_SHAPES } from "./glasses.js";

const KEY = dayKey();
const GAME = dayGame(KEY);
const PATRON = PATRONS[GAME.patron];
const DAY_STORE = "fillle:day2:" + KEY; // day2: the brim-filling rules, from 10 Oct 2026
const STATS_STORE = "fillle:stats";
const HELP_STORE = "fillle:seen-help";
const SHARE_URL = location.origin + location.pathname;
const TAP_KEYS = "qwert";
const MIXED_COLOR = "#7a6248";
const MIXED_HEAD = "#cdbb9f";

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
  startsAt: 0, // Date.now() time the clock starts by itself, once the order's given
  endAt: 0, // performance.now() time the clock runs out
  endEpoch: 0, // the same, as a Date.now() time, so a reload can carry on
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
  const el = document.createElement("button");
  el.type = "button";
  el.className = "glass";
  el.setAttribute("aria-label", `Glass ${i + 1}`);
  el.innerHTML = `
    <svg viewBox="0 -44 100 244" aria-hidden="true">
      <rect class="stream" x="48" y="-44" width="4" height="0" rx="2"/>
      ${shape.stand ? `<path class="stand" d="${shape.stand}"/>` : ""}
      <path class="outline" d="${shape.outline}"/>
      <path class="beer" d=""/>
      <path class="head" d=""/>
      <path class="crown" d=""/>
      ${shape.facets ? `<path class="facets" d="${shape.facets}"/>` : ""}
      <rect class="drip" width="5" height="12" rx="2.5"/>
      <rect class="drip" width="5" height="12" rx="2.5"/>
    </svg>
    <span class="key">${i + 1}</span>
    <span class="out"></span>`;
  const bowl = bowlPolygon(shape.bowl, el.querySelector("svg"));
  // Foam that runs over the brim trickles down the outside from its edges.
  const [left, right] = spanAt(bowl, shape.top);
  const drips = el.querySelectorAll(".drip");
  drips[0].setAttribute("x", left - 4);
  drips[1].setAttribute("x", right - 1);
  drips.forEach((d) => d.setAttribute("y", shape.top));
  glassEls.push({
    el, shape, bowl, drips,
    beer: el.querySelector(".beer"),
    head: el.querySelector(".head"),
    crown: el.querySelector(".crown"),
    stream: el.querySelector(".stream"),
    out: el.querySelector(".out"),
    froth: 0, // 0 settled, 1 frothing from a fresh pour
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

// bowlPolygon samples a glass's bowl outline into points, so the beer can be
// drawn as a plain shape cut from it. (Clipping a rectangle to the bowl
// instead didn't always repaint in Firefox while pouring.)
function bowlPolygon(d, svg) {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  svg.append(path); // measured in place: some browsers won't measure a detached path
  const length = path.getTotalLength();
  const steps = 160;
  const points = Array.from({ length: steps }, (_, k) => {
    const p = path.getPointAtLength((length * k) / steps);
    return [p.x, p.y];
  });
  path.remove();
  return points;
}

// cutPolygon keeps the part of a polygon between two heights
// (Sutherland–Hodgman against each edge in turn).
function cutPolygon(points, top, bottom) {
  const clip = (pts, inside, cross) => {
    const out = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k], b = pts[(k + 1) % pts.length];
      const ina = inside(a), inb = inside(b);
      if (ina) out.push(a);
      if (ina !== inb) {
        const t = (cross - a[1]) / (b[1] - a[1]);
        out.push([a[0] + t * (b[0] - a[0]), cross]);
      }
    }
    return out;
  };
  return clip(clip(points, (p) => p[1] >= top, top), (p) => p[1] <= bottom, bottom);
}

// spanAt is the left and right edges of a bowl at height y.
function spanAt(bowl, y) {
  const xs = cutPolygon(bowl, y, y + 0.5).map((p) => p[0]);
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : [50, 50];
}

// crownPath is the foam heaped over the brim of an overpoured glass: a smooth
// dome rising height above y between x0 and x1.
function crownPath(x0, x1, y, height) {
  if (x1 - x0 < 1 || height < 0.2) return "";
  const mid = (x0 + x1) / 2;
  return `M${x0.toFixed(2)},${y.toFixed(2)}Q${mid.toFixed(2)},${(y - 2 * height).toFixed(2)} ${x1.toFixed(2)},${y.toFixed(2)}Z`;
}

function polygonPath(points) {
  if (points.length < 3) return "";
  return "M" + points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("L") + "Z";
}

// --- Playing

function start(t) {
  if (state.started) return;
  state.started = true;
  state.endAt = t + TIME_LIMIT * 1000;
  state.endEpoch = Date.now() + (state.endAt - performance.now());
  $("done").hidden = false;
  setHint(state.tap === null ? "Go! Pick a tap and pour" : "");
  save();
}

function setHint(text, ready = false) {
  const hint = $("hint");
  if (hint.textContent !== text) hint.textContent = text;
  hint.classList.toggle("ready", ready);
}

// --- The patron's order

// talk types the order into the speech bubble as if the patron is mid-sentence.
// The player gets READY_TIME seconds from when they start talking before the
// clock starts by itself, so listening to the order uses up some of it.
function talk() {
  const text = orderText(GAME.order);
  const bubble = $("bubble-text");
  const begin = () => {
    if (!state.started && !state.finished) {
      state.startsAt = Date.now() + READY_TIME * 1000;
      save();
    }
  };
  const done = () => bubble.parentElement.classList.remove("typing");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bubble.textContent = text;
    begin();
    return done();
  }
  bubble.textContent = "";
  bubble.parentElement.classList.add("typing");
  let n = 0;
  const next = () => {
    bubble.textContent = text.slice(0, ++n);
    if (n >= text.length) return done();
    setTimeout(next, /[,.]/.test(text[n - 1]) ? 220 : 32);
  };
  setTimeout(() => { begin(); next(); }, 800); // once the patron has walked up
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

let lastDraw = 0;

function draw(now) {
  const dt = lastDraw ? (now - lastDraw) / 1000 : 0;
  lastDraw = now;
  for (let i = 0; i < GLASSES; i++) {
    const g = state.glasses[i];
    const c = glassEls[i];
    const { shape, bowl, el } = c;
    const level = currentLevel(i, now);
    c.froth = state.finished ? 0 : froth(c.froth, dt, state.pouring?.glass === i);
    const info = g.beer && beerById[g.beer];

    // The top of the foam is the level; under it the head takes its share of
    // the glass, more while it's frothing, and the beer the rest.
    const y = shape.bottom - Math.min(level, 1) * (shape.bottom - shape.top);
    const headBottom = info ? y + headShare(g.beer, g.mixed, c.froth) * (shape.bottom - y) : y;
    const beerShape = level > 0 ? polygonPath(cutPolygon(bowl, headBottom, Infinity)) : "";
    if (c.beer.getAttribute("d") !== beerShape) c.beer.setAttribute("d", beerShape);
    c.beer.style.fill = g.mixed ? MIXED_COLOR : info ? info.color : "transparent";
    const headShape = level > 0 ? polygonPath(cutPolygon(bowl, y, headBottom)) : "";
    if (c.head.getAttribute("d") !== headShape) c.head.setAttribute("d", headShape);

    // The crown: foam heaping up over the brim when it's overpoured.
    const over = Math.max(0, level - 1) / (MAX_LEVEL - 1);
    const [x0, x1] = spanAt(bowl, y);
    const spread = 4 * over;
    const crownShape = info ? crownPath(x0 - spread, x1 + spread, y, 14 * over) : "";
    if (c.crown.getAttribute("d") !== crownShape) c.crown.setAttribute("d", crownShape);
    const headColor = g.mixed ? MIXED_HEAD : info ? info.head : "transparent";
    c.head.style.fill = c.crown.style.fill = headColor;
    c.drips.forEach((d) => { d.style.fill = headColor; });

    // The stream runs down to the beer, narrower than any glass's neck so the
    // surface stays visible either side of it.
    c.stream.setAttribute("height", Math.max(0, y + 44));
    el.classList.toggle("overflowing", level > 1.005);
    el.classList.toggle("spilled", level >= MAX_LEVEL);
  }
  const left = state.started ? Math.max(0, state.endAt - now) / 1000 : TIME_LIMIT;
  $("clock").textContent = state.finished ? "0.0" : left.toFixed(1);
  $("track").style.transform = `scaleX(${state.finished ? 0 : left / TIME_LIMIT})`;
  document.querySelector(".timer").classList.toggle("low", state.started && !state.finished && left <= 3);
}

function tick() {
  const now = performance.now();
  if (!state.started && state.startsAt) {
    const left = state.startsAt - Date.now();
    if (left <= 0) start(now);
    else setHint(`Pouring starts in ${Math.ceil(left / 1000)}`, true);
  }
  if (state.started && !state.finished && now >= state.endAt) {
    stopPour(state.endAt);
    finish();
  }
  draw(now);
  if (!state.finished) requestAnimationFrame(tick);
}

function save() {
  store.set(DAY_STORE, {
    glasses: state.glasses,
    started: state.started,
    finished: state.finished,
    startsAt: state.startsAt,
    endEpoch: state.endEpoch,
  });
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
      label = `Glass ${i + 1}, ${expected.name}: filled to ${(g.level * 100).toFixed(1)}% of the brim, ${score} points`;
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
  GAME.taps.forEach((_, i) => $("taps").append(buildTap(i)));
  GAME.glasses.forEach((_, i) => $("glasses").append(buildGlass(i)));

  $("done").addEventListener("click", finish);
  $("share").addEventListener("click", share);
  $("help-open").addEventListener("click", () => $("help").showModal());
  $("help").addEventListener("close", () => {
    store.set(HELP_STORE, true);
    if (!introBegun) beginIntro();
  });

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

  if (restore()) return;
  if (store.get(HELP_STORE)) beginIntro();
  else $("help").showModal(); // the patron starts talking once it's closed
  requestAnimationFrame(tick);
}

let introBegun = false;
function beginIntro() {
  introBegun = true;
  setHint("");
  talk();
}

// restore picks up today's game where it was left. Its deadlines are real
// times, so reloading can't buy more time to plan or pour: a countdown or
// clock that ran out while away has run out. It reports whether there was a
// game to pick up.
function restore() {
  const saved = store.get(DAY_STORE);
  if (!saved || !Array.isArray(saved.glasses)) return false;
  if (!saved.finished && !saved.started && !saved.startsAt) return false; // the order hadn't been given yet
  state.glasses = saved.glasses.map((g) => ({ ...emptyGlass(), ...g }));
  introBegun = true;
  document.body.classList.add("served");
  $("bubble-text").textContent = orderText(GAME.order);
  if (saved.finished) {
    state.started = state.finished = true;
    showResult();
    return true;
  }
  const now = Date.now();
  const clockStarted = saved.started || (saved.startsAt && now >= saved.startsAt);
  const endEpoch = saved.endEpoch || (saved.startsAt ? saved.startsAt + TIME_LIMIT * 1000 : 0);
  if (clockStarted) {
    state.started = true;
    if (!endEpoch || now >= endEpoch) {
      finish();
      return true;
    }
    state.endEpoch = endEpoch;
    state.endAt = performance.now() + (endEpoch - now);
    $("done").hidden = false;
    setHint("");
  } else {
    state.startsAt = saved.startsAt;
  }
  requestAnimationFrame(tick);
  return true;
}

init();
