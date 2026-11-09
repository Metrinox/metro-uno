# Spec Delta

## MODIFIED Requirements

### Requirement: Visible AI pacing
In the browser game, each computer action SHALL be shown after a pause of 2 seconds by default, so the human can follow what happened. In online rooms, the server SHALL apply the same pause before each computer action. This includes moves made for a disconnected human's seat.

#### Scenario: Paced turns
- **WHEN** it becomes a computer player's turn
- **THEN** its action is shown after the pause, not instantly

#### Scenario: Paced turns online
- **WHEN** it becomes a computer player's turn in an online room
- **THEN** every player sees its action after the pause, not instantly

## ADDED Requirements

### Requirement: Online computer players see only their own view
In an online room, a computer player SHALL decide its moves using the same strategy as in single-player. It SHALL use only the information that player could see. This includes when it is playing for a disconnected or departed human.

#### Scenario: Taking over a seat
- **WHEN** a computer player takes turns for a human who has disconnected
- **THEN** it decides from that seat's own hand and the public table only
