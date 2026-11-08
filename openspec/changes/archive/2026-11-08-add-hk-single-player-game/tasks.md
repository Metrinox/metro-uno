# Tasks

## 1. Project setup

- [x] 1.1 Create a Vite + React + TypeScript (strict) app with `src/engine`, `src/data`, and `src/ui` folders, and verify that `npm run dev` serves a blank page and `npm run build` succeeds
- [x] 1.2 Add Vitest, ESLint, and Playwright, and add a lint rule that stops `src/engine` and `src/data` from importing React or `src/ui`. Verify that `npm test`, `npm run lint`, and `npx playwright test` all run (an empty suite passes)

## 2. Network data

- [x] 2.1 Define the network data types and a loader that computes interchanges and station numbers (interchanges skipped; trunk first, then branches carrying on the count), and validates references, empty lines, and duplicate codes. Verify with Vitest using a small test network, including the unknown-station error case
- [x] 2.2 Enter the Hong Kong heavy rail data (9 lines, Disneyland merged into TCL, bilingual names, colours) from MTR's official system map. Verify with tests: 9 lines and no Light Rail; Disneyland Resort on TCL; Admiralty = ISL/TWL/EAL/SIL; Admiralty has no number and Exhibition Centre is 1 on EAL; Hang Hau, Po Lam, and LOHAS Park have different numbers; Fo Tan and Racecourse have different numbers; no line repeats a number; every station has non-empty EN and ZH names
- [x] 2.3 Check line colours against MTR sources, and have a native reader check the Chinese station names. Record any corrections in the data file

- [x] 2.4 Merge the Airport Express into the Tung Chung Line (branch from Tsing Yi) and give that line TCL/DRL/AEL display labels. Verify with Vitest: 8 lines; Hong Kong, Kowloon, and Tsing Yi are single-line and numbered; Airport and AsiaWorld-Expo are on TCL; deck is 130 cards. Verify with Playwright that TCL cards and the badge show all three labels
- [x] 2.5 Add walkway transfers (Hong Kong ↔ Central; Tsim Sha Tsui ↔ East TST) to the data format, cards, rules, AI, and card display. Verify with Vitest (transfer lines, line switch with face kept, Central offers TWL and TCL, validation errors) and Playwright (Hong Kong prompts ISL/TWL; East TST switches to TWL with no prompt; card shows the transfer marker)
- [x] 2.6 Draw the line strip with branches at their fork and each track section in the colours of the labels that cover it (TCL orange + AEL green side by side from Hong Kong to Tsing Yi). Verify the layout and colours with Vitest, and the strip and the 360×640 fit with Playwright
- [x] 2.7 Let a branch rejoin the line (`to`), and make Racecourse a loop from Sha Tin to University. Verify with Vitest (loader validation; Racecourse on the loop; layout beside Fo Tan with both connecting tracks) and Playwright (strip tracks Sha Tin–Racecourse–University)

## 3. Deck

- [x] 3.1 Implement the seeded random number generator and shuffle, and verify that the same seed gives the same order and different seeds give different orders
- [x] 3.2 Implement deck building: station cards (single-line and interchange), 3 line action cards per line, 4 Octopus, and 4 Typhoon No. 8. Verify the card-deck spec scenarios with Vitest, including the total count for Hong Kong

## 4. Rules engine

- [x] 4.1 Implement the `GameState`, face, and action types, plus `isPlayable`. Verify every legal-play scenario in the game-rules spec (line, number, interchange, action, wild, and no-match)
- [x] 4.2 Implement round setup (2–4 players, 7 cards each, turning cards until a single-line station card appears) and verify with seeded tests
- [x] 4.3 Implement `applyAction` for play, draw, and pass, with events, interchange and wild line choice, action effects (skip, reverse including the 2-player case, draw 2, draw 4), reshuffle, the UNO penalty (1 card), and winning. Verify each game-rules scenario with Vitest
- [x] 4.4 Implement rejection of illegal actions (out of turn, unplayable card, invalid line) and verify with tests that the state is deeply equal before and after a rejection
- [x] 4.5 Implement `viewFor(state, playerId)` and verify that the view contains no other player's hand and no draw pile order

