// Fillle's rules: the day's cups, pouring and scoring. Everything here is
// pure so it runs the same in the browser and in tests.

export const CUPS = 5;
export const TIME_LIMIT = 30; // seconds
export const PERFECT_TIME = 28; // seconds of pouring to fill every cup exactly
export const RIM = 1.25; // a cup holds 25% more than its line before spilling
export const MIN_POUR = 2.5; // seconds; no cup fills faster than this
export const MAX_POUR = 9; // seconds; or slower than this
export const MIN_SPREAD = 1.6; // the slowest cup takes at least this many times as long as the fastest
export const FIRST_DAY = "2026-10-10"; // Fillle #1

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

// dayKey is the UTC date of t as YYYY-MM-DD; everyone gets the same cups on
// the same UTC day.
export function dayKey(t = new Date()) {
  return t.toISOString().slice(0, 10);
}

// dayNumber is the puzzle number for a day key, counting FIRST_DAY as 1.
export function dayNumber(key) {
  return Math.round((Date.parse(key) - Date.parse(FIRST_DAY)) / 86400000) + 1;
}

// pourTimes returns how many seconds each cup takes to fill to its line on
// the given day. They add up to PERFECT_TIME, each between MIN_POUR and
// MAX_POUR, and they differ by at least MIN_SPREAD so every day has fast
// and slow cups.
export function pourTimes(key) {
  const rand = mulberry32(hash("fillle:" + key));
  for (;;) {
    const weights = Array.from({ length: CUPS }, () => 0.4 + 1.2 * rand());
    const total = weights.reduce((a, b) => a + b, 0);
    const times = weights.map((w) => (PERFECT_TIME * w) / total);
    const spread = Math.max(...times) / Math.min(...times);
    if (spread >= MIN_SPREAD && times.every((t) => t >= MIN_POUR && t <= MAX_POUR)) {
      // Round to milliseconds, putting any rounding error on the last cup so
      // the total stays exact.
      const rounded = times.map((t) => Math.round(t * 1000) / 1000);
      const drift = PERFECT_TIME - rounded.reduce((a, b) => a + b, 0);
      rounded[CUPS - 1] = Math.round((rounded[CUPS - 1] + drift) * 1000) / 1000;
      return rounded;
    }
  }
}

// pour returns a cup's fill level (1 is the line) after pouring for seconds,
// starting from level. Past the rim it spills, so it never goes above RIM.
export function pour(level, pourTime, seconds) {
  return Math.min(RIM, level + Math.max(0, seconds) / pourTime);
}

// cupScore is 0–100 for how close a level is to the line: 100 on it, falling
// by 2 for every 1% off in either direction.
export function cupScore(level) {
  const off = Math.abs(level - 1);
  return Math.max(0, Math.round(100 * (1 - off / 0.5)));
}

export function totalScore(levels) {
  return levels.reduce((sum, l) => sum + cupScore(l), 0);
}

export function cupEmoji(score) {
  if (score >= 95) return "🟩";
  if (score >= 80) return "🟨";
  if (score >= 50) return "🟧";
  return "🟥";
}

// shareText is the result players copy and share.
export function shareText(key, levels, url) {
  const scores = levels.map(cupScore);
  return [
    `Fillle #${dayNumber(key)} · ${totalScore(levels)}/${CUPS * 100}`,
    scores.map(cupEmoji).join(""),
    url,
  ].join("\n");
}

// msUntilNextDay is how long until the next UTC day's cups.
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
