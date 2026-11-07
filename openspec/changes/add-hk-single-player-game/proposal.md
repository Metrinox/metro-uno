# Proposal

## Why

Metro Uno (working title) is a shedding card game, like Uno, where the colours are Hong Kong MTR lines and the numbers are station positions. Interchange stations let a player change line. The project is empty, so this change builds the first playable version: one human against computer opponents in the browser, using MTR heavy rail data.

## What Changes

- New browser game that works on phones and desktop, with English and Traditional Chinese (繁體中文) UI and station names.
- Hong Kong MTR heavy rail network data: lines, official line colours, ordered station lists, and interchange membership. The Airport Express and Disneyland Resort lines are merged into the Tung Chung Line. Light Rail is excluded.
- A deck built from that data:
  - One station card per heavy rail station. Its colour is its line. Its number is its place along the line, counting only single-line stations (interchanges are skipped). Numbers never repeat within a line, including on branches.
  - Interchange stations get one card with no number that belongs to all of their lines.
  - Metro-themed action cards: Signal Fault (skip), Terminus (reverse), Rush Hour (draw 2), Octopus (wild), and Typhoon Signal No. 8 (wild + draw 4).
- Game rules:
  - A card is playable if it matches the current line or the current number.
  - An interchange card can be played on any of its lines and always changes line. A 2-line card switches to its other line automatically; with more lines, the player chooses among the others.
  - Players draw when they cannot play.
  - A player must call "UNO!" when down to one card. Forgetting costs 1 penalty card.
  - The first player to empty their hand wins the round.
- 1–3 computer opponents that play only legal moves and use a simple strategy.
- The game engine is kept separate from the screen and its state can be saved and reloaded, so online play with friends can be added later without rewriting the rules.

Assumptions made for questions the user did not answer (they can be changed during review):
- The Airport Express and Disneyland Resort lines are merged into the Tung Chung Line (shown with all three labels) to keep the game playable.
- Single round, no points scoring across rounds. Hand size, drawing, and stacking are house rules (see the house-rules spec).
- "Metro Uno" is a working title only. "Uno" is a Mattel trademark, so pick a different name before any public release.

## Capabilities

### New Capabilities
- `transit-network-data`: Data for a city's metro network (lines, colours, ordered stations, bilingual names, interchanges), starting with Hong Kong MTR heavy rail, in a format that later cities can reuse.
- `card-deck`: Building the deck from network data: station cards with line and number, interchange cards, and themed action cards.
- `game-rules`: Turn order, legal plays (line or number match), interchange line choice, action card effects, drawing, the "UNO!" call, and winning.
- `ai-opponents`: Computer players that choose legal moves, choose lines for interchange and wild cards, and act on their own on their turn.
- `house-rules`: Optional rules chosen before a round: starting hand size, draw one or draw until playable, playing the drawn card, mixing +2/+4 when stacking, and playing several same-number cards together.
- `game-ui`: The playable browser interface: game setup, hand and discard pile, current line and station display, line choice prompts, language switch, and layouts that work on phones and desktop.

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- Greenfield: creates a new web app (source, tests, build config) in this repository. There is no existing code to change.
- New dependencies: a front-end build toolchain and a test runner (see design.md).
- Output is a static site that can be hosted anywhere and needs no backend for this change.
- Out of scope, planned later: online multiplayer, more cities, scoring across multiple rounds, and a full interactive network map.
