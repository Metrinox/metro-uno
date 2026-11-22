# Design

## Context

See proposal.md for why. The current state that shapes the approach:

- **Main branch.**
  - London merges the Circle, H&C and Metropolitan into one line, `SSR`, whose `labels` give each part its own colour and coverage.
  - `loadNetwork` (`src/data/network.ts`) marks a station as an interchange when it is on two or more lines.
  - `GameState` has one `currentLine: string`. `lineChoices` returns a list of single lines, and a play carries `chosenLine?: string` (also in `src/shared/protocol.ts`).
- **Working tree.** It holds an uncommitted implementation of this change's earlier version:
  - `sharedTrack` pairs, `restartAt` and `Station.number`;
  - numbered interchange cards and their rules;
  - CardView/LineStrip support for them, the "current line first" line prompt, and tests.

  This design replaces that work. The tasks say what to remove and what to keep.
- **Online rooms.** They store their whole state in Durable Object storage, including a round's cards and current line (`server/roomObject.ts`). Local rounds are not saved.

## Goals / Non-Goals

**Goals:**
- Shared-track lines and numbering groups are network data. Hong Kong declares none and plays exactly as on main.
- A multi-line station is still a `station` card, so same-number groups, hand order and transfers change little.
- One rule set for local and online rounds.

**Non-Goals:**
- Numbering interchanges. Every interchange, subsurface or not, keeps no number.
- Showing group names to players, anywhere.
- Letting wilds or action cards set several lines. They still set one line.
- Changing Hong Kong, ordinary interchange behaviour, or any house rule.

## Decisions

### 1. Data format: `sharedTrack` with groups
`NetworkDef` gains:

```ts
sharedTrack?: {
  lines: string[];
  groups: { id: string; trunk: string[]; branches?: BranchDef[] }[];
}
```

A group is shaped like a line (trunk plus branches), so the existing route checks and numbering pass serve both.

In `loadNetwork`:
- **Interchanges:** a station is one when its lines, counting every shared-track line as one, number two or more.
- **Numbering:**
  - Ordinary lines number their non-interchange stops as today.
  - Each group numbers its non-interchange stations along its trunk, then its branches.
  - A group station's number is written to `numbers[line]` for every line serving it, and to `Station.number`.
  - `Station.group` holds the group id. It decides number order and gallery order, and players never see it.

Validation fails in any of these cases:
- unknown lines, or fewer than two shared-track lines;
- a shared-track station in no group or in several;
- a group station that no shared-track line serves.

*Alternative for groups:* derive them from the yes/no/any table. Rejected because the table leaves Paddington and Edgware Road out, and the numbering order still needs data. A London test checks every station against the table instead.

*Removed from the working tree:* the pair form of `sharedTrack`, `restartAt`, and the numbered-interchange counting.

