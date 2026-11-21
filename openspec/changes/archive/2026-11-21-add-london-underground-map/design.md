# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- `loadNetwork` (`src/data/network.ts`) already derives interchanges, numbers, branches, loops (`BranchDef.to`), multi-label lines with per-label coverage, and walkway transfers. London fits this format with **no new structural features**.
- The network is a module-level singleton in two places: `src/ui/common/network.ts` (browser) and `server/network.ts` (server). Seven UI modules import the browser singleton directly.
- The engine is already network-agnostic: `createGame({ network, ... })` builds the deck, and cards carry their own lines and transfer lines. After the deal, no engine code looks at the network.
- Wild cards have engine ids `octopus` and `typhoon`. These ids appear in card ids (`wild:octopus:1`), in AI logic and in draw-stacking logic, and are sent over the wire.
- `LocalizedName` requires both `en` and `zh`, and `localName`, `stationName` and `lineName` index it directly.
- Online rooms are stored as `RoomState` in Durable Object storage and are read back after a restart. A stored room has no map field.

## Goals / Non-Goals

**Goals:**
- One source of truth for the round's network on each side: React context in the browser, `RoomState.map` on the server.
- Add London purely as data, plus the small format extensions in the specs (optional `zh`, a wild theme, a registry).
- Keep Hong Kong rounds, stored rooms, and connected clients working across the deploy.

**Non-Goals:**
- Chinese names for London.
- A different rule set or deck size per map.
- Showing several maps in one round, or letting players vote on the map.
- Any official TfL or Oyster logos or roundel artwork.

## Decisions

### 1. Network registry keyed by id
Add `src/data/networks.ts`, which exports `NETWORKS` (Hong Kong, then London, both loaded once) and `networkById(id): Network | undefined`. The ids are `hk-mtr` (existing) and `london-underground`. Browser and server both import it, and the two singleton modules are deleted.
*Alternative:* load a network lazily per round. Rejected because both networks are small and validating them up front surfaces data errors at startup and in tests.

### 2. Browser: `NetworkContext` instead of the singleton
Add a `NetworkProvider` and a `useNetwork()` hook, following the pattern of `LangContext`. `LocalGame` provides the network chosen in setup. `OnlineGame` and `Lobby` provide `networkById(room.map)`. `GalleryPage` provides its own selection. `Setup` reads the network directly from its own state for the stripes and subtitle. Every current importer of `../common/network` switches to `useNetwork()`. Pure helpers (`format.ts`, `handOrder`) already take the network as a parameter, so they're unchanged.
*Alternative:* pass the network as props through `GameScreen`. Rejected because it threads one value through around 10 components.

### 3. Optional Chinese names, fallback at the edge
Change `LocalizedName` to `{ en: string; zh?: string }`. `localName(name, lang)` returns `name[lang] ?? name.en`, and `stationName` and `lineName` route through it. The gallery's "alternate language" line (`gallery-line-alt`) is hidden when the two names would be the same. Hong Kong tests keep asserting that every Hong Kong name has `zh`, which enforces the per-network rule in the spec.

### 4. Wild theme is display-only; engine ids unchanged
Add `wilds: { wild: WildTheme; draw4: WildTheme }` to `NetworkDef`, where `WildTheme = { name: LocalizedName; art: 'octopus' | 'oyster' | 'ring' }`. The engine keeps `WildType = 'octopus' | 'typhoon'` as the two wild **roles**. `CardView`, `cardName` and `cardLabel` look up the name and art through the network's theme instead of `t.wildName`, so `t.wildName` is removed. The Chinese names for London are 「Oyster 卡」 and 「地鐵罷工」, so Chinese mode reads naturally even though London's station names stay English.
*Alternative:* rename the engine ids to neutral `wild` and `wild-draw4`. Rejected for now: it would change card ids on the wire and in stored games, plus the AI and draw-stack code, with no change in behaviour. It can be done later as its own refactor.

### 5. Oyster artwork
Oyster gets an original card face: a blue card with a white wave mark and the word "Oyster", drawn as inline SVG like `OctopusLogo`, but **not** a copy of TfL's Oyster logo. Tube Strike reuses the existing ring-and-"+4" wild face (`art: 'ring'`), as Typhoon already does.

