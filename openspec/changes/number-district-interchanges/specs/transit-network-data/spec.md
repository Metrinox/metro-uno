# Spec Delta

## ADDED Requirements

### Requirement: Shared-track lines
A network MAY name a set of lines that share track. When deciding whether a station is an interchange, those lines SHALL count as one line. A station served only by shared-track lines SHALL NOT be an interchange, however many of them serve it. A station also served by any other line SHALL be an interchange. Loading SHALL fail if the set names an unknown line or names fewer than two lines.

#### Scenario: Station on two shared-track lines
- **GIVEN** a network names lines A and B as shared-track lines, and station X is served only by A and B
- **WHEN** X is inspected
- **THEN** X is not an interchange, and it is served by both A and B

#### Scenario: Shared-track station on another line
- **GIVEN** a network names lines A and B as shared-track lines, and station Y is served by A, B, and C
- **WHEN** Y is inspected
- **THEN** Y is an interchange with no number

#### Scenario: Networks without shared-track lines
- **WHEN** a Hong Kong station served by two lines, such as North Point, is inspected
- **THEN** it is an interchange with no number

#### Scenario: Invalid shared-track set
- **WHEN** a network names an unknown line as a shared-track line
- **THEN** loading fails with an error naming the line

### Requirement: Numbering groups
A network with shared-track lines SHALL sort every station on those lines into exactly one numbering group. Each group SHALL list its stations in order, with branches like a line. Its plain stations SHALL be numbered 1, 2, 3, and so on in that order, skipping interchanges, as a line is. A group station SHALL have that number on every line that serves it.

#### Scenario: Group numbering
- **GIVEN** a group lists stations P, Q, R in that order, and Q is an interchange
- **WHEN** their numbers are looked up
- **THEN** P is 1, Q has no number, and R is 2

### Requirement: Numbering group validation
Loading SHALL fail if a station on a shared-track line is in no group or in more than one, or if a group lists a station that no shared-track line serves.

#### Scenario: Station left out of every group
- **WHEN** a network has a station on a shared-track line that is in no group
- **THEN** loading fails with an error naming the station

### Requirement: London subsurface lines share track
The London network SHALL name the Circle, Hammersmith & City, Metropolitan, and District as shared-track lines.

#### Scenario: Two subsurface lines only
- **WHEN** Sloane Square and Goldhawk Road are inspected
- **THEN** neither is an interchange; Sloane Square is on the Circle and District, and Goldhawk Road on the Circle and Hammersmith & City

#### Scenario: Subsurface station with another line
- **WHEN** Victoria is inspected
- **THEN** it is an interchange of the Circle, District, and Victoria lines, with no number

#### Scenario: Interchange count
- **WHEN** the London network is loaded
- **THEN** exactly 34 of its 136 stations are interchanges

### Requirement: London numbering groups
The London network SHALL have five numbering groups, sorted by which subsurface lines serve each station:

| Group | Circle | Hammersmith & City | Metropolitan | District |
|---|---|---|---|---|
| 1 | yes | yes | no | no |
| 2 | any | any | yes | no |
| 3 | no | yes | no | yes |
| 4 | yes | no | no | yes |
| 5 | no | no | no | yes |

Paddington and Edgware Road (Circle) are served by the Circle, Hammersmith & City, and District. They SHALL be in group 1.

#### Scenario: Every subsurface station in its group
- **WHEN** each London station on a subsurface line is checked against the table
- **THEN** it is in the group its subsurface lines give, or in group 1 if it is Paddington or Edgware Road (Circle)

#### Scenario: Group interchanges unnumbered
- **WHEN** Paddington, Baker Street, Mile End, and Earl's Court are inspected
- **THEN** each is an interchange with no number

### Requirement: London group numbering order
London's groups SHALL be numbered from their west or north end:
- group 1: Hammersmith (H&C) to Edgware Road (Circle);
- group 2: Finchley Road to Aldgate;
- group 3: Aldgate East to West Ham;
- group 4: Bayswater to Tower Hill;
- group 5: Turnham Green to Earl's Court, then the Wimbledon branch to East Putney, then Kensington (Olympia).

#### Scenario: Group numbers
- **WHEN** the numbers of Hammersmith (H&C), Edgware Road (Circle), Aldgate, Aldgate East, Sloane Square, Tower Hill, Turnham Green, and Kensington (Olympia) are looked up
- **THEN** they are 1, 9, 5, 1, 3, 10, 1, and 10

