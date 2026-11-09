# Spec Delta

## MODIFIED Requirements

### Requirement: House rules apply per round
The house rules SHALL be chosen on the setup screen and SHALL be fixed for the whole round. Every player, including computer players, SHALL follow them. They SHALL be stored with the round's state. In an online room, the host SHALL choose the house rules in the lobby, and the rules SHALL be fixed from the moment the round starts until it ends.

#### Scenario: Rules fixed during a round
- **WHEN** a round starts with a starting hand size of 5
- **THEN** every player is dealt 5 cards, and the rules cannot change until a new round starts

#### Scenario: Online rules fixed during a round
- **WHEN** the host tries to change a house rule while an online round is in progress
- **THEN** the change is rejected and the round continues with the rules it started with

## ADDED Requirements

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
