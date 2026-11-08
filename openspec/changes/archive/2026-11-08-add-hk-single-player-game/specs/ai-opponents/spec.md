# Spec Delta

## Purpose

Defines how computer opponents play: always legally, with a simple sensible strategy, at a pace a human can follow.

## ADDED Requirements

### Requirement: AI only makes legal moves
On its turn, a computer player SHALL either play a legal card or draw. Every line it chooses SHALL be valid for the card it played.

#### Scenario: Many simulated rounds
- **WHEN** 1,000 seeded rounds are simulated with only computer players
- **THEN** no computer action is rejected, and every round ends with a winner or reaches the safety turn limit

### Requirement: AI uses only information its player can see
A computer player SHALL decide using only its own hand, the visible discard pile, the current line and face, turn order, and other players' card counts.

#### Scenario: Hidden hands
- **WHEN** a computer player makes a decision
- **THEN** its decision input does not include other players' hands or the order of the draw pile

### Requirement: AI line choice
When a computer player chooses a line for an interchange or wild card, it SHALL choose, from the lines that card allows, the line that matches the most cards remaining in its hand. Ties SHALL be broken in a fixed order.

#### Scenario: Prefer line held most
- **GIVEN** a computer player holds three Kwun Tong Line cards and one Island Line card
- **WHEN** it plays an Octopus
- **THEN** it chooses the Kwun Tong Line

### Requirement: AI play preference
A computer player SHALL prefer a station or line action card over a wild card. It SHALL keep wild cards unless no other legal play exists. If the next player has 2 or fewer cards, it SHALL prefer a card that skips that player or makes them draw.

#### Scenario: Save wilds
- **WHEN** a computer player holds a playable station card and a playable Octopus
- **THEN** it plays the station card

#### Scenario: Block a near winner
- **GIVEN** the next player has 1 card
- **WHEN** a computer player holds a playable Rush Hour and a playable station card
- **THEN** it plays Rush Hour

### Requirement: AI calls UNO
A computer player SHALL always call "UNO!" when it plays its second-to-last card.

#### Scenario: AI call
- **WHEN** a computer player plays down to one card
- **THEN** "UNO!" is called for it and no penalty is applied

### Requirement: Visible AI pacing
In the browser game, each computer action SHALL be shown after a pause of 2 seconds by default, so the human can follow what happened.

#### Scenario: Paced turns
- **WHEN** it becomes a computer player's turn
- **THEN** its action is shown after the pause, not instantly
