# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- `loadNetwork` (`src/data/network.ts`) numbers each line's stops in order, skipping every station on two or more lines. It records `Station.numbers[line]` (null for interchanges) and `Station.interchange`.
- `buildDeck` (`src/engine/cards.ts`) makes an `interchange` card (lines, no number) for each interchange, and a `station` card (line, number) otherwise.
- The engine treats "has a number" and "is a station card" as the same thing:
  - `isPlayable` matches by number only for `station` cards;
  - `lineChoices` forbids staying for interchanges;
  - `applyAction` sets the face to none after any interchange;
  - same-number groups accept only `station` cards.
- The UI also equates "interchange" with "no number". `LineStrip` decides `interchange = stop.number === null`, and `CardView` draws a ⇄ icon in place of a number on every interchange card.
- The prototype behind the proposal's figures lives only in a scratch copy, not in the repo. It patched `buildDeck` and `game.ts` directly. This design moves the same rules into the data format and the engine properly.

## Goals / Non-Goals

**Goals:**
- Shared-track numbering is network data: Hong Kong declares nothing and behaves exactly as today.
- One engine rule for numbered interchanges, used by both local and online rounds, with no protocol change.
- "Is an interchange" and "has a number" become separate properties everywhere they were conflated.

**Non-Goals:**
- Changing ordinary interchanges, wilds, or any house rule.
- The "interchanges keep the previous number" idea. It was simulated as an alternative, but it's a separate rule change for every map.
- Letting numbered interchanges join same-number groups (see decision 4).
- Numbering the merged line's single-line stations differently; they keep 1–13.

## Decisions

### 1. Data format: `sharedTrack` pairs and `restartAt`
- `NetworkDef` gains `sharedTrack?: { numbering: string; partner: string }[]`.
- `LineDef` gains `restartAt?: string`.
- London declares `sharedTrack: [{ numbering: 'DIS', partner: 'SSR' }]`, and the District declares `restartAt: 'aldgate-east'`.

In `loadNetwork`:
- **Numbered interchanges:** a station is one when, for some pair, it is on both the numbering and the partner line. It stays `interchange: true`.
- **Numbering pass:** each line counts its stops in order. A stop gets the next number when it is single-line, or when it is a numbered interchange and this line is its numbering line. Reaching the `restartAt` station resets the count to 1 before numbering it.
- **What a station records:**
  - `numbers[numbering line]` is set;
  - `numbers[partner]` stays null, so the merged line keeps 1–13;
  - a new `Station.number: number | null` holds the card number: the single-line number, the numbered-interchange number, or null.

Validation:
- a pair must name two different known lines;
- `restartAt` must be a station on the line that gets a number.

*Alternative:* hard-code District/merged-line logic in `buildDeck`, as the prototype did. Rejected because it ties the engine to London ids.

### 2. Cards: an optional number on interchange cards
The `interchange` card type gains `number?: number`, and `buildDeck` sets it from `Station.number`. No new card kind, so the AI's `cardLines`, hand sorting, the gallery's interchange group, and the server's card handling keep working. Cards cross the wire as plain data, and the protocol has no card schema check, so online needs no change.
*Alternative:* a new `kind: 'numbered-interchange'`. Rejected because every `switch` on card kind would need a new branch for behaviour that is "interchange, plus a number".

### 3. Engine rules
- **`isPlayable`:** an interchange matches by line, or, when it has a number, by number against a number face.
- **`lineChoices`:** a numbered interchange returns all its lines plus transfer lines, current line first when it's one of them. An ordinary interchange keeps today's "other lines only".
- **`applyAction`:** numbered interchanges never auto-choose a line, so a missing `chosenLine` is `line-choice-required`. The face becomes `{ kind: 'number', n }`. Ordinary interchanges still set the face to none.
- **The AI:** needs no rule change. `chooseLine` already picks the allowed line it holds most of, and that can be the current line.

### 4. Same-number groups exclude numbered interchanges
`sameNumberCards` and the extra-card check stay restricted to `station` cards. A numbered interchange would need its own line choice in the middle of a group, and the "play same numbers together" rule is defined for single-line station cards. A numbered interchange can still be the card a group follows, by matching its number on the next turn.
*Alternative:* allow them in groups. Deferred; it needs a line choice for a mid-group interchange, and simulation didn't call for it.

### 5. UI: separate "interchange" from "has a number"
- **`CardView`:** a numbered interchange shows its bands and its number in the number's usual place. A small ⇄ badge sits beside the number, so it still reads as an interchange.
- **Phone-size cards:** cards with three or more bands (Victoria, Paddington, Embankment) use the tightened band rules from the London change, and a smaller number.
- **`LineStrip` and `lineLayout`:** `StripStop` gains `interchange: boolean`. A numbered interchange is drawn as an interchange dot with its number instead of ⇄, on both the District and merged-line strips, using `Station.number`.
- **`format.ts`:** `cardName` and `cardLabel` include the number for numbered interchanges, e.g. "Tower Hill (DIS/CIR·H&C·MET 17)". `handOrder` sorts them among their first line's numbered cards.
- **Line prompt:** `GameScreen` already opens `LineChooser` whenever `lineChoices` has more than one line. Numbered interchanges always do, with the current line listed first.

## Risks / Trade-offs

- **The same number twice on one line** (District 1–17 appears in both runs) → Players could misread a line strip. → The strip shows both runs in place along the line. The card band shows the line, and matching is by line or number, never by position, so a repeat never makes a play ambiguous.
- **Crowded phone-size cards** (Embankment has four bands plus a number and a name on an 88 px card) → Check every numbered interchange in the gallery at 360 px. Shrink the number on cards with three or more bands. Fixing any overlap is a task.
- **Every District card number changes** → Players who learned the old numbers see new ones. → Accepted; London shipped recently.
- **Longer prompts:** a numbered interchange always asks for a line, even a two-line one played on its own line. → Listing the current line first makes "stay" one tap. Revisit if play-testing finds it tedious.
- **Simulated, not play-tested:** the figures come from computer players that match by number only when they can't match by line. → Re-run the London simulation in the test suite, and play a few real rounds before merging.

## Migration Plan

- **Rounds in progress** (local or stored online rooms) keep the cards they were dealt: ordinary interchanges with old District numbers. The new rules only add behaviour for cards with a number, so old decks play exactly as before. New rounds get the new deck.
- **Deploy order:** the server and client deploy together, as now. An old client receiving a numbered interchange card would ignore its number and render it as an ordinary interchange. That's acceptable for one deploy cycle.
- **Rollback:** reverting the change restores the old numbering. Rounds dealt with numbered interchanges would then play them as ordinary interchanges.

## Open Questions

- Whether the "stay or switch" prompt should become a single tap for two-line numbered interchanges played on their own line. This can be decided after play-testing without changing the specs' outcome, since staying is already allowed.
