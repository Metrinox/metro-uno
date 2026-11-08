# Spec Delta

## Purpose

Defines the browser interface for a single-player game against computer opponents: setup, the table, line choice, the UNO call, language switching, and layouts that work on phones and desktop.

## ADDED Requirements

### Requirement: Game setup screen
Before a round, the player SHALL be able to choose 1–3 computer opponents, a language, and the house rules, then start the game.

#### Scenario: Start with two opponents
- **WHEN** the player chooses 2 opponents and presses Start
- **THEN** a 3-player round begins, with the human as one of the players

### Requirement: Table view
During a round the screen SHALL show:
- the player's hand
- the top discard card
- the draw pile
- each opponent's card count
- whose turn it is
- the turn direction
- the current line, by name and colour

#### Scenario: Table contents
- **WHEN** a round is in progress
- **THEN** all of the listed items are visible without scrolling on a 360×640 screen and on a 1280×800 screen

### Requirement: Current line strip
The screen SHALL show the current line's stations in order, with each single-line station's number and each interchange marked as an interchange, and SHALL highlight the top card's station when it is on that line. Branches SHALL be drawn beside the main route, starting at the station they leave from, not appended at the end. Each section of track SHALL be drawn in the colour of every label that covers it, side by side where several do.

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

### Requirement: Card presentation
Each card SHALL show its line colour or colours, a text line code, and its number (if it has one) or its action name. Station cards SHALL also show the station name in the selected language. Cards SHALL NOT rely on colour alone to show their line.

#### Scenario: Interchange card display
- **WHEN** the Admiralty card is shown
- **THEN** it shows every line's colour and code and the station name, and shows no number

#### Scenario: Transfer card display
- **WHEN** the Hong Kong card is shown
- **THEN** it shows its line, number 1, its name, and a transfer marker showing ISL and TWL

#### Scenario: Merged line display
- **WHEN** any Tung Chung Line card or the Tung Chung Line badge is shown
- **THEN** it shows all three labels, TCL, DRL, and AEL, each in its own colour

### Requirement: Playable cards indicated
On the human's turn, the cards that can legally be played SHALL be visually marked. Selecting a card that cannot be played SHALL NOT play it.

#### Scenario: Unplayable card tapped
- **WHEN** the human taps a card that cannot be played
- **THEN** nothing is played and a short message explains why

### Requirement: Line choice prompt
When the human plays a wild card, or an interchange or transfer card with more than one line to change to, the game SHALL ask which line to switch to. A two-line interchange SHALL change line without asking. The prompt SHALL offer only the allowed lines, each shown with its colour, code, and name. The play SHALL be completed only after a line is chosen.

#### Scenario: Interchange prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays Admiralty
- **THEN** a prompt offers exactly the Tsuen Wan, East Rail, and South Island lines

#### Scenario: Two-line interchange needs no prompt
- **GIVEN** the current line is the Island Line
- **WHEN** the human plays North Point
- **THEN** no prompt appears and the current line becomes the Tseung Kwan O Line

### Requirement: Pending draw shown
While a draw is pending against the human, the screen SHALL show the total and which cards can stack, and the Draw control SHALL say how many cards it will draw.

#### Scenario: Rush Hour on the human who holds a Rush Hour
- **WHEN** a computer plays Rush Hour on the human and the human holds a Rush Hour
- **THEN** the screen shows 2 cards pending, the human's Rush Hour is marked playable, and Draw reads "Draw 2"

### Requirement: Same-number prompt
When "play same numbers together" is on and the human plays a station card while holding other station cards with the same number, the game SHALL let them pick which of those to add and which card ends on top, before the play happens.

#### Scenario: Add a matching number
- **GIVEN** the human holds ISL 3 and TML 3 and ISL 3 is playable
- **WHEN** they play ISL 3, add TML 3, and end on TML 3
- **THEN** both cards are played and the current line is the Tuen Ma Line

### Requirement: Draw and pass controls
On their turn, the human SHALL be able to draw a card. After drawing a playable card, they SHALL be able to play it or pass.

#### Scenario: Draw then pass
- **WHEN** the human draws a playable card and presses Pass
- **THEN** the card stays in their hand and the turn moves to the next player

### Requirement: UNO control
When the human has 2 cards on their turn, a "UNO!" control SHALL be available, and they SHALL be able to use it before or as part of playing a card. When a penalty is applied, the screen SHALL show that it happened.

#### Scenario: Penalty shown
- **WHEN** the human plays down to one card without calling "UNO!"
- **THEN** 1 card is added to their hand and a message explains the penalty

### Requirement: Event feedback
The screen SHALL briefly report each play, draw, skip, reverse, line change, and penalty, including which player caused it.

#### Scenario: Computer plays a card
- **WHEN** a computer opponent plays Rush Hour on the human
- **THEN** a message names the opponent and the effect, and the human's hand grows by 2

### Requirement: End of round
When the round ends, the screen SHALL announce the winner and offer to play again or return to setup.

#### Scenario: Play again
- **WHEN** the round has ended and the player chooses Play Again
- **THEN** a new round starts with the same number of opponents and a new shuffle

### Requirement: Asset gallery page
The site SHALL have a page at `/gallery` that shows every line and every card in the deck, for reviewing the artwork. For each line it SHALL show the line's labels, name, and line diagram. It SHALL show every card once, grouped by line, with interchanges and wild cards in their own groups. The language switch SHALL work on this page, and the page SHALL link back to the game.

#### Scenario: Everything shown
- **WHEN** the `/gallery` page is opened
- **THEN** it shows all 8 lines with their diagrams and all 130 cards, each card exactly once

#### Scenario: Gallery in Chinese
- **WHEN** the language is switched to Traditional Chinese on the `/gallery` page
- **THEN** line and station names appear in Chinese

### Requirement: Language switch
The interface SHALL support English and Traditional Chinese. It SHALL be possible to switch language at any time without restarting. The choice SHALL be remembered on that device where browser storage is available.

#### Scenario: Switch mid-round
- **WHEN** the player switches to Traditional Chinese during a round
- **THEN** interface text, line names, and station names appear in Chinese, and the round continues unchanged

### Requirement: Responsive touch and keyboard input
The game SHALL be playable by touch on phones and by mouse or keyboard on desktop. The page SHALL NOT scroll horizontally at widths of 360px and above.

#### Scenario: Phone width
- **WHEN** the game is shown at 360px width
- **THEN** the page does not scroll horizontally and every control can be reached by touch
