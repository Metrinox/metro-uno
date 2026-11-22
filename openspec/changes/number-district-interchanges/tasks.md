# Tasks

The working tree holds an implementation of this change's earlier version (numbered interchanges). Each task below says what to keep from it and what to remove.

## 1. Data format and London data

- [x] 1.1 Replace the pair form of `sharedTrack`, `restartAt`, and numbered-interchange counting in `src/data/network.ts` with `sharedTrack: { lines, groups }`, `Station.group` and group numbering (design decision 1); keep `Station.number`. Verify with `network.test.ts` cases on a small test network:
  - a station on two shared-track lines only is not an interchange;
  - a station also on another line is an unnumbered interchange;
  - group numbering skips interchanges and carries on through branches;
  - a group station has its group number on every line serving it;
  - loading fails for an unknown or single shared-track line;
  - loading fails for a station in no group or in two, and for a group station no shared-track line serves.

  Remove the earlier pair and restart cases.
- [x] 1.2 Replace `SSR` with `CIR`, `H&C` and `MET` in `src/data/london-underground.ts`, declare `sharedTrack` with the five groups, and repoint the Hammersmith and Bank transfers (design decision 2); update the file's header comment. Verify with `london-underground.test.ts` cases for every changed transit-network-data scenario:
  - 10 lines;
  - each subsurface station in the group the table gives (Paddington and Edgware Road in group 1);
  - the group numbers in the "Group numbers" scenario;
  - 34 interchanges;
  - Sloane Square and Goldhawk Road not interchanges, and Victoria an unnumbered interchange;
  - Whitechapel and High Street Kensington both 2 on the District;
  - the West Ham and walkway-transfer scenarios.

  Also check that `hk-mtr.test.ts` still passes with no shared-track lines.

## 2. Deck and engine rules

- [x] 2.1 Add `lines?` to station cards and a `cardLines` helper in `src/engine/cards.ts`, set it in `buildDeck`, and remove `number?` from interchange cards. Verify with `cards.test.ts`:
  - Goldhawk Road lists CIR and H&C with number 2;
  - Aldgate lists CIR and MET with 5;
  - Victoria is an unnumbered interchange;
  - London has 174 cards: 34 interchange, 29 multi-line, 73 single-line;
  - Hong Kong still has 130.
- [x] 2.2 Replace `currentLine` with `currentLines`, `chosenLine` with `chosenLines`, and make `lineChoices` return options of several lines in `src/engine/game.ts` and `src/shared/protocol.ts` (design decision 4); update `test-helpers.ts`. Verify that every existing Hong Kong `game.test.ts` case passes, rewritten only for the new field names.
- [x] 2.3 Implement the multi-line station, interchange, transfer and line action rules (design decision 4), and remove the numbered-interchange rules and their tests. Verify with a `game.test.ts` case for each scenario in:
  - "Multi-line station plays";
  - "Current line and face";
  - "Legal station plays";
  - "Interchange plays and line choice", including Victoria both ways and King's Cross;
  - "Transfer plays", including Monument and Bank;
  - "Line action plays".
- [x] 2.4 Check same-number groups that end on a multi-line card. Verify with a `game.test.ts` case for "Ending on a multi-line card".
- [x] 2.5 Score options of several lines in the AI's line choice (`src/engine/ai.ts`). Verify with an `ai.test.ts` case for the "Shared-track option" scenario, and the existing Octopus case.
- [x] 2.6 Convert or end stored rounds on load (design decision 6, `server/room.ts`/`roomObject.ts`), in its own commit. Verify with room tests:
  - a stored Hong Kong round with `currentLine` loads with `currentLines` and plays on;
  - a stored London round with an `SSR` card loads into the lobby with its players.
