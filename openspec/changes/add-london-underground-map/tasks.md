# Tasks

## 1. Network format extensions

- [x] 1.1 Make `LocalizedName.zh` optional in `src/data/network.ts`, make `localName` fall back to `en`, and route `stationName`/`lineName` in `src/ui/i18n/format.ts` through it; verify with a unit test in `network.test.ts` or `i18n.test.tsx` that a name without `zh` renders its English name in `zh` mode
- [x] 1.2 Keep the Hong Kong rule: update `hk-mtr.test.ts` so it asserts every Hong Kong station and line has a non-empty `zh`; verify `npx vitest run src/data` passes
- [x] 1.3 Add `wilds: { wild, draw4 }` (each `{ name: LocalizedName; art }`) to `NetworkDef`/`Network`, and give `hk-mtr.ts` Octopus (八達通, art `octopus`) and Typhoon Signal No. 8 (八號風球, art `ring`); verify `npx tsc -b` passes and a test checks the Hong Kong theme names
- [x] 1.4 Add `src/data/networks.ts` with `NETWORKS` (Hong Kong, then London) and `networkById`, plus a test for the list order, unique ids, and `undefined` for an unknown id; verify the test passes (London is a stub here until group 2)

## 2. London Underground data

- [x] 2.1 Build the Zone 1–2 station list (Zone 2/3 boundary included) for the 8 lines from TfL's current fare zone data and the Standard Tube Map, recording regular-service stops only (Turnham Green District-only, no Waterloo & City); verify by checking the list against the map, and note the source in a header comment in `src/data/london-underground.ts`
- [x] 2.2 Write `src/data/london-underground.ts` with Bakerloo, Central, Jubilee, Piccadilly and Victoria, each numbered from its north/west end; verify `loadNetwork` accepts it
- [x] 2.3 Add the District (main route Turnham Green → Earl's Court → West Ham; branches to East Putney, Edgware Road, and Kensington (Olympia)) and the Northern (main route Hampstead → Charing Cross branch → Kennington; Bank branch as a loop from Euston to Kennington; Archway, Battersea and Clapham South branches); verify `loadNetwork` accepts them
- [x] 2.4 Add the merged CIR · H&C · MET line per design decision 6: main route, MET branch to Finchley Road, Circle loop from Liverpool Street rejoining at Paddington, and per-label station coverage in each label's official colour; verify `loadNetwork` accepts it
- [x] 2.5 Add separate stations for the two Hammersmiths and the two Edgware Roads, transfers Hammersmith ↔ Hammersmith and Bank ↔ Monument, and London's wild theme (Oyster 「Oyster 卡」, art `oyster`; Tube Strike 「地鐵罷工」, art `ring`); register London in `networks.ts`; verify `npx tsc -b` passes
- [x] 2.6 Add `src/data/london-underground.test.ts` covering every transit-network-data scenario for London (line list, excluded and boundary stations, West Brompton, Waterloo, Turnham Green, Royal Oak/Great Portland Street/Aldgate numbered, label coverage, both transfers, no Chinese names, wild names, no repeated numbers); verify `npx vitest run src/data` passes

## 3. Deck and engine

- [x] 3.1 Add `cards.test.ts` cases for the London deck (S station cards, 24 action cards, 4 + 4 wilds with role ids `octopus`/`typhoon`) and the card-deck scenarios; verify they pass
- [x] 3.2 Run the round simulation in `simulate.test.ts` against London as well as Hong Kong; verify London rounds finish within the existing limits

## 4. Browser: network context and theming

- [x] 4.1 Add `NetworkProvider` and `useNetwork()` (pattern of `LangContext`), switch `CardView`, `LineStrip`, `LineBadge`, `GameScreen`, `Setup` and `GalleryPage` to it, and delete `src/ui/common/network.ts`; verify `npx tsc -b`, `npm run lint` and the existing UI tests pass with Hong Kong unchanged
- [x] 4.2 Make `cardName`, `cardLabel` and `CardView` use the network's wild theme instead of `t.wildName`, and remove `wildName` from both translations; verify `CardView.test.tsx` and `i18n.test.tsx` cover Octopus/Typhoon names in both languages
- [x] 4.3 Add an original Oyster card face (`OysterArt.tsx`, inline SVG, no TfL logo) and pick wild artwork by `art`; verify a `CardView` test shows "Oyster" without the Octopus artwork, and review it in the gallery
- [x] 4.4 Hide `gallery-line-alt` when the alternate name equals the shown one; verify on the London gallery in Chinese mode that no line name appears twice

## 5. Browser: choosing the map locally

- [x] 5.1 Add `loadMap`/`saveMap` to `src/ui/common/settings.ts` (key `metro-uno.map`, default and unknown → `hk-mtr`); verify with cases in `settings.test.ts`, including storage that throws
- [x] 5.2 Add a map picker to `Setup` (segmented control, translated labels), with the subtitle and stripes taken from the chosen network, and pass the map through `GameConfig` to `useLocalGame`/`LocalGame`; verify `useLocalGame.test.tsx` starts a London round and a screen test shows the London subtitle
- [x] 5.3 Add translations for the map picker label and map names in English and Chinese; verify `i18n.test.tsx` checks both languages have every key
- [x] 5.4 Add e2e coverage in `e2e/game.spec.ts`: choose London, start, see the Royal Oak-style merged-line cards and the merged line strip, reload, and find London still chosen; verify `npm run e2e -- game.spec.ts` passes

## 6. Online rooms

- [x] 6.1 Add `map` to `RoomSnapshot`, an optional `map` to `createRoom`, the `setMap` message, and the `unknown-map` rejection in `src/shared/protocol.ts`, with shape validation there and an `isKnownMap` registry check for the server; verify `protocol.test.ts` accepts valid ids and rejects unknown ones and wrong types
- [x] 6.2 Add `map` to `RoomState` in `server/room.ts`: set it on create, handle `setMap` (host-only, lobby-only, known ids), build rounds from `networkOrDefault(state.map)`, and delete `server/network.ts`; verify `room.test.ts` covers the online-multiplayer scenarios (guest rejected, unknown map, mid-round change rejected, London round)
- [x] 6.3 In `server/roomObject.ts`, default a stored room without `map` to `hk-mtr` when loading; verify with a worker test that loads a pre-change `RoomState` and starts a Hong Kong round
- [x] 6.4 Show the room's map in `Lobby` with a host-only picker (sends `setMap`), and send the locally chosen map with `createRoom`; provide `networkById(room.map)` to `OnlineGame`; verify `screens.test.tsx` and `useOnlineGame.test.tsx` cover a guest seeing the map change and the London table
- [x] 6.5 Add an e2e case in `e2e/online.spec.ts`: the host picks London, a guest sees it, the round shows London cards for both, and a guest reload returns to the London table; verify `npm run e2e -- online.spec.ts` passes

## 7. Gallery and final checks

- [x] 7.1 Add the map menu at the top of `GalleryPage` (design decision 9) and update `e2e/gallery.spec.ts` to check: the menu is at the top with Hong Kong selected; choosing London shows its 8 lines and every card once, updates the count text, and sets `?map=london-underground`; opening that link starts on London; Chinese mode falls back to English names; and the menu fits at 360 px with no sideways scroll; verify `npm run e2e -- gallery.spec.ts` passes
- [x] 7.2 Review every London line strip and the busiest interchange cards (King's Cross St Pancras, Baker Street, Bank, Earl's Court) in the gallery at 360 px and 1280 px wide, and fix any layout problems with the long Circle loop or crowded bands; verify by screenshots that show no overlap or horizontal scrolling
- [x] 7.3 Run the full checks: `npx tsc -b`, `npm run lint`, `npm test`, and `npm run e2e`; verify they all pass

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, then check the main specs in `openspec/specs/` picked up the deltas.
