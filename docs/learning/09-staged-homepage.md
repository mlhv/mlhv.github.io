# 09 — Staged homepage

## What we built

- The homepage is now a Stage of five full-height Steps: Hello (photo, name, tagline), Work Experience, Projects, Blog, Contact. Only the Step at the middle of the screen shows its card; the others fade out.
- Each card is dark frosted glass centred over the World. The camera glides to that Step's Host (Minh, Phoenix Wright, Joker, Isabelle, Reshiram) and holds still while you read.
- A progress rail (dots on desktop, a thin bar on phones) and "skip to" chips on Hello jump straight to a Step; the URL hash follows along, so `/#projects` is shareable.
- Without JavaScript every card is visible and stacked; without WebGL the cards still reveal over the gradient; with reduced motion nothing slides and the camera cuts.

## Key concepts

### One signal, many listeners
`activeStep(rects, viewportHeight)` is a pure function: which Step's box contains the middle of the screen, else the nearest. The Stage script runs it once per animation frame while scrolling and broadcasts the answer as a `stage:step` event. CSS (`data-active`), the rail (`aria-current`), the URL and the World all react to that one event; the Stage doesn't know the World exists.

### Hiding visually, not semantically
Inactive cards are `opacity: 0`, never `hidden` or `inert`, so screen readers and keyboard users still reach everything in order. Because the browser scrolls a focused link into view but not necessarily to the middle, focusing anything inside a Step makes that Step active directly.

### Camera glides instead of a scroll curve
Each Step has a framing: where its Host stands and which side of the card to show them on. `frame()` turns that into a landscape and a portrait shot. Moving between shots is a `Glide` (`from`, `to`, `start`) eased with ease-in-out cubic over 1.2 s. Changing your mind mid-glide calls `retarget`, which starts the new glide from wherever the camera is right now, so it never jumps.

### Contrast as a test
The glass is translucent, so its real colour depends on what's behind it. `glass-contrast.test.ts` reads the tokens from `theme.css`, composites the glass over pure white (the worst case for light text), and fails the build if any text colour drops below WCAG AA.
