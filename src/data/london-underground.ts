import type { NetworkDef } from './network';

/**
 * London Underground, fare Zones 1–2, from TfL's Standard Tube Map and fare
 * zone data. Zones were cross-checked (2026-11) against Wikipedia's "List of
 * London Underground stations" table (which follows TfL's zone map).
 *
 * - Tube only: no Overground, Elizabeth line, DLR, trams or National Rail.
 *   Those services never make a station an interchange (e.g. West Brompton,
 *   Canary Wharf, Stratford's Central/Jubilee only).
 * - Every station in Zone 1 or 2 is included, as are Zone 2/3 boundary
 *   stations: Willesden Junction, Willesden Green, North Acton, Hampstead,
 *   Archway, Manor House, Stratford, West Ham, Canning Town, North Greenwich,
 *   Bromley-by-Bow, Turnham Green, East Putney and Clapham South.
 * - Regular-service stops only. Piccadilly trains run through Turnham Green,
 *   Stamford Brook and Ravenscourt Park without stopping (bar early/late
 *   trains), so those are District-only. Metropolitan trains in Zones 1–2 stop
 *   at Aldgate … Baker Street and Finchley Road only.
 * - Waterloo & City is left out (both its stations are interchanges anyway).
 * - Circle, Hammersmith & City and Metropolitan are merged into one line, code
 *   SSR, labelled CIR · H&C · MET (game decision, like Hong Kong's TCL · DRL · AEL).
 *   Its main route is the H&C; the Circle's southern half is a loop from
 *   Liverpool Street rejoining at Paddington; the Met is a spur from Baker Street.
 * - Kensington (Olympia) is kept as a District spur (game decision) although its
 *   District service is part-time.
 * - The two Hammersmiths and the two Edgware Roads are separate stations, as TfL
 *   treats them. The Hammersmiths are joined by a walkway transfer, as are Bank
 *   and Monument. The Edgware Roads have no transfer.
 * - Northern: the trunk is Hampstead → Charing Cross branch → Kennington → Clapham
 *   South (the Morden branch carries straight on); the Bank branch is a loop
 *   from Euston (where the two branches first meet going south from Camden
 *   Town) rejoining at Kennington.
 * - Each line is numbered from its north or west end within Zones 1–2.
 * - Colours: TfL colour standards. No Chinese names (game decision).
 */