- [x] 4.6 Make every interchange change line: exclude the current line from its choices, and choose automatically when one line remains. Verify with Vitest (Central on ISL switches to TWL with no choice; Admiralty on ISL rejects ISL) and Playwright (Central plays with no prompt; Admiralty prompt offers TWL/EAL/SIL)

## 5. AI opponents

- [x] 5.1 Implement `chooseAction(view)` with line choice (most cards held, fixed tie-break), play preferences (keep wilds; block a next player holding 2 or fewer cards), and always calling UNO. Verify the ai-opponents spec scenarios with Vitest
- [x] 5.2 Add a simulation test that runs 1,000 seeded AI-only rounds with 2–4 players and a safety turn limit, and verify that no action is ever rejected and the run finishes in CI time (under 30 s)

## 6. Game UI

- [x] 6.1 Add the i18n dictionaries (EN and 繁中) and a language provider, with the choice remembered via guarded `localStorage`. Verify with a test that switching language changes the text, and that blocked storage falls back to English without errors
- [x] 6.2 Build the setup screen (1–3 opponents, language, Start), and verify in the browser that starting with 2 opponents gives a 3-player table
- [x] 6.3 Build the card components (line bands, line code text, number or action name, station name; stacked bands for interchanges), and verify that the Admiralty card shows 4 lines and no number
- [x] 6.4 Build the table view: hand with playable cards marked, top discard, draw pile, opponent card counts, turn and direction indicators, and current line badge. Verify the table-contents scenario at 360×640 and 1280×800 with Playwright
- [x] 6.5 Build the current line strip with the top station highlighted, and verify with the Mong Kok on Tsuen Wan Line scenario
- [x] 6.6 Wire up the game controller: human actions go to `applyAction`, AI turns run on a timer (default 2 s, zero in tests), and events show as messages. Verify that a full round can be played to the end in the browser
- [x] 6.7 Add the line choice dialog for interchange and wild cards, Draw and Pass controls, the UNO control, and the penalty message. Verify the game-ui scenarios for each control with Playwright
- [x] 6.8 Add the end-of-round screen with Play Again and Back to Setup, and verify that Play Again keeps the opponent count and reshuffles
- [x] 6.9 Add keyboard and focus support and no horizontal scroll at 360px. Verify with a Playwright check at 360px and by tabbing through the controls
- [x] 6.10 Add the `/gallery` page (all lines with diagrams, all cards grouped) as a separate page. Verify with Playwright that it shows 8 lines and 130 unique cards and switches language, and that the production build serves it

## 8. House rules

- [x] 8.1 Add `HouseRules` (defaults: 7 cards, draw one, no playing the drawn card, mixing on, same numbers on) to the game state and round setup. Verify with Vitest that the hand size is used and that defaults apply
- [x] 8.2 Implement the drawing rules (draw one with or without playing it; draw until playable, then must play). Verify each Drawing scenario with Vitest
- [x] 8.3 Implement draw stacking (pending total, same-type always, mixing per rule, take the draw, automatic when nothing can stack, applied on a win). Verify each Draw stacking scenario with Vitest
- [x] 8.4 Implement playing several same-number station cards together. Verify the scenarios with Vitest, including the rejections
- [x] 8.5 Teach the AI to stack draw cards and play same numbers together, and re-run the 1,000-round simulation with default and all-on/all-off rules. Verify no action is rejected
- [x] 8.6 Add the House rules section to the setup screen (remembered via guarded storage), the pending-draw display, and the same-number prompt. Verify the game-ui and house-rules scenarios with Playwright, and update the README rules

## 7. Integration and docs

- [x] 7.1 Add a Playwright end-to-end test that plays a full seeded game against 1 AI in each language, and verify that it passes
- [x] 7.2 Write a README covering how to play (rules summary), the dev and build commands, and how to add a new city's network data. Verify that the documented commands run as written

## Workflow follow-up

- Playtest a few rounds and decide whether number matching needs tuning (see design.md Risks) before archiving.
- Archive the change after review.
