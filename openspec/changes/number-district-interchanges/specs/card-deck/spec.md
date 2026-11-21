# Spec Delta

## MODIFIED Requirements

### Requirement: Interchange card attributes
An interchange station's card SHALL list every line serving the station. It SHALL have no number, unless the station is a numbered interchange, in which case the card SHALL carry the station's number on its numbering line.

#### Scenario: Interchange card lists all lines
- **WHEN** the card for Admiralty is inspected
- **THEN** it lists the Island, Tsuen Wan, East Rail, and South Island lines and has no number

#### Scenario: Numbered interchange card
- **WHEN** the card for Tower Hill is inspected
- **THEN** it lists the District and the merged line and has the number 17

#### Scenario: London deck size unchanged
- **WHEN** a deck is built from the London network
- **THEN** it still has 168 cards, 25 of them numbered interchange cards and 25 ordinary interchange cards
