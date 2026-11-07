# Spec Delta

## Purpose

Describes a city's metro network (lines, official colours, ordered stations, bilingual names, and interchanges) in a form the game can turn into a deck. Hong Kong MTR heavy rail is the first network.

## ADDED Requirements

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
Each line SHALL have a unique short code, an English name, a Traditional Chinese name, and a display colour matching MTR's official line colour.

#### Scenario: Line metadata present
- **WHEN** any line in the network is inspected
- **THEN** it has a unique code, a non-empty English name, a non-empty Chinese name, and a colour value

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
Every station SHALL have an English name and a Traditional Chinese name.

#### Scenario: Station names present
- **WHEN** any station is inspected
- **THEN** both its English and its Chinese name are non-empty

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
