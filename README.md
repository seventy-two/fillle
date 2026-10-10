# fillle

A daily game set in a Belgian bar. A patron walks up and orders five beers;
pour each one into its glass, stopping at the line, within 15 seconds.

- Pick a tap (click it, or Q W E R T), then press and hold a glass (or 1–5)
  to pour that beer into it. Let go to stop.
- Every beer comes in its own glass: Duvel's tulip, Kwak's bulb in its
  wooden stand, Chimay's chalice, Hoegaarden's hexagonal tumbler, Stella
  Artois, Jupiler's pils glass, Orval's bowl and Delirium Tremens' tall
  tulip. Each tap shows its glass's outline underneath.
- The bar has more taps than the order needs, so some are decoys.
- Each beer pours at its own speed. The patron, order and speeds change every
  UTC day and are the same for everyone that day.
- Pouring every glass exactly to its line takes 8 seconds, leaving 7 of the 15
  for picking taps and moving between glasses. The clock starts at your first
  tap or pour, so reading the order is free.
- Each glass scores up to 100, losing 2 points for every 1% over or under the
  line. The wrong beer, or two beers in one glass, scores 0. Past the rim
  (125% of the line) it spills.
- One go a day, kept in the browser. Reloading mid-game finishes the game as
  it was left.

Tap handles use each brewery's colours and name; they're not the breweries'
logos.

## How it works

It's a static page with no server.

- `game.js` holds the rules as pure functions. `dayGame` seeds a PRNG with
  the UTC date to pick the patron, an order of 2 or 3 beers adding up to five
  glasses, two decoy taps, and each beer's pour time: weighted by its glass's
  size, scaled so the five glasses add up to exactly 8 seconds, each between
  0.5 and 3.5 seconds, with the slowest beer at least 2.5× the fastest.
- `patrons.js` has the ASCII regulars and `glasses.js` the SVG glass shapes.
  Beer rises linearly from the bottom of a glass's bowl to its rim, and the
  line is always at the same proportion, so a glass's shape changes how it
  looks, not how it scores.
- `app.js` draws the bar and handles input. A pour's result comes from the
  press and release event times, not animation frames, so a slow device
  doesn't change the score.

## Running

Serve the folder with any static file server, e.g.

```sh
python3 -m http.server
```

Tests need Node 18 or later:

```sh
npm test
```
