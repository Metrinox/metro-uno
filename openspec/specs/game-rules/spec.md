# game-rules Specification

## Purpose

Defines how a round of Metro Uno is played: setup, the current line and face, which cards can be played, interchange and wild line choice, action effects, drawing, the "UNO!" call, and winning.

## Requirements

### Requirement: Round setup
A round SHALL have 2–4 players. Each player SHALL be dealt the starting hand size set in the house rules (7 by default). Cards SHALL then be turned from the draw pile until a single-line station card comes up. That card starts the discard pile and sets the current line and current number. Cards skipped while turning SHALL be shuffled back into the draw pile.

#### Scenario: Deal and starting card
- **WHEN** a round starts with 4 players
- **THEN** each player holds the starting hand size of cards, and the discard pile's top card is a single-line station card whose line and number are current

### Requirement: Current line and face
The game SHALL always track a current line and a current face. The face SHALL be a number, an action type, or none.

#### Scenario: Face after a station card
- **WHEN** a single-line station card numbered 5 on the Kwun Tong Line is played
- **THEN** the current line is the Kwun Tong Line and the current face is the number 5

### Requirement: Legal station plays
A single-line station card SHALL be playable when its line equals the current line or its number equals the current face.

#### Scenario: Match by line
- **GIVEN** the current line is the Island Line and the current face is 3
- **WHEN** the player holds an Island Line station card numbered 9
- **THEN** that card is playable

#### Scenario: Match by number changes line
- **GIVEN** the current line is the Island Line and the current face is 3
- **WHEN** the player plays a Tuen Ma Line station card numbered 3
- **THEN** the play is accepted and the current line becomes the Tuen Ma Line

#### Scenario: No match
- **GIVEN** the current line is the Island Line and the current face is 3
- **WHEN** the player tries to play a Tuen Ma Line station card numbered 8
- **THEN** the play is rejected and the game state is unchanged

### Requirement: Interchange plays and line choice
An interchange card SHALL be playable when any of its lines equals the current line. Interchange cards have no number, so they SHALL NOT be playable by matching a number. Playing it SHALL always change line: the new line is one of the card's lines other than the current line. If only one such line exists, it SHALL be chosen automatically; otherwise the player SHALL choose. The current face becomes none.

#### Scenario: Choose among interchange lines
- **GIVEN** the current line is the Island Line
- **WHEN** the player plays Admiralty and chooses the South Island Line
- **THEN** the current line is the South Island Line and the current face is none

#### Scenario: Two-line interchange changes automatically
- **GIVEN** the current line is the Island Line
- **WHEN** the player plays North Point without choosing a line
- **THEN** the current line is the Tseung Kwan O Line and the current face is none

#### Scenario: Cannot stay on the current line
- **GIVEN** the current line is the Island Line
- **WHEN** the player plays Admiralty and chooses the Island Line
- **THEN** the choice is rejected because an interchange must change line

#### Scenario: Interchange not on the current line
- **GIVEN** the current line is the Kwun Tong Line
- **WHEN** the player tries to play Admiralty
- **THEN** the play is rejected because Admiralty is not on the Kwun Tong Line

#### Scenario: Choice limited to the card's lines
- **WHEN** a player plays Admiralty and picks the Kwun Tong Line
- **THEN** the choice is rejected because Admiralty is not on the Kwun Tong Line

### Requirement: Transfer plays
A transfer station card SHALL be playable like any single-line station card (by its line or its number). When played, the current line SHALL switch to one of its transfer lines: chosen automatically if there is only one, otherwise by the player. The current face SHALL be the card's number. An interchange with a transfer SHALL offer its transfer lines in addition to its own other lines.

#### Scenario: Hong Kong switches to Central's line
- **GIVEN** the current line is the Tung Chung Line
- **WHEN** the player plays Hong Kong (TCL 1) and chooses the Tsuen Wan Line
- **THEN** the current line is the Tsuen Wan Line and the current face is 1

