# house-rules Specification

## Purpose

Lets the player change optional rules before a round: starting hand size, how drawing works, mixing +2 and +4 when stacking, playing several cards of the same number, and whether play continues until one player is left.

## Requirements

### Requirement: House rule settings and defaults
The game SHALL offer these house rules, with these defaults:
- Starting hand size: 7 (from 3 to 15)
- Draw until playable: off (draw one card)
- Play the drawn card: off
- Mix +2 and +4 when stacking: on
- Play same numbers together: on
- Play until one player is left: on

#### Scenario: Defaults
- **WHEN** the player has never changed the house rules
- **THEN** a round starts with 7 cards each, draw one card, no playing the drawn card, mixing allowed, same numbers allowed together, and play continuing until one player is left

### Requirement: Play the drawn card only applies when drawing one
"Play the drawn card" SHALL only apply when "draw until playable" is off. When "draw until playable" is on, the card found SHALL always be played.

#### Scenario: Setting disabled
- **WHEN** "draw until playable" is on
- **THEN** the "play the drawn card" setting is shown as not applicable and has no effect

### Requirement: House rules apply per round
The house rules SHALL be chosen on the setup screen and SHALL be fixed for the whole round. Every player, including computer players, SHALL follow them. They SHALL be stored with the round's state. In an online room, the host SHALL choose the house rules in the lobby, and the rules SHALL be fixed from the moment the round starts until it ends.

#### Scenario: Rules fixed during a round
- **WHEN** a round starts with a starting hand size of 5
- **THEN** every player is dealt 5 cards, and the rules cannot change until a new round starts

#### Scenario: Online rules fixed during a round
- **WHEN** the host tries to change a house rule while an online round is in progress
- **THEN** the change is rejected and the round continues with the rules it started with

### Requirement: House rules remembered
The chosen house rules SHALL be remembered on that device where browser storage is available, and SHALL fall back to the defaults when it is not.

#### Scenario: Remembered next visit
- **WHEN** the player turns "draw until playable" on and reloads the page
- **THEN** the setup screen still shows "draw until playable" on

#### Scenario: Storage blocked
- **WHEN** browser storage is unavailable
- **THEN** the setup screen shows the defaults and the game works normally

### Requirement: Computer players follow house rules
Computer players SHALL only make moves the house rules allow. They SHALL stack a draw card when they can, and SHALL play all their same-number station cards together when allowed.

#### Scenario: AI stacks
- **GIVEN** 2 cards are pending against a computer player that holds a Rush Hour
- **WHEN** it is that player's turn
- **THEN** it plays the Rush Hour

### Requirement: Host's remembered rules pre-fill the lobby
When a player creates an online room, the lobby's house rules SHALL start from the rules remembered on that player's device. A host's changes in the lobby SHALL be remembered on the host's device in the same way as changes on the setup screen. Guests' remembered rules SHALL NOT be changed by the room's rules.

#### Scenario: Host's saved rules used
- **GIVEN** the host has "Draw until you can play" remembered as on
- **WHEN** they create a room
- **THEN** the lobby shows "Draw until you can play" on for everyone

#### Scenario: Guest's settings untouched
- **GIVEN** a guest has a starting hand size of 9 remembered
- **WHEN** they play a room round with hand size 7 and then return to single-player setup
- **THEN** their setup screen still shows 9
