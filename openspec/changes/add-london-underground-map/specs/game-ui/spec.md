# Spec Delta

## MODIFIED Requirements

### Requirement: Game setup screen
Before a round, the player SHALL be able to choose a map, 1–3 computer opponents, a language, and the house rules, then start the game. The setup screen SHALL also offer Play online, which leads to creating or joining a room, whenever the site is built with a game server address. When it is built without one, the online option SHALL NOT be shown, and single-player SHALL work exactly as before.

#### Scenario: Start with two opponents
- **WHEN** the player chooses 2 opponents and presses Start
- **THEN** a 3-player round begins, with the human as one of the players

#### Scenario: Online option shown
- **WHEN** the site is built with a game server address and the setup screen is shown
- **THEN** a Play online control is visible next to the single-player Start

#### Scenario: No server configured
- **WHEN** the site is built without a game server address
- **THEN** the setup screen shows no online option, and starting a single-player game needs no network connection

#### Scenario: Choose London
- **WHEN** the player chooses London and presses Start
- **THEN** the round is played with the London deck, and the setup screen's subtitle and colour stripes show London's name and lines

### Requirement: Asset gallery page
The site SHALL have a page at `/gallery` that shows every line and every card in one map's deck, for reviewing the artwork. A menu at the top of the page, above the lines and cards, SHALL choose between Hong Kong and London. Hong Kong SHALL be chosen when the page opens, unless the page's link names another map. For each line it SHALL show the line's labels, name, and line diagram. It SHALL show every card once, grouped by line, with interchanges and wild cards in their own groups. The language switch SHALL work on this page, and the page SHALL link back to the game.

#### Scenario: Everything shown
- **WHEN** the `/gallery` page is opened
- **THEN** it shows the Hong Kong map: all 8 lines with their diagrams and all 130 cards, each card exactly once

#### Scenario: Map menu
- **WHEN** the `/gallery` page is opened
- **THEN** a menu at the top of the page shows Hong Kong and London, with Hong Kong selected

#### Scenario: Gallery for London
- **WHEN** London is chosen from the menu at the top of the `/gallery` page
- **THEN** it shows London's 8 lines with their diagrams and every card in London's deck exactly once, including the Oyster and Tube Strike cards

#### Scenario: Link to the London gallery
- **WHEN** the `/gallery/?map=london-underground` link is opened, or the page is reloaded after choosing London
- **THEN** London is selected in the menu and its lines and cards are shown

#### Scenario: Gallery in Chinese
- **WHEN** the language is switched to Traditional Chinese on the `/gallery` page
- **THEN** line and station names appear in Chinese where the map has them, and in English otherwise

### Requirement: Language switch
The interface SHALL support English and Traditional Chinese. It SHALL be possible to switch language at any time without restarting. The choice SHALL be remembered on that device where browser storage is available. A station or line with no Chinese name SHALL show its English name in Chinese mode.

#### Scenario: Switch mid-round
- **WHEN** the player switches to Traditional Chinese during a round
- **THEN** interface text, line names, and station names appear in Chinese, and the round continues unchanged

#### Scenario: London in Chinese
- **WHEN** the player switches to Traditional Chinese during a London round
- **THEN** interface text appears in Chinese, and London station and line names stay in English

## ADDED Requirements

### Requirement: Map choice remembered
The map chosen on the setup screen SHALL be remembered on that device where browser storage is available. When nothing is remembered, or the remembered map is unknown, Hong Kong SHALL be chosen.

#### Scenario: Map remembered
- **WHEN** the player chooses London, then reloads the page
- **THEN** the setup screen has London chosen

### Requirement: Table follows the round's map
Cards, line badges, line strips, and event messages SHALL use the network the round is played on, in both single-player and online rounds. Wild cards SHALL show the names and artwork of that network's theme.

#### Scenario: London card display
- **WHEN** the Royal Oak card is shown in a London round
- **THEN** it shows the merged line's three labels, CIR, H&C, and MET, its number, and the name "Royal Oak"

#### Scenario: London wild display
- **WHEN** an Oyster card is shown in a London round
- **THEN** it is named Oyster and does not show the Octopus artwork

#### Scenario: London line strip
- **WHEN** the current line is the merged line in a London round
- **THEN** the line strip draws the Metropolitan branch to Finchley Road beside the main route, and the Circle's southern loop between its ends
