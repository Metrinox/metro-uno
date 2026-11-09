# online-multiplayer Specification

## Purpose

Lets friends play Metro Uno together on their own devices. A server runs the rules and hides each player's hand. Players gather in rooms that are joined with a short code or a link.

## Requirements

### Requirement: Create a room
A player SHALL be able to create an online room by entering a display name. The server SHALL give the room a 4-character code and a share link. It SHALL put the creator in the first seat as host. Hosts and players SHALL be able to click a button to copy and paste.

#### Scenario: Room created
- **WHEN** a player enters the name "Mei" and chooses Create room
- **THEN** a lobby opens showing a 4-character room code, a copyable share link, and "Mei" in seat 1 marked as host

### Requirement: Room codes
Room codes SHALL use only upper-case letters and digits that are hard to confuse with each other, so no 0/O or 1/I/L. Codes SHALL be matched case-insensitively. The server SHALL NOT give an open room's code to a second room.

#### Scenario: Lower-case entry
- **GIVEN** an open room with code "K7MX"
- **WHEN** a player enters "k7mx" to join
- **THEN** they join room K7MX

### Requirement: Join a room
A player SHALL be able to join a room by entering its code, or by opening its share link, and then entering a display name. They SHALL take the first free seat in the lobby.

#### Scenario: Join by link
- **WHEN** a player opens a room's share link and enters the name "Ka Ho"
- **THEN** they appear in the lobby in the next free seat, and every lobby member sees them appear

#### Scenario: Unknown code
- **WHEN** a player tries to join with a code that does not match any open room
- **THEN** they see a message that the room was not found and stay on the join screen

### Requirement: Joining limits
Host SHALL be able to decide how many players can join, counting humans and computer players, with a maximum of 8. Joining SHALL be refused when every seat is taken, or when a round is in progress. The player SHALL be told why.

#### Scenario: Room full
- **GIVEN** a room with 4 occupied seats
- **WHEN** another player tries to join
- **THEN** they are told the room is full and are not added

#### Scenario: Round in progress
- **GIVEN** a room whose round has started
- **WHEN** a new player tries to join
- **THEN** they are told a round is in progress and are not added

### Requirement: Display names
A display name SHALL be 1–20 characters after trimming whitespace. Names SHALL be unique within a room. If a name is already taken, the server SHALL add a number to the newcomer's name to make it unique. Names SHALL be shown as plain text, never as markup. Display names SHALL accept Traditional Chinese, so install the relevant fonts.

#### Scenario: Duplicate name
- **GIVEN** a room with a player named "Sam"
- **WHEN** another player joins as "Sam"
- **THEN** the newcomer is shown as "Sam 2"

### Requirement: Lobby
The lobby SHALL show the room code, the share link, every seat with its occupant's name and whether it is a human or a computer player, who the host is, and the house rules. All members SHALL see changes to it immediately.

#### Scenario: Rules change seen by guests
- **WHEN** the host turns "Draw until you can play" on in the lobby
- **THEN** every guest's lobby shows that rule as on

### Requirement: Host controls the lobby
Only the host SHALL be able to change house rules, add or remove computer players, remove a guest, and start the round. The server SHALL reject these requests from any other player.

#### Scenario: Guest cannot start
- **WHEN** a guest sends a request to start the round
- **THEN** the server rejects it and the room is unchanged

#### Scenario: Host removes a guest
- **WHEN** the host removes a guest from the lobby
- **THEN** that guest is returned to the online menu with a message that they were removed, and their seat becomes free

### Requirement: Computer players in a room
The host SHALL be able to add a computer player to any free seat, and remove one, before a round starts.

#### Scenario: Fill with bots
- **GIVEN** a room with 2 humans
- **WHEN** the host adds 2 computer players
- **THEN** the lobby shows 4 occupied seats, two of them marked as computer players

### Requirement: Starting a round
The host SHALL be able to start a round when at least 2 seats are occupied. The round SHALL use the lobby's house rules and a shuffle chosen by the server. Every member SHALL move to the table at the same time.

#### Scenario: Not enough players
- **WHEN** the host is alone in the room with no computer players
- **THEN** the Start control is disabled

