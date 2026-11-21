# Proposal

## Why

The game plays on one map: Hong Kong MTR is hard-coded on both the browser and the server. The network format was built so a city could be added as data. London's Underground, cut down to Zones 1–2, is a familiar second map that keeps the deck about the size of Hong Kong's, so a round plays at the same pace.

## What Changes

- Add a **London Underground, Zones 1–2** network. It is Tube only: no Overground, Elizabeth line, DLR, trams or National Rail. Stations on the Zone 2/3 boundary are included.
  - 8 lines: Bakerloo, Central, District, Jubilee, Northern, Piccadilly, Victoria, and one merged line labelled **CIR · H&C · MET** (Circle, Hammersmith & City, and Metropolitan).
  - The three are merged because each of them alone would have few or no numbered stations in Zones 1–2. The merge follows the precedent of Hong Kong's TCL · DRL · AEL.
  - Waterloo & City is left out. Both of its stations are interchanges, so it would have no numbered cards.
  - Walkway transfers join Hammersmith (H&C/Circle) ↔ Hammersmith (District/Piccadilly) and Bank ↔ Monument.
- Make **Chinese names optional** in network data. A station or line without one shows its English name when the interface is in Chinese. London has no Chinese names.
- Give each network **its own wild-card theme** (names and artwork). Hong Kong keeps Octopus and Typhoon Signal No. 8. London gets Oyster (wild) and Tube Strike (wild + draw 4). The rules are unchanged.
- Let players **choose the map**:
  - The setup screen offers Hong Kong or London for single-player, and the choice is remembered on the device.
  - The host of an online room picks the map in the lobby. The server plays the round on that map, and every member sees cards and line strips for it.
- The **gallery page** has a menu at the top to choose between Hong Kong and London, and shows one map at a time.
- The setup subtitle (currently "Hong Kong MTR") names the chosen map.

Nothing breaks. Hong Kong stays the default map, and an online room stored before this change carries on as a Hong Kong room.

## Capabilities

### New Capabilities

None. Choosing a map changes existing screens and rooms, and is specified with them.

### Modified Capabilities

- `transit-network-data`: adds the London Zones 1–2 line set, the merged CIR · H&C · MET line, London's walkway transfers, optional Chinese names, a per-network wild-card theme, and a registry of available networks.
- `card-deck`: wild cards are named by the network's theme. The counts (4 + 4) and rules are unchanged.
- `game-ui`: map choice on the setup screen, cards and line strips drawn from the round's network, English fallback for names in Chinese, and a map menu at the top of the gallery page.
- `online-multiplayer`: the host chooses the room's map in the lobby, guests see it, and rounds are played on it.

## Impact

- **Data:** new `src/data/london-underground.ts` and tests. `src/data/network.ts` gets optional `zh`, a wild theme, and a network registry.
- **Engine:** no rule changes. `createGame` already takes a network.
- **UI:** every component that imports the module-level `network` (`CardView`, `LineStrip`, `LineBadge`, `GameScreen`, `Setup`, `GalleryPage`, `useLocalGame`) switches to reading the round's network from context. New wild-card artwork for London.
- **Server and protocol:** `RoomState`, `RoomSnapshot` and the client messages gain a map id. `server/network.ts` resolves the network per room. Stored rooms without a map id read as Hong Kong.
- **Translations:** map names, London wild names, and a map-picker label in English and Traditional Chinese.
