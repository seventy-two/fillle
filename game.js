// Beerle's rules: the day's patron, order, taps and glasses, pouring and
// scoring. Everything here is pure so it runs the same in the browser and in
// tests.

import { PATRONS } from "./patrons.js";

export const GLASSES = 5;
export const TIME_LIMIT = 15; // seconds
export const READY_TIME = 10; // seconds from when the patron starts ordering until the clock starts by itself
export const PERFECT_TIME = 8; // seconds of pouring to fill every glass exactly
export const MAX_LEVEL = 1.25; // 1 is the brim; past it foam runs over, and past this it's all down the drain
export const MIN_POUR = 0.5; // seconds; no glass fills faster than this
export const MAX_POUR = 3.5; // seconds; or slower than this
export const MIN_SPREAD = 2.5; // the slowest beer takes at least this many times as long as the fastest
export const FIRST_DAY = "2026-10-10"; // Beerle #1

// The beers on offer, each in its own glass. volume is the glass's relative
// size: bigger glasses tend to take longer to fill. foam is how much of a
// full glass is head when it's settled.
export const BEERS = [
  { id: "duvel", name: "Duvel", label: "DUVEL", glass: "tulip", volume: 1.2, color: "#e8b53f", head: "#fffaf0", foam: 0.35, tap: "#ffffff", ink: "#c8102e" },
  { id: "kwak", name: "Kwak", label: "KWAK", glass: "kwak", volume: 1.1, color: "#b4601c", head: "#f5e3c3", foam: 0.15, tap: "#6b3a1e", ink: "#f4d27a" },
  { id: "chimay", name: "Chimay Blue", label: "CHIMAY", glass: "chalice", volume: 1.0, color: "#4a2410", head: "#e6d0a8", foam: 0.18, tap: "#1d3f8f", ink: "#f2d16b" },
  { id: "hoegaarden", name: "Hoegaarden", label: "HOEGAARDEN", glass: "tumbler", volume: 1.3, color: "#f1e1a6", head: "#ffffff", foam: 0.25, tap: "#78b7e0", ink: "#ffffff" },
  { id: "stella", name: "Stella Artois", label: "STELLA", glass: "stella", volume: 0.9, color: "#e5b13a", head: "#fffdf5", foam: 0.18, tap: "#9e1b32", ink: "#e5c06b" },
  { id: "jupiler", name: "Jupiler", label: "JUPILER", glass: "pils", volume: 1.0, color: "#eec55c", head: "#ffffff", foam: 0.18, tap: "#d7262b", ink: "#ffffff" },
  { id: "orval", name: "Orval", label: "ORVAL", glass: "orval", volume: 1.2, color: "#cf7d28", head: "#fbeed6", foam: 0.3, tap: "#0f5e73", ink: "#f6e7c1" },
  { id: "delirium", name: "Delirium Tremens", label: "DELIRIUM", glass: "delirium", volume: 1.1, color: "#eccd66", head: "#ffffff", foam: 0.3, tap: "#f08bb4", ink: "#2a2a6a" },
  { id: "leffe", name: "Leffe Blonde", label: "LEFFE", glass: "goblet", volume: 1.1, color: "#dc9c2c", head: "#fff6e2", foam: 0.2, tap: "#3a2316", ink: "#d9b25f" },
  { id: "westmalle", name: "Westmalle Tripel", label: "WESTMALLE", glass: "westmalle", volume: 1.2, color: "#f0c75a", head: "#ffffff", foam: 0.3, tap: "#efe6d2", ink: "#5a2b1e" },
  { id: "karmeliet", name: "Tripel Karmeliet", label: "KARMELIET", glass: "karmeliet", volume: 1.1, color: "#ebbc4e", head: "#fffaf0", foam: 0.28, tap: "#f3e9cf", ink: "#6b4a1e" },
  { id: "kriek", name: "Lindemans Kriek", label: "KRIEK", glass: "flute", volume: 0.8, color: "#9c1c38", head: "#f7c9d2", foam: 0.12, tap: "#7a1028", ink: "#ffffff" },
  { id: "rodenbach", name: "Rodenbach", label: "RODENBACH", glass: "rodenbach", volume: 1.0, color: "#7a2a18", head: "#e9d6b8", foam: 0.06, tap: "#ad1f23", ink: "#f2d16b" },
  { id: "dekoninck", name: "De Koninck", label: "DE KONINCK", glass: "bolleke", volume: 0.8, color: "#b8651f", head: "#f3e3c4", foam: 0.15, tap: "#c8102e", ink: "#ffffff" },
];
export const beerById = Object.fromEntries(BEERS.map((b) => [b.id, b]));

