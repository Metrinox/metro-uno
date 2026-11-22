# Proposal

## Why

London has far more interchanges than Hong Kong: 50 of 136 stations (37%), against 17 of 98 (17%). An interchange has no number, so after one is played the next player can match only by line. In simulated four-player rounds, number-matching is off on 38% of London turns against 22% in Hong Kong, and players match by number less often (12% of plays against 17%). Rounds play more like "follow the colour" than UNO.

Most of those interchanges are stations where the subsurface lines (Circle, Hammersmith & City, Metropolitan, District) share track and platforms. Riders don't think of them as changing line. If stations served only by subsurface lines stop counting as interchanges, London drops to 34 interchanges of 136 (25%). Each of those stations then has a number.

## What Changes

- **BREAKING: Circle, Hammersmith & City and Metropolitan become separate lines.** The merged CIR · H&C · MET line is removed. London has 10 lines: Bakerloo, Central, Circle, District, Hammersmith & City, Jubilee, Metropolitan, Northern, Piccadilly, Victoria. Each subsurface line has its own colour, line strip and action cards.
- **Subsurface stations don't count as interchanges among themselves.** A network may name a set of shared-track lines. For deciding interchanges they count as one line. Sloane Square (Circle + District) is a plain station. Victoria (Circle + District + Victoria) is still an interchange, and like every interchange it has no number.
- **Five numbering groups.** London sorts every subsurface station into one of five groups, by which subsurface lines serve it:

  | Group | Circle | H&C | Met | District | Stations |
  |---|---|---|---|---|---|
  | 1 | yes | yes | no | no | Hammersmith (H&C) … Royal Oak, plus Paddington and Edgware Road (Circle), which also have the District |
  | 2 | any | any | yes | no | Finchley Road … Aldgate |
  | 3 | no | yes | no | yes | Aldgate East … West Ham |
  | 4 | yes | no | no | yes | Bayswater … Tower Hill |
  | 5 | no | no | no | yes | Turnham Green … Earl's Court and the District's branches |

  Each group numbers its plain stations 1, 2, 3 … in its own order and skips interchanges, the same way a line is numbered. So a number repeats on a subsurface line when its stations fall in different groups.
- **Multi-line station cards.** A plain station on more than one subsurface line gets one card that shows all its lines side by side in one band, plus its group number. Examples: Goldhawk Road is CIR | H&C 2, Aldgate is CIR | MET 5, Sloane Square is CIR | DIS 3. It can be played on any of its lines, or by matching its number. Nobody chooses a line: all its lines become current together, so the next player can play a card on either line, or the same number.
- **BREAKING: several lines can be current at once.** The game tracks one current line or a set of shared-track lines. An interchange offers its subsurface lines as one option. Victoria played from the Victoria line makes the Circle and District current together, and needs no prompt. Wilds and action cards still set one line.
- **The District's numbers change.** The District is now numbered through its groups (3, 4 and 5) rather than as one line. The Aldgate East restart and the "numbered interchange" from the earlier version of this change are dropped.
- **Maps.** Each subsurface line has its own line strip. When several lines are current, the strip shows one of them, with a tab per current line to switch between their maps. There are no merged maps, so the strip is never taller than one line's.
- **Gallery.** A new "Subsurface lines" section (淺層綫) shows every subsurface station's card group after group, without naming the groups. Action cards stay in their own lines' sections.
- **Computer players** choose among an interchange's options the same way as now, counting a card as matching an option when it is on any of the option's lines.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `transit-network-data`:
  - shared-track lines that don't make interchanges among themselves;
  - numbering groups;
  - London's separate Circle, H&C and Metropolitan lines (replacing the merged line);
  - London's five groups;
  - repeated numbers on a shared-track line.
- `card-deck`: multi-line station cards; London's deck size.
- `game-rules`:
  - several current lines;
  - multi-line station plays;
  - interchange and transfer options that keep shared-track lines together;
  - same-number groups.
- `game-ui`:
  - several current lines on the table, and the line strip's tabs;
  - multi-line station cards and subsurface interchange cards;
  - the line prompt;
  - the gallery's Subsurface lines section.
- `ai-opponents`: choosing among options of several lines.

## Impact

- **Data:**
  - `src/data/network.ts` gains shared-track lines and numbering groups, with validation.
  - `src/data/london-underground.ts` replaces the merged line with three lines and declares the five groups.
- **Engine:**
  - `src/engine/cards.ts`: station cards may list several lines.
  - `src/engine/game.ts`: the current line becomes a list of lines; line options become sets of lines; playability, face, same-number groups.
  - `src/engine/ai.ts`: scoring options of several lines.
- **UI:**
  - `CardView`: multi-line bands, and subsurface lines sharing one band on interchange cards.
  - `LineStrip`: a tab per current line.
  - `GameScreen` and `LineChooser`: several current lines, and options of several lines.
  - `GalleryPage`: the Subsurface lines section.
  - `format.ts`: names, labels, hand order and event messages.
- **Replaces work in progress:** the numbered-interchange implementation in the working tree (`sharedTrack` pairs, `restartAt`, numbered interchange cards) is replaced, not shipped.
- **Server and protocol:** the game state and the play message change shape: there are several current lines, and a chosen option can be several lines. Server and client deploy together. Stored rounds are converted or ended (see design).
- **Tests:** data, deck, rules, AI, card display, line strip, gallery and e2e tests. The London simulation is re-run and its figures recorded.
- **Players:** London's subsurface cards, colours and numbers all change. Hong Kong is unchanged.
