# fillle

A daily game: fill five cups to the line in 20 seconds.

- Press and hold a cup (or its number key, 1–5) to pour; let go to stop.
- Each cup pours at its own speed. The speeds change every UTC day and are
  the same for everyone that day.
- Filling every cup exactly to its line takes 18 seconds of pouring, so the
  20-second timer leaves 2 seconds for moving between cups and mistakes. The
  timer starts with your first pour.
- Each cup scores up to 100, losing 2 points for every 1% over or under the
  line. Past the rim (125% of the line) it spills.
- One go a day, kept in the browser. Reloading mid-game finishes the game as
  it was left.

## How it works

It's a static page with no server. `game.js` holds the rules as pure
functions: the day's pour times come from a PRNG seeded with the UTC date,
scaled so they add up to exactly 18 seconds, each between 1 and 7 seconds,
with the slowest at least 3× the fastest (about 4× on a typical day). `app.js` draws the cups and
handles input; a pour's result comes from the press and release event times,
not animation frames, so a slow device doesn't change the score.

## Running

Serve the folder with any static file server, e.g.

```sh
python3 -m http.server
```

Tests need Node 18 or later:

```sh
npm test
```
