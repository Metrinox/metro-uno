# transit-network-data Specification

## Purpose

Describes a city's metro network (lines, official colours, ordered stations, bilingual names, and interchanges) in a form the game can turn into a deck. Hong Kong MTR heavy rail is the first network.

## Requirements

### Requirement: Hong Kong heavy rail line set
The Hong Kong network SHALL contain exactly these lines: Island, Tsuen Wan, Kwun Tong, Tseung Kwan O, Tung Chung (with Disneyland and Airport Express merged in), East Rail, Tuen Ma, and South Island. Light Rail SHALL NOT be included.

#### Scenario: Line list
- **WHEN** the Hong Kong network is loaded
- **THEN** it contains exactly the 8 lines listed above, and none of them is Light Rail

### Requirement: Disneyland Resort and Airport Express merged into Tung Chung Line
The Tung Chung Line SHALL include the Disneyland Resort Line as a branch from Sunny Bay and the Airport Express as a branch from Tsing Yi (Airport, AsiaWorld-Expo). Neither SHALL appear as a separate line. Stations served only by these three SHALL NOT be interchanges.

#### Scenario: Disneyland Resort station belongs to Tung Chung Line
- **WHEN** the Hong Kong network is loaded
- **THEN** Disneyland Resort station is listed on the Tung Chung Line, and no line named Disneyland Resort Line exists

#### Scenario: Airport Express stations belong to Tung Chung Line
- **WHEN** the Hong Kong network is loaded
- **THEN** Airport and AsiaWorld-Expo are on the Tung Chung Line, and no separate Airport Express line exists

#### Scenario: Kowloon and Tsing Yi are not interchanges
- **WHEN** Hong Kong, Kowloon, and Tsing Yi stations are inspected
- **THEN** each is served only by the Tung Chung Line, is not an interchange, and has a number

### Requirement: Walkway transfers
A network MAY define transfers from one station to another station joined by a walkway. A transfer SHALL give the "from" station the other station's lines (those it does not already serve) as its transfer lines. A transfer SHALL NOT change whether either station is an interchange, and numbered stations keep their numbers. Hong Kong and Central SHALL transfer to each other, as SHALL Tsim Sha Tsui and East Tsim Sha Tsui.

#### Scenario: Hong Kong to Central
- **WHEN** Hong Kong station is inspected
- **THEN** it is a single-line Tung Chung Line station numbered 1, with transfer lines Island and Tsuen Wan

#### Scenario: Central to Hong Kong
- **WHEN** Central station is inspected
- **THEN** it is still an Island / Tsuen Wan interchange, with transfer line Tung Chung

#### Scenario: Tsim Sha Tsui both ways
- **WHEN** Tsim Sha Tsui and East Tsim Sha Tsui are inspected
- **THEN** Tsim Sha Tsui has transfer line Tuen Ma, and East Tsim Sha Tsui has transfer line Tsuen Wan

#### Scenario: Invalid transfer
- **WHEN** a network defines a transfer to an unknown station, or to a station with no other line
- **THEN** loading fails with an error naming the transfer

### Requirement: Multi-part line labels
A line MAY carry several display labels, each a short code and colour. The merged Tung Chung Line SHALL be labelled TCL, DRL, and AEL in their own colours. Labels are for display only; the line is still one line for matching.

#### Scenario: Tung Chung Line labels
- **WHEN** the Tung Chung Line is inspected
- **THEN** it has the labels TCL, DRL, and AEL, each with its own colour

### Requirement: Label coverage
Each label MAY list the stations its service runs through on the line, including stations it passes without stopping. A label with no list SHALL cover the whole line. On the Tung Chung Line, TCL SHALL cover Hong Kong to Tung Chung, DRL SHALL cover Sunny Bay to Disneyland Resort, and AEL SHALL cover Hong Kong to Tsing Yi plus Airport and AsiaWorld-Expo.

#### Scenario: Shared section
- **WHEN** the section between Kowloon and Olympic is checked
- **THEN** it is covered by TCL and AEL

#### Scenario: Branch sections
- **WHEN** the sections Sunny Bay–Disneyland Resort and Tsing Yi–Airport are checked
- **THEN** the first is covered only by DRL and the second only by AEL