// mulberry32: a small, fast seeded PRNG.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a hash of a string, for seeding.
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// dayKey is the UTC date of t as YYYY-MM-DD; everyone gets the same game on
// the same UTC day.
export function dayKey(t = new Date()) {
  return t.toISOString().slice(0, 10);
}

// pastKey reads an earlier day from a page's hash: "#12" (puzzle 12) or
// "#2026-10-21". Only days from #1 up to yesterday count; anything else is
// null, so the page plays today's.
export function pastKey(hash, today = dayKey()) {
  const h = String(hash || "").replace(/^#/, "");
  let key = null;
  if (/^\d{1,5}$/.test(h)) key = new Date(Date.parse(FIRST_DAY) + (Number(h) - 1) * 86400000).toISOString().slice(0, 10);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(h) && !Number.isNaN(Date.parse(h))) key = h;
  return key && key >= FIRST_DAY && key < today ? key : null;
}

// dayNumber is the puzzle number for a day key, counting FIRST_DAY as 1.
export function dayNumber(key) {
  return Math.round((Date.parse(key) - Date.parse(FIRST_DAY)) / 86400000) + 1;
}

// dayGame builds a day's game: who orders, what they order, which taps are
// on, the glasses on the bar (in order) and how long each takes to fill.
export function dayGame(key) {
  const rand = mulberry32(hash("fillle:" + key)); // its old name, kept so the days stay the same
  const patron = Math.floor(rand() * PATRONS.length);

  const kinds = rand() < 0.5 ? 2 : 3;
  const splits = kinds === 2 ? [[3, 2], [4, 1]] : [[2, 2, 1], [3, 1, 1]];
  const counts = splits[Math.floor(rand() * splits.length)];
  const beers = shuffle(BEERS, rand);
  const ordered = beers.slice(0, kinds);
  const decoys = beers.slice(kinds, kinds + 2);
  const order = ordered.map((b, i) => ({ beer: b.id, count: counts[i] }));
  const glasses = shuffle(order.flatMap((o) => Array(o.count).fill(o.beer)), rand);
  const taps = shuffle([...ordered, ...decoys], rand).map((b) => b.id);

  // Each beer's glass gets a pour time; together the glasses take exactly
  // PERFECT_TIME.
  let beerTimes;
  for (;;) {
    const weights = Object.fromEntries(ordered.map((b) => [b.id, b.volume * Math.exp(Math.log(6) * rand())]));
    const total = glasses.reduce((sum, id) => sum + weights[id], 0);
    beerTimes = Object.fromEntries(ordered.map((b) => [b.id, (PERFECT_TIME * weights[b.id]) / total]));
    const times = Object.values(beerTimes);
    const spread = Math.max(...times) / Math.min(...times);
    if (spread >= MIN_SPREAD && times.every((t) => t >= MIN_POUR && t <= MAX_POUR)) break;
  }

  return {
    key,
    number: dayNumber(key),
    patron,
    order,
    taps,
    glasses,
    times: glasses.map((id) => beerTimes[id]),
  };
}

const COUNT_WORDS = ["", "a", "two", "three", "four", "five"];

