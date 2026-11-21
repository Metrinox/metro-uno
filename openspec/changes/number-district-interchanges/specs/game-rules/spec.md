# Spec Delta

## MODIFIED Requirements

### Requirement: Interchange plays and line choice
An interchange card with no number SHALL be playable when any of its lines equals the current line. Such cards SHALL NOT be playable by matching a number. Playing it SHALL always change line: the new line is one of the card's lines other than the current line. If only one such line exists, it SHALL be chosen automatically; otherwise the player SHALL choose. The current face becomes none. Numbered interchange cards follow "Numbered interchange plays" instead.

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

## ADDED Requirements

### Requirement: Numbered interchange plays
A numbered interchange card SHALL be playable when any of its lines equals the current line, or its number equals the current face. The player SHALL choose any of the card's lines, including the current line, plus any transfer lines; staying is allowed. Its number SHALL become the current face. It SHALL NOT be played together with same-number cards.

#### Scenario: Play by line and stay
- **GIVEN** the current line is the District with face 3
- **WHEN** the player plays Tower Hill (District 17) and chooses the District
- **THEN** the current line is the District and the current face is 17

#### Scenario: Play by line and switch
- **GIVEN** the current line is the District
- **WHEN** the player plays Victoria (District 8) and chooses the Victoria line
- **THEN** the current line is the Victoria line and the current face is 8

#### Scenario: Play by number from another line
- **GIVEN** the current line is the Bakerloo with face 7
- **WHEN** the player plays Sloane Square (District 7) and chooses the merged line
- **THEN** the play is accepted, the current line is the merged line, and the current face is 7

#### Scenario: A line choice is required
- **GIVEN** the current line is the Bakerloo with face 7
- **WHEN** the player plays Sloane Square without choosing a line
- **THEN** the play is rejected because a line must be chosen

#### Scenario: Choice limited to the card's lines
- **WHEN** a player plays Sloane Square and picks the Bakerloo
- **THEN** the choice is rejected because Sloane Square is not on the Bakerloo

#### Scenario: Not grouped with same numbers
- **GIVEN** "play same numbers together" is on and the current face is 7
- **WHEN** a player tries to play Sloane Square (District 7) together with a station card numbered 7
- **THEN** the play is rejected
