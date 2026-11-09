# Proposal

## Why

Metro Uno can only be played by one person against computer opponents. The obvious next step is playing with friends on their own phones or computers. The engine was built for this: it is pure, its state is plain JSON, and players only see a `PlayerView`. So a server can run the same rules without a rewrite.

## What Changes

- Add an online game server on Cloudflare Workers, with one Durable Object per room, running alongside the static site. It runs the existing rules engine and is the only authority on game state. Clients send actions, and each client receives only its own `PlayerView` plus public events.
- Add **rooms**. A host creates a room and gets a short room code and a share link. Friends join with the code or the link and enter a display name. Each room has 2–4 seats.
- Add a **lobby** screen. The host sees who has joined, sets the house rules, adds or removes computer players to fill seats, and starts the round. Everyone else sees the same lobby, read-only.
- Handle **disconnects**. A player who drops can rejoin their seat from the same browser. If they are gone too long, or leave, a computer player takes over their seat so the round can continue. If the host leaves, host duties pass to another connected human.
- At the end of a round, the host can start another round in the same room.
- Refactor the game screen to work from a per-player view and an "act" callback, rather than the full game state. Single-player and online games then share one table UI. Single-player stays fully offline, works without the server, and behaves as it does today.
- The setup screen gains **Play online** (create or join a room) next to the existing single-player start. The online option is hidden when the build has no server URL configured.
- The table shows each player's name instead of only "Computer N".
- Add server tests, protocol tests, and multi-browser e2e tests. Add deployment notes and a workflow that deploys the server to Cloudflare.

Out of scope: accounts and logins, public matchmaking, spectators, chat, joining a round already in progress, and multi-round scoring.

## Capabilities

### New Capabilities
- `online-multiplayer`: Server-run online rooms. This covers creating and joining rooms by code or link, the lobby, seats and bots, starting rounds, the server as sole authority on game state, hiding each player's hand from everyone else, reconnecting, bots taking over for players who leave, host handover, and cleaning up rooms.

### Modified Capabilities
- `game-ui`: The setup screen offers online play. The table shows player names. End-of-round options differ in an online room: only the host can start the next round, and anyone can leave. Player-facing controls work the same whether the game is local or online.
- `house-rules`: In an online room, the host chooses the house rules in the lobby and every player sees them. Remembered rules pre-fill the host's lobby.
- `ai-opponents`: The visible pacing of computer players also applies in online rooms. Server bots follow the same strategy and see only their own view.

## Impact

- **New code:** `server/`, which holds the Cloudflare Worker, the room Durable Object, and a pure room state machine. It imports `src/engine` and `src/data` directly. There are also new shared protocol types used by both the client and the server.
- **Changed UI:** `src/ui/App.tsx`, `Setup.tsx`, `GameScreen.tsx`, and `useGameController.ts` (split into local and online controllers), plus new lobby and online screens, and new strings in `i18n.ts`.
- **Dependencies:** `wrangler` and Cloudflare's Vitest integration, both dev-only. No new runtime dependencies.
- **Build and deploy:** A new `VITE_SERVER_URL` build variable. A `wrangler.jsonc` file and a new `deploy-server.yml` workflow that deploys the server with `wrangler deploy`, using Cloudflare API secrets. `deploy.yml` passes the server URL to the Pages build. The server runs on Cloudflare's Workers Free plan, which needs a free Cloudflare account but no machine to manage.
- **Lint:** The engine import boundary stays the same. The server may import the engine but not `src/ui`.
- **README:** Will cover how to run the server locally and deploy it.
