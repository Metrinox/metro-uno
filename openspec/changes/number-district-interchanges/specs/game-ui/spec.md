# Spec Delta

## ADDED Requirements

### Requirement: Gallery Subsurface lines group
On a map with shared-track lines, the gallery SHALL show every station card for a station on those lines, interchanges included, in one "Subsurface lines" group (淺層綫 in Chinese). The cards SHALL come one numbering group after another, in numbering order, and the numbering groups SHALL NOT be named. Those lines' action cards SHALL stay in their own lines' groups.

#### Scenario: Subsurface lines group
- **WHEN** London is chosen on the `/gallery` page
- **THEN** a "Subsurface lines" group shows every Circle, Hammersmith & City, Metropolitan, and District station card, starting with Hammersmith (H&C) and ending with Kensington (Olympia), with no group names
- **AND** the Circle, District, Hammersmith & City, and Metropolitan groups each show only that line's three action cards

#### Scenario: Subsurface lines group in Chinese
- **WHEN** the language is Traditional Chinese and London is chosen on the `/gallery` page
- **THEN** the group is headed 淺層綫

## MODIFIED Requirements

### Requirement: Table view
During a round the screen SHALL show:
- the player's hand
- the top discard card
- the draw pile
- each opponent's name and card count
- whose turn it is
- the turn direction
- the current line or lines, each by name and colour

In an online round, the screen SHALL also mark each opponent as a human or a computer player, and SHALL show which opponents are disconnected.

#### Scenario: Table contents
- **WHEN** a round is in progress
- **THEN** all of the listed items are visible without scrolling on a 360×640 screen and on a 1280×800 screen

#### Scenario: Opponent names online
- **WHEN** an online round is in progress with players "Mei" and "Ka Ho" and one computer player
- **THEN** "Mei" sees opponents labelled "Ka Ho" and a computer player, with their card counts

#### Scenario: Several current lines
- **WHEN** the Circle and District are both current in a London round
- **THEN** the table shows both lines' names and colours as current

### Requirement: Current line strip
The screen SHALL show the current line's stations in order. When several lines are current, it SHALL show one of them at a time: the first in shared-track order, with a control for each current line that switches the strip to that line's stations. Each station's number SHALL be shown where it has one, and each interchange SHALL be marked as an interchange. The top card's station SHALL be highlighted when it is on the line shown. Branches SHALL be drawn beside the main route, starting at the station they leave from, not appended at the end. Each section of track SHALL be drawn in the colour of every label that covers it, side by side where several do.

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

#### Scenario: Multi-line stations on the strip
- **WHEN** the current line is the District in a London round
- **THEN** Sloane Square is drawn as a numbered station showing 3, not as an interchange

#### Scenario: Several current lines on the strip
- **WHEN** Sloane Square has just been played in a London round
- **THEN** the strip shows the Circle's stations with Sloane Square highlighted, and controls for the Circle and the District
- **AND** choosing the District shows the District's stations with Sloane Square highlighted

#### Scenario: Several current lines after an interchange
- **WHEN** Victoria has just been played from the Victoria line in a London round
- **THEN** the strip shows the Circle's stations with Victoria highlighted, and controls for the Circle and the District

#### Scenario: One current line has no controls
- **WHEN** a single line is current
- **THEN** the strip shows that line with no line controls

### Requirement: Card presentation
Each card SHALL show its line colour or colours, a text line code, and its number (if it has one) or its action name. Station cards SHALL also show the station name in the selected language. Cards SHALL NOT rely on colour alone to show their line. A multi-line station card SHALL show all its lines side by side in one band, and SHALL NOT be marked as an interchange. On an interchange card, the shared-track lines SHALL share one band side by side, and each other line SHALL have its own band.

#### Scenario: Interchange card display
- **WHEN** the Admiralty card is shown
- **THEN** it shows every line's colour and code and the station name, and shows no number

#### Scenario: Transfer card display
- **WHEN** the Hong Kong card is shown
- **THEN** it shows its line, number 1, its name, and a transfer marker showing ISL and TWL

#### Scenario: Merged line display
- **WHEN** any Tung Chung Line card or the Tung Chung Line badge is shown
- **THEN** it shows all three labels, TCL, DRL, and AEL, each in its own colour