// orderText is what the patron says, e.g. "Two Duvel, a Kwak and two Chimay
// Blue, please."
export function orderText(order) {
  const parts = order.map((o) => {
    const name = beerById[o.beer].name;
    const count = o.count === 1 && /^[aeiou]/i.test(name) ? "an" : COUNT_WORDS[o.count];
    return `${count} ${name}`;
  });
  const list = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts.at(-1) : parts[0];
  return list.charAt(0).toUpperCase() + list.slice(1) + ", please.";
}

// pour returns a glass's fill level (1 is the brim, head and all) after
// pouring for seconds, starting from level. Past the brim the foam runs over
// the side, up to MAX_LEVEL; anything more just goes down the drain.
export function pour(level, pourTime, seconds) {
  return Math.min(MAX_LEVEL, level + Math.max(0, seconds) / pourTime);
}

export const FROTH_RISE = 0.25; // seconds for a fresh pour's extra foam to build
export const FROTH_FALL = 1.0; // and for it to settle once the tap's shut
export const SURGE = 0.7; // a glass mid-pour has up to 70% more head than when settled
export const MIXED_FOAM = 0.2;

// froth eases a glass's mid-pour foaminess (0 settled, 1 frothing) towards 1
// while pouring and back to 0 afterwards, over dt seconds.
export function froth(f, dt, pouring) {
  const target = pouring ? 1 : 0;
  const tau = pouring ? FROTH_RISE : FROTH_FALL;
  return target + (f - target) * Math.exp(-Math.max(0, dt) / tau);
}

// headShare is how much of what's in a glass is head: the beer's settled
// head, more while it's frothing, never more than 90%. The top of the foam
// is what's scored, so froth only moves where the beer stops and the head
// starts.
export function headShare(beerId, mixed, f) {
  const settled = mixed ? MIXED_FOAM : beerById[beerId].foam;
  return Math.min(0.9, settled * (1 + SURGE * f));
}

// cupScore is 0–100 for how close a level is to the brim: 100 on it, falling
// by 2 for every 1% short or over.
export function cupScore(level) {
  const off = Math.abs(level - 1);
  return Math.max(0, Math.round(100 * (1 - off / 0.5)));
}

// A glass on the bar: which beer went in (null if empty), whether a second
// beer went in too, and how full it is.
export function emptyGlass() {
  return { beer: null, mixed: false, level: 0 };
}

export function wrongBeer(glass, expected) {
  return glass.beer !== null && (glass.beer !== expected || glass.mixed);
}

// glassScore is 0 for the wrong (or mixed) beer, otherwise how close to the
// brim it is.
export function glassScore(glass, expected) {
  if (glass.beer === null || wrongBeer(glass, expected)) return 0;
  return cupScore(glass.level);
}

export function totalScore(glasses, expected) {
  return glasses.reduce((sum, g, i) => sum + glassScore(g, expected[i]), 0);
}

export function glassEmoji(glass, expected) {
  if (wrongBeer(glass, expected)) return "❌";
  const score = glassScore(glass, expected);
  if (score >= 95) return "🟩";
  if (score >= 80) return "🟨";
  if (score >= 50) return "🟧";
  return "🟥";
}

// shareText is the result players copy and share.
export function shareText(game, glasses, url) {
  return [
    `Beerle #${game.number} · ${totalScore(glasses, game.glasses)}/${GLASSES * 100}`,
    glasses.map((g, i) => glassEmoji(g, game.glasses[i])).join(""),
    url,
  ].join("\n");
}

// msUntilNextDay is how long until the next UTC day's game.
export function msUntilNextDay(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

// updateStats folds a finished game into a player's stats: games played,
// current and best streak of consecutive days, best and total score.
export function updateStats(stats, key, score) {
  const s = { played: 0, streak: 0, bestStreak: 0, best: 0, total: 0, last: null, ...stats };
  if (s.last === key) return s;
  const yesterday = dayKey(new Date(Date.parse(key) - 86400000));
  s.streak = s.last === yesterday ? s.streak + 1 : 1;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.played += 1;
  s.best = Math.max(s.best, score);
  s.total += score;
  s.last = key;
  return s;
}