### 2. London data
- `SSR` is replaced by three single-label lines in TfL's colours:
  - `CIR` (#FFD300): the trunk runs Hammersmith (H&C) → Aldgate, so Aldgate is level with Liverpool Street, and the southern half is the loop branch from Aldgate back to Paddington. A `close` drawing hint on the loop keeps the stations from Paddington to Great Portland Street one column apart while the rest of the ring is spread out;
  - `H&C` (#F3A9BB): Hammersmith (H&C) → West Ham;
  - `MET` (#9B0056): Finchley Road → Aldgate, numbered from its north end.
- Line order follows TfL's alphabetical list: BAK, CEN, CIR, DIS, H&C, JUB, MET, NOR, PIC, VIC.
- `sharedTrack.lines` is `CIR, H&C, MET, DIS`. That order is also the order of lines on a card and within an option.
- **Groups:** the five groups are listed in the order the specs give. Group 5's trunk ends at Earl's Court, with the Wimbledon branch and then Olympia as branches.
- **Transfers:** the two walkway transfers that named `SSR` now name the real lines. Hammersmith (D/P) transfers to `CIR`/`H&C`, and Bank to `CIR`/`DIS`.

### 3. Cards: optional `lines` on station cards
- A `station` card gains `lines?: string[]`, set only when the station has more than one line. `line` stays the first of them.
- A helper `cardLines(card)` returns every line of any card. Engine, AI and UI code use it in place of reading `line` or `lines` directly.
- Interchange cards go back to main's shape: the working tree's `number?` is removed.

*Alternative:* a new card kind. Rejected because it would need its own branch in same-number groups, transfers, hand sorting and the gallery, for what is "a station card on several lines".

### 4. Several current lines
- `GameState.currentLine: string` becomes `currentLines: string[]`: one line, or a set of shared-track lines in `sharedTrack.lines` order. The `lineChanged` event carries `lines`.
- A line option is a `string[]`:
  - `lineChoices` returns `string[][]`;
  - a play carries `chosenLines?: string[]`, matched as a set;
  - `chosenLine` is removed from `game.ts`, `ai.ts`, `protocol.ts` and `GameScreen`.

  Keeping `currentLine` and adding an `alsoCurrent` list was rejected: every reader would have to remember to check both.
- **`isPlayable`:** a card is "on the current lines" when `cardLines(card)` meets `currentLines`. Number and action matching are unchanged.
- **Options (`lineChoices`):**
  - Wild: every line on its own.
  - Interchange:
    - each line that isn't shared-track, on its own, plus one option of its shared-track lines;
    - transfer lines are grouped the same way;
    - options that share a line with `currentLines` are dropped, and duplicates are dropped.
  - Transfer station (single- or multi-line): its transfer lines, grouped the same way.
  - Multi-line station without a transfer: null, so there is no choice.
- **`applyAction`:**
  - With no choices, a multi-line station sets `currentLines` to its lines.
  - Otherwise the chosen or only option becomes `currentLines`.
  - The face rules are unchanged, and same-number groups need no new code.
- **The AI:** `chooseLine` scores each option by the hand cards whose `cardLines` meet the option. The tie order is the option's position in `lineChoices`.

### 5. UI
- **`CardView`:**
  - A `Band` takes a list of line codes and draws them side by side in one band, as merged bands are drawn today.
  - A multi-line station card has one band for all its lines.
  - An interchange card has one band for its shared-track lines, then one band per other line. This keeps King's Cross at four bands, as today.
  - The numbered-interchange markup and CSS from the working tree are removed.
- **`LineStrip`:**
  - It takes `lines: string[]` and always draws one line, so the strip is never taller than a single line's.
  - With several current lines it draws the first (in `sharedTrack.lines` order) and shows a small tab per current line above the strip (e.g. CIR | DIS). Choosing a tab draws that line. The choice is local display state and resets to the first line whenever the current lines change.
  - `lineLayout` changes only to follow the Circle's `close` hint.
  - When the table would not fit the screen (the District below its tabs at 360×640), the strip gives up the missing height and scrolls inside its own box, centred on the top card's station.

  *Alternative:* a merged map drawing every current line in one strip. Rejected: those maps were up to 55 stations across several rows and pushed the hand off a 360×640 screen.
- **`GameScreen`:**
  - The current-line label shows each current line's badge.
  - The top card's station is highlighted when it is on the line the strip is drawing.
  - The "top card on the current lines" check uses `cardLines`.
  - `LineChooser` shows an option of several lines as one button with each line's badge and name.
  - The working tree's current-line-first prompt is removed, since multi-line stations no longer prompt.
- **`GalleryPage`:**
  - Station cards on shared-track lines leave the per-line groups for one "Subsurface lines" group (淺層綫), in group order, with a small gap between groups and no headings.
  - Each shared-track line's group keeps its action cards.
- **`format.ts`:**
  - `cardName` and `cardLabel` list every line, e.g. "Sloane Square (CIR·DIS 3)".
  - `handOrder` sorts a multi-line card under its first line.
  - Line-change messages name every line ("Now on Circle / District").
  - The new gallery string is added in both languages.

### 6. Stored rounds
When a room loads a stored round:
- **Old state shape:** a round with `currentLine` is converted to `currentLines: [currentLine]`. Hong Kong rounds carry on.
- **Removed line:** if the round has a card or current line the network no longer has (`SSR`), the room ends that round and returns to its lobby, keeping its players.

*Alternative:* keep `SSR` as a hidden alias. Rejected because an old `SSR` card can't say which of three lines it means.

## Risks / Trade-offs

- **Only one of several current lines is drawn at a time.** → The tabs name every current line, and one tap shows another. The current-line label always shows them all.
- **Repeated numbers on subsurface lines.** The District's strip shows group 3's 1–5, group 4's 1–10 and group 5's 1–10. → The card band shows the line set. Matching is by line or number, never by position, so a repeat never makes a play ambiguous.
- **CIR, H&C and MET have no single-line cards**, and multi-line cards make two or three lines current at once. Line-matching on the subsurface becomes easier than elsewhere, and the deck gains 6 action cards (30 of 174, against 24 of 168). → Re-run the London simulation and record turns, number-matching and action share against main.
- **The state and message shape change.** → The server and client deploy together, and stored rounds are converted (decision 6). Hong Kong rounds keep their behaviour; only the field names change.
- **The number of every London subsurface card changes.** → Accepted; London shipped recently.

## Migration Plan

- **Deploy order:** the server and client deploy together, as now. `PROTOCOL_VERSION` goes from 1 to 2, so the server refuses a client still open from before the deploy with its existing "version" refusal, and a reload fixes it.
- **Rounds in progress:** see decision 6. Local rounds aren't saved.
- **Rollback:**
  - Reverting restores `currentLine`. Rounds saved under the new shape would then not load.
  - Mitigation: put the decision 6 conversion in its own commit, written so it can also convert `currentLines` back to its first line. On rollback, keep that commit.
