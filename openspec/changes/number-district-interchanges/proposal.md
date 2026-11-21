# Proposal

## Why

London has far more interchanges than Hong Kong: 50 of 136 stations (37%), against 17 of 98 (17%). An interchange has no number, so after one is played the next player can match only by line. In simulated four-player rounds, number-matching is off on 38% of London turns against 22% in Hong Kong, and players match by number less often (12% of plays against 17%). Rounds play more like "follow the colour" than UNO.

Most of those interchanges are District stations shared with the Circle, Hammersmith & City or Metropolitan (merged in the game as one line). These lines share track and platforms through central London. Giving those stations a number brings London in line with Hong Kong. In simulation, number-matching is off on 22.5% of turns, 14.9% of plays match by number, and rounds are about 9% shorter (322 turns against 354).

## What Changes

- **Numbered interchanges.** A network may name pairs of lines that share track. A station served by both lines of a pair is still an interchange, but it also has a number, taken from the first line of the pair. In London the pair is District + the merged CIR · H&C · MET line, which makes 25 numbered interchanges. Examples: Tower Hill, Sloane Square, Victoria, Paddington. Hong Kong has no such pairs and is unchanged.
- **Numbering restarts.** A line may restart its numbering at 1 from a named station. The District numbers Turnham Green → Tower Hill as 1–17, then restarts at Aldgate East: 1–18 through the East End and its three branches. Its numbers then stay in the same range as the other London lines (up to 19) instead of reaching 34. **This relaxes the rule that no two stations on one line share a number.** On the District each number up to 17 appears twice.
- **District renumbered.** Every District station's number changes, since the numbered interchanges now count. The merged line's numbers are unchanged; its numbered interchanges carry their District number.
- **Playing a numbered interchange.**
  - It is playable on any of its lines, or by matching its number.
  - The player chooses any of its lines, including staying on the current one.
  - Its number becomes the face, so the next player can match by number.
  - Ordinary interchanges are unchanged: they still must switch line and clear the face.
- **Display.** A numbered interchange card shows its lines' bands and its number, marked as an interchange. The line strip shows its number in an interchange-style dot. The line prompt offers all its lines, current line first.
- **Computer players** choose a line for a numbered interchange the same way they do for any interchange.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transit-network-data`:
  - shared-track line pairs and numbered interchanges;
  - numbering restarts;
  - the District / merged-line pair and the Aldgate East restart for London;
  - an exception to unique numbers per line.
- `card-deck`: numbered interchange cards carry a number.
- `game-rules`: how numbered interchanges are played, and the line and face they set.
- `game-ui`: how numbered interchange cards, line-strip stops, and the line prompt look.

## Impact

- **Data:** `src/data/network.ts` gains `sharedTrack` on `NetworkDef` and `restartAt` on `LineDef`, plus loader validation. `src/data/london-underground.ts` sets the District pair and restart.
- **Engine:**
  - `src/engine/cards.ts`: interchange cards gain an optional `number`.
  - `src/engine/game.ts`: playability, line choices, and the face after play.
  - The AI needs no change beyond what `lineChoices` returns.
- **UI:** `CardView` (number on interchange cards, including phone-size layout), `LineStrip` (numbered interchange dots), `format.ts` (card names and labels), `GameScreen` (line prompt for numbered interchanges).
- **Server and protocol:** no message changes; cards already travel as data. Rounds already in progress keep the deck they were dealt.
- **Tests:** data, deck, rules, AI, card display and line strip tests. The London simulation is re-run with the new expectations.
- **Players:** every District card number changes, and London rounds play differently. Hong Kong is unchanged.