#### Scenario: Multi-line station card display
- **WHEN** the Goldhawk Road card is shown in a London round
- **THEN** it shows CIR and H&C side by side in one band, the number 2, and the name "Goldhawk Road", with no interchange mark

#### Scenario: Subsurface interchange card display
- **WHEN** the King's Cross St Pancras card is shown in a London round, at phone and at desktop size
- **THEN** it shows one band with CIR, H&C, and MET side by side, then a band each for the Northern, Piccadilly, and Victoria lines, an interchange mark, and the name, with none of them overlapping

### Requirement: Line choice prompt
When the human plays a wild card, or an interchange or transfer card with more than one allowed option, the game SHALL ask which line to switch to. A card with only one allowed option SHALL change line without asking. A multi-line station card without a transfer SHALL never ask. The prompt SHALL offer only the allowed options. An option of several shared-track lines SHALL be one choice showing each line's colour, code, and name. Every other option SHALL show its line's colour, code, and name. The play SHALL be completed only after a choice is made.

#### Scenario: Interchange prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays Admiralty
- **THEN** a prompt offers exactly the Tsuen Wan, East Rail, and South Island lines

#### Scenario: Two-line interchange needs no prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays North Point
- **THEN** no prompt appears and the current line becomes the Tseung Kwan O Line

#### Scenario: Multi-line station needs no prompt
- **GIVEN** the current line is the District
- **WHEN** the human plays Sloane Square
- **THEN** no prompt appears, and the Circle and District are both current

#### Scenario: Shared-track lines offered together
- **GIVEN** the current line is the Northern
- **WHEN** the human plays King's Cross St Pancras
- **THEN** a prompt offers three choices: Circle, Hammersmith & City and Metropolitan as one choice, the Piccadilly, and the Victoria line

### Requirement: Asset gallery page
The site SHALL have a page at `/gallery` that shows every line and every card in one map's deck, for reviewing the artwork. A menu at the top of the page, above the lines and cards, SHALL choose between Hong Kong and London. Hong Kong SHALL be chosen when the page opens, unless the page's link names another map. For each line it SHALL show the line's labels, name, and line diagram. It SHALL show every card once, grouped by line, with interchanges and wild cards in their own groups, except as "Gallery Subsurface lines group" says. The language switch SHALL work on this page, and the page SHALL link back to the game.

#### Scenario: Everything shown
- **WHEN** the `/gallery` page is opened
- **THEN** it shows the Hong Kong map: all 8 lines with their diagrams and all 130 cards, each card exactly once

#### Scenario: Map menu
- **WHEN** the `/gallery` page is opened
- **THEN** a menu at the top of the page shows Hong Kong and London, with Hong Kong selected

#### Scenario: Gallery for London
- **WHEN** London is chosen from the menu at the top of the `/gallery` page
- **THEN** it shows London's 10 lines with their diagrams, and every card in London's deck exactly once, including the Oyster and Tube Strike cards

#### Scenario: Link to the London gallery
- **WHEN** the `/gallery/?map=london-underground` link is opened, or the page is reloaded after choosing London
- **THEN** London is selected in the menu and its lines and cards are shown

#### Scenario: Gallery in Chinese
- **WHEN** the language is switched to Traditional Chinese on the `/gallery` page
- **THEN** line and station names appear in Chinese where the map has them, and in English otherwise

### Requirement: Table follows the round's map
Cards, line badges, line strips, and event messages SHALL use the network the round is played on, in both single-player and online rounds. Wild cards SHALL show the names and artwork of that network's theme.

#### Scenario: London card display
- **WHEN** the Royal Oak card is shown in a London round
- **THEN** it shows CIR and H&C side by side in one band, the number 8, and the name "Royal Oak"

#### Scenario: London wild display
- **WHEN** an Oyster card is shown in a London round
- **THEN** it is named Oyster and does not show the Octopus artwork

#### Scenario: London line strip
- **WHEN** the current line is the Circle alone in a London round
- **THEN** the line strip shows only Circle stations, with its southern loop drawn between Liverpool Street and Paddington, and no Finchley Road or Whitechapel

#### Scenario: Metropolitan line strip
- **WHEN** the current line is the Metropolitan alone in a London round
- **THEN** the line strip shows Finchley Road to Aldgate, numbered 1 to 5 with the interchanges marked
