# Spec Delta

## ADDED Requirements

### Requirement: Multi-line station plays
A multi-line station card SHALL be playable when any of its lines is current, or its number equals the current face. No line SHALL be chosen. All of the card's lines SHALL become current together, and its number SHALL become the current face. A multi-line station with a walkway transfer SHALL switch line as in "Transfer plays" instead.

#### Scenario: Play by line
- **GIVEN** the current line is the Circle with face 4
- **WHEN** the player plays Sloane Square (CIR | DIS 3)
- **THEN** the Circle and District are both current, and the current face is 3

#### Scenario: Play by number from another line
- **GIVEN** the current line is the Bakerloo with face 3
- **WHEN** the player plays Sloane Square
- **THEN** the play is accepted, the Circle and District are both current, and the current face is 3

#### Scenario: Next player plays either line
- **GIVEN** the Circle and District are current with face 3
- **WHEN** the next player looks at Goldhawk Road (CIR | H&C 2), Parsons Green (DIS 7), and Whitechapel (H&C | DIS 2)
- **THEN** all three are playable

#### Scenario: No match
- **GIVEN** the current line is the Hammersmith & City with face 7
- **WHEN** the player tries to play Sloane Square
- **THEN** the play is rejected because Sloane Square is not on the Hammersmith & City and is not numbered 7

## MODIFIED Requirements

### Requirement: Current line and face
The game SHALL always track the current lines and a current face. The current lines SHALL be a single line, or several shared-track lines that are current together. Wherever a rule says a card's line "is current", it SHALL mean the line is one of the current lines. The face SHALL be a number, an action type, or none.

#### Scenario: Face after a station card
- **WHEN** a single-line station card numbered 5 on the Kwun Tong Line is played
- **THEN** the current line is the Kwun Tong Line and the current face is the number 5

#### Scenario: Several current lines
- **WHEN** Goldhawk Road (CIR | H&C 2) is played
- **THEN** the Circle and Hammersmith & City are both current and the current face is 2

### Requirement: Legal station plays
A single-line station card SHALL be playable when its line is current or its number equals the current face.

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

#### Scenario: Match one of several current lines
- **GIVEN** the Circle and District are current with face 3
- **WHEN** the player plays Parsons Green (DIS 7)
- **THEN** the play is accepted and the current line is the District alone

### Requirement: Interchange plays and line choice
An interchange card SHALL be playable when any of its lines is current. Interchange cards have no number, so they SHALL NOT be playable by matching a number. Its line options are:
- each of its lines that is not a shared-track line, on its own;
- its shared-track lines, together as one option.

Playing it SHALL always change line: the allowed options are those that share no line with the current lines. If only one option is allowed, it SHALL be chosen automatically; otherwise the player SHALL choose. The chosen option's lines become current, and the current face becomes none.

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

#### Scenario: Shared-track lines switch together
- **GIVEN** the current line is the Victoria line
- **WHEN** the player plays Victoria without choosing a line
- **THEN** the Circle and District are both current and the current face is none

#### Scenario: Leaving shared-track lines
- **GIVEN** the Circle and District are current
- **WHEN** the player plays Victoria without choosing a line
- **THEN** the current line is the Victoria line

#### Scenario: Shared-track lines cannot be split
- **GIVEN** the current line is the Northern
- **WHEN** the player plays King's Cross St Pancras and chooses the Circle alone
- **THEN** the choice is rejected; the allowed options are Circle, Hammersmith & City and Metropolitan together, the Piccadilly, and the Victoria line

### Requirement: Transfer plays
A transfer station card SHALL be playable like any station card of its kind: by its line or lines, or by its number. When played, the current lines SHALL switch to one of its transfer options: chosen automatically if there is only one, otherwise by the player. Transfer lines that are shared-track lines SHALL form one option together. The current face SHALL be the card's number. An interchange with a transfer SHALL offer its transfer options in addition to its own allowed options.

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

#### Scenario: Multi-line transfer station
- **GIVEN** the current line is the District
- **WHEN** the player plays Monument (CIR | DIS 9)
- **THEN** they are offered the Central and the Northern, and the current face is 9

#### Scenario: Transfer to shared-track lines
- **GIVEN** the current line is the Central
- **WHEN** the player plays Bank
- **THEN** they are offered the Northern, and the Circle and District together

### Requirement: Line action plays
A line action card SHALL be playable when its line is current or its action type equals the current face. After it is played, its line alone becomes current and its action type becomes the face.

#### Scenario: Match action by type
- **GIVEN** the current face is Signal Fault on the Island Line
- **WHEN** the player plays a Tsuen Wan Line Signal Fault
- **THEN** the play is accepted and the current line becomes the Tsuen Wan Line

#### Scenario: Action on one of several current lines
- **GIVEN** the Circle and District are current
- **WHEN** the player plays a District Signal Fault
- **THEN** the play is accepted and the current line is the District alone

### Requirement: Playing several cards of the same number
When the "play same numbers together" house rule is on, a player SHALL be able to play two or more station cards with the same number in one turn, single-line or multi-line. The first card SHALL be playable; each other card SHALL have the same number. The cards SHALL go on the discard pile in the order given, and the last one SHALL set the current lines as if it had been played alone.

#### Scenario: Two threes
- **GIVEN** "play same numbers together" is on and the current line is the Island Line with face 3
- **WHEN** the player plays Sai Ying Pun (ISL 3) together with Heng On (TML 3), ending on Heng On
- **THEN** both cards are discarded, Heng On is on top, and the current line is the Tuen Ma Line

#### Scenario: Ending on a multi-line card
- **GIVEN** "play same numbers together" is on and the current line is the Bakerloo with face 3
- **WHEN** the player plays a Bakerloo station card numbered 3 together with Sloane Square (CIR | DIS 3), ending on Sloane Square
- **THEN** both cards are discarded, Sloane Square is on top, and the Circle and District are both current with face 3

#### Scenario: Rule off
- **GIVEN** "play same numbers together" is off
- **WHEN** a player tries to play two cards in one turn
- **THEN** the play is rejected

#### Scenario: Different numbers
- **WHEN** a player tries to play an ISL 3 together with an ISL 4
- **THEN** the play is rejected
