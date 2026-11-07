# Spec Delta

## Purpose

Defines how the deck is built from a metro network: station cards with a line and number, unnumbered interchange cards that span several lines, and metro-themed action cards.

## ADDED Requirements

### Requirement: One card per station
The deck SHALL contain exactly one station card for each station in the network.

#### Scenario: Station card count
- **WHEN** a deck is built from a network with S stations
- **THEN** it contains exactly S station cards, and no two of them are for the same station

### Requirement: Regular station card attributes
A station card for a single-line station SHALL show that line as its colour and the station's number on that line.

#### Scenario: Single-line card
- **GIVEN** Chai Wan is the last station of the Island Line, with number P
- **WHEN** its card is inspected
- **THEN** the card's line is the Island Line and its number is P

### Requirement: Transfer station cards
A station or interchange card for a station with a walkway transfer SHALL also carry its transfer lines.

#### Scenario: Hong Kong card
- **WHEN** the Hong Kong card is inspected
- **THEN** its line is the Tung Chung Line, its number is 1, and its transfer lines are Island and Tsuen Wan

### Requirement: Interchange card attributes
An interchange station's card SHALL list every line serving the station and SHALL have no number.

#### Scenario: Interchange card lists all lines
- **WHEN** the card for Admiralty is inspected
- **THEN** it lists the Island, Tsuen Wan, East Rail, and South Island lines and has no number

### Requirement: Line action cards
For each line, the deck SHALL contain one Signal Fault (skip), one Terminus (reverse), and one Rush Hour (draw 2) card in that line's colour. Action cards SHALL have no number.

#### Scenario: Action cards per line
- **WHEN** a deck is built from a network with L lines
- **THEN** it contains L Signal Fault, L Terminus, and L Rush Hour cards, one of each per line

### Requirement: Wild cards
The deck SHALL contain 4 Octopus (wild) cards and 4 Typhoon Signal No. 8 (wild + draw 4) cards. Wild cards SHALL have no line and no number.

#### Scenario: Wild card count
- **WHEN** a deck is built
- **THEN** it contains exactly 4 Octopus cards and 4 Typhoon Signal No. 8 cards

### Requirement: Reproducible shuffle
Shuffling SHALL be driven by a seed, so the same seed always produces the same deck order.

#### Scenario: Same seed, same order
- **WHEN** two decks are built and shuffled with the same seed
- **THEN** their card orders are identical
