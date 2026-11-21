# Spec Delta

## ADDED Requirements

### Requirement: Available networks
The game SHALL offer a fixed set of networks: Hong Kong MTR and London Underground Zones 1–2. Each network SHALL have a unique id and a name. Hong Kong SHALL be the default wherever no network has been chosen.

#### Scenario: Network list
- **WHEN** the available networks are listed
- **THEN** there are exactly two, Hong Kong MTR first and London Underground second, with different ids

#### Scenario: Unknown network id
- **WHEN** a network is looked up by an id that is not in the list
- **THEN** no network is returned, and callers fall back to Hong Kong

### Requirement: London Underground line set
The London network SHALL contain exactly these lines: Bakerloo, Central, District, Jubilee, Northern, Piccadilly, Victoria, and one line merging the Circle, Hammersmith & City, and Metropolitan lines. Waterloo & City SHALL NOT be included. No London Overground, Elizabeth line, DLR, tram, or National Rail line SHALL be included.

#### Scenario: Line list
- **WHEN** the London network is loaded
- **THEN** it contains exactly the 8 lines listed above, and none of them is Waterloo & City, Overground, Elizabeth line, DLR, or tram

### Requirement: London stations limited to Zones 1 and 2
The London network SHALL contain exactly the stations that are in fare Zone 1 or Zone 2, including stations on a Zone 2/3 boundary, and are served by an included line. A station counts as served by a line only if that line's trains stop there in regular service, except that Kensington (Olympia) SHALL be included on the District line although its District service is part-time. Services and lines that are left out SHALL NOT make a station an interchange.

#### Scenario: Outer stations left out
- **WHEN** the London network is loaded
- **THEN** Wembley Park, Wimbledon, and Heathrow are not in it

#### Scenario: Boundary stations kept
- **WHEN** the London network is loaded
- **THEN** Stratford, Turnham Green, and East Putney are in it

#### Scenario: Excluded lines do not make interchanges
- **WHEN** West Brompton and Waterloo are inspected
- **THEN** West Brompton is a single-line District station with a number, and Waterloo is an interchange of only the Bakerloo, Jubilee, and Northern lines

#### Scenario: Peak-only stop ignored
- **WHEN** Turnham Green is inspected
- **THEN** it is a single-line District station with a number, although Piccadilly trains stop there early and late

#### Scenario: Kensington (Olympia) kept
- **WHEN** Kensington (Olympia) is inspected
- **THEN** it is a single-line District station with a number

#### Scenario: West Ham
- **WHEN** West Ham is inspected
- **THEN** it is an interchange of the District, Jubilee, and merged lines

### Requirement: Circle, Hammersmith & City, and Metropolitan merged
The Circle, Hammersmith & City, and Metropolitan lines SHALL be one line for matching, labelled CIR, H&C, and MET, each in its own official colour. Each label SHALL cover the stations its service runs through within Zones 1–2. No separate Circle, Hammersmith & City, or Metropolitan line SHALL exist.

#### Scenario: Merged labels
- **WHEN** the merged line is inspected
- **THEN** it has the labels CIR, H&C, and MET, each with its own colour

#### Scenario: Stations only on the merged line are numbered
- **WHEN** Royal Oak, Great Portland Street, and Aldgate are inspected
- **THEN** each is served only by the merged line, is not an interchange, and has a number

#### Scenario: Label coverage
- **WHEN** the sections Baker Street–Finchley Road, Hammersmith–Paddington, and Aldgate East–Bromley-by-Bow are checked
- **THEN** the first is covered only by MET, the second by CIR and H&C, and the third only by H&C

### Requirement: London walkway transfers
Both Hammersmith stations SHALL be in the London network as separate stations. The Hammersmith served by the merged line and the Hammersmith served by the District and Piccadilly lines SHALL transfer to each other. Bank and Monument SHALL transfer to each other.

#### Scenario: Hammersmith both ways
- **WHEN** the two Hammersmith stations are inspected
- **THEN** the merged-line station is numbered and has transfer lines District and Piccadilly, and the District/Piccadilly station is an interchange with the merged line as its transfer line

#### Scenario: Bank and Monument
- **WHEN** Bank and Monument are inspected
- **THEN** Bank has transfer lines District and the merged line, and Monument has transfer lines Central and Northern

### Requirement: Network wild-card theme
Each network SHALL name its wild card and its wild + draw 4 card, each with an English name and an optional Chinese name. Hong Kong's SHALL be Octopus (八達通) and Typhoon Signal No. 8 (八號風球). London's SHALL be Oyster and Tube Strike.

#### Scenario: London wild names
- **WHEN** the London network's wild-card theme is inspected
- **THEN** the wild is named Oyster and the wild + draw 4 is named Tube Strike

## MODIFIED Requirements

### Requirement: Line identity and colour
Each line SHALL have a unique short code, an English name, and a display colour matching the operator's official line colour. A line MAY also have a Traditional Chinese name. Every Hong Kong line SHALL have one.

#### Scenario: Line metadata present
- **WHEN** any line in a network is inspected
- **THEN** it has a unique code, a non-empty English name, and a colour value, and, if it is a Hong Kong line, a non-empty Chinese name

### Requirement: Bilingual station names
Every station SHALL have an English name. A station MAY also have a Traditional Chinese name. Every Hong Kong station SHALL have one, and London stations SHALL have none.

#### Scenario: Station names present
- **WHEN** any station is inspected
- **THEN** its English name is non-empty, and, if it is a Hong Kong station, its Chinese name is non-empty

#### Scenario: London names are English only
- **WHEN** any London station is inspected
- **THEN** it has an English name and no Chinese name
