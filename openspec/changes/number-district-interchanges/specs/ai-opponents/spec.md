# Spec Delta

## MODIFIED Requirements

### Requirement: AI line choice
When a computer player chooses a line for an interchange, a transfer, or a wild card, it SHALL choose, from the options that card allows, the option that matches the most cards remaining in its hand. A card matches an option when it is on any of the option's lines. Ties SHALL be broken in a fixed order.

#### Scenario: Prefer line held most
- **GIVEN** a computer player holds three Kwun Tong Line cards and one Island Line card
- **WHEN** it plays an Octopus
- **THEN** it chooses the Kwun Tong Line

#### Scenario: Shared-track option
- **GIVEN** the current line is the Northern, and a computer player holds one Piccadilly card, one Circle card, and one Metropolitan card besides King's Cross St Pancras
- **WHEN** it plays King's Cross St Pancras
- **THEN** it chooses Circle, Hammersmith & City and Metropolitan together
