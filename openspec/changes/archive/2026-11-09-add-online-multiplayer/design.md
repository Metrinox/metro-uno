# Design

## Context

See proposal.md for motivation. The requirements are in `specs/online-multiplayer`, with deltas to `game-ui`, `house-rules`, and `ai-opponents`.

What exists today:
- `src/engine/game.ts` is pure and deterministic. `applyAction(state, playerId, action)` returns either `{ ok, state, events }` or `{ ok: false, reason }`. `GameState` is plain JSON. `viewFor(state, id)` builds a `PlayerView` that hides other hands and the draw pile. `GameEvent`s carry no hidden cards: `drew` has a count only, and `played` shows a card that is now public.
- `src/engine/ai.ts` `chooseAction(view)` already works from a `PlayerView`.
- The engine uses no Node or browser APIs, so it runs unchanged in the Cloudflare Workers runtime.
- ESLint stops `src/engine` and `src/data` from importing React, `src/ui`, browser globals, or `Math.random`.
- `src/ui/useGameController.ts` holds the full `GameState` in React, runs AI turns with `setTimeout`, and returns a synchronous `act(playerId, action) → ActionResult`.
- `src/ui/GameScreen.tsx` reads the full `GameState` (`state.players[].hand`, `state.drawPile.length`, `state.turn`, and so on). It hard-codes `HUMAN_ID = 'p0'` and builds names from ids (`displayName` → "You" / "Computer N"). It also calls `act` and reads the result synchronously.
- The site is built with Vite (`base: './'`) and deployed to GitHub Pages by `.github/workflows/deploy.yml`. There is no backend.

## Goals / Non-Goals

**Goals:**
- One rules implementation, `src/engine`, used unchanged by both the browser and the server.
- The server is the only authority. Clients send intents and render what they receive.
- One table UI for local and online play, fed by a per-player view.
- Single-player keeps working with no network and no server configured.
- Room logic is a pure state machine that can be tested in plain Node without the Workers runtime, sockets, or real time.
- The whole backend runs on Cloudflare's Workers Free plan.

**Non-Goals:**
- Moving the static site off GitHub Pages. Only the game server runs on Cloudflare.
- Turn timers for players who are connected but idle (see Risks).
- Anti-cheat beyond keeping hidden information on the server, such as stopping collusion between friends.
- Moving to a monorepo or workspaces. One `package.json` stays.

## Decisions

### 1. Folder layout and import boundaries
```
src/engine/   (unchanged) rules, AI, RNG
src/data/     (unchanged) networks
src/shared/   NEW: protocol message types, runtime validators, room-code helpers
src/ui/       React client (local + online)
server/       NEW: Cloudflare Worker entry, room Durable Object, pure room state machine
```
- `src/shared` gets the same ESLint restrictions as `src/engine`: no React, no `src/ui`, no browser globals.
- `server/**` may import `src/engine`, `src/data`, and `src/shared`. ESLint stops it importing `src/ui`, React, or the browser-only globals (`window`, `document`, `localStorage`, `navigator`).
- `src/ui` may import `src/shared`.
- *Alternative:* an npm-workspaces monorepo (`packages/engine`, `apps/web`, `apps/server`). That is cleaner long term, but a large tooling change on top of a feature change. The folder boundary plus lint rules get most of the benefit now.

### 2. Runtime: a Cloudflare Worker with one Durable Object per room
- `server/worker.ts` is the Worker. It is stateless and only routes requests:
  - `GET /healthz` returns 200.
  - `GET /rooms/new` (WebSocket upgrade) creates a room. The Worker draws a random code and calls `ROOMS.getByName(code).reserve()`. If the code is already in use, it draws another (up to 5 tries). It then forwards the upgrade to that object.
  - `GET /rooms/<CODE>` (WebSocket upgrade) joins or rejoins a room. The Worker normalises the code, checks its format, and forwards the upgrade to `ROOMS.getByName(code)`.
  - Every upgrade is refused with 403 unless its `Origin` is listed in `ALLOWED_ORIGINS`.
