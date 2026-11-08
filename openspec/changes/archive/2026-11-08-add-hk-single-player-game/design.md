# Design

## Context

This is a greenfield repository with no existing code or specs. The first version is single-player against computer opponents. Online play with friends is the next planned step, so the rules engine must be usable later on a server without being rewritten. The requirements are in the specs under `specs/`.

## Goals / Non-Goals

**Goals:**
- A pure, deterministic rules engine with no dependency on the screen or browser, so it can be tested on its own and later run on a server.
- Network data kept separate from the rules, so new cities can be added as data.
- Hidden information handled from the start: AI and UI read a per-player view, never the full state.
- A static site with no backend.

**Non-Goals:**
- Networking, accounts, lobbies, saving or resuming a game, and sound.
- Multi-round scoring and challenging a Typhoon Signal No. 8 play.
- Adjustable AI difficulty.
- A full geographic map. The line strip is enough.

## Decisions

### Stack: TypeScript + Vite + React, Vitest, Playwright
- TypeScript catches rule and data mistakes at compile time.
- Vite gives a fast dev server and a static build.
- React suits a component-heavy card table and has the most well-known tooling.
- Vitest runs the engine and data tests. Playwright runs a small number of browser smoke tests at phone and desktop sizes.
- *Alternatives:* Plain TypeScript with DOM code would mean more hand-written UI code for dialogs, the hand, and state updates. Svelte or Vue are equally viable; React won on familiarity. A canvas game engine such as Phaser is overkill for a turn-based card UI and is worse for accessibility.

### Layout: one package, three folders with one-way dependencies
- `src/engine/`: rules, deck, AI, and seeded random numbers. Imports nothing from React or the browser.
- `src/data/`: network data files and the network loader and validator.
- `src/ui/`: React components and the i18n dictionaries.

A lint rule or test SHALL check that `engine/` does not import from `ui/`. When online play arrives, `engine/` can be moved into a shared package used by both server and client.
*Alternative:* a monorepo from day one. This adds tooling cost before there is a second consumer.

### Engine API: reducer-style actions with events
`applyAction(state, playerId, action) → { ok: true, state, events } | { ok: false, reason }`
- Actions: `play { cardId, chosenLine?, callUno? }`, `draw`, `pass`.
- State is plain JSON (no classes, no functions), so it can be serialized.
- `events`, such as `played`, `drew`, `skipped`, `reversed`, `lineChanged`, `penalty`, and `won`, drive UI messages and animations.
- Illegal actions return a reason and leave state untouched.
- *Why:* This is the shape a future server would use: clients send actions, the server checks them and sends out events. It also makes every scenario in the rules spec easy to test.

### Hidden information: `viewFor(state, playerId)`
The AI and the UI both receive a `PlayerView`, which contains:
- the player's own hand
- the top discard
- the current line and face
- turn order and direction
- other players' card counts

Neither receives the full `GameState`. This enforces the AI's information rule by construction, and it is the payload a server would send to each client.

### Deterministic randomness
A small seeded random number generator (mulberry32 or similar) is used. Its state is stored inside `GameState`, so shuffles and reshuffles can be replayed from the seed. No `Math.random` calls inside `engine/`.

### Network data format
Data lives in TypeScript modules, so the compiler checks them:
- `stations`: a map of station id to `{ en, zh }`.
- `lines`: an array of `{ code, en, zh, colour, trunk: stationId[], branches: { from: stationId, stations: stationId[] }[] }`.

Interchanges are computed from line membership, never written by hand. The loader then numbers each line:
- Interchange stations get no number.
- Single-line stations along the trunk (the main route to the main terminus) are numbered 1, 2, 3, and so on in order.
- Each branch is then numbered in the order listed, carrying on the count, so no number repeats on a line.

Merging Disneyland into the Tung Chung Line makes Sunny Bay a single-line station, so it gets a number.

Tests check the validation rules in the network spec, including that Admiralty is served by ISL, TWL, EAL, and SIL.

Hong Kong lines, the end each line is numbered from, and the draft colour values:

