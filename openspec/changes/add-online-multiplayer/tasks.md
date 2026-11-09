# Tasks

## 1. View-driven table (refactor, no behaviour change)

- [x] 1.1 Define the `TableController` and `SeatInfo` types (design §7) in `src/ui/tableController.ts`. Verify `npm run build` type-checks.
- [x] 1.2 Turn `useGameController` into `useLocalGame`. It keeps the full state, AI timers, and the `window.__metroTest` hook, and exposes `view = viewFor(state, HUMAN_ID)`, `seats`, `log`, and `send`/`reject`. `send` logs rejections itself. Verify with a new `src/ui/useLocalGame.test.tsx` that a rejected `send` adds a `rejected` log item and leaves the state unchanged.
- [x] 1.3 Rewrite `GameScreen` to read only from the controller (`view`, `seats`, `log`). Replace `state.drawPile.length`, `p.hand.length`, and `state.players[state.turn]`, and remove the synchronous `ActionResult` reads. Take names from `seats`: "You" for the viewer and the translated "Computer N" for local bots. Verify that `npm test`, `npm run lint`, and the whole existing `npm run e2e` suite pass unchanged.
- [x] 1.4 Show each opponent's name in the opponent list (game-ui "Table view"). Verify that the existing table e2e test still sees "Computer 1/2" labels, and that a 360×640 screenshot shows no horizontal scroll.

## 2. Shared protocol

- [x] 2.1 Create `src/shared/protocol.ts` with a `PROTOCOL_VERSION` constant, all client→server and server→client message types (design §4), and `SeatInfo`/`RoomSnapshot` types. Verify `npm run build` type-checks.
- [x] 2.2 Add runtime validators `parseClientMessage` / `parseServerMessage` that reject unknown types, missing or ill-typed fields, and oversized strings. Verify with `src/shared/protocol.test.ts` covering valid messages and each rejection case.
- [x] 2.3 Add room-code helpers: the alphabet, `normalizeCode`, `isValidCode`, and `randomCode(rng)` (design §9). Add display-name sanitising: trim, strip control characters, enforce 1–20 characters. Verify with unit tests that cover lower-case input, confusable characters rejected, and names that are empty or too long.
- [x] 2.4 Extend `eslint.config.js` to apply the engine restrictions to `src/shared/**`, and block `server/**` from importing `src/ui` or React or using `window`/`document`/`localStorage`/`navigator`. Verify `npm run lint` passes, and that a temporary bad import in each folder is reported (then removed).

## 3. Cloudflare project setup

- [x] 3.1 Add the `wrangler` dev dependency and the packages Cloudflare's current Vitest-integration docs list. Add `wrangler.jsonc` (design §11: name, `main: server/worker.ts`, compatibility date, `ROOMS` binding to `RoomObject`, the `v1` migration with `new_sqlite_classes`, `ALLOWED_ORIGINS` and `AI_DELAY_MS` vars), plus a `.dev.vars.example` that adds the localhost origin. Add `.dev.vars` and `.wrangler/` to `.gitignore` and the ESLint ignores. Verify `npm install` succeeds and `npx wrangler deploy --dry-run` bundles.
- [x] 3.2 Run `wrangler types` (add a `cf-typegen` script), and add `tsconfig.worker.json` covering `server/` and `src/{engine,data,shared}` to the root references. Add a stub `server/worker.ts` that answers `GET /healthz` and a stub `RoomObject`. Add the `server:dev` (`wrangler dev --port 8787`) script. Verify `npm run build` type-checks and that `curl localhost:8787/healthz` returns 200 under `npm run server:dev`.
- [x] 3.3 Add `vitest.worker.config.ts` for Cloudflare's Vitest integration, set up as its current docs describe. Change `npm test` to run the Node config and the Workers config. Verify with a first Workers-runtime test that `/healthz` returns 200 through `SELF.fetch` (or the current equivalent).

## 4. Room state machine (lobby)