#### Scenario: Central switches to Hong Kong's line too
- **GIVEN** the current line is the Island Line
- **WHEN** the player plays Central
- **THEN** they are offered the Tsuen Wan Line and the Tung Chung Line, and Central is still not playable while the Tung Chung Line is current

#### Scenario: East TST to Tsim Sha Tsui
- **WHEN** the player plays East Tsim Sha Tsui
- **THEN** the current line becomes the Tsuen Wan Line without a choice, and the current face is its number

#### Scenario: Played by number
- **GIVEN** the current line is the Island Line and the current face is 1
- **WHEN** the player plays Hong Kong (TCL 1) and chooses the Island Line
- **THEN** the play is accepted and the current line is the Island Line with face 1

### Requirement: Line action plays
A line action card SHALL be playable when its line equals the current line or its action type equals the current face. After it is played, its line becomes current and its action type becomes the face.

#### Scenario: Match action by type
- **GIVEN** the current face is Signal Fault on the Island Line
- **WHEN** the player plays a Tsuen Wan Line Signal Fault
- **THEN** the play is accepted and the current line becomes the Tsuen Wan Line

### Requirement: Action effects
Signal Fault SHALL skip the next player. Terminus SHALL reverse the turn direction; with 2 players it SHALL act as a skip. Rush Hour SHALL add 2 to a pending draw against the next player (see Draw stacking).

#### Scenario: Rush Hour
- **GIVEN** the next player holds no card that can stack on it
- **WHEN** a player plays Rush Hour
- **THEN** the next player draws 2 cards and the turn passes to the player after them

#### Scenario: Terminus with two players
- **GIVEN** a 2-player round
- **WHEN** a player plays Terminus
- **THEN** the same player takes the next turn

### Requirement: Wild plays
Octopus and Typhoon Signal No. 8 cards SHALL be playable on any turn. The player SHALL choose any line in the network, which becomes current with face none. Typhoon Signal No. 8 SHALL also add 4 to a pending draw against the next player (see Draw stacking).

#### Scenario: Octopus sets line
- **WHEN** a player plays Octopus and chooses the East Rail Line
- **THEN** the current line is the East Rail Line and the current face is none

#### Scenario: Typhoon Signal No. 8
- **GIVEN** the next player holds no card that can stack on it
- **WHEN** a player plays Typhoon Signal No. 8 and chooses the Tuen Ma Line
- **THEN** the next player draws 4 cards, loses their turn, and the current line is the Tuen Ma Line

### Requirement: Drawing
On their turn a player SHALL either play a legal card or draw. How drawing works is set by the house rules "draw until playable" and "play the drawn card".

#### Scenario: Draw one, may not play it (default)
- **GIVEN** "draw until playable" is off and "play the drawn card" is off
- **WHEN** a player draws
- **THEN** they draw one card and the turn passes, even if that card is playable

#### Scenario: Draw one, may play it
- **GIVEN** "draw until playable" is off and "play the drawn card" is on
- **WHEN** a player draws a playable card
- **THEN** they may play that card in the same turn, or keep it and pass

#### Scenario: Draw until playable
- **GIVEN** "draw until playable" is on
- **WHEN** a player draws
- **THEN** they keep drawing until they draw a playable card, and they must play that card in the same turn

#### Scenario: Draw until playable runs out
- **GIVEN** "draw until playable" is on and no playable card can be drawn
- **WHEN** a player draws
- **THEN** they take every card left to draw and the turn passes

### Requirement: Draw stacking
Rush Hour and Typhoon Signal No. 8 SHALL build a pending draw against the next player. That player SHALL either stack a draw card, which adds to the total and passes it on, or draw the whole total and lose their turn. A Rush Hour of any line SHALL stack on a Rush Hour, and a Typhoon on a Typhoon. Mixing them follows the "mix +2 and +4" house rule. While a draw is pending, no other card is playable.

#### Scenario: Stack Rush Hour on Rush Hour
- **GIVEN** a Rush Hour was played on the player, so 2 cards are pending
- **WHEN** they play a Rush Hour of any line
- **THEN** 4 cards are pending against the next player

