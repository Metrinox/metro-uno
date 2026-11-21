# Tasks

## 1. Data format and London numbering

- [ ] 1.1 Add `sharedTrack` to `NetworkDef`, `restartAt` to `LineDef`, and `Station.number` in `src/data/network.ts`; number stops per design decision 1 (numbered interchanges count on their numbering line, the count resets at `restartAt`, partner-line numbers unchanged); verify with `network.test.ts` cases on a small test network: a paired station is an interchange with its numbering-line number, a restart resets the count, unknown/duplicate pair lines and an unnumbered or off-line `restartAt` fail to load
- [ ] 1.2 Declare `sharedTrack: [{ numbering: 'DIS', partner: 'SSR' }]` and the District's `restartAt: 'aldgate-east'` in `src/data/london-underground.ts`; verify with `london-underground.test.ts` cases for every new transit-network-data scenario (Tower Hill 17, Victoria 8, King's Cross and Earl's Court unnumbered, exactly 25 numbered interchanges, Turnham Green 1 / Tower Hill 17 / Aldgate East 1 / Kensington (Olympia) 18, no District number above 18, Gloucester Road and Bow Road both 5, merged line still 1–13), and that `hk-mtr.test.ts` still passes with no numbered interchanges

## 2. Deck and engine rules

- [ ] 2.1 Add `number?` to interchange cards and set it in `buildDeck`; verify with `cards.test.ts`: Tower Hill card has 17, Admiralty has none, London still 168 cards with 25 numbered and 25 ordinary interchange cards
- [ ] 2.2 Update `isPlayable`, `lineChoices` and `applyAction` in `src/engine/game.ts` per design decision 3; verify with `game.test.ts` cases for each game-rules scenario (stay, switch, play by number from another line, missing line choice rejected, choice outside the card's lines rejected, face set to the number) and the unchanged Admiralty/North Point scenarios
- [ ] 2.3 Keep numbered interchanges out of same-number groups (design decision 4); verify with a `game.test.ts` case that grouping Sloane Square with a station card numbered 7 is rejected
- [ ] 2.4 Check the AI with numbered interchanges; verify with an `ai.test.ts` case that a computer player playing Tower Hill picks the line it holds most cards of, including staying on the District
- [ ] 2.5 Update the London expectations in `simulate.test.ts` if needed and run it; verify London rounds still finish within the limits, and record turns per round and plays by number against the proposal's figures (about 322 turns and 15%)

## 3. Display

- [ ] 3.1 Separate "interchange" from "has a number" in `lineLayout.ts` and `LineStrip.tsx` (`StripStop.interchange`, numbered interchanges drawn as interchange dots with their number on both lines' strips); verify with a `lineLayout.test.ts` case for Tower Hill on the District and merged-line layouts, and that Hong Kong strips are unchanged
- [ ] 3.2 Show the number and a ⇄ badge on numbered interchange cards in `CardView.tsx` and `styles.css`; verify with `CardView.test.tsx` (Victoria shows 8, its three lines and an interchange mark; Admiralty unchanged)
- [ ] 3.3 Include the number in `cardName`/`cardLabel` and sort numbered interchanges by number in `handOrder` (`src/ui/i18n/format.ts`); verify with `i18n.test.tsx` cases in English and Chinese
- [ ] 3.4 Make the line prompt list the current line first for numbered interchanges and always ask; verify with a screen test that playing Tower Hill on the District offers District then the merged line, and North Point still changes line without a prompt
- [ ] 3.5 Review every numbered interchange card and the District and merged-line strips in the gallery at 360 px and 1280 px (Embankment, Victoria, Paddington, Westminster in particular), and fix any overlap; verify by screenshots showing no overlap and no sideways scrolling

## 4. Final checks

- [ ] 4.1 Add an e2e case in `e2e/game.spec.ts`: in a London round, a numbered interchange in hand is playable by its number from another line and the line prompt appears; verify `npm run e2e -- game.spec.ts` passes
- [ ] 4.2 Run `npx tsc -b`, `npm run lint`, `npm test`, and `npm run e2e`; verify they all pass

## Workflow follow-up

- Play a few real London rounds with the change before merging; the figures come from computer players.
- Archive the change with `/opsx:archive` after review, then check the main specs picked up the deltas.
