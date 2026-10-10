import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GLASSES, PERFECT_TIME, RIM, MIN_POUR, MAX_POUR, MIN_SPREAD, BEERS, beerById,
  dayKey, dayNumber, dayGame, orderText, pour, cupScore, emptyGlass, wrongBeer, glassScore, totalScore, glassEmoji,
  shareText, msUntilNextDay, updateStats,
} from "../game.js";
import { PATRONS } from "../patrons.js";

const days = (n) => Array.from({ length: n }, (_, d) => dayKey(new Date(Date.UTC(2026, 9, 10 + d))));

test("the day is the UTC date", () => {
  assert.equal(dayKey(new Date("2026-10-10T23:59:59Z")), "2026-10-10");
  assert.equal(dayKey(new Date("2026-10-11T00:00:00Z")), "2026-10-11");
  assert.equal(dayNumber("2026-10-10"), 1);
  assert.equal(dayNumber("2027-10-10"), 366);
});

test("everyone gets the same game on a day, and a different one each day", () => {
  assert.deepEqual(dayGame("2026-10-10"), dayGame("2026-10-10"));
  assert.notDeepEqual(dayGame("2026-10-10"), dayGame("2026-10-11"));
});

test("every day's order, taps and glasses fit together", () => {
  const patronsSeen = new Set();
  for (const key of days(1000)) {
    const g = dayGame(key);
    patronsSeen.add(g.patron);
    assert.ok(g.patron >= 0 && g.patron < PATRONS.length);

    // 2 or 3 beers, 5 glasses.
    assert.ok(g.order.length === 2 || g.order.length === 3, key);
    assert.equal(g.order.reduce((n, o) => n + o.count, 0), GLASSES, key);
    assert.equal(new Set(g.order.map((o) => o.beer)).size, g.order.length, `${key}: a beer ordered twice`);

    // The glasses are exactly what was ordered.
    assert.equal(g.glasses.length, GLASSES);
    for (const o of g.order) {
      assert.equal(g.glasses.filter((b) => b === o.beer).length, o.count, key);
    }

    // The taps have every ordered beer, plus two others.
    assert.equal(g.taps.length, g.order.length + 2, key);
    assert.equal(new Set(g.taps).size, g.taps.length, `${key}: a tap twice`);
    for (const o of g.order) assert.ok(g.taps.includes(o.beer), `${key}: no tap for ${o.beer}`);
    for (const t of g.taps) assert.ok(beerById[t], `${key}: unknown beer ${t}`);
  }
  assert.equal(patronsSeen.size, PATRONS.length, "every patron turns up");
});

test("perfect pouring takes exactly PERFECT_TIME, with fast and slow beers", () => {
  for (const key of days(1000)) {
    const g = dayGame(key);
    const total = g.times.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - PERFECT_TIME) < 1e-9, `${key}: total ${total}`);
    for (const t of g.times) assert.ok(t >= MIN_POUR && t <= MAX_POUR, `${key}: glass takes ${t}s`);
    assert.ok(Math.max(...g.times) / Math.min(...g.times) >= MIN_SPREAD - 1e-9, `${key}: beers too alike`);
    // The same beer always pours at the same speed.
    for (let i = 0; i < GLASSES; i++) {
      for (let j = 0; j < GLASSES; j++) {
        if (g.glasses[i] === g.glasses[j]) assert.equal(g.times[i], g.times[j]);
      }
    }
  }
});

test("the patron's order reads naturally", () => {
  assert.equal(orderText([{ beer: "duvel", count: 2 }, { beer: "kwak", count: 1 }, { beer: "chimay", count: 2 }]),
    "Two Duvel, a Kwak and two Chimay Blue, please.");
  assert.equal(orderText([{ beer: "kwak", count: 1 }, { beer: "orval", count: 4 }]), "A Kwak and four Orval, please.");
});

test("every beer has a distinct glass", () => {
  assert.equal(new Set(BEERS.map((b) => b.glass)).size, BEERS.length);
});

test("pouring fills at the glass's rate and spills at the rim", () => {
  assert.equal(pour(0, 4, 2), 0.5);
  assert.equal(pour(0.5, 4, 2), 1);
  assert.equal(pour(0, 4, 100), RIM);
  assert.equal(pour(0.3, 4, -1), 0.3, "no negative pours");
});

test("scoring: closeness to the line, and nothing for the wrong beer", () => {
  assert.equal(cupScore(1), 100);
  assert.equal(cupScore(0.95), 90);
  assert.equal(cupScore(1.05), 90);
  assert.equal(cupScore(0.5), 0);
  assert.equal(cupScore(RIM), 50);

  const right = { beer: "duvel", mixed: false, level: 0.95 };
  assert.equal(glassScore(right, "duvel"), 90);
  assert.equal(glassScore({ ...right, beer: "kwak" }, "duvel"), 0, "wrong beer");
  assert.equal(glassScore({ ...right, mixed: true }, "duvel"), 0, "two beers in one glass");
  assert.equal(glassScore(emptyGlass(), "duvel"), 0);
  assert.equal(wrongBeer(emptyGlass(), "duvel"), false, "an empty glass isn't the wrong beer");
  assert.equal(totalScore([right, { ...right, level: 1 }], ["duvel", "duvel"]), 190);
});

test("share text", () => {
  const game = { number: 3, glasses: ["duvel", "duvel", "kwak", "kwak", "chimay"] };
  const glasses = [
    { beer: "duvel", mixed: false, level: 1 },
    { beer: "duvel", mixed: false, level: 0.92 },
    { beer: "kwak", mixed: false, level: 1.2 },
    { beer: "duvel", mixed: false, level: 1 }, // wrong beer
    emptyGlass(),
  ];
  assert.equal(glassEmoji(glasses[3], "kwak"), "❌");
  assert.equal(shareText(game, glasses, "https://0x48.io/fillle/"), "Fillle #3 · 244/500\n🟩🟨🟧❌🟥\nhttps://0x48.io/fillle/");
});

test("time until the next day's game", () => {
  assert.equal(msUntilNextDay(new Date("2026-10-10T23:00:00Z")), 3600000);
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
