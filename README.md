# Metro Uno

*Working title.* A shedding card game played on the Hong Kong MTR. Lines are the colours and stations are the numbers. Play in the browser against 1–3 computer opponents, or online with friends, in English or Traditional Chinese (繁體中文).

## How to play

Be the first to get rid of all your cards.

**The cards** (130 in the deck)

| Card | What it is |
|---|---|
| **Station** (81) | One per single-line station. It shows the station's line and its **number**. A line's number counts its stations from one end, skipping interchanges: on the East Rail Line, Admiralty is an interchange and Exhibition Centre is **1**. Branches carry on the count, so no number repeats on a line. Racecourse is a loop from Sha Tin to University and is numbered after the main line. |
| **Interchange** (17) | One per interchange station, e.g. Admiralty (ISL / TWL / EAL / SIL). It shows all its lines and has **no number**. |
| **Signal Fault** ⚠ | Skip the next player. One per line. |
| **Terminus** ⇆ | Reverse direction (with 2 players, acts as a skip). One per line. |
| **Rush Hour** +2 | Next player draws 2 and misses their turn, unless they stack. One per line. |
| **Octopus** ◎ | Wild: change to any line. 4 in the deck. |
| **Typhoon Signal No. 8** +4 | Wild: change to any line; the next player draws 4 and misses their turn, unless they stack. 4 in the deck. |

**On your turn**, play one card that matches the **current line** or the **current number or action**:
- A station card can be played on its own line, or on another line with the same number. A number match switches to that line.
- An interchange card can be played on any of its lines, and it always **changes line**. A 2-line interchange such as North Point (ISL/TKL) switches to its other line automatically. With more lines, such as Admiralty on the Island Line, you choose from the others (TWL, EAL or SIL).
- **Walkway transfers:** Hong Kong ↔ Central and Tsim Sha Tsui ↔ East TST are linked. Playing one switches to the other station's line, shown on the card as ⇢ ISL TWL and so on. Hong Kong (TCL 1) lets you choose Island or Tsuen Wan. Central offers Tsuen Wan or Tung Chung from the Island Line. East TST switches to Tsuen Wan, and TST switches to Tuen Ma. Numbered transfer cards keep their number, so the next player can match it.
- Wild cards can be played at any time.
- After an interchange or a wild, there is no current number, so only the line matches.

If you can't play, or don't want to, **draw**. By default you draw one card and your turn ends.

**Stacking:** when a Rush Hour (+2) or Typhoon No. 8 (+4) is played on you, you may play another one to add to the total and pass it on. Otherwise you draw the whole total and miss your turn. If you have nothing to stack, this happens automatically.

**UNO!** When you play your second-to-last card, press **UNO!** first. If you forget, you draw 1 penalty card.

Each player starts with 7 cards. The first player with no cards left wins the round.

### House rules

Set these on the setup screen. They're remembered on your device and fixed for the whole round.

| Rule | Default | What it does |
|---|---|---|
| Starting cards | 7 | Cards dealt to each player (3–15). |
| Draw until you can play | Off | Off: draw 1 card. On: keep drawing until you get a playable card, then you must play it. |
| Play the card you drew | Off | When drawing 1 card, you may play it straight away if it matches. Not used with "draw until you can play". |
| Stack +2 with +4 | On | Rush Hour and Typhoon No. 8 can be stacked on each other. Stacking the same type is always allowed. |
| Play same numbers together | On | Play several station cards with the same number in one turn, e.g. ISL 3 then TML 3. The first must be playable; you pick which one ends on top, and that sets the line. |

"Draw until you can play" makes rounds much longer: players often draw several cards before finding a match, so hands grow.

### Playing online

Choose **Play online** on the setup screen. It only appears when the site was built with a game server address.

1. Enter your name and choose **Create room**. You get a 4-character room code and a link to share.
2. Friends open the link, or choose **Play online** and type the code, then enter their names. A room has up to 4 seats.
3. The host sets the house rules, can fill empty seats with computer players, and presses **Start**.

Each player sees only their own hand. If your connection drops, the game reconnects by itself. If you reload or reopen the page in the same browser, you return to your seat. While you're away, a computer plays your turns. If you leave during a round, a computer takes your seat until the round ends. If the host leaves, another player becomes host. At the end of a round, the host can start another one in the same room. A room with nobody connected closes after 5 minutes.

## Development

Requires Node.js 20+.

```bash
npm install                      # install dependencies
npm run dev                      # start the dev server at http://localhost:5173
npm test                         # unit tests (rules engine, data, AI, i18n)
npm run lint                     # ESLint, including the engine/data import boundary
npx playwright install chromium  # one-time browser download for e2e tests
npm run e2e                      # browser tests (starts its own dev server)
npm run build                    # type-check and build the static site into dist/
npm run preview                  # serve the production build locally
```

`dist/` is a static site. Upload it to any static host. Single-player needs nothing else. Online play also needs the game server (below).

`npm test` runs two suites: the Node tests (`vite.config.ts`), and the game-server tests inside the Cloudflare Workers runtime (`vitest.worker.config.ts`, files named `*.worker.test.ts`). `npm run test:worker` runs only the second. The e2e tests start a local game server themselves.

### Online play locally

The game server is a Cloudflare Worker with one Durable Object per room (`server/`). It runs locally without a Cloudflare account:

```bash
cp .dev.vars.example .dev.vars           # one-time: lets localhost pages connect
npm run server:dev                       # game server at http://localhost:8787
VITE_SERVER_URL=ws://localhost:8787 npm run dev   # in a second terminal
```

