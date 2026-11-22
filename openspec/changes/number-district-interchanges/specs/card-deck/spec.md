# Spec Delta

## ADDED Requirements

### Requirement: Multi-line station cards
A plain station (not an interchange) served by more than one shared-track line SHALL have one card. The card SHALL list every line serving the station and carry the station's number.

#### Scenario: Two-line station card
- **WHEN** the card for Goldhawk Road is inspected
- **THEN** it lists the Circle and the Hammersmith & City and has the number 2

#### Scenario: Station card on the Metropolitan
- **WHEN** the card for Aldgate is inspected
- **THEN** it lists the Circle and the Metropolitan and has the number 5

#### Scenario: Subsurface interchange card
- **WHEN** the card for Victoria is inspected
- **THEN** it is an interchange card listing the Circle, District, and Victoria lines, with no number

## MODIFIED Requirements

### Requirement: Deck from the chosen network
A round's deck SHALL be built from the network chosen for that round, using the same deck rules for every network.

#### Scenario: London deck
- **GIVEN** the London network has 136 stations and 10 lines
- **WHEN** a deck is built from it
- **THEN** it contains 136 station cards, 30 action cards (one of each action per line), and 8 wild cards, 174 in all

#### Scenario: London station cards by kind
- **WHEN** a deck is built from the London network
- **THEN** 34 of its station cards are interchange cards, 29 are multi-line station cards, and 73 are single-line station cards