### 6. London data shape
`src/data/london-underground.ts` follows `hk-mtr.ts`. Each line is numbered from its north or west end within Zones 1–2, which keeps numbering stable and easy to check against the map.
- **Merged line (code `SSR`, labels CIR/H&C/MET):** the main route runs Hammersmith (H&C) → Paddington → Edgware Road → Baker Street → King's Cross St Pancras → Liverpool Street → Aldgate East → Bromley-by-Bow → West Ham. Branch 1 runs Baker Street → Finchley Road (MET). Branch 2 leaves Liverpool Street to Aldgate → Tower Hill → … → Gloucester Road → … → Bayswater and rejoins at Paddington. That is the Circle's southern half as a loop, like Racecourse. Label coverage: CIR covers Hammersmith–Liverpool Street plus the loop. H&C covers the main route. MET covers Aldgate–Liverpool Street–Baker Street–Finchley Road. That makes Aldgate the MET and CIR station that H&C passes by. In the line strip (decision 10), the Finchley Road branch heads left from Baker Street, and the loop is drawn below the main route as a ring back to Paddington.
- **District:** the main route runs Turnham Green → Earl's Court → West Ham, numbered west to east. Branches from Earl's Court go to East Putney, to Edgware Road (via High Street Kensington), and to Kensington (Olympia). Olympia's District service is part-time, but it is kept by decision (see the transit-network-data spec). In the line strip, the branches leave Earl's Court as on the map: the Wimbledon branch below and to the left, Olympia above and to the left, and the Edgware Road branch above and to the right.
- **Northern:** both northern ends are cut at Zones 1–2.
  - **Main route:** Hampstead → Camden Town → (Charing Cross branch) → Kennington → Oval → … → Clapham South. The Morden branch is part of the main route, so it is drawn straight on from Kennington. That puts its stations' numbers (8–11) before the branches'.
  - **Branches:** Camden Town → Archway, drawn heading left beside the Hampstead end, since both leave Camden Town northwards; the Bank branch, a loop from Euston that rejoins at Kennington; and Kennington → Battersea Power Station.
  - **Why the Bank loop leaves from Euston:** both branches call at Euston, and a station can appear only once on a line, so it can't leave from Camden Town.
- **West Ham** (Zone 2/3) is the eastern end of both the District and the merged line, and a three-line interchange with the Jubilee.
- **Separate stations:** the two Hammersmiths are separate station ids (`hammersmith-hc`, `hammersmith-dp`), both displayed as "Hammersmith". The line band on each card tells them apart, and the transfer joins them.
- **Edgware Road:** this is also two stations, the Bakerloo one and the District/merged-line one. TfL treats them as separate with no interchange, so they get two ids and no transfer.
- **Transfers:** Hammersmith ↔ Hammersmith and Bank ↔ Monument.

### 7. Online: map on the room, not in house rules
Add `map: string` to `RoomState` and `RoomSnapshot`, an optional `map` to `createRoom`, and a new `{ type: 'setMap'; map: string }` message. The host-only check and the lobby-only check reuse the existing `not-host` and `not-in-lobby` rejections. An unknown id gets a new `unknown-map` rejection. `startRound` calls `createGame({ network: networkOrDefault(state.map) })`. Protocol parsing only checks that `map` is a short non-empty string; the server checks the id against the registry with `isKnownMap`, so an unknown id is answered with `unknown-map` instead of being dropped as a malformed message. `PROTOCOL_VERSION` is unchanged, so connected clients are not cut off.
*Alternative:* add the map as a field of `HouseRules`. Rejected because house rules are typed as booleans and numbers, are edited with `HouseRulesEditor`, and are persisted as rules. The map is a different kind of choice and has its own control.

### 8. Local map choice persistence
`settings.ts` gains `loadMap()` and `saveMap()` under the key `metro-uno.map`, with the same try/catch pattern as `loadRules`. An unknown or missing value returns `hk-mtr`.

### 9. Gallery map menu
The menu is a segmented control in the gallery header, using the same `.segmented` style as the setup screen. It sits beside the title and above the "Back to game" link, so it's the first thing on the page. The selection lives in the URL's `?map=` parameter, updated with `history.replaceState`, so a reload or a shared link keeps the map. A missing or unknown value shows Hong Kong. The dev and preview servers' `/gallery` redirect already keeps the query string. The menu sets the `NetworkProvider` for everything below it, so the intro's card and line counts, the lines, and the cards all switch together.
*Alternative:* remember the gallery's map in browser storage, as the setup screen does. Rejected because the gallery is for reviewing artwork, and a link that opens on a given map is more useful there than a remembered preference.