- [x] 4.1 Implement the pure `server/room.ts` `Room` (design §3): `handle(connId, msg, now)`, `tick(now)`, `nextDeadline()`, with an injected RNG. Add `reserve`/create (the creator is host in seat `s1`, rules from `normalizeRules`) and join (first free seat, unique names with numeric suffix). Verify with `server/room.test.ts` for creating, joining, joining an unopened room giving `room-not-found`, a full room, and the duplicate name becoming "Sam 2".
- [x] 4.2 Add host-only lobby operations: `setRules`, `addBot`, `removeSeat` (removing a guest sends them `kicked` and closes their connection), and `start` (needs 2 or more seats, deals with a seed from the RNG). Reject non-host requests and joins during a round. Verify with unit tests for each, including "guest cannot start" leaving the state unchanged, and "rules rejected mid-round".
- [x] 4.3 Put a `room` snapshot for every connected member in the outbox after each lobby change. Snapshots never include session tokens or hashes. Verify with a unit test that searches every outbox message for token and hash strings.

## 5. Room state machine (play)

- [x] 5.1 Route `act` messages through `applyAction`. On success, put each connected seat's own `viewFor` plus the events in the outbox. On rejection, send `rejected` only to the sender. Verify with unit tests, including an out-of-turn play that produces no messages to the other seats.
- [x] 5.2 Add a hidden-information test. Play several seeded rounds through `Room` with bots and capture every outbox message to seat A. Assert that none contains a card id from another seat's hand or from the draw pile at that moment.
- [x] 5.3 Add the turn driver (design §6). Bot seats and disconnected or departed human seats get an `ai` deadline of `now + aiDelayMs`, and `tick` plays `chooseAction(viewFor(...))`. Verify with unit tests that `tick` before the deadline does nothing and after it moves, that a disconnected human's turn is played, and that a reconnected human regains control from their next turn.
- [x] 5.4 Add round end, `playAgain`, and `backToLobby` (host only). On a rematch, drop departed humans' seats and their replacement bots, and keep the other seats. Verify with unit tests for a rematch with the same seats and a new shuffle, and for clean-up after someone left.

## 6. Sessions, presence, and lifetime

- [x] 6.1 Issue 128-bit session tokens on create and join, storing only their SHA-256 hashes. Support `hello { session }` to re-attach a seat and resend the `room` and `table` snapshots. Reply `error` for an unknown session. Verify with unit tests for a reconnect mid-round that returns the same hand, and for a stale token.
- [x] 6.2 Track presence. A close or error marks a seat disconnected, and the `presence` deadline (every 10 s while a human is connected) marks sockets idle for more than 15 s as gone, given each connection's last-ping time. Broadcast the change. A `leave` mid-round gives the seat to a bot, and a `leave` in the lobby frees the seat. Verify with unit tests for each path, including a silent drop detected within 30 s.
- [x] 6.3 Hand over the host role to the longest-seated connected human when the host leaves, or after 30 s disconnected. Close the room after 5 minutes with no connected humans, setting `open: false` so the adapter clears storage. Verify with unit tests for handover at 30 s (not before), and for expiry at 5 minutes.

## 7. Worker and Durable Object adapter

- [x] 7.1 Implement `server/worker.ts` routing (design §2): `/healthz`, `/rooms/new` with `reserve()` retries, and `/rooms/<CODE>`. Check the `Origin` against `ALLOWED_ORIGINS` and the code format. Verify with Workers-runtime tests for a bad Origin (403), a malformed code, and creating a room returning a `welcome` with a valid code.
- [x] 7.2 Implement `server/roomObject.ts`. Load state in the constructor with `blockConcurrencyWhile`. Accept sockets with the hibernation API and a `{ connId, seatId }` attachment. Set the ping/pong auto-response. In `webSocketMessage`, `webSocketClose`, and `alarm`, call `Room`, save state before sending, then set the alarm to `nextDeadline()`. Clear storage when the room closes. Enforce the 8 KB size and rate limits (design §10). Read `AI_DELAY_MS`, `ENVIRONMENT`, and `SEED_PREFIX`. Verify with Workers-runtime tests: state survives a fresh object instance, a running alarm makes the computer's move, two codes stay isolated, an oversized message is dropped, a malformed message gets `bad-message`, a wrong version gets `version`, and an expired room's code reports `room-not-found`.
- [x] 7.3 Add a Workers-runtime integration test with two WebSocket clients. They create, join, add a bot, start with `AI_DELAY_MS=0`, and play a seeded round to the end by always sending a legal action from `chooseAction` on their own view. Log the CPU time of the `start` message as a check against the Free plan limit. Verify that it passes in `npm test`.

## 8. Online client

