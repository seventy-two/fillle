import {
  CUPS, TIME_LIMIT, RIM,
  dayKey, dayNumber, pourTimes, pour, cupScore, totalScore, cupEmoji, shareText, msUntilNextDay, updateStats,
} from "./game.js";

const KEY = dayKey();
const TIMES = pourTimes(KEY);
const DAY_STORE = "fillle:day:" + KEY;
const STATS_STORE = "fillle:stats";
const HELP_STORE = "fillle:seen-help";
const SHARE_URL = location.origin + location.pathname;

// Cup geometry in SVG units: a tapered glass from TOP to BOTTOM.
const TOP = 6, BOTTOM = 154, HEIGHT = BOTTOM - TOP;
const LINE_Y = BOTTOM - HEIGHT / RIM;
const edgeX = (y, side) => (side < 0 ? 6 + (10 * (y - TOP)) / HEIGHT : 74 - (10 * (y - TOP)) / HEIGHT);
const levelY = (level) => BOTTOM - (Math.min(level, RIM) / RIM) * HEIGHT;

const $ = (id) => document.getElementById(id);
const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: play still works */ }
  },
};

const game = {
  levels: Array(CUPS).fill(0),
  started: false,
  finished: false,
  startAt: 0, // performance.now() time of the first pour
  endAt: 0,
  pouring: null, // { cup, since }
};
const cups = [];

function buildCup(i) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "cup";
  el.setAttribute("aria-label", `Cup ${i + 1}`);
  el.innerHTML = `
    <svg viewBox="0 -34 80 200" aria-hidden="true">
      <defs><clipPath id="clip-${i}"><polygon points="8,7 72,7 62.4,153 17.6,153"/></clipPath></defs>
      <rect class="stream" x="37" y="-34" width="6" height="0" rx="3"/>
      <polygon class="glass" points="6,6 74,6 64,154 16,154"/>
      <g clip-path="url(#clip-${i})">
        <rect class="water" x="0" width="80" y="${BOTTOM}" height="0"/>
        <rect class="surface" x="0" width="80" y="${BOTTOM}" height="0"/>
      </g>
      <line class="line" x1="${edgeX(LINE_Y, -1) - 5}" x2="${edgeX(LINE_Y, 1) + 5}" y1="${LINE_Y}" y2="${LINE_Y}"/>
      <rect class="drip" x="1" y="150" width="4" height="9" rx="2"/>
      <rect class="drip" x="75" y="150" width="4" height="9" rx="2"/>
    </svg>
    <span class="key">${i + 1}</span>
    <span class="out"></span>`;
  cups.push({
    el,
    water: el.querySelector(".water"),
    surface: el.querySelector(".surface"),
    stream: el.querySelector(".stream"),
    out: el.querySelector(".out"),
  });
  el.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    if (startPour(i, e.timeStamp)) el.setPointerCapture(e.pointerId);
  });
  const release = (e) => {
    if (game.pouring?.cup === i) stopPour(e.timeStamp);
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("lostpointercapture", release);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
  return el;
}

function startPour(cup, t) {
  if (game.finished || game.pouring || $("help").open) return false;
  if (!game.started) {
    game.started = true;
    game.startAt = t;
    game.endAt = t + TIME_LIMIT * 1000;
    $("done").hidden = false;
    $("hint").textContent = "";
    save();
  }
  if (t >= game.endAt) return false;
  game.pouring = { cup, since: t };
  cups[cup].el.classList.add("pouring");
  return true;
}

function stopPour(t) {
  const p = game.pouring;
  if (!p) return;
  const end = Math.min(t, game.endAt);
  game.levels[p.cup] = pour(game.levels[p.cup], TIMES[p.cup], (end - p.since) / 1000);
  game.pouring = null;
  cups[p.cup].el.classList.remove("pouring");
  save();
}

// currentLevel includes any pour in progress, for drawing.
function currentLevel(i, now) {
  const p = game.pouring;
  if (p?.cup !== i) return game.levels[i];
  return pour(game.levels[i], TIMES[i], (Math.min(now, game.endAt) - p.since) / 1000);
}