export const londonUnderground: NetworkDef = {
  id: 'london-underground',
  name: { en: 'London Underground' },
  wilds: {
    wild: { name: { en: 'Oyster', zh: 'Oyster 卡' }, art: 'oyster' },
    draw4: { name: { en: 'Tube Strike', zh: '地鐵罷工' }, art: 'ring' },
  },
  stations: {
    // Bakerloo
    'willesden-junction': { en: 'Willesden Junction' },
    'kensal-green': { en: 'Kensal Green' },
    'queens-park': { en: "Queen's Park" },
    'kilburn-park': { en: 'Kilburn Park' },
    'maida-vale': { en: 'Maida Vale' },
    'warwick-avenue': { en: 'Warwick Avenue' },
    paddington: { en: 'Paddington' },
    'edgware-road-bakerloo': { en: 'Edgware Road' },
    marylebone: { en: 'Marylebone' },
    'baker-street': { en: 'Baker Street' },
    'regents-park': { en: "Regent's Park" },
    'oxford-circus': { en: 'Oxford Circus' },
    'piccadilly-circus': { en: 'Piccadilly Circus' },
    'charing-cross': { en: 'Charing Cross' },
    embankment: { en: 'Embankment' },
    waterloo: { en: 'Waterloo' },
    'lambeth-north': { en: 'Lambeth North' },
    'elephant-and-castle': { en: 'Elephant & Castle' },
    // Central
    'north-acton': { en: 'North Acton' },
    'east-acton': { en: 'East Acton' },
    'white-city': { en: 'White City' },
    'shepherds-bush': { en: "Shepherd's Bush" },
    'holland-park': { en: 'Holland Park' },
    'notting-hill-gate': { en: 'Notting Hill Gate' },
    queensway: { en: 'Queensway' },
    'lancaster-gate': { en: 'Lancaster Gate' },
    'marble-arch': { en: 'Marble Arch' },
    'bond-street': { en: 'Bond Street' },
    'tottenham-court-road': { en: 'Tottenham Court Road' },
    holborn: { en: 'Holborn' },
    'chancery-lane': { en: 'Chancery Lane' },
    'st-pauls': { en: "St Paul's" },
    bank: { en: 'Bank' },
    'liverpool-street': { en: 'Liverpool Street' },
    'bethnal-green': { en: 'Bethnal Green' },
    'mile-end': { en: 'Mile End' },
    stratford: { en: 'Stratford' },
    // Jubilee
    'willesden-green': { en: 'Willesden Green' },
    kilburn: { en: 'Kilburn' },
    'west-hampstead': { en: 'West Hampstead' },
    'finchley-road': { en: 'Finchley Road' },
    'swiss-cottage': { en: 'Swiss Cottage' },
    'st-johns-wood': { en: "St John's Wood" },
    'green-park': { en: 'Green Park' },
    westminster: { en: 'Westminster' },
    southwark: { en: 'Southwark' },
    'london-bridge': { en: 'London Bridge' },
    bermondsey: { en: 'Bermondsey' },
    'canada-water': { en: 'Canada Water' },
    'canary-wharf': { en: 'Canary Wharf' },
    'north-greenwich': { en: 'North Greenwich' },
    'canning-town': { en: 'Canning Town' },
    'west-ham': { en: 'West Ham' },
    // Northern
    hampstead: { en: 'Hampstead' },
    'belsize-park': { en: 'Belsize Park' },
    'chalk-farm': { en: 'Chalk Farm' },
    'camden-town': { en: 'Camden Town' },
    'mornington-crescent': { en: 'Mornington Crescent' },
    euston: { en: 'Euston' },
    'warren-street': { en: 'Warren Street' },
    'goodge-street': { en: 'Goodge Street' },
    'leicester-square': { en: 'Leicester Square' },
    kennington: { en: 'Kennington' },
    'kentish-town': { en: 'Kentish Town' },
    'tufnell-park': { en: 'Tufnell Park' },
    archway: { en: 'Archway' },
    'kings-cross-st-pancras': { en: "King's Cross St Pancras" },
    angel: { en: 'Angel' },
    'old-street': { en: 'Old Street' },
    moorgate: { en: 'Moorgate' },
    borough: { en: 'Borough' },
    oval: { en: 'Oval' },
    stockwell: { en: 'Stockwell' },
    'clapham-north': { en: 'Clapham North' },
    'clapham-common': { en: 'Clapham Common' },
    'clapham-south': { en: 'Clapham South' },
    'nine-elms': { en: 'Nine Elms' },
    'battersea-power-station': { en: 'Battersea Power Station' },
    // Piccadilly
    'hammersmith-dp': { en: 'Hammersmith' },
    'barons-court': { en: 'Barons Court' },
    'earls-court': { en: "Earl's Court" },
    'gloucester-road': { en: 'Gloucester Road' },
    'south-kensington': { en: 'South Kensington' },
    knightsbridge: { en: 'Knightsbridge' },
    'hyde-park-corner': { en: 'Hyde Park Corner' },
    'covent-garden': { en: 'Covent Garden' },
    'russell-square': { en: 'Russell Square' },
    'caledonian-road': { en: 'Caledonian Road' },
    'holloway-road': { en: 'Holloway Road' },
    arsenal: { en: 'Arsenal' },
    'finsbury-park': { en: 'Finsbury Park' },
    'manor-house': { en: 'Manor House' },
    // Victoria
    'highbury-and-islington': { en: 'Highbury & Islington' },
    victoria: { en: 'Victoria' },
    pimlico: { en: 'Pimlico' },
    vauxhall: { en: 'Vauxhall' },
    brixton: { en: 'Brixton' },
    // District
    'turnham-green': { en: 'Turnham Green' },
    'stamford-brook': { en: 'Stamford Brook' },
    'ravenscourt-park': { en: 'Ravenscourt Park' },
    'west-kensington': { en: 'West Kensington' },
    'sloane-square': { en: 'Sloane Square' },
    'st-jamess-park': { en: "St James's Park" },
    temple: { en: 'Temple' },
    blackfriars: { en: 'Blackfriars' },
    'mansion-house': { en: 'Mansion House' },
    'cannon-street': { en: 'Cannon Street' },
    monument: { en: 'Monument' },
    'tower-hill': { en: 'Tower Hill' },
    'aldgate-east': { en: 'Aldgate East' },
    whitechapel: { en: 'Whitechapel' },
    'stepney-green': { en: 'Stepney Green' },
    'bow-road': { en: 'Bow Road' },
    'bromley-by-bow': { en: 'Bromley-by-Bow' },
    'west-brompton': { en: 'West Brompton' },
    'fulham-broadway': { en: 'Fulham Broadway' },
    'parsons-green': { en: 'Parsons Green' },
    'putney-bridge': { en: 'Putney Bridge' },
    'east-putney': { en: 'East Putney' },
    'high-street-kensington': { en: 'High Street Kensington' },
    bayswater: { en: 'Bayswater' },
    'edgware-road-circle': { en: 'Edgware Road' },
    'kensington-olympia': { en: 'Kensington (Olympia)' },
    // Circle, Hammersmith & City and Metropolitan
    'hammersmith-hc': { en: 'Hammersmith' },
    'goldhawk-road': { en: 'Goldhawk Road' },
    'shepherds-bush-market': { en: "Shepherd's Bush Market" },
    'wood-lane': { en: 'Wood Lane' },
    'latimer-road': { en: 'Latimer Road' },
    'ladbroke-grove': { en: 'Ladbroke Grove' },
    'westbourne-park': { en: 'Westbourne Park' },
    'royal-oak': { en: 'Royal Oak' },
    'great-portland-street': { en: 'Great Portland Street' },
    'euston-square': { en: 'Euston Square' },
    farringdon: { en: 'Farringdon' },
    barbican: { en: 'Barbican' },
    aldgate: { en: 'Aldgate' },
  },
  transfers: [
    { from: 'hammersmith-hc', to: 'hammersmith-dp' },
    { from: 'hammersmith-dp', to: 'hammersmith-hc' },
    { from: 'bank', to: 'monument' },
    { from: 'monument', to: 'bank' },
  ],
  lines: [
    {
      code: 'BAK',
      name: { en: 'Bakerloo' },
      colour: '#B36305',
      trunk: [
        'willesden-junction', 'kensal-green', 'queens-park', 'kilburn-park', 'maida-vale', 'warwick-avenue',
        'paddington', 'edgware-road-bakerloo', 'marylebone', 'baker-street', 'regents-park', 'oxford-circus',
        'piccadilly-circus', 'charing-cross', 'embankment', 'waterloo', 'lambeth-north', 'elephant-and-castle',
      ],
    },
    {
      code: 'CEN',
      name: { en: 'Central' },
      colour: '#E32017',
      trunk: [
        'north-acton', 'east-acton', 'white-city', 'shepherds-bush', 'holland-park', 'notting-hill-gate',
        'queensway', 'lancaster-gate', 'marble-arch', 'bond-street', 'oxford-circus', 'tottenham-court-road',
        'holborn', 'chancery-lane', 'st-pauls', 'bank', 'liverpool-street', 'bethnal-green', 'mile-end', 'stratford',
      ],
    },
    {
      code: 'DIS',
      name: { en: 'District' },
      colour: '#00782A',
      trunk: [
        'turnham-green', 'stamford-brook', 'ravenscourt-park', 'hammersmith-dp', 'barons-court', 'west-kensington',
        'earls-court', 'gloucester-road', 'south-kensington', 'sloane-square', 'victoria', 'st-jamess-park',
        'westminster', 'embankment', 'temple', 'blackfriars', 'mansion-house', 'cannon-street', 'monument',
        'tower-hill', 'aldgate-east', 'whitechapel', 'stepney-green', 'mile-end', 'bow-road', 'bromley-by-bow',
        'west-ham',
      ],
      branches: [
        // Drawn as on the map: the Wimbledon branch heads south-west (below, to the left),
        // the Edgware Road branch north then east, and Olympia north-west.
        {
          from: 'earls-court',
          stations: ['west-brompton', 'fulham-broadway', 'parsons-green', 'putney-bridge', 'east-putney'],
          draw: { toward: 'left', side: 'below' },
        },
        {
          from: 'earls-court',
          stations: ['high-street-kensington', 'notting-hill-gate', 'bayswater', 'paddington', 'edgware-road-circle'],
        },
        { from: 'earls-court', stations: ['kensington-olympia'], draw: { toward: 'left' } },
      ],
    },
    {
      code: 'JUB',
      name: { en: 'Jubilee' },
      colour: '#A0A5A9',
      trunk: [
        'willesden-green', 'kilburn', 'west-hampstead', 'finchley-road', 'swiss-cottage', 'st-johns-wood',
        'baker-street', 'bond-street', 'green-park', 'westminster', 'waterloo', 'southwark', 'london-bridge',
        'bermondsey', 'canada-water', 'canary-wharf', 'north-greenwich', 'canning-town', 'west-ham', 'stratford',
      ],
    },
    {
      code: 'NOR',
      name: { en: 'Northern' },
      colour: '#000000',
      // Trunk: Edgware branch end, the Charing Cross branch to Kennington, then the
      // Morden branch (cut at Clapham South), so it is drawn straight on from Kennington.
      trunk: [
        'hampstead', 'belsize-park', 'chalk-farm', 'camden-town', 'mornington-crescent', 'euston', 'warren-street',
        'goodge-street', 'tottenham-court-road', 'leicester-square', 'charing-cross', 'embankment', 'waterloo',
        'kennington', 'oval', 'stockwell', 'clapham-north', 'clapham-common', 'clapham-south',
      ],
      branches: [
        // High Barnet branch, cut at Archway. Drawn heading north (left) beside the
        // Edgware branch end of the trunk, as both leave Camden Town northwards.
        { from: 'camden-town', stations: ['kentish-town', 'tufnell-park', 'archway'], draw: { toward: 'left' } },
        // Bank branch: a loop rejoining at Kennington.
        {
          from: 'euston',
          to: 'kennington',
          stations: [
            'kings-cross-st-pancras', 'angel', 'old-street', 'moorgate', 'bank', 'london-bridge', 'borough',
            'elephant-and-castle',
          ],
        },
        { from: 'kennington', stations: ['nine-elms', 'battersea-power-station'] },
      ],
    },
    {
      code: 'PIC',
      name: { en: 'Piccadilly' },
      colour: '#003688',
      trunk: [
        'hammersmith-dp', 'barons-court', 'earls-court', 'gloucester-road', 'south-kensington', 'knightsbridge',
        'hyde-park-corner', 'green-park', 'piccadilly-circus', 'leicester-square', 'covent-garden', 'holborn',
        'russell-square', 'kings-cross-st-pancras', 'caledonian-road', 'holloway-road', 'arsenal', 'finsbury-park',
        'manor-house',
      ],
    },
    {
      code: 'VIC',
      name: { en: 'Victoria' },
      colour: '#0098D4',
      trunk: [
        'finsbury-park', 'highbury-and-islington', 'kings-cross-st-pancras', 'euston', 'warren-street',
        'oxford-circus', 'green-park', 'victoria', 'pimlico', 'vauxhall', 'stockwell', 'brixton',
      ],
    },
    {
      code: 'SSR',
      name: { en: 'Circle, Hammersmith & City and Metropolitan' },
      colour: '#FFD300',
      // Coverage drives the line strip. MET runs through St John's Wood etc. without stopping,
      // and H&C passes Aldgate by (it leaves the Circle at Liverpool Street for Aldgate East).
      labels: [
        {
          code: 'CIR',
          colour: '#FFD300',
          stations: [
            'hammersmith-hc', 'goldhawk-road', 'shepherds-bush-market', 'wood-lane', 'latimer-road', 'ladbroke-grove',
            'westbourne-park', 'royal-oak', 'paddington', 'edgware-road-circle', 'baker-street',
            'great-portland-street', 'euston-square', 'kings-cross-st-pancras', 'farringdon', 'barbican', 'moorgate',
            'liverpool-street', 'aldgate', 'tower-hill', 'monument', 'cannon-street', 'mansion-house', 'blackfriars',
            'temple', 'embankment', 'westminster', 'st-jamess-park', 'victoria', 'sloane-square', 'south-kensington',
            'gloucester-road', 'high-street-kensington', 'notting-hill-gate', 'bayswater',
          ],
        },
        {
          code: 'H&C',
          colour: '#F3A9BB',
          stations: [
            'hammersmith-hc', 'goldhawk-road', 'shepherds-bush-market', 'wood-lane', 'latimer-road', 'ladbroke-grove',
            'westbourne-park', 'royal-oak', 'paddington', 'edgware-road-circle', 'baker-street',
            'great-portland-street', 'euston-square', 'kings-cross-st-pancras', 'farringdon', 'barbican', 'moorgate',
            'liverpool-street', 'aldgate-east', 'whitechapel', 'stepney-green', 'mile-end', 'bow-road',
            'bromley-by-bow', 'west-ham',
          ],
        },
        {
          code: 'MET',
          colour: '#9B0056',
          stations: [
            'aldgate', 'liverpool-street', 'moorgate', 'barbican', 'farringdon', 'kings-cross-st-pancras',
            'euston-square', 'great-portland-street', 'baker-street', 'finchley-road',
          ],
        },
      ],
      trunk: [
        'hammersmith-hc', 'goldhawk-road', 'shepherds-bush-market', 'wood-lane', 'latimer-road', 'ladbroke-grove',
        'westbourne-park', 'royal-oak', 'paddington', 'edgware-road-circle', 'baker-street', 'great-portland-street',
        'euston-square', 'kings-cross-st-pancras', 'farringdon', 'barbican', 'moorgate', 'liverpool-street',
        'aldgate-east', 'whitechapel', 'stepney-green', 'mile-end', 'bow-road', 'bromley-by-bow', 'west-ham',
      ],
      branches: [
        // Metropolitan, non-stop from Baker Street to Finchley Road.
        // Metropolitan to Finchley Road, drawn heading north-west (left) as on the map.
        { from: 'baker-street', stations: ['finchley-road'], draw: { toward: 'left' } },
        // Circle's southern half: a loop from Liverpool Street rejoining at Paddington.
        {
          from: 'liverpool-street',
          to: 'paddington',
          stations: [
            'aldgate', 'tower-hill', 'monument', 'cannon-street', 'mansion-house', 'blackfriars', 'temple',
            'embankment', 'westminster', 'st-jamess-park', 'victoria', 'sloane-square', 'south-kensington',
            'gloucester-road', 'high-street-kensington', 'notting-hill-gate', 'bayswater',
          ],
          // Drawn as on the map: the Circle's southern side runs below the trunk,
          // heading back west (left) to Paddington, closing the ring.
          draw: { toward: 'left', side: 'below' },
        },
      ],
    },
  ],
};