- [x] 8.1 Add `src/ui/online/connection.ts`. It opens `/rooms/new` or `/rooms/<code>` on `VITE_SERVER_URL`, sends `ping` every 5 s, validates messages with `parseServerMessage`, reconnects automatically with backoff (design §5), stores and clears the session in `localStorage` with try/catch, and exposes a status of connecting / open / reconnecting / unavailable. Verify with unit tests using a fake WebSocket for backoff, heartbeats, session save and clear, and the 15 s unavailable timeout.
- [x] 8.2 Add `useOnlineGame`, which builds a `TableController` from `table` messages, with names and connected flags from the seats. Verify with a unit test that feeds recorded messages and checks the view, seats, and that rejections appear in the log.
- [x] 8.3 Add the online menu screen (name field, Create room, a Join field for the code) and the `?room=CODE` link handling in `App`. Hide Play online when `VITE_SERVER_URL` is unset. Verify with a component test for both builds, and confirm `npm run e2e` (without a server) still passes.
- [x] 8.4 Add the lobby screen with the code, copy-link button, seats (human or computer, host badge, disconnected marker), and house rules. Hosts get editable rules, Add computer, Remove, and Start (disabled below 2 seats). Guests get a read-only view. The host's lobby rules pre-fill from `loadRules()` and are saved with `saveRules()`. Guests' saved rules are never written. Verify with component tests for host versus guest controls and for leaving guest settings unchanged.
- [x] 8.5 Wire the online table. Use `GameScreen` with `useOnlineGame`, show the connection banner, show the end-of-round controls by role (host: Play again / Back to lobby; everyone: Leave room; guest: "waiting for host" note), and show the error messages for room-not-found, full, in-progress, kicked, and unavailable. Verify with component tests for the end-of-round controls by role.
- [x] 8.6 Add English and Traditional Chinese strings for every new online, lobby, and connection text. Verify that `src/ui/i18n.test.tsx` checks both dictionaries have the same keys, and extend it if needed.

## 9. E2E, deploy, docs

- [x] 9.1 Add `wrangler dev --port 8788` as a second Playwright `webServer` (vars `AI_DELAY_MS=0`, `ENVIRONMENT=test`, `SEED_PREFIX=e2e`), with the client dev server started with `VITE_SERVER_URL=ws://localhost:8788`. Verify that the existing e2e specs still pass.
- [x] 9.2 Write `e2e/online.spec.ts` with two browser contexts. The host creates a room, the guest joins by link, the host adds a computer and starts, both see 3 players with the right names, the guest reloads and returns to the same hand, the guest plays a card and the host sees it, and the lobby at 360 px has no horizontal scroll. Verify that `npm run e2e` passes.
- [x] 9.3 Add `.github/workflows/deploy-server.yml` (design §11): on pushes to `main` touching the server paths, and on manual runs, run lint and tests, then deploy with `cloudflare/wrangler-action` using the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. Verify by reading the workflow and with `npx wrangler deploy --dry-run` locally.
- [x] 9.4 Update `deploy.yml` to pass `VITE_SERVER_URL: ${{ vars.SERVER_URL }}` to the build step. Verify by reading the workflow, and with a local `VITE_SERVER_URL=wss://example.test npm run build` that the URL is embedded, and that a build without it hides online play.
- [x] 9.5 Update `README.md` with online play in "How to play", running the server locally (`npm run server:dev` plus `npm run dev`, and copying `.dev.vars.example` to `.dev.vars`), the server vars, a "Cloudflare server" section (free account and workers.dev subdomain, API token and the two secrets, `SERVER_URL`, where to see Free plan usage, `wrangler rollback`), and that `dist/` is still static but online play needs the server. Verify that the documented local commands run as written.

## 10. Final integration check

- [ ] 10.1 Run `npm run lint`, `npm test`, `npm run build`, `npx wrangler deploy --dry-run`, and `npm run e2e` together on a clean checkout. All must pass. Then do a manual two-device smoke test on the LAN (phone plus desktop) against `npm run server:dev` (started with `--ip 0.0.0.0`), and record the result.

## Workflow follow-up

- Set up Cloudflare by following the README (design.md Migration Plan step 3): add the two repository secrets, deploy the server, and check `/healthz`. Then set the `SERVER_URL` repository variable to `wss://metro-uno-server.<subdomain>.workers.dev` and redeploy Pages.
- After a week of play, check Free plan usage in the Cloudflare dashboard.
- Archive the change with `/opsx:archive` once it has been reviewed and deployed.
