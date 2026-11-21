# Spec Delta

## MODIFIED Requirements

### Requirement: Lobby
The lobby SHALL show the room code, the share link, every seat with its occupant's name and whether it is a human or a computer player, who the host is, the room's map, and the house rules. All members SHALL see changes to it immediately.

#### Scenario: Rules change seen by guests
- **WHEN** the host turns "Draw until you can play" on in the lobby
- **THEN** every guest's lobby shows that rule as on

#### Scenario: Map change seen by guests
- **WHEN** the host changes the map to London in the lobby
- **THEN** every guest's lobby shows London as the map

### Requirement: Host controls the lobby
Only the host SHALL be able to change the map and house rules, add or remove computer players, remove a guest, and start the round. The server SHALL reject these requests from any other player.

#### Scenario: Guest cannot start
- **WHEN** a guest sends a request to start the round
- **THEN** the server rejects it and the room is unchanged

#### Scenario: Host removes a guest
- **WHEN** the host removes a guest from the lobby
- **THEN** that guest is returned to the online menu with a message that they were removed, and their seat becomes free

#### Scenario: Guest cannot change the map
- **WHEN** a guest sends a request to change the map
- **THEN** the server rejects it and the room's map is unchanged

## ADDED Requirements

### Requirement: Room map
Every room SHALL have a map. A new room SHALL start with the map its creator had chosen, or Hong Kong if none. The map SHALL change only in the lobby. A request naming an unknown map SHALL be rejected without changing the room. A room stored without a map SHALL be treated as a Hong Kong room.

#### Scenario: Room created with London
- **WHEN** a player who has London chosen creates a room
- **THEN** the lobby shows London as the map

#### Scenario: Unknown map rejected
- **WHEN** the host sends a request to change the map to an id that is not an available network
- **THEN** the server rejects it and the room's map is unchanged

#### Scenario: Map fixed during a round
- **WHEN** the host sends a request to change the map while a round is in progress
- **THEN** the server rejects it and the round continues on its map

### Requirement: Rounds use the room's map
The server SHALL build each round's deck from the room's map. Every member SHALL see the table for that map.

#### Scenario: London round online
- **GIVEN** a room whose map is London
- **WHEN** the host starts a round
- **THEN** every player's hand and table show London cards and lines

#### Scenario: Rejoining a London round
- **WHEN** a player reloads the page during a London round
- **THEN** they return to their seat and see London cards and lines