| Code | Line | Numbered from | Colour (verify) | Branches (numbered after the trunk, in this order) |
|---|---|---|---|---|
| ISL | Island | Kennedy Town | #007DC5 | — |
| TWL | Tsuen Wan | Central | #E2231A | — |
| KTL | Kwun Tong | Whampoa | #00AB4E | — |
| TKL | Tseung Kwan O | North Point (trunk to Po Lam) | #7D499D | LOHAS Park from Tseung Kwan O |
| TCL | Tung Chung (+ Disneyland, Airport Express); labels TCL #F7943E · DRL #E777CB · AEL #00888A | Hong Kong (trunk to Tung Chung) | #F7943E | 1. Disneyland Resort from Sunny Bay; 2. Airport, AsiaWorld-Expo from Tsing Yi |
| EAL | East Rail | Admiralty (trunk to Lo Wu) | #5EB6E4 | 1. Racecourse loop from Sha Tin, rejoining at University; 2. Lok Ma Chau from Sheung Shui |
| TML | Tuen Ma | Wu Kai Sha | #923011 | — |
| SIL | South Island | Admiralty | #BAC429 | — |

Station lists are entered from MTR's current official system map. Stations under construction, such as Tung Chung East, are excluded. Station pairs joined only by a walkway (Central/Hong Kong, Tsim Sha Tsui/East Tsim Sha Tsui) stay separate stations with their own cards and numbers, linked by two-way `transfers` in the network data. Playing one switches to the other station's line(s). Transfers are data, validated by the loader, and add lines to `lineChoices`, so the rules engine needs no special case per station.

### Line strip drawing
The strip is an SVG drawn from a pure layout function (`layoutLine`):
- The trunk runs left to right.
- Each branch starts one column after its fork, on its own row above the trunk. Overlapping branches take further rows, so diagonal tracks never cross the trunk's names.
- Each track section is drawn once per label whose `stations` cover both ends, offset side by side. This is how the shared Hong Kong–Tsing Yi track shows TCL orange and AEL green together.
- A branch station with another branch directly above it puts its name beside the dot.

SVG was chosen over HTML/CSS because diagonal branches and parallel coloured stripes are simple geometry in SVG and awkward in CSS.

### Current face model
`face` is one of `{ kind: 'number', n } | { kind: 'action', type } | { kind: 'none' }`. Interchange and wild plays both set the face to `none`. A single matching function, `isPlayable(card, line, face)`, implements every rule in the game-rules spec. The UI uses it to mark playable cards and the AI uses it to choose moves.

### "UNO!" as a flag on the play action
The call is part of the play action (`callUno: true`), not a separate timed action. The penalty is applied when the turn ends. This avoids a race between the human and the computer players, which would be unfair and would get worse online.
*Alternative:* the Uno-style "catch" mechanic, where others can challenge a missed call. That needs timing windows, and it is deferred to the online change.

### AI: rule-based, run on a UI timer
The AI is a pure function `chooseAction(view) → Action`, following the priorities in the AI spec. The UI controller runs AI turns with `setTimeout`, waiting 2 s by default. The delay is passed in as a setting, so tests can set it to zero. The engine has no knowledge of timing.

### i18n: in-house dictionary
- UI strings live in `en.ts` and `zh-Hant.ts`.
- Line and station names come from the network data.
- The language choice is stored in `localStorage`. Every read and write is wrapped in try/catch, and English is the fallback.

*Why:* there are fewer than 100 strings and only two languages, so an i18n library isn't worth adding.

### Card visuals
Cards are drawn in CSS, with no image assets:
- a coloured band per line
- a large number (left blank on interchange cards)
- the line code in text, so the card does not rely on colour alone
- the station name

Interchange cards stack one band per line. Action cards use a simple icon and their name.

## Risks / Trade-offs

- [Lines differ greatly in length. Once interchanges are skipped, SIL numbers only 4 stations while TML still reaches about 20. High numbers exist only on the longest lines, so they rarely match by number, and long lines dominate the deck.] → Ship as specified, then playtest. Folding numbers (for example, taking them mod 10) would be a rules change and would go in a follow-up change.
- [Station data mistakes: wrong order, missing station, wrong Chinese name.] → Entered from the official MTR map. Tests check counts per line and known interchanges, and a native reader checks the Chinese names.
- [MTR's official line colours are only roughly available as published hex values.] → Colours are kept as data and can be adjusted. Contrast against card text is checked.
- [About a quarter of stations are interchanges. Their cards have no number and leave the face at `none`, so after one is played only a line match, another interchange on that line, or a wild can follow.] → This is intended (interchanges act as line-change cards). Watch it during playtesting.
- [The AI is predictable.] → Acceptable for v1. The AI sits behind `chooseAction`, so it can be replaced later.
- [A seeded AI-only simulation could, in theory, never end.] → The simulation harness uses a safety turn limit and reports any game that hits it.

## Migration Plan

Not applicable: greenfield. Deployment is `vite build`, with the static `dist/` output uploaded to any static host. The hosting target is chosen when the game is published.
