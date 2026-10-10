# fillle

A daily game set in a Belgian bar. A patron walks up and orders five beers;
pour each one into its glass, filling it to the brim the way Belgian bars
do, within 15 seconds.

- Pick a tap (click it, or Q W E R T), then press and hold a glass (or 1–5)
  to pour that beer into it. Let go to stop. The target is the brim: the
  top of the head, not the beer under it.
- Every beer comes in its own glass: Duvel's tulip, Kwak's bulb in its
  wooden stand, Chimay's chalice, Hoegaarden's hexagonal tumbler, Stella
  Artois, Jupiler's pils glass, Orval's bowl, Delirium Tremens' tall tulip,
  Leffe's goblet, Westmalle's chalice, Tripel Karmeliet's tall flared glass,
  Lindemans Kriek's flute, Rodenbach's straight glass and De Koninck's
  bolleke. Each tap shows its glass's outline underneath.
- Each beer has its own head: Duvel, Orval and Westmalle's are big,
  Stella and Jupiler's skimmed to a couple of fingers, Kriek's pink, Rodenbach's barely
  there. A head grows with the beer, froths up while you pour and settles
  after; it changes where the beer stops and the foam starts, never the top
  of the foam, which is what's scored.
- The bar has more taps than the order needs, so some are decoys.
- Each beer pours at its own speed. The patron, order and speeds change every
  UTC day and are the same for everyone that day.
- The patron types out their order. From when they start talking you get 10
  seconds to get ready before the clock starts by itself (or pick a tap or
  pour to start it sooner), so there's only so long to plan.
- Pouring every glass exactly to its line takes 8 seconds, leaving 7 of the 15
  for picking taps and moving between glasses.
- Each glass scores up to 100, losing 2 points for every 1% short of the brim
  or over it. Overpouring heaps foam above the brim and runs it down the
  side, up to 125%; past that it all goes down the drain.
- One go a day, kept in the browser. The countdown and clock run on real
  time, so reloading carries on where you were rather than buying more time.

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
  Beer rises linearly from the bottom of a glass's bowl to its brim, so a
  glass's shape changes how it looks, not how it scores. Each beer's `foam`
  in `game.js` sets how deep its head is.
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