- `server/roomObject.ts` holds `RoomObject`, a Durable Object class with SQLite storage (`new_sqlite_classes`). Each object is one room, named by its code. It is a thin adapter: it loads and saves the room state, accepts sockets, turns socket events and alarms into calls on the pure `Room` (§3), and sends the messages `Room` returns.
- A room that is not open (never reserved, or already closed) accepts the socket, sends `error { code: 'room-not-found' }`, and closes it. Browsers can't read the HTTP status of a failed WebSocket, so the error has to arrive as a message.
- *Why Durable Objects:* a room needs one place where moves are applied in order, and that is exactly what a Durable Object provides. Rooms are spread across objects, so there is no single process to keep alive. State is stored durably, so rooms survive deploys and restarts. It all fits the Free plan.
- *Alternatives:* a Node server on Koyeb, Render, or a VM was the earlier plan. It is simpler code, but needs a host that may sleep or reclaim the machine, and rooms are lost when the process restarts. Cloudflare's PartyKit or Agents SDK wraps Durable Objects with extra conveniences, but adds a framework layer this small protocol doesn't need.

### 3. Rooms are a pure state machine with deadlines
`server/room.ts` holds `Room`, a pure class with no Workers APIs:
- `Room.handle(connId, message, now)` and `Room.tick(now)` each return `{ state, outbox }`. `outbox` lists messages per connection plus any connections to close.
- Time-based work is stored as **deadlines** in the room state, not timers: the next computer move, the host handover, room expiry, and the presence check. `Room.nextDeadline()` returns the earliest one.
- `RoomObject` saves the state first, then sends the outbox, then calls `storage.setAlarm(room.nextDeadline())`. Its `alarm()` handler calls `Room.tick(Date.now())`. This fits the one-alarm-per-object rule, and tests can drive time just by passing `now`, without fake timers.
- Randomness (shuffle seeds, session tokens) comes from an injected source. Production uses `crypto.getRandomValues`.

Room state, stored as a single JSON value in the object's storage:
- `code`
- `open`
- `phase: 'lobby' | 'playing' | 'ended'`
- `rules`
- `hostSeat`
- `seats[]`, each with `{ seatId, name, kind: 'human' | 'bot', sessionHash?, connected, departed, joinedAt, lastSeenAt }`
- `game: GameState | null`
- `deadlines`

Seat ids (`s1`–`s4`) are used as engine player ids. The state is about 20 KB at most, well within the storage limits.

