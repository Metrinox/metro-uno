# Spec Delta

## MODIFIED Requirements

### Requirement: Card presentation
Each card SHALL show its line colour or colours, a text line code, and its number (if it has one) or its action name. Station cards SHALL also show the station name in the selected language. A numbered interchange card SHALL show its number and SHALL also be marked as an interchange. Cards SHALL NOT rely on colour alone to show their line.

#### Scenario: Interchange card display
- **WHEN** the Admiralty card is shown
- **THEN** it shows every line's colour and code and the station name, and shows no number

#### Scenario: Transfer card display
- **WHEN** the Hong Kong card is shown
- **THEN** it shows its line, number 1, its name, and a transfer marker showing ISL and TWL

#### Scenario: Merged line display
- **WHEN** any Tung Chung Line card or the Tung Chung Line badge is shown
- **THEN** it shows all three labels, TCL, DRL, and AEL, each in its own colour

#### Scenario: Numbered interchange card display
- **WHEN** the Victoria card is shown in a London round, at phone and at desktop size
- **THEN** it shows the District, Victoria, and merged lines' colours and codes, the number 8, an interchange mark, and the name "Victoria", with none of them overlapping

### Requirement: Current line strip
The screen SHALL show the current line's stations in order, with each single-line station's number and each interchange marked as an interchange, and SHALL highlight the top card's station when it is on that line. A numbered interchange SHALL be marked as an interchange and show its number. Branches SHALL be drawn beside the main route, starting at the station they leave from, not appended at the end. Each section of track SHALL be drawn in the colour of every label that covers it, side by side where several do.

#### Scenario: Branch drawn at its fork
- **WHEN** the current line is the Tseung Kwan O Line
- **THEN** LOHAS Park is drawn on a branch starting at Tseung Kwan O, beside Hang Hau, not after Po Lam

#### Scenario: Loop drawn between its ends
- **WHEN** the current line is the East Rail Line
- **THEN** Racecourse is drawn beside Fo Tan, with track from Sha Tin to Racecourse and from Racecourse to University

#### Scenario: Overlapping colours on the Tung Chung Line
- **WHEN** the current line is the Tung Chung Line
- **THEN** the track from Hong Kong to Tsing Yi shows orange and green side by side, the Disneyland Resort branch is pink, and the Airport branch is green

#### Scenario: Highlight current station
- **WHEN** the top card is Mong Kok and the current line is the Tsuen Wan Line
- **THEN** the line strip shows the Tsuen Wan Line's stations with Mong Kok highlighted

#### Scenario: Numbered interchanges on the strip
- **WHEN** the current line is the District or the merged line in a London round
- **THEN** Tower Hill is drawn as an interchange showing 17, on both lines' strips

### Requirement: Line choice prompt
When the human plays a wild card, or an interchange or transfer card with more than one line to change to, the game SHALL ask which line to switch to. A two-line interchange without a number SHALL change line without asking. A numbered interchange SHALL always ask, offering all of its lines with the current line first when it is one of them. The prompt SHALL offer only the allowed lines, each shown with its colour, code, and name. The play SHALL be completed only after a line is chosen.

#### Scenario: Interchange prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays Admiralty
- **THEN** a prompt offers exactly the Tsuen Wan, East Rail, and South Island lines

#### Scenario: Two-line interchange needs no prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays North Point
- **THEN** no prompt appears and the current line becomes the Tseung Kwan O Line

#### Scenario: Numbered interchange prompt
- **GIVEN** the current line is the District
- **WHEN** the human plays Tower Hill
- **THEN** a prompt offers the District first, then the merged line