#### Scenario: Round starts
- **WHEN** the host starts a round with 3 occupied seats
- **THEN** every human in the room sees the table with a 3-player round, dealt using the lobby's hand size

### Requirement: Server is the authority on game state
The server SHALL hold each room's game state and SHALL apply every move using the same rules as single-player. A move SHALL take effect only if the server accepts it. A rejected move SHALL change nothing and SHALL be reported only to the player who sent it.

#### Scenario: Out-of-turn play online
- **WHEN** a player sends a card play when it is not their turn
- **THEN** the server rejects it with a reason, no other player sees any change, and the sender sees the rejection message

#### Scenario: Malformed message
- **WHEN** a client sends a message that is not valid for the protocol, such as an unknown type, missing fields, or one that is too large
- **THEN** the server ignores or rejects it without changing any room, and keeps running

### Requirement: Hidden hands online
The server SHALL send each player only what that player is allowed to see: their own hand, other players' card counts, and public table information. Nothing the server sends to a player SHALL contain another player's cards or the order of the draw pile.

#### Scenario: Inspecting traffic
- **WHEN** a player inspects every message their browser receives during a round
- **THEN** no message contains another player's hand or the draw pile's contents

### Requirement: Shared table updates
After each accepted move, every connected player SHALL receive the updated table and the events that move caused, in the order the moves were applied.

#### Scenario: Play seen by others
- **WHEN** one player plays Rush Hour on the next player
- **THEN** every player sees the new top card and a message naming who played it, and the target's card count rises by 2

### Requirement: Reconnecting
A player whose connection drops SHALL keep their seat until the room closes. When they open the game again in the same browser, they SHALL return to their seat with their hand and the current table. The other players SHALL see that player marked as disconnected while they are away.

#### Scenario: Page reload mid-round
- **WHEN** a player reloads the page during a round
- **THEN** they return to the same seat with the same hand and see the current table

#### Scenario: Shown as away
- **WHEN** a player's connection drops
- **THEN** the other players see that player marked as disconnected within 30 seconds

### Requirement: Disconnected players' turns
While a human's seat is disconnected during a round, the server SHALL let a computer player take that seat's turns, using the normal computer pause. When the human reconnects, they SHALL take back control from their next turn onward.

#### Scenario: Turn of an absent player
- **GIVEN** a player is disconnected
- **WHEN** it becomes their turn
- **THEN** a computer move is made for their seat after the usual pause, and the round continues

### Requirement: Leaving a room
A player SHALL be able to leave a room at any time. If they leave during a round, a computer player SHALL take over their seat for the rest of that round. If they leave in the lobby, their seat SHALL become free.

#### Scenario: Leave mid-round
- **WHEN** a player chooses Leave during a round
- **THEN** they return to the setup screen, and the others see that seat now played by a computer player

### Requirement: Host handover
If the host leaves, or stays disconnected for 30 seconds, the host role SHALL pass to the longest-seated human who is still connected. Every member SHALL see the new host.

#### Scenario: Host leaves the lobby
- **GIVEN** a lobby with host "Mei" and guest "Ka Ho"
- **WHEN** Mei leaves
- **THEN** Ka Ho becomes host and gets the host controls

### Requirement: Next round in the same room
When a round ends, every member SHALL see the results. The host SHALL be able to return the room to the lobby or start another round straight away. Players who left SHALL lose their seats, and the computer players who replaced them SHALL be removed. Humans still in the room SHALL keep their seats.

#### Scenario: Rematch
- **WHEN** a round ends and the host chooses Play again
- **THEN** a new round starts with a new shuffle and the same seated humans and computer players

### Requirement: Room clean-up
A room with no connected humans SHALL be closed after 5 minutes. A closed room's code SHALL stop working.

#### Scenario: Everyone gone
- **GIVEN** every human has disconnected from a room
- **WHEN** 5 minutes pass without anyone reconnecting
- **THEN** the room is closed, and joining with its code reports that the room was not found

### Requirement: Connection status
The client SHALL show when it has lost contact with the server and is trying to reconnect. It SHALL try to reconnect automatically. If the server can't be reached at all, the client SHALL say so instead of failing silently.

#### Scenario: Server down
- **WHEN** a player chooses Play online and the server cannot be reached
- **THEN** they see a message that online play is unavailable, and single-player still works