#### Scenario: Mix allowed
- **GIVEN** "mix +2 and +4" is on and 2 cards are pending
- **WHEN** the player plays Typhoon Signal No. 8 and chooses a line
- **THEN** 6 cards are pending against the next player and the chosen line is current

#### Scenario: Mix not allowed
- **GIVEN** "mix +2 and +4" is off and 2 cards are pending
- **WHEN** the player tries to play Typhoon Signal No. 8
- **THEN** the play is rejected

#### Scenario: Take the draw
- **GIVEN** 4 cards are pending against the player
- **WHEN** they draw
- **THEN** they draw 4 cards, the pending draw is cleared, and the turn passes to the next player

#### Scenario: Nothing to stack
- **GIVEN** the next player holds no card that can stack
- **WHEN** a draw card is played
- **THEN** the next player draws the total and loses their turn without having to act

### Requirement: Playing several cards of the same number
When the "play same numbers together" house rule is on, a player SHALL be able to play two or more single-line station cards with the same number in one turn. The first card SHALL be playable; each other card SHALL have the same number. The cards SHALL go on the discard pile in the order given, and the last one SHALL set the current line.

#### Scenario: Two threes
- **GIVEN** "play same numbers together" is on and the current line is the Island Line with face 3
- **WHEN** the player plays Sai Ying Pun (ISL 3) together with Heng On (TML 3), ending on Heng On
- **THEN** both cards are discarded, Heng On is on top, and the current line is the Tuen Ma Line

#### Scenario: Rule off
- **GIVEN** "play same numbers together" is off
- **WHEN** a player tries to play two cards in one turn
- **THEN** the play is rejected

#### Scenario: Different numbers
- **WHEN** a player tries to play an ISL 3 together with an ISL 4
- **THEN** the play is rejected

### Requirement: Reshuffle when draw pile is empty
When a card must be drawn and the draw pile is empty, every discard except the top card SHALL be shuffled into a new draw pile. If no cards are available even then, the draw SHALL be skipped.

#### Scenario: Reshuffle
- **GIVEN** the draw pile is empty and the discard pile has 10 cards
- **WHEN** a player must draw
- **THEN** 9 cards form a new draw pile, the top discard stays in place, and the player draws one

### Requirement: UNO call
A player who plays their second-to-last card SHALL call "UNO!" as part of that play. If they do not, they SHALL draw 1 penalty card at the end of that turn.

#### Scenario: Call made
- **WHEN** a player with 2 cards plays one and calls "UNO!"
- **THEN** they keep 1 card and take no penalty

#### Scenario: Call missed
- **WHEN** a player with 2 cards plays one without calling "UNO!"
- **THEN** they draw 1 penalty card at the end of that turn

### Requirement: Winning
The first player to have no cards left SHALL win. With the "play until one player is left" house rule on (the default), a player who runs out of cards SHALL go out and take the next finishing place; their turns SHALL be skipped, any effect of their final card SHALL apply to the next remaining player, and the round SHALL end when only one player still has cards. With the rule off, the round SHALL end as soon as the first player runs out; any effect of the final card on other players, including a pending draw, SHALL still be applied before the round ends.

#### Scenario: Play goes on after the first player goes out
- **GIVEN** 3 players and "play until one player is left" is on
- **WHEN** a player plays their last card
- **THEN** that player is the winner, the round continues without them, and it ends when a second player runs out, showing the finishing order

#### Scenario: Win on last card ends the round
- **GIVEN** "play until one player is left" is off
- **WHEN** a player plays their last card
- **THEN** the round ends and that player is the winner

### Requirement: Rejected moves leave state unchanged
Any illegal action, such as playing out of turn, playing an unplayable card, or choosing an invalid line, SHALL be rejected with a reason and SHALL NOT change the game state.

#### Scenario: Out-of-turn play
- **WHEN** a player who is not the current player tries to play a card
- **THEN** the action is rejected and the game state is unchanged
