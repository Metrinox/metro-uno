# Spec Delta

## ADDED Requirements

### Requirement: Shared-track line pairs
A network MAY name pairs of lines that share track, each pair listing a numbering line and a partner line. A station served by both lines of a pair SHALL still be an interchange, and SHALL also have a number: its number on the numbering line. Loading SHALL fail if a pair names an unknown line or the same line twice.

#### Scenario: Numbered interchange
- **GIVEN** a network pairs line A (numbering) with line B, and station X is served by A and B
- **WHEN** X is inspected
- **THEN** X is an interchange and has a number, which is its number on line A

#### Scenario: Unpaired interchanges keep no number
- **WHEN** a Hong Kong interchange such as Admiralty is inspected
- **THEN** it has no number

#### Scenario: Invalid pair
- **WHEN** a network names a shared-track pair with an unknown line
- **THEN** loading fails with an error naming the pair

### Requirement: London District shares track with the merged line
The London network SHALL pair the District (numbering line) with the merged Circle, Hammersmith & City and Metropolitan line. Every station served by both SHALL be a numbered interchange, whatever other lines also serve it.

#### Scenario: Two-line numbered interchange
- **WHEN** Tower Hill is inspected
- **THEN** it is an interchange of the District and the merged line, with District number 17

#### Scenario: Numbered interchange with a third line
- **WHEN** Victoria is inspected
- **THEN** it is an interchange of the District, Victoria, and merged lines, with District number 8

#### Scenario: Other London interchanges keep no number
- **WHEN** King's Cross St Pancras and Earl's Court are inspected
- **THEN** both are interchanges with no number

#### Scenario: Count of numbered interchanges
- **WHEN** the London network is loaded
- **THEN** exactly 25 stations are numbered interchanges

### Requirement: Numbering restarts
A line MAY name a station at which its numbering restarts at 1. The restart station SHALL be on the line and SHALL have a number. Loading SHALL fail otherwise.

#### Scenario: Invalid restart
- **WHEN** a line names a restart station that is not on the line, or is an interchange with no number
- **THEN** loading fails with an error naming the line

### Requirement: District numbering restarts at Aldgate East
The District SHALL number Turnham Green to Tower Hill as 1 to 17. It SHALL then restart at 1 at Aldgate East and continue through the rest of its main route and its branches to 18. No District number SHALL be higher than 18.

#### Scenario: Before and after the restart
- **WHEN** the District numbers of Turnham Green, Tower Hill, Aldgate East, and Kensington (Olympia) are looked up
- **THEN** they are 1, 17, 1, and 18

#### Scenario: Merged line numbering unchanged
- **WHEN** the merged line's own numbers are looked up
- **THEN** its single-line stations keep their numbers (Hammersmith 1 to Barbican 12, Aldgate 13), and its numbered interchanges carry their District numbers

## MODIFIED Requirements

### Requirement: Station numbers skip interchanges
Each line SHALL list its stations in order from one fixed terminus. Interchange stations SHALL have no number, except numbered interchanges (see Shared-track line pairs), which count on their numbering line. The line's other stations SHALL be numbered 1, 2, 3, and so on in that order, skipping the interchanges.

#### Scenario: Interchange at the start of a line
- **GIVEN** the East Rail Line is listed from Admiralty, which is an interchange
- **WHEN** the numbers of Admiralty and Exhibition Centre are looked up
- **THEN** Admiralty has no number and Exhibition Centre is 1

#### Scenario: Interchange in the middle of a line
- **GIVEN** on the East Rail Line, Exhibition Centre is 1 and Hung Hom, the next station, is an interchange
- **WHEN** the number of Mong Kok East, the station after Hung Hom, is looked up
- **THEN** it is 2

#### Scenario: Numbered interchanges count on their numbering line
- **GIVEN** on the District, West Kensington is 4, Earl's Court is an interchange with no number, and Gloucester Road is a numbered interchange
- **WHEN** the District numbers of Gloucester Road and South Kensington are looked up
- **THEN** they are 5 and 6

### Requirement: Unique numbers on branched lines
A line with branches SHALL number its main route to its main terminus first, then each branch in a fixed order, carrying on the count. No two stations on the same line SHALL share a number, except on a line whose numbering restarts (see Numbering restarts): there, no two stations SHALL share a number within the same run.

#### Scenario: Tseung Kwan O Line branch
- **WHEN** the numbers of Hang Hau, Po Lam, and LOHAS Park are looked up
- **THEN** all three are different, and LOHAS Park's number is one more than Po Lam's

#### Scenario: East Rail Line Racecourse loop
- **WHEN** the numbers of Fo Tan and Racecourse are looked up
- **THEN** they are different

#### Scenario: Repeated numbers on the District
- **WHEN** the District numbers of Gloucester Road and Bow Road are looked up
- **THEN** both are 5, one in each run
