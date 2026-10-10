import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUPS, PERFECT_TIME, RIM, MIN_POUR, MAX_POUR, MIN_SPREAD,
  dayKey, dayNumber, pourTimes, pour, cupScore, totalScore, cupEmoji, shareText, msUntilNextDay, updateStats,
} from "../game.js";

test("the day is the UTC date", () => {
  assert.equal(dayKey(new Date("2026-10-10T23:59:59Z")), "2026-10-10");
  assert.equal(dayKey(new Date("2026-10-11T00:00:00Z")), "2026-10-11");
  assert.equal(dayNumber("2026-10-10"), 1);
  assert.equal(dayNumber("2026-10-11"), 2);
  assert.equal(dayNumber("2027-10-10"), 366);
});

test("everyone gets the same cups on a day, and different cups each day", () => {
  assert.deepEqual(pourTimes("2026-10-10"), pourTimes("2026-10-10"));
  assert.notDeepEqual(pourTimes("2026-10-10"), pourTimes("2026-10-11"));
});

test("perfect pouring takes exactly PERFECT_TIME, with fast and slow cups", () => {
  for (let d = 0; d < 1000; d++) {
    const key = dayKey(new Date(Date.UTC(2026, 9, 10 + d)));
    const times = pourTimes(key);
    assert.equal(times.length, CUPS);
    const total = times.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - PERFECT_TIME) < 1e-9, `${key}: total ${total}`);
    for (const t of times) {
      assert.ok(t >= MIN_POUR - 0.001 && t <= MAX_POUR + 0.001, `${key}: cup takes ${t}s`);
    }
    assert.ok(Math.max(...times) / Math.min(...times) >= MIN_SPREAD - 0.001, `${key}: cups too alike: ${times}`);
  }
});

test("pouring fills at the cup's rate and spills at the rim", () => {
  assert.equal(pour(0, 4, 2), 0.5);
  assert.equal(pour(0.5, 4, 2), 1);
  assert.equal(pour(0, 4, 100), RIM);
  assert.equal(pour(0.3, 4, -1), 0.3, "no negative pours");
});

test("scoring falls off evenly either side of the line", () => {
  assert.equal(cupScore(1), 100);
  assert.equal(cupScore(0.95), 90);
  assert.equal(cupScore(1.05), 90);
  assert.equal(cupScore(0.9), 80);
  assert.equal(cupScore(1.1), 80);
  assert.equal(cupScore(0.5), 0);
  assert.equal(cupScore(0), 0);
  assert.equal(cupScore(RIM), 50, "a spilled cup still scores something");
  assert.equal(totalScore([1, 1, 1, 1, 1]), 500);
  assert.equal(totalScore([1, 0.95, 1.1, 0, 0.5]), 270);
});

test("share text", () => {
  assert.equal(cupEmoji(100), "🟩");
  assert.equal(cupEmoji(95), "🟩");
  assert.equal(cupEmoji(94), "🟨");
  assert.equal(cupEmoji(80), "🟨");
  assert.equal(cupEmoji(50), "🟧");
  assert.equal(cupEmoji(49), "🟥");
  assert.equal(
    shareText("2026-10-12", [1, 0.92, 1.2, 0.6, 0], "https://0x48.io/fillle/"),
    "Fillle #3 · 264/500\n🟩🟨🟧🟥🟥\nhttps://0x48.io/fillle/",
  );
});

test("time until the next day's cups", () => {
  assert.equal(msUntilNextDay(new Date("2026-10-10T23:00:00Z")), 3600000);
  assert.equal(msUntilNextDay(new Date("2026-10-10T00:00:00Z")), 86400000);
});

test("stats track streaks across consecutive days", () => {
  let s = updateStats(undefined, "2026-10-10", 400);
  assert.deepEqual(s, { played: 1, streak: 1, bestStreak: 1, best: 400, total: 400, last: "2026-10-10" });
  s = updateStats(s, "2026-10-10", 500);
  assert.equal(s.played, 1, "the same day isn't counted twice");
  s = updateStats(s, "2026-10-11", 450);
  assert.equal(s.streak, 2);
  s = updateStats(s, "2026-10-13", 300);
  assert.deepEqual(s, { played: 3, streak: 1, bestStreak: 2, best: 450, total: 1150, last: "2026-10-13" });
});