### 10. Line strip branch directions and rings
A branch may carry a display-only `draw` hint, `{ toward: 'left' | 'right', side: 'above' | 'below' }`, defaulting to right and above, which is how every branch was drawn before. `loadNetwork` copies it to `Line.branchDraw`, and it never affects numbering or matching. `layoutLine` places a branch one column beside its fork in that direction, on the nearest free row on that side: negative rows above the trunk, positive rows below. Names on rows below the trunk go under their dots, like the trunk's. `LineStrip` adds height between any two neighbouring rows whose stations share or neighbour a column, so the names between them fit.
- **Rings.** A loop drawn toward the trunk station where it rejoins (the Circle's southern side, left from Liverpool Street back to Paddington) is drawn as a ring. The trunk between its two ends is spread out until the loop's stations fit underneath, so the track back to the trunk is one short step instead of a diagonal across the strip. Racecourse already fits, so Hong Kong is unchanged.
- **London's hints:**
  - District: Wimbledon branch left and below; Olympia left.
  - Northern: Archway branch left.
  - Merged line: Finchley Road left; Circle loop left and below.
- **No hints on Hong Kong:** its lines keep the default, which a test checks.

*Alternative:* lay the strip out from real station coordinates. Rejected because it needs coordinate data for every station on both maps and a different strip design; hand-set hints on a handful of branches give a map-like shape at a fraction of the cost.

## Risks / Trade-offs

- **Wrong station data** (zones, Piccadilly stops at Turnham Green, boundary stations) → Build the station list from TfL's current zone data and the Standard Tube Map. Add tests for every scenario station in the spec. Review the line strips on the gallery page before merging.
- **The Circle loop and District branches render badly in the line strip.** The loop is about 17 stations long, far longer than Racecourse. → This happened: where two branch rows stacked (the District's, the Northern's), names beside the dots ran into each other. Fixed by giving a branch row extra height when another row sits directly above it, putting every branch name above its dot, and widening the columns from 58 to 68 px. The Circle loop then ran off past the end of the line, and its track back to Paddington crossed the whole strip. Decision 10 fixed that by drawing it as a ring. The same hints point the District and Northern branches the way the map does.
- **Interchange cards with three or more bands on small cards** (e.g. King's Cross St Pancras: merged line, Northern, Piccadilly, Victoria). → This happened on phone-size cards only. King's Cross, Embankment and Hammersmith had the ⇄ touching the name, and "H&C" was cut off in three-label bands. Fixed below 720 px: interchange names take real space, bands with four lines sit tighter, the ⇄ is smaller on interchanges with four bands or a transfer marker, and three-label bands use a smaller font. Desktop and Hong Kong cards are unchanged.
- **Deck size.** London's deck is 168 cards against Hong Kong's 130, so rounds run slightly longer. → Accepted. The simulation tests (`simulate.test.ts`) run with London too, and rounds still finish. London's heaviest rule set takes about 25 s against the test's 30 s limit, so that check could fail on a slow machine.
- **Trademarks:** "Oyster" is a TfL brand. → Use the name only on an original card face with no logo (decision 5), the same approach `OctopusLogo` takes for Octopus.
- **Cross-version clients during deploy:** an old client sends `createRoom` without `map` (the room becomes Hong Kong) and ignores `room.map` in snapshots. → Acceptable for one deploy cycle.

## Migration Plan

- **Stored rooms:** when reading a `RoomState`, `state.map ??= 'hk-mtr'`, so a round in progress during the deploy continues on Hong Kong.
- **Deploy order:** deploy the server and the client together, as now. No data migration is needed.
- **Rollback:** reverting removes London. Stored rooms keep an extra `map` field, which the old code ignores. A London round in progress at rollback would keep playing on its own cards, but would show station names and line strips from the Hong Kong map, so roll back when rooms are idle.

## Open Questions

- The exact Chinese wording for the London wild names (「Oyster 卡」 and 「地鐵罷工」) can be adjusted during implementation without affecting anything else.