### 4. Protocol: a small JSON protocol over WebSockets
- Messages are JSON objects with a `type` field. Each side checks incoming messages with hand-written type-guard validators in `src/shared/protocol.ts`. The protocol is small, so it doesn't need a schema library.
- The client's first message carries a `protocol` version. The server closes mismatched clients with a "please reload" error code.
- **Client → server:** `hello { protocol, session? }`, `createRoom { name, rules }` (on `/rooms/new`), `joinRoom { name }` (on `/rooms/<CODE>`), `setRules { rules }`, `addBot { seat }`, `removeSeat { seat }`, `start`, `playAgain`, `backToLobby`, `act { action }`, `leave`, `ping`.
- **Server → client:** `welcome { code, session }` (on create or join), `room { room }` (seats, host, rules, phase, code, and the receiver's own seat; sent after every lobby or seat change, including connects and disconnects), `table { view, events }` (sent after every accepted move), `rejected { reason }` (game moves and lobby requests), `error { code }` (room-not-found, room-full, in-progress, kicked, bad-message, version), `pong`.
- `table` always carries a complete `PlayerView` from `viewFor`, not a diff. Views are small (a hand of up to about 30 cards), and full snapshots make reconnecting trivial and remove any chance of drift.
- *Alternatives:* Socket.IO doesn't run on Workers. WebRTC peer-to-peer was rejected because it would expose hands to the host. A realtime database was rejected because hiding hands there needs server-side code anyway.

### 5. Sessions, presence and hibernation
- **Hibernation:** `RoomObject` accepts sockets with the hibernation API (`ctx.acceptWebSocket`). An idle room is evicted from memory and costs nothing while its sockets stay open. Each socket's attachment (`serializeAttachment`) stores `{ connId, seatId }`. On waking, the object reloads the room state from storage and rebuilds its connection list from `ctx.getWebSockets()`. In-memory state is always rebuildable from storage.
- **Sessions:** when a player creates or joins a room, `Room` makes a 128-bit session token and stores only its SHA-256 hash in the seat. The client stores `{ serverUrl, code, session }` in `localStorage`, wrapped in try/catch like the other settings.
- **Reconnecting:** on page load, if a stored session exists, the client connects to `/rooms/<code>` and sends `hello { session }`. If the seat still exists, the server re-attaches it and sends `room` and `table` snapshots. If not, the client clears the stored session and shows the setup screen.
- The token is the only credential. It is never shown to other players or included in any snapshot.
- **Heartbeat:** the client sends `{"type":"ping"}` every 5 s. `ctx.setWebSocketAutoResponse` answers it with `{"type":"pong"}` without waking the object.
- **Detecting drops:** socket `close` and `error` events mark a seat disconnected immediately, which covers normal drops. For connections that die silently, a presence deadline runs every 10 s while any human is connected. It compares `ctx.getWebSocketAutoResponseTimestamp(ws)` with the current time and treats a socket as gone after 15 s without a ping. This meets the spec's "within 30 seconds".
- The client reconnects automatically with backoff (0.5 s, 1 s, 2 s, then every 5 s) and shows a "Reconnecting…" banner meanwhile. Deploying a new server version closes all sockets. Clients reconnect, and their rooms are still in storage.

### 6. Server-side turn driver
After every state change, `Room` checks whose turn it is. If that seat is a bot, or a human who is disconnected or departed, it sets the `ai` deadline to `now + aiDelayMs` (2000 by default, `AI_DELAY_MS` var to override). When the deadline arrives, `tick` plays `chooseAction(viewFor(game, seatId))`. Any state change replaces the deadline. This uses the same strategy and the same view-only input as single-player (ai-opponents spec).

`PlayerState.isHuman` in the engine stays as "seat is a human seat". It is used for display only. On the server, who controls a seat comes from the seat's status, not from `isHuman`.

### 7. Client architecture: a table-controller interface
`GameScreen` stops reading `GameState`. It takes a controller with this shape:
```ts
interface TableController {
  view: PlayerView;            // the viewer's own view
  seats: SeatInfo[];           // id, name, kind, connected, isMe, isHost
  log: LogItem[];
  send(action: Action): void;  // fire-and-forget; rejections arrive in log
  reject(reason: RejectReason): void;
  endOfRound: EndOfRoundControls;  // local: play again / setup; online: per host/guest
}
```
- `useLocalGame(config)` wraps today's `useGameController`. It keeps the full state, runs the AI timers, and exposes `viewFor(state, HUMAN_ID)`. `send` calls `applyAction` and puts any rejection in the log. The dev-only `window.__metroTest` hook stays here, so the existing e2e tests keep working.
- `useOnlineGame(connection)` builds the controller from server `table` messages. `send` posts `act`, and `rejected` messages go into the log.
- Today `GameScreen` reads the `ActionResult` synchronously (`if (!r.ok) reject(r.reason)`). That moves into the controllers, so `GameScreen` no longer depends on synchronous results. Prompts (line chooser, same-number chooser, UNO arm) close as soon as the player sends a move.
- Names come from `seats`. The viewer is still shown as "You". Local computer players keep their translated "Computer N" label. Online computer players show a translated "Computer" label plus a seat number. Human names are rendered as React text, never as HTML.
- Fields that need replacing in `GameScreen`: `state.drawPile.length` → `view.drawPileCount`, `opponent.hand.length` → `cardCount`, `state.players[state.turn]` → `view.players[view.turn]`. `canPlay(card, view)` already works, because `PlayerView` extends `PlayContext`.

### 8. Screens and routing
- `App` gains modes: `setup` → `local` (existing), or `setup` → `online-menu` (create / join form) → `lobby` → `online-table`.
- There is no router library. A share link is the site URL plus `?room=CODE`. When `App` loads and sees `room`, it opens the join form with the code filled in. The existing `?seed` / `?aiDelay` params keep working for local play.
- The server address comes from `import.meta.env.VITE_SERVER_URL`, for example `wss://metro-uno-server.<subdomain>.workers.dev`. If it is unset, the online option is hidden (game-ui spec). Pages is served over HTTPS, so in production this must be a `wss://` URL.

### 9. Room codes
Codes are 4 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, which is 31 symbols and about 920k codes. Input is upper-cased before lookup. Each code names one Durable Object, so a collision is detected by `reserve()` returning false, and the Worker draws again. A closed room clears its storage, so its code can be used again. No global room cap is needed. The Free plan's daily request limits are the real ceiling (see Risks).

### 10. Robustness limits
- Maximum incoming message size: 8 KB, checked in `webSocketMessage`. Cloudflare's own limit is much higher.
- At most 30 messages per second per connection. Above that, the server drops messages, and above 3× that it closes the connection. The counters live in memory and reset when the object hibernates, which is acceptable for an approximate limit.
- Names are trimmed, control characters are stripped, and length is capped at 20.
- `setRules` input goes through `normalizeRules` from the engine.
- A message that fails to parse or validate gets an `error { code: 'bad-message' }` reply and is otherwise ignored. A handler exception is caught and logged, and the room's stored state is left as it was before that message.

### 11. Building, testing locally, and deploying
- **Config:** `wrangler.jsonc` at the repo root sets `name: metro-uno-server`, `main: server/worker.ts`, a `compatibility_date`, the `ROOMS` Durable Object binding to `RoomObject`, the `v1` migration with `new_sqlite_classes: ["RoomObject"]`, and vars `ALLOWED_ORIGINS` (`https://metro-uno.duckdns.org`) and `AI_DELAY_MS`.
- **Dev:** `npm run server:dev` runs `wrangler dev --port 8787` (Durable Objects run locally, with no Cloudflare account needed). The README documents running it next to `npm run dev`. The local `ALLOWED_ORIGINS` adds `http://localhost:5173` through `.dev.vars`.
- **Type-checking:** `wrangler types` generates `worker-configuration.d.ts`, and a new `tsconfig.worker.json` (Workers types, no DOM) covers `server/` and `src/{engine,data,shared}`. It is added to the root `tsconfig.json` references, so `npm run build` type-checks the server. Wrangler does the bundling, including the extensionless imports.
- **Deploy:** a new workflow, `.github/workflows/deploy-server.yml`, runs on pushes to `main` that touch `server/`, `src/{engine,data,shared}`, `wrangler.jsonc`, or `package-lock.json`. It runs lint and tests, then `wrangler deploy` using `cloudflare/wrangler-action` with the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
- `deploy.yml` passes `VITE_SERVER_URL: ${{ vars.SERVER_URL }}` to `npm run build`, so online play turns on once the repository variable is set.

### 12. Testing
- **Unit (Vitest, node env, existing config):** protocol validators and the pure `Room`, driven by passing `now`. Cover create/join/full/in-progress/duplicate names/host-only checks/bots/start, hidden information (every outgoing message to seat A contains no card id from seat B's hand or the draw pile), reconnect, disconnected-turn AI, leave, host handover at 30 s, the presence check, rematch clean-up, and 5-minute expiry. This is where most of the behaviour is tested.
- **Workers runtime (Cloudflare's Vitest integration, separate config `vitest.worker.config.ts`):** follow the current setup in Cloudflare's docs. Cover Worker routing (`/healthz`, bad Origin, bad code), `RoomObject` saving state and reloading it in a fresh instance, alarms firing a computer move (using the documented helper to run alarms), room isolation between codes, and a short WebSocket round with two clients. `npm test` runs both configs.
- **E2E (Playwright):** add `wrangler dev --port 8788` as a second `webServer` with vars `AI_DELAY_MS=0`, `ENVIRONMENT=test`, and `SEED_PREFIX=e2e`. Serve the client with `VITE_SERVER_URL=ws://localhost:8788`. Use two browser contexts: host creates, guest joins by link, host adds a bot and starts, both see the table, the guest reloads and returns to the same hand. Add one check at 360 px for the lobby.
- **Determinism for tests:** `SEED_PREFIX` is honoured only when `ENVIRONMENT=test`, so e2e deals are reproducible and production shuffles never are.

## Risks / Trade-offs

- [A connected player who stops playing stalls the round, since there is no turn timer] → This is acceptable for v1 because rooms are friends playing together. Others can leave, and the host can start a new round afterwards. Deadlines (§3) make a turn timer easy to add later.
- [Free plan limits (daily requests, CPU per request, storage) could be reached] → At the time of writing the Free plan allows about 100,000 requests a day, and WebSocket messages and alarms count toward Durable Object usage. A few rooms of friends use a small fraction of that. Auto-responded pings don't wake the object. When a limit is hit, requests fail until the daily reset; there is no bill. Usage is visible in the Cloudflare dashboard. If it becomes a problem, the Workers Paid plan raises the limits with no code change.
- [CPU time per request on the Free plan is short (about 10 ms)] → `applyAction`, `viewFor`, and a 4-seat fan-out take well under that. Starting a round (building and shuffling 130 cards) is the heaviest step. A Node test measures it on the same V8 engine, since the Workers runtime freezes its clock during a request; it takes well under 1 ms.
- [Cloudflare lock-in] → Rules, protocol, and room logic (`src/engine`, `src/shared`, `server/room.ts`) are plain TypeScript with no Cloudflare APIs. Only `worker.ts` and `roomObject.ts` would need rewriting to move to a Node host.
- [Deploying the server closes every open socket] → Clients reconnect automatically, and rooms are restored from storage. Players see a short "Reconnecting…" banner.
- [Session tokens in `localStorage` could be read by injected script] → Tokens only grant one seat in a short-lived room, and the server stores only their hashes. Names are rendered as text, and the site loads no third-party scripts.
- [Refactoring `GameScreen` to use views could break single-player] → The existing e2e suite (`game`, `full-game`, `house-rules`, `theme`) must pass unchanged before any online UI is added. The refactor is its own task group.
- [The per-seat token is the only identity, so someone who copies another player's token could take their seat] → Accepted. There are no accounts by design.
- [Running the engine on the server means engine changes are protocol changes] → The `protocol` version is bumped whenever `GameState`, `PlayerView`, or `Action` shapes change, and old clients are told to reload. Stored rooms from an older version are closed with a "room not found" message when they load.

## Migration Plan

1. Land the UI refactor (local controller and view-driven `GameScreen`) with no behaviour change, and deploy it.
2. Land the server, protocol, and online UI. Without `vars.SERVER_URL` set, Pages builds still hide online play, so this is safe to deploy.
3. Set up Cloudflare: create a free account and a workers.dev subdomain. Create an API token from the "Edit Cloudflare Workers" template. Add the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Push to `main`, or run `deploy-server.yml` by hand, then check that `https://metro-uno-server.<subdomain>.workers.dev/healthz` answers.
4. Set the repository variable `SERVER_URL` to `wss://metro-uno-server.<subdomain>.workers.dev` and re-run the Pages deploy. Online play appears.
5. Rollback: clear `SERVER_URL` and redeploy Pages. Online play disappears, and single-player is unaffected. `wrangler rollback` restores the previous server version.

## Open Questions

- Whether to give the server a custom domain later instead of the workers.dev address. That needs a domain added to Cloudflare, and only changes `SERVER_URL`.