- [x] 2.7 Update the London expectations in `simulate.test.ts` and run it. Verify that London rounds still finish within the limits. Record turns per round, share of plays by number, share of turns with no number face, and action-card share, against main's figures (354 turns, 12%, 38%).
  - Results (2026-11-22; 1,000 four-player rounds, default rules, seeds 0–999, same measure for both). `simulate.test.ts` needed no new London expectations: every London rule set passes its limits.

    | | Turns per round | Turns with no number face | Plays matched by number only | Action cards |
    |---|---|---|---|---|
    | London, main | 351 | 52.6% | 8.0% | 24 of 168 (14.3%) |
    | London, this change | 334 | 48.1% | 9.2% | 30 of 174 (17.2%) |
    | Hong Kong (both) | 359 | 42.2% | 10.8% | 24 of 130 (18.5%) |

    The proposal's main figures (354 turns, 12%, 38%) came from an earlier prototype with a different measure, so compare within this table.

## 3. Display

- [x] 3.1 Make `LineStrip` take `lines: string[]` and draw one current line at a time, the first in shared-track order, with a tab per current line to switch (design decision 5). Verify with `lineLayout.test.ts` cases:
  - the Circle has its loop and no Finchley Road or Whitechapel;
  - the Metropolitan runs Finchley Road to Aldgate, numbered 1–5;
  - Sloane Square is a numbered stop on the District;
  - Hong Kong layouts are unchanged.

  And with a `LineStrip.test.tsx`:
  - Circle and District current shows the Circle with tabs CIR and DIS;
  - choosing DIS shows the District with Sloane Square highlighted;
  - one current line shows no tabs.
- [ ] 3.2 Draw multi-line bands and shared-track interchange bands in `CardView.tsx` and `styles.css`, and remove the numbered-interchange markup and CSS. Verify with `CardView.test.tsx`:
  - Goldhawk Road shows CIR and H&C in one band, 2, and no interchange mark;
  - King's Cross shows one CIR/H&C/MET band, then NOR, PIC and VIC bands;
  - Admiralty is unchanged.
- [ ] 3.3 List every line in `cardName`/`cardLabel`, sort multi-line cards under their first line in `handOrder`, and name every line in line-change messages (`src/ui/i18n/format.ts`); remove the numbered-interchange forms. Verify with `i18n.test.tsx` cases in English and Chinese.
- [ ] 3.4 Update `GameScreen` and `LineChooser`:
  - show the current lines' badges;
  - pass `currentLines` to the strip;
  - show options of several lines as one choice;
  - send `chosenLines`;
  - remove the current-line-first prompt.

  Verify with `GameScreen.test.tsx`:
  - Sloane Square plays with no prompt and shows Circle and District as current, with the Circle strip and a District tab;
  - King's Cross from the Northern offers three choices, the first showing CIR, H&C and MET;
  - Victoria from the Victoria line plays with no prompt;
  - North Point still changes line with no prompt.
- [ ] 3.5 Add the "Subsurface lines" (淺層綫) card group to `GalleryPage.tsx`, keeping action cards in their lines' groups (design decision 5). Verify with `GalleryPage.test.tsx`:
  - London shows 10 lines and 174 cards, each card once;
  - the Subsurface group runs Hammersmith (H&C) to Kensington (Olympia), with no group names;
  - the CIR, DIS, H&C and MET groups each hold only their three action cards;
  - the Chinese heading is 淺層綫;
  - Hong Kong is unchanged at 130 cards.
- [ ] 3.6 Review the gallery and a London round at 360×640 and 1280×800, and fix any problem found. In particular:
  - King's Cross, Baker Street, Paddington and Hammersmith (H&C), whose bands come with a transfer marker;
  - the four subsurface line maps and the strip's tabs;
  - the table with two and three current lines.

  Verify by screenshots showing no overlap, no sideways page scrolling, and the whole table visible without scrolling at 360×640.

## 4. Final checks

- [ ] 4.1 Replace the numbered-interchange e2e case in `e2e/game.spec.ts`. In a London round, a multi-line station in hand is playable by its number from another line, plays without a prompt, and leaves both its lines current, with a tab to show each line's map. Verify that `npm run e2e -- game.spec.ts` passes.
- [ ] 4.2 Run `npx tsc -b`, `npm run lint`, `npm test` (which includes the worker tests), and `npm run e2e`. Verify that they all pass.

## Workflow follow-up

- Play a few real London rounds before merging; the figures come from computer players.
- Archive the change with `/opsx:archive` after review, then check the main specs picked up the deltas, including the removed merged-line requirement.
