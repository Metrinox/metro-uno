# Spec Delta

## MODIFIED Requirements

### Requirement: Wild cards
The deck SHALL contain 4 wild cards and 4 wild + draw 4 cards, named by the network's wild-card theme: Octopus and Typhoon Signal No. 8 on the Hong Kong network. Wild cards SHALL have no line and no number. The theme SHALL change only names and artwork, never what the cards do.

#### Scenario: Wild card count
- **WHEN** a deck is built
- **THEN** it contains exactly 4 Octopus cards and 4 Typhoon Signal No. 8 cards

#### Scenario: London wild cards
- **WHEN** a deck is built from the London network
- **THEN** it contains exactly 4 Oyster (wild) cards and 4 Tube Strike (wild + draw 4) cards, which play exactly as Octopus and Typhoon Signal No. 8 do

## ADDED Requirements

### Requirement: Deck from the chosen network
A round's deck SHALL be built from the network chosen for that round, using the same deck rules for every network.

#### Scenario: London deck
- **GIVEN** the London network has S stations and 8 lines
- **WHEN** a deck is built from it
- **THEN** it contains S station cards, 24 action cards (one of each action per line), and 8 wild cards