### Requirement: Line identity and colour
Each line SHALL have a unique short code, an English name, and a display colour matching the operator's official line colour. A line MAY also have a Traditional Chinese name. Every Hong Kong line SHALL have one.

#### Scenario: Line metadata present
- **WHEN** any line in a network is inspected
- **THEN** it has a unique code, a non-empty English name, and a colour value, and, if it is a Hong Kong line, a non-empty Chinese name

### Requirement: Station numbers skip interchanges
Each line SHALL list its stations in order from one fixed terminus. Interchange stations SHALL have no number. The line's other stations SHALL be numbered 1, 2, 3, and so on in that order, skipping the interchanges.

#### Scenario: Interchange at the start of a line
- **GIVEN** the East Rail Line is listed from Admiralty, which is an interchange
- **WHEN** the numbers of Admiralty and Exhibition Centre are looked up
- **THEN** Admiralty has no number and Exhibition Centre is 1

#### Scenario: Interchange in the middle of a line
- **GIVEN** on the East Rail Line, Exhibition Centre is 1 and Hung Hom, the next station, is an interchange
- **WHEN** the number of Mong Kok East, the station after Hung Hom, is looked up
- **THEN** it is 2

### Requirement: Unique numbers on branched lines
A line with branches SHALL number its main route to its main terminus first, then each branch in a fixed order, carrying on the count. No two stations on the same line SHALL share a number.

#### Scenario: Tseung Kwan O Line branch
- **WHEN** the numbers of Hang Hau, Po Lam, and LOHAS Park are looked up
- **THEN** all three are different, and LOHAS Park's number is one more than Po Lam's

#### Scenario: East Rail Line Racecourse loop
- **WHEN** the numbers of Fo Tan and Racecourse are looked up
- **THEN** they are different

### Requirement: Branches that rejoin the line
A branch MAY name a station where it rejoins the line, making it a loop alongside the main route. The rejoin station SHALL be on the line, and SHALL NOT be the station the branch leaves from. Racecourse SHALL be a loop that leaves the East Rail Line at Sha Tin and rejoins at University.

#### Scenario: Racecourse loop
- **WHEN** the East Rail Line is inspected
- **THEN** Racecourse is on a branch from Sha Tin that rejoins at University

#### Scenario: Invalid rejoin
- **WHEN** a branch names a rejoin station that is not on the line, or is its own start station
- **THEN** loading fails with an error naming the line

#### Scenario: No repeats on any line
- **WHEN** the numbers on any line are listed
- **THEN** no number appears twice

### Requirement: Bilingual station names
Every station SHALL have an English name. A station MAY also have a Traditional Chinese name. Every Hong Kong station SHALL have one, and London stations SHALL have none.

#### Scenario: Station names present
- **WHEN** any station is inspected
- **THEN** its English name is non-empty, and, if it is a Hong Kong station, its Chinese name is non-empty

#### Scenario: London names are English only
- **WHEN** any London station is inspected
- **THEN** it has an English name and no Chinese name

### Requirement: Interchange stations derived from line membership
A station SHALL be an interchange exactly when it appears on two or more lines. Each station SHALL be one entity no matter how many lines serve it.

#### Scenario: Admiralty is a four-line interchange
- **WHEN** Admiralty station is inspected
- **THEN** it is an interchange served by the Island, Tsuen Wan, East Rail, and South Island lines

#### Scenario: Single-line station
- **WHEN** a station that appears on only one line is inspected
- **THEN** it is not an interchange

### Requirement: Network data validation
Loading a network SHALL fail with a clear error if a line names a station that does not exist, if a line has no stations, or if two lines share a code.

#### Scenario: Unknown station reference
- **WHEN** a network is loaded in which a line names a station that does not exist
- **THEN** loading fails with an error naming the line and the missing station

### Requirement: City-independent network format
The game SHALL take a network as data, so a new city can be added by supplying new network data without changing the game rules.

#### Scenario: Alternative network
- **WHEN** a small test network with two lines and one shared station is supplied
- **THEN** the game builds a deck from it and the game is playable

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