## MODIFIED Requirements

### Requirement: London Underground line set
The London network SHALL contain exactly these lines: Bakerloo, Central, Circle, District, Hammersmith & City, Jubilee, Metropolitan, Northern, Piccadilly, and Victoria. Waterloo & City SHALL NOT be included. No London Overground, Elizabeth line, DLR, tram, or National Rail line SHALL be included.

#### Scenario: Line list
- **WHEN** the London network is loaded
- **THEN** it contains exactly the 10 lines listed above, and none of them is Waterloo & City, Overground, Elizabeth line, DLR, or tram

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
- **THEN** it is an interchange of the District, Hammersmith & City, and Jubilee lines

### Requirement: London walkway transfers
Both Hammersmith stations SHALL be in the London network as separate stations. The Hammersmith served by the Circle and Hammersmith & City and the Hammersmith served by the District and Piccadilly lines SHALL transfer to each other. Bank and Monument SHALL transfer to each other.

#### Scenario: Hammersmith both ways
- **WHEN** the two Hammersmith stations are inspected
- **THEN** the Circle and Hammersmith & City station is numbered and has transfer lines District and Piccadilly; the District/Piccadilly station is an interchange with transfer lines Circle and Hammersmith & City

#### Scenario: Bank and Monument
- **WHEN** Bank and Monument are inspected
- **THEN** Bank has transfer lines Circle and District, and Monument has transfer lines Central and Northern

### Requirement: Interchange stations derived from line membership
A station SHALL be an interchange exactly when it appears on two or more lines, counting a network's shared-track lines as one line (see Shared-track lines). Each station SHALL be one entity no matter how many lines serve it.

#### Scenario: Admiralty is a four-line interchange
- **WHEN** Admiralty station is inspected
- **THEN** it is an interchange served by the Island, Tsuen Wan, East Rail, and South Island lines

#### Scenario: Single-line station
- **WHEN** a station that appears on only one line is inspected
- **THEN** it is not an interchange

### Requirement: Station numbers skip interchanges
Each line SHALL list its stations in order from one fixed terminus. Interchange stations SHALL have no number. The line's other stations SHALL be numbered 1, 2, 3, and so on in that order, skipping the interchanges. On a shared-track line, a station takes its numbering group's number instead (see Numbering groups).

#### Scenario: Interchange at the start of a line
- **GIVEN** the East Rail Line is listed from Admiralty, which is an interchange
- **WHEN** the numbers of Admiralty and Exhibition Centre are looked up
- **THEN** Admiralty has no number and Exhibition Centre is 1

#### Scenario: Interchange in the middle of a line
- **GIVEN** on the East Rail Line, Exhibition Centre is 1 and Hung Hom, the next station, is an interchange
- **WHEN** the number of Mong Kok East, the station after Hung Hom, is looked up
- **THEN** it is 2

#### Scenario: Shared-track line takes group numbers
- **WHEN** the Circle numbers of Royal Oak and Sloane Square are looked up
- **THEN** they are 8 (group 1) and 3 (group 4)

### Requirement: Unique numbers on branched lines
A line with branches SHALL number its main route to its main terminus first, then each branch in a fixed order, carrying on the count. No two stations on the same line SHALL share a number. On a shared-track line, two of its stations MAY share a number only when they are in different numbering groups.

#### Scenario: Tseung Kwan O Line branch
- **WHEN** the numbers of Hang Hau, Po Lam, and LOHAS Park are looked up
- **THEN** all three are different, and LOHAS Park's number is one more than Po Lam's

#### Scenario: East Rail Line Racecourse loop
- **WHEN** the numbers of Fo Tan and Racecourse are looked up
- **THEN** they are different

#### Scenario: Repeated numbers on the District
- **WHEN** the District numbers of Whitechapel and High Street Kensington are looked up
- **THEN** both are 2, one in group 3 and one in group 4

## REMOVED Requirements

### Requirement: Circle, Hammersmith & City, and Metropolitan merged
**Reason**: The three lines are separate lines again, and the subsurface lines share track through numbering groups instead.
**Migration**: See "London Underground line set", "London subsurface lines share track" and "London numbering groups".
