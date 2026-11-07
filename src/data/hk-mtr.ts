import type { NetworkDef } from './network';

/**
 * Hong Kong MTR heavy rail, from MTR's system map.
 *
 * - Light Rail is excluded.
 * - The Disneyland Resort Line (branch from Sunny Bay) and the Airport Express
 *   (branch from Tsing Yi) are merged into the Tung Chung Line (game decision, to
 *   keep the game playable). That line is labelled TCL · DRL · AEL. Hong Kong,
 *   Kowloon, Tsing Yi and Sunny Bay are therefore single-line stations here.
 * - Stations under construction (e.g. Tung Chung East) are excluded.
 * - Walkway pairs are separate stations joined by transfers (game decision):
 *   Hong Kong ↔ Central and Tsim Sha Tsui ↔ East Tsim Sha Tsui.
 * - Line colours and Chinese names reviewed and confirmed (task 2.3, 2026-11-07).
 */
export const hongKongMtr: NetworkDef = {
  id: 'hk-mtr',
  name: { en: 'Hong Kong MTR', zh: '香港港鐵' },
  stations: {
    // Island Line
    'kennedy-town': { en: 'Kennedy Town', zh: '堅尼地城' },
    hku: { en: 'HKU', zh: '香港大學' },
    'sai-ying-pun': { en: 'Sai Ying Pun', zh: '西營盤' },
    'sheung-wan': { en: 'Sheung Wan', zh: '上環' },
    central: { en: 'Central', zh: '中環' },
    admiralty: { en: 'Admiralty', zh: '金鐘' },
    'wan-chai': { en: 'Wan Chai', zh: '灣仔' },
    'causeway-bay': { en: 'Causeway Bay', zh: '銅鑼灣' },
    'tin-hau': { en: 'Tin Hau', zh: '天后' },
    'fortress-hill': { en: 'Fortress Hill', zh: '炮台山' },
    'north-point': { en: 'North Point', zh: '北角' },
    'quarry-bay': { en: 'Quarry Bay', zh: '鰂魚涌' },
    'tai-koo': { en: 'Tai Koo', zh: '太古' },
    'sai-wan-ho': { en: 'Sai Wan Ho', zh: '西灣河' },
    'shau-kei-wan': { en: 'Shau Kei Wan', zh: '筲箕灣' },
    'heng-fa-chuen': { en: 'Heng Fa Chuen', zh: '杏花邨' },
    'chai-wan': { en: 'Chai Wan', zh: '柴灣' },
    // Tsuen Wan Line
    'tsim-sha-tsui': { en: 'Tsim Sha Tsui', zh: '尖沙咀' },
    jordan: { en: 'Jordan', zh: '佐敦' },
    'yau-ma-tei': { en: 'Yau Ma Tei', zh: '油麻地' },
    'mong-kok': { en: 'Mong Kok', zh: '旺角' },
    'prince-edward': { en: 'Prince Edward', zh: '太子' },
    'sham-shui-po': { en: 'Sham Shui Po', zh: '深水埗' },
    'cheung-sha-wan': { en: 'Cheung Sha Wan', zh: '長沙灣' },
    'lai-chi-kok': { en: 'Lai Chi Kok', zh: '荔枝角' },
    'mei-foo': { en: 'Mei Foo', zh: '美孚' },
    'lai-king': { en: 'Lai King', zh: '荔景' },
    'kwai-fong': { en: 'Kwai Fong', zh: '葵芳' },
    'kwai-hing': { en: 'Kwai Hing', zh: '葵興' },
    'tai-wo-hau': { en: 'Tai Wo Hau', zh: '大窩口' },
    'tsuen-wan': { en: 'Tsuen Wan', zh: '荃灣' },
    // Kwun Tong Line
    whampoa: { en: 'Whampoa', zh: '黃埔' },
    'ho-man-tin': { en: 'Ho Man Tin', zh: '何文田' },
    'shek-kip-mei': { en: 'Shek Kip Mei', zh: '石硤尾' },
    'kowloon-tong': { en: 'Kowloon Tong', zh: '九龍塘' },
    'lok-fu': { en: 'Lok Fu', zh: '樂富' },
    'wong-tai-sin': { en: 'Wong Tai Sin', zh: '黃大仙' },
    'diamond-hill': { en: 'Diamond Hill', zh: '鑽石山' },
    'choi-hung': { en: 'Choi Hung', zh: '彩虹' },
    'kowloon-bay': { en: 'Kowloon Bay', zh: '九龍灣' },
    'ngau-tau-kok': { en: 'Ngau Tau Kok', zh: '牛頭角' },
    'kwun-tong': { en: 'Kwun Tong', zh: '觀塘' },
    'lam-tin': { en: 'Lam Tin', zh: '藍田' },
    'yau-tong': { en: 'Yau Tong', zh: '油塘' },
    'tiu-keng-leng': { en: 'Tiu Keng Leng', zh: '調景嶺' },
    // Tseung Kwan O Line
    'tseung-kwan-o': { en: 'Tseung Kwan O', zh: '將軍澳' },
    'hang-hau': { en: 'Hang Hau', zh: '坑口' },
    'po-lam': { en: 'Po Lam', zh: '寶琳' },
    'lohas-park': { en: 'LOHAS Park', zh: '康城' },
    // Tung Chung Line (+ Disneyland and Airport Express branches)
    'hong-kong': { en: 'Hong Kong', zh: '香港' },
    kowloon: { en: 'Kowloon', zh: '九龍' },
    olympic: { en: 'Olympic', zh: '奧運' },
    'nam-cheong': { en: 'Nam Cheong', zh: '南昌' },
    'tsing-yi': { en: 'Tsing Yi', zh: '青衣' },
    'sunny-bay': { en: 'Sunny Bay', zh: '欣澳' },
    'tung-chung': { en: 'Tung Chung', zh: '東涌' },
    'disneyland-resort': { en: 'Disneyland Resort', zh: '迪士尼' },
    // Airport Express branch
    airport: { en: 'Airport', zh: '機場' },
    'asiaworld-expo': { en: 'AsiaWorld-Expo', zh: '博覽館' },
    // East Rail Line
    'exhibition-centre': { en: 'Exhibition Centre', zh: '會展' },
    'hung-hom': { en: 'Hung Hom', zh: '紅磡' },
    'mong-kok-east': { en: 'Mong Kok East', zh: '旺角東' },
    'tai-wai': { en: 'Tai Wai', zh: '大圍' },
    'sha-tin': { en: 'Sha Tin', zh: '沙田' },
    'fo-tan': { en: 'Fo Tan', zh: '火炭' },
    racecourse: { en: 'Racecourse', zh: '馬場' },
    university: { en: 'University', zh: '大學' },
    'tai-po-market': { en: 'Tai Po Market', zh: '大埔墟' },
    'tai-wo': { en: 'Tai Wo', zh: '太和' },
    fanling: { en: 'Fanling', zh: '粉嶺' },
    'sheung-shui': { en: 'Sheung Shui', zh: '上水' },
    'lo-wu': { en: 'Lo Wu', zh: '羅湖' },
    'lok-ma-chau': { en: 'Lok Ma Chau', zh: '落馬洲' },
    // Tuen Ma Line
    'wu-kai-sha': { en: 'Wu Kai Sha', zh: '烏溪沙' },
    'ma-on-shan': { en: 'Ma On Shan', zh: '馬鞍山' },
    'heng-on': { en: 'Heng On', zh: '恆安' },
    'tai-shui-hang': { en: 'Tai Shui Hang', zh: '大水坑' },
    'shek-mun': { en: 'Shek Mun', zh: '石門' },
    'city-one': { en: 'City One', zh: '第一城' },
    'sha-tin-wai': { en: 'Sha Tin Wai', zh: '沙田圍' },
    'che-kung-temple': { en: 'Che Kung Temple', zh: '車公廟' },
    'hin-keng': { en: 'Hin Keng', zh: '顯徑' },
    'kai-tak': { en: 'Kai Tak', zh: '啟德' },
    'sung-wong-toi': { en: 'Sung Wong Toi', zh: '宋皇臺' },
    'to-kwa-wan': { en: 'To Kwa Wan', zh: '土瓜灣' },
    'east-tsim-sha-tsui': { en: 'East Tsim Sha Tsui', zh: '尖東' },
    austin: { en: 'Austin', zh: '柯士甸' },
    'tsuen-wan-west': { en: 'Tsuen Wan West', zh: '荃灣西' },
    'kam-sheung-road': { en: 'Kam Sheung Road', zh: '錦上路' },
    'yuen-long': { en: 'Yuen Long', zh: '元朗' },
    'long-ping': { en: 'Long Ping', zh: '朗屏' },
    'tin-shui-wai': { en: 'Tin Shui Wai', zh: '天水圍' },
    'siu-hong': { en: 'Siu Hong', zh: '兆康' },
    'tuen-mun': { en: 'Tuen Mun', zh: '屯門' },
    // South Island Line
    'ocean-park': { en: 'Ocean Park', zh: '海洋公園' },
    'wong-chuk-hang': { en: 'Wong Chuk Hang', zh: '黃竹坑' },
    'lei-tung': { en: 'Lei Tung', zh: '利東' },
    'south-horizons': { en: 'South Horizons', zh: '海怡半島' },
  },
  transfers: [
    { from: 'hong-kong', to: 'central' },
    { from: 'central', to: 'hong-kong' },
    { from: 'tsim-sha-tsui', to: 'east-tsim-sha-tsui' },
    { from: 'east-tsim-sha-tsui', to: 'tsim-sha-tsui' },
  ],
  lines: [
    {
      code: 'ISL',
      name: { en: 'Island Line', zh: '港島綫' },
      colour: '#007DC5',
      trunk: [
        'kennedy-town', 'hku', 'sai-ying-pun', 'sheung-wan', 'central', 'admiralty', 'wan-chai',
        'causeway-bay', 'tin-hau', 'fortress-hill', 'north-point', 'quarry-bay', 'tai-koo',
        'sai-wan-ho', 'shau-kei-wan', 'heng-fa-chuen', 'chai-wan',
      ],
    },
    {
      code: 'TWL',
      name: { en: 'Tsuen Wan Line', zh: '荃灣綫' },
      colour: '#E2231A',
      trunk: [
        'central', 'admiralty', 'tsim-sha-tsui', 'jordan', 'yau-ma-tei', 'mong-kok', 'prince-edward',
        'sham-shui-po', 'cheung-sha-wan', 'lai-chi-kok', 'mei-foo', 'lai-king', 'kwai-fong',
        'kwai-hing', 'tai-wo-hau', 'tsuen-wan',
      ],
    },
    {
      code: 'KTL',
      name: { en: 'Kwun Tong Line', zh: '觀塘綫' },
      colour: '#00AB4E',
      trunk: [
        'whampoa', 'ho-man-tin', 'yau-ma-tei', 'mong-kok', 'prince-edward', 'shek-kip-mei',
        'kowloon-tong', 'lok-fu', 'wong-tai-sin', 'diamond-hill', 'choi-hung', 'kowloon-bay',
        'ngau-tau-kok', 'kwun-tong', 'lam-tin', 'yau-tong', 'tiu-keng-leng',
      ],
    },
    {
      code: 'TKL',
      name: { en: 'Tseung Kwan O Line', zh: '將軍澳綫' },
      colour: '#7D499D',
      trunk: ['north-point', 'quarry-bay', 'yau-tong', 'tiu-keng-leng', 'tseung-kwan-o', 'hang-hau', 'po-lam'],
      branches: [{ from: 'tseung-kwan-o', stations: ['lohas-park'] }],
    },
    {
      code: 'TCL',
      name: { en: 'Tung Chung / Disneyland / Airport Line', zh: '東涌綫 / 迪士尼綫 / 機場快綫' },
      colour: '#F7943E',
      // Coverage drives the line strip: AEL shares the track from Hong Kong to Tsing Yi.
      labels: [
        {
          code: 'TCL',
          colour: '#F7943E',
          stations: ['hong-kong', 'kowloon', 'olympic', 'nam-cheong', 'lai-king', 'tsing-yi', 'sunny-bay', 'tung-chung'],
        },
        { code: 'DRL', colour: '#E777CB', stations: ['sunny-bay', 'disneyland-resort'] },
        {
          code: 'AEL',
          colour: '#00888A',
          stations: ['hong-kong', 'kowloon', 'olympic', 'nam-cheong', 'lai-king', 'tsing-yi', 'airport', 'asiaworld-expo'],
        },
      ],
      trunk: ['hong-kong', 'kowloon', 'olympic', 'nam-cheong', 'lai-king', 'tsing-yi', 'sunny-bay', 'tung-chung'],
      branches: [
        { from: 'sunny-bay', stations: ['disneyland-resort'] },
        { from: 'tsing-yi', stations: ['airport', 'asiaworld-expo'] },
      ],
    },
    {
      code: 'EAL',
      name: { en: 'East Rail Line', zh: '東鐵綫' },
      colour: '#5EB6E4',
      trunk: [
        'admiralty', 'exhibition-centre', 'hung-hom', 'mong-kok-east', 'kowloon-tong', 'tai-wai',
        'sha-tin', 'fo-tan', 'university', 'tai-po-market', 'tai-wo', 'fanling', 'sheung-shui', 'lo-wu',
      ],
      branches: [
        // Racecourse is a loop: it leaves at Sha Tin and rejoins at University, bypassing Fo Tan.
        { from: 'sha-tin', to: 'university', stations: ['racecourse'] },
        { from: 'sheung-shui', stations: ['lok-ma-chau'] },
      ],
    },
    {
      code: 'TML',
      name: { en: 'Tuen Ma Line', zh: '屯馬綫' },
      colour: '#923011',
      trunk: [
        'wu-kai-sha', 'ma-on-shan', 'heng-on', 'tai-shui-hang', 'shek-mun', 'city-one', 'sha-tin-wai',
        'che-kung-temple', 'tai-wai', 'hin-keng', 'diamond-hill', 'kai-tak', 'sung-wong-toi',
        'to-kwa-wan', 'ho-man-tin', 'hung-hom', 'east-tsim-sha-tsui', 'austin', 'nam-cheong',
        'mei-foo', 'tsuen-wan-west', 'kam-sheung-road', 'yuen-long', 'long-ping', 'tin-shui-wai',
        'siu-hong', 'tuen-mun',
      ],
    },
    {
      code: 'SIL',
      name: { en: 'South Island Line', zh: '南港島綫' },
      colour: '#BAC429',
      trunk: ['admiralty', 'ocean-park', 'wong-chuk-hang', 'lei-tung', 'south-horizons'],
    },
  ],
};
