# Spec Delta

## MODIFIED Requirements

### Requirement: Game setup screen
Before a round, the player SHALL be able to choose 1–3 computer opponents, a language, and the house rules, then start the game. The setup screen SHALL also offer Play online, which leads to creating or joining a room, whenever the site is built with a game server address. When it is built without one, the online option SHALL NOT be shown, and single-player SHALL work exactly as before.

#### Scenario: Start with two opponents
- **WHEN** the player chooses 2 opponents and presses Start
- **THEN** a 3-player round begins, with the human as one of the players

#### Scenario: Online option shown
- **WHEN** the site is built with a game server address and the setup screen is shown
- **THEN** a Play online control is visible next to the single-player Start

#### Scenario: No server configured
- **WHEN** the site is built without a game server address
- **THEN** the setup screen shows no online option, and starting a single-player game needs no network connection

### Requirement: Table view
During a round the screen SHALL show:
- the player's hand
- the top discard card
- the draw pile
- each opponent's name and card count
- whose turn it is
- the turn direction
- the current line, by name and colour

In an online round, the screen SHALL also mark each opponent as a human or a computer player, and SHALL show which opponents are disconnected.

#### Scenario: Table contents
- **WHEN** a round is in progress
- **THEN** all of the listed items are visible without scrolling on a 360×640 screen and on a 1280×800 screen

#### Scenario: Opponent names online
- **WHEN** an online round is in progress with players "Mei" and "Ka Ho" and one computer player
- **THEN** "Mei" sees opponents labelled "Ka Ho" and a computer player, with their card counts

### Requirement: End of round
When the round ends, the screen SHALL announce the winner and offer to play again or return to setup. In an online room, only the host SHALL be offered Play again and Back to lobby. Every player SHALL be offered Leave room.

#### Scenario: Play again
- **WHEN** the round has ended and the player chooses Play Again
- **THEN** a new round starts with the same number of opponents and a new shuffle

#### Scenario: Guest at end of online round
- **WHEN** an online round ends
- **THEN** a guest sees the results and a Leave room control, plus a note that the host will start the next round, and does not see Play again

## ADDED Requirements

### Requirement: Same table for local and online games
The table controls (playing a card, choosing a line, playing same-number cards together, drawing, passing, and calling UNO) SHALL look and behave the same in single-player and online rounds.

#### Scenario: UNO online
- **WHEN** an online player has 2 cards on their turn, presses UNO!, and plays one
- **THEN** UNO is called for them and no penalty is applied, just as in single-player

### Requirement: Online screens are translated
The online menu, join form, lobby, and connection messages SHALL be available in English and Traditional Chinese. They SHALL follow the language switch.

#### Scenario: Lobby in Chinese
- **WHEN** a player switches to Traditional Chinese in the lobby
- **THEN** lobby labels and controls appear in Chinese, and player names appear exactly as entered