To try it with a phone on the same network, start the server with `npm run server:dev -- --ip 0.0.0.0`, start Vite with `--host`, add the page's address (e.g. `http://192.168.1.20:5173`) to `ALLOWED_ORIGINS` in `.dev.vars`, and use `ws://<your computer's IP>:8787` as `VITE_SERVER_URL`.

Run `npm run cf-typegen` after changing `wrangler.jsonc`, to regenerate `worker-configuration.d.ts`.

**Server settings** (`vars` in `wrangler.jsonc`, overridden locally by `.dev.vars`):

| Variable | Default | What it does |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://metro-uno.duckdns.org` | Comma-separated sites allowed to connect. |
| `AI_DELAY_MS` | `2000` | Pause before each computer move, in ms. |
| `ENVIRONMENT` | `production` | `test` allows `SEED_PREFIX`. |
| `SEED_PREFIX` | (empty) | Test-only: fixes the shuffles. Ignored unless `ENVIRONMENT` is `test`. |

The site reads the server address from `VITE_SERVER_URL` at build time. Online play is hidden when it is unset.

### Cloudflare server

The game server runs on Cloudflare's Workers Free plan. The site itself stays on GitHub Pages.

1. Create a free Cloudflare account and choose a workers.dev subdomain (Workers & Pages in the dashboard).
2. Create an API token from the **Edit Cloudflare Workers** template (My Profile → API Tokens). Copy your **Account ID** from the Workers & Pages overview.
3. In the GitHub repository settings, add the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Push to `main`, or run the **Deploy game server** workflow by hand. Check that `https://metro-uno-server.<subdomain>.workers.dev/healthz` answers `ok`.
5. Add the repository variable `SERVER_URL` = `wss://metro-uno-server.<subdomain>.workers.dev` and re-run the Pages deploy. **Play online** appears.

Notes:

- `.github/workflows/deploy-server.yml` deploys the server when `server/`, `src/engine`, `src/data`, `src/shared`, or `wrangler.jsonc` change on `main`. A deploy closes open connections. Players reconnect automatically, and their rooms are kept.
- Usage on the Free plan (requests and Durable Object time) is shown in the Cloudflare dashboard under Workers & Pages. When a daily limit is reached, requests fail until the next day. There is no bill.
- To undo a bad server deploy, run `npx wrangler rollback`. To turn online play off, clear `SERVER_URL` and re-run the Pages deploy.

**Card gallery:** open `/gallery/` (e.g. http://localhost:5173/gallery/) to see every line diagram and all 130 cards, in either language. It's a separate page (`gallery/index.html`), so it works on any static host.

URL options for testing: `?seed=abc` fixes the shuffle, and `?aiDelay=0` removes the computer's pause (the default is 2 s).

### Project layout

```
src/
  data/     Network format, loader/validator, and city data (hk-mtr.ts)
  engine/   Rules (game.ts), deck (cards.ts), AI (ai.ts), seeded RNG, simulation
  shared/   Online protocol messages and validators, room codes, names
  ui/       React app: screens, cards, line strip, i18n
  ui/online/  Online menu, lobby, server connection
server/     Game server: Worker routing, room Durable Object, pure room logic (room.ts)
gallery/    The /gallery card gallery page (entry HTML)
e2e/        Playwright browser tests
openspec/   Specs and change history
```

`src/engine`, `src/data` and `src/shared` must not import React, browser globals, `Math.random`, or anything from `src/ui`, and `server/` must not import `src/ui` either. ESLint enforces this. The rules engine is pure (`applyAction(state, playerId, action)` returns a new state plus events), so the game server runs the same code as the browser. Players and the AI only see a `PlayerView` from `viewFor()`, never other hands, and the server only ever sends each player their own view.

## Adding a city

1. Create `src/data/<city>.ts` exporting a `NetworkDef`:

   ```ts
   import type { NetworkDef } from './network';

   export const myCity: NetworkDef = {
     id: 'my-city',
     name: { en: 'My City Metro', zh: '我的城市地鐵' },
     stations: {
       'north-end': { en: 'North End', zh: '北端' },
       // … one entry per station, used by every line that serves it
     },
     lines: [
       {
         code: 'RED',                      // unique short code shown on cards
         name: { en: 'Red Line', zh: '紅綫' },
         colour: '#D32F2F',
         trunk: ['north-end', /* …in order from the end numbering starts at */],
         branches: [{ from: 'some-station', stations: ['branch-stop'] }], // optional; add `to` for a loop that rejoins
       },
     ],
   };
   ```

   - List the stations in each line in order. Interchanges are worked out automatically: any station on two or more lines.
   - Numbers are worked out too: interchanges are skipped, the trunk is numbered first, then each branch in the order listed.
   - `loadNetwork` throws a clear error for an unknown station, an empty line, a duplicate line code, or a branch from a station not on the line.

2. Add a test like `src/data/hk-mtr.test.ts` that checks line counts, interchanges, and a few numbers.
3. Point `src/ui/network.ts` at the new data. There is no city picker yet.

## Notes

- Hong Kong data: heavy rail only. Light Rail is excluded. The Disneyland Resort Line and Airport Express are merged into the Tung Chung Line, which is labelled TCL · DRL · AEL. Line colours and Chinese station names have been reviewed and confirmed.
- "Uno" is a trademark of Mattel. Choose a different name before any public release.