function draw(now) {
  for (let i = 0; i < CUPS; i++) {
    const level = currentLevel(i, now);
    const y = levelY(level);
    const c = cups[i];
    c.water.setAttribute("y", y);
    c.water.setAttribute("height", BOTTOM - y);
    c.surface.setAttribute("y", y);
    c.surface.setAttribute("height", level > 0 ? 3 : 0);
    c.stream.setAttribute("height", Math.max(0, y + 34));
    c.el.classList.toggle("spilled", level >= RIM);
  }
  const left = game.started ? Math.max(0, game.endAt - now) / 1000 : TIME_LIMIT;
  $("clock").textContent = game.finished ? "0.0" : left.toFixed(1);
  $("track").style.transform = `scaleX(${game.finished ? 0 : left / TIME_LIMIT})`;
  document.querySelector(".timer").classList.toggle("low", game.started && !game.finished && left <= 5);
}

function tick() {
  const now = performance.now();
  if (game.started && !game.finished && now >= game.endAt) {
    stopPour(game.endAt);
    finish();
  }
  draw(now);
  if (!game.finished) requestAnimationFrame(tick);
}

function save() {
  store.set(DAY_STORE, { levels: game.levels, started: game.started, finished: game.finished });
}

function finish() {
  if (game.finished) return;
  stopPour(performance.now());
  game.finished = true;
  save();
  const stats = updateStats(store.get(STATS_STORE), KEY, totalScore(game.levels));
  store.set(STATS_STORE, stats);
  showResult(stats);
}

function verdict(score) {
  if (score === 500) return "Perfect. Every cup, right on the line.";
  if (score >= 475) return "Steady hands.";
  if (score >= 425) return "Nicely poured.";
  if (score >= 350) return "A few drips on the counter.";
  if (score >= 250) return "Bit of a mess.";
  return "Fetch the mop.";
}

function showResult(stats) {
  draw(performance.now());
  $("done").hidden = true;
  $("hint").textContent = "";
  for (let i = 0; i < CUPS; i++) {
    const level = game.levels[i];
    const score = cupScore(level);
    const cls = score >= 95 ? "good" : score >= 80 ? "ok" : score >= 50 ? "meh" : "bad";
    const c = cups[i];
    c.el.disabled = true;
    c.el.querySelector(".key").hidden = true;
    c.out.innerHTML = `<span class="pts ${cls}">${score}</span><span class="pct">${(level * 100).toFixed(1)}%</span>`;
    c.el.setAttribute("aria-label", `Cup ${i + 1}: filled to ${(level * 100).toFixed(1)}% of the line, ${score} points`);
  }
  const total = totalScore(game.levels);
  $("score").textContent = total;
  $("squares").textContent = game.levels.map((l) => cupEmoji(cupScore(l))).join("");
  $("verdict").textContent = verdict(total);
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
  const text = shareText(KEY, game.levels, SHARE_URL);
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

function init() {
  const label = new Date(KEY + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  $("day").textContent = `#${dayNumber(KEY)} · ${label}`;
  const row = $("cups");
  for (let i = 0; i < CUPS; i++) row.append(buildCup(i));

  $("done").addEventListener("click", finish);
  $("share").addEventListener("click", share);
  $("help-open").addEventListener("click", () => $("help").showModal());
  $("help").addEventListener("close", () => store.set(HELP_STORE, true));

  addEventListener("keydown", (e) => {
    const cup = "12345".indexOf(e.key);
    if (cup < 0 || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (startPour(cup, e.timeStamp)) e.preventDefault();
  });
  addEventListener("keyup", (e) => {
    if (game.pouring && game.pouring.cup === "12345".indexOf(e.key)) stopPour(e.timeStamp);
  });
  // Don't keep pouring if the window loses focus mid-pour.
  addEventListener("blur", () => stopPour(performance.now()));

  // One go a day: a game started earlier today counts as it was left.
  const saved = store.get(DAY_STORE);
  if (saved?.started) {
    game.levels = saved.levels.map(Number);
    game.started = true;
    if (saved.finished) {
      game.finished = true;
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
