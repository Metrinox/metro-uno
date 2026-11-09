import type { LocalizedName } from '../data/network';
import type { ActionType, WildType } from '../engine/cards';
import type { RejectReason } from '../engine/game';
import type { ErrorCode, LobbyRejectReason } from '../shared/protocol';

export type Lang = 'en' | 'zh';
export const LANGS: readonly Lang[] = ['en', 'zh'];
const STORAGE_KEY = 'metro-uno.lang';

/** `who` is the display name; `you` is true when it refers to the human player. */
type Who = { who: string; you: boolean };

export interface Dict {
  title: string;
  subtitle: string;
  opponents: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  switchToLight: string;
  switchToDark: string;
  start: string;
  you: string;
  computer: (n: number) => string;
  cards: (n: number) => string;
  draw: string;
  pass: string;
  uno: string;
  unoArmed: string;
  drawPile: string;
  currentLine: string;
  direction: string;
  clockwise: string;
  anticlockwise: string;
  yourTurn: string;
  theirTurn: (who: string) => string;
  drawnHint: string;
  chooseLine: string;
  cancel: string;
  interchange: string;
  transferTo: (station: string) => string;
  playAgain: string;
  backToSetup: string;
  menu: string;
  /** An online player whose connection has dropped. */
  away: string;
  winner: (w: Who) => string;
  houseRules: string;
  galleryTitle: string;
  galleryIntro: (cards: number, lines: number) => string;
  linesHeading: string;
  stationCount: (n: number) => string;
  cardsHeading: string;
  interchangesGroup: string;
  wildsGroup: string;
  backToGame: string;
  defaultValue: (v: string) => string;
  on: string;
  off: string;
  startingCards: string;
  fewerCards: string;
  moreCards: string;
  drawUntilPlayable: string;
  drawUntilPlayableHint: string;
  playDrawnCard: string;
  playDrawnCardHint: string;
  playDrawnCardNA: string;
  mixStacking: string;
  mixStackingHint: string;
  sameNumbers: string;
  sameNumbersHint: string;
  playUntilLast: string;
  playUntilLastHint: string;
  /** Finishing place, e.g. "2nd". */
  place: (n: number) => string;
  standings: string;
  youFinished: (place: number) => string;
  resetRules: string;
  drawN: (n: number) => string;
  pendingYou: (n: number) => string;
  mustPlayHint: string;
  sameNumberTitle: (n: number) => string;
  sameNumberAdd: string;
  endOn: string;
  play: string;
  actionName: Record<ActionType, string>;
  wildName: Record<WildType, string>;
  rejected: Record<RejectReason, string>;
  online: OnlineDict;
  ev: {
    played: (w: Who, card: string) => string;
    lineChanged: (line: string) => string;
    unoCalled: (w: Who) => string;
    drew: (w: Who, n: number) => string;
    penalty: (w: Who, n: number) => string;
    skipped: (w: Who) => string;
    reversed: string;
    reshuffled: string;
    passed: (w: Who) => string;
    drawPending: (w: Who, n: number) => string;
    finished: (w: Who, place: number) => string;
  };
}

/** Strings for online play: the online menu, the lobby, and connection messages. */
export interface OnlineDict {
  playOnline: string;
  menuTitle: string;
  intro: string;
  yourName: string;
  createRoom: string;
  orJoin: string;
  roomCode: string;
  join: string;
  back: string;
  nameRequired: string;
  codeInvalid: string;
  lobbyTitle: string;
  shareLink: string;
  copyLink: string;
  copied: string;
  seats: string;
  emptySeat: string;
  addComputer: string;
  remove: string;
  removeWho: (who: string) => string;
  host: string;
  rulesByHost: string;
  needTwo: string;
  waitingForHost: string;
  waitingNextRound: string;
  leaveRoom: string;
  backToLobby: string;
  connecting: string;
  reconnecting: string;
  unavailable: string;
  errors: Record<ErrorCode, string>;
  lobbyRejected: Record<LobbyRejectReason, string>;
}

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

const en: Dict = {
  title: 'Metro Uno',
  subtitle: 'Hong Kong MTR',
  opponents: 'Computer opponents',
  language: 'Language',
  theme: 'Appearance',
  light: 'Light',
  dark: 'Dark',
  switchToLight: 'Switch to light mode',
  switchToDark: 'Switch to dark mode',
  start: 'Start',
  you: 'You',
  computer: (n) => `Computer ${n}`,
  cards: (n) => (n === 1 ? '1 card' : `${n} cards`),
  draw: 'Draw',
  pass: 'Pass',
  uno: 'UNO!',
  unoArmed: 'UNO! called',
  drawPile: 'Draw pile',
  currentLine: 'Current line',
  direction: 'Direction',
  clockwise: 'Clockwise',
  anticlockwise: 'Anticlockwise',
  yourTurn: 'Your turn',
  theirTurn: (who) => `${who}’s turn`,
  drawnHint: 'You drew a playable card: play it or pass.',
  chooseLine: 'Change to which line?',
  cancel: 'Cancel',
  interchange: 'Interchange',
  transferTo: (station) => `Walkway transfer to ${station}`,
  playAgain: 'Play again',
  backToSetup: 'Back to setup',
  menu: 'Setup',
  away: 'away',
  winner: ({ who, you }) => (you ? 'You win!' : `${who} wins`),
  houseRules: 'House rules',
  galleryTitle: 'Card & line gallery',
  galleryIntro: (cards, lines) => `All ${cards} cards in the deck and all ${lines} lines.`,
  linesHeading: 'Lines',
  stationCount: (n) => `${n} stations`,
  cardsHeading: 'Cards',
  interchangesGroup: 'Interchanges',
  wildsGroup: 'Wild cards',
  backToGame: '← Back to the game',
  defaultValue: (v) => `Default: ${v}`,
  on: 'On',
  off: 'Off',
  startingCards: 'Starting cards',
  fewerCards: 'Fewer starting cards',
  moreCards: 'More starting cards',
  drawUntilPlayable: 'Draw until you can play',
  drawUntilPlayableHint: 'Off: draw 1 card. On: keep drawing until a card can be played, then play it.',
  playDrawnCard: 'Play the card you drew',
  playDrawnCardHint: 'When drawing 1 card, you may play it straight away if it matches.',
  playDrawnCardNA: 'Not used when drawing until you can play.',
  mixStacking: 'Stack +2 with +4',
  mixStackingHint: 'Rush Hour (+2) and Typhoon No. 8 (+4) can be stacked on each other. Same-type stacking is always allowed.',
  sameNumbers: 'Play same numbers together',
  sameNumbersHint: 'Play several station cards with the same number in one turn.',
  playUntilLast: 'Play until one player is left',
  playUntilLastHint: 'When someone goes out, the others keep playing for places. Off: the first player out ends the round.',
  place: ordinal,
  standings: 'Standings',
  youFinished: (place) => `You finished ${ordinal(place)}. The others play on.`,
  resetRules: 'Reset to defaults',
  drawN: (n) => `Draw ${n}`,
  pendingYou: (n) => `${n} cards coming your way: stack a +2/+4 or draw ${n}.`,
  mustPlayHint: 'Play the card you drew.',
  sameNumberTitle: (n) => `Play other ${n}s too?`,
  sameNumberAdd: 'Add these cards',
  endOn: 'Finish on (sets the line)',
  play: 'Play',
  actionName: { 'signal-fault': 'Signal Fault', terminus: 'Terminus', 'rush-hour': 'Rush Hour' },
  wildName: { octopus: 'Octopus', typhoon: 'Typhoon Signal No. 8' },
  rejected: {
    'game-over': 'The round is over.',
    'not-your-turn': 'Wait for your turn.',
    'unknown-player': 'Unknown player.',
    'card-not-in-hand': 'That card is not in your hand.',
    'not-playable': 'That card doesn’t match the current line or number.',
    'must-play-drawn-card-or-pass': 'Play the card you drew, or pass.',
    'line-choice-required': 'Choose a line.',
    'invalid-line': 'That line isn’t available for this card.',
    'already-drew': 'You already drew this turn.',
    'cannot-pass': 'Draw a card before passing.',
    'must-play-drawn-card': 'You must play the card you drew.',
    'cannot-play-together': 'Those cards can’t be played together.',
  },
  online: {
    playOnline: 'Play online',
    menuTitle: 'Play online',
    intro: 'Play with friends on their own phones or computers. Create a room and share the link, or join with a room code.',
    yourName: 'Your name',
    createRoom: 'Create room',
    orJoin: 'Or join a room',
    roomCode: 'Room code',
    join: 'Join',
    back: 'Back',
    nameRequired: 'Enter your name first.',
    codeInvalid: 'Room codes are 4 letters or digits.',
    lobbyTitle: 'Room',
    shareLink: 'Share this link with friends',
    copyLink: 'Copy link',
    copied: 'Copied',
    seats: 'Seats',
    emptySeat: 'Empty seat',
    addComputer: 'Add computer',
    remove: 'Remove',
    removeWho: (who) => `Remove ${who}`,
    host: 'Host',
    rulesByHost: 'The host chooses the house rules.',
    needTwo: 'At least 2 players are needed to start.',
    waitingForHost: 'Waiting for the host to start the round.',
    waitingNextRound: 'The host will start the next round.',
    leaveRoom: 'Leave room',
    backToLobby: 'Back to lobby',
    connecting: 'Connecting…',
    reconnecting: 'Connection lost. Reconnecting…',
    unavailable: 'Online play is unavailable right now. You can still play against the computer.',
    errors: {
      'room-not-found': 'Room not found. Check the code and try again.',
      'room-full': 'That room is full.',
      'in-progress': 'A round is in progress in that room. Try again when it ends.',
      kicked: 'The host removed you from the room.',
      'bad-message': 'Something went wrong. Please try again.',
      version: 'The game has been updated. Please reload the page.',
      'session-expired': 'Your seat in that room is no longer available.',
    },
    lobbyRejected: {
      'not-host': 'Only the host can do that.',
      'not-in-lobby': 'That can only be done in the lobby.',
      'not-enough-players': 'At least 2 players are needed to start.',
      'seat-taken': 'That seat is taken.',
      'seat-empty': 'That seat is already empty.',
      'not-playing': 'No round is in progress.',
    },
  },
  ev: {
    played: ({ who }, card) => `${who} played ${card}`,
    lineChanged: (line) => `Now on the ${line}`,
    unoCalled: ({ who }) => `${who} called UNO!`,
    drew: ({ who }, n) => `${who} drew ${n === 1 ? 'a card' : `${n} cards`}`,
    penalty: ({ who, you }, n) => `${who} forgot to call UNO! ${you ? 'You draw' : 'Draws'} ${n} penalty card${n === 1 ? '' : 's'}`,
    skipped: ({ who, you }) => (you ? 'You are skipped' : `${who} is skipped`),
    reversed: 'Direction reversed',
    reshuffled: 'Discard pile reshuffled into the draw pile',
    passed: ({ who }) => `${who} passed`,
    drawPending: ({ who, you }, n) => `${n} cards pending: ${you ? 'you must' : `${who} must`} stack or draw`,
    finished: ({ who }, place) => `${who} went out in ${ordinal(place)} place`,
  },
};

const zh: Dict = {
  title: '地鐵 UNO',
  subtitle: '香港港鐵',
  opponents: '電腦對手',
  language: '語言',
  theme: '外觀',
  light: '淺色',
  dark: '深色',
  switchToLight: '切換至淺色模式',
  switchToDark: '切換至深色模式',
  start: '開始',
  you: '你',
  computer: (n) => `電腦 ${n}`,
  cards: (n) => `${n} 張`,
  draw: '抽牌',
  pass: '過',
  uno: 'UNO!',
  unoArmed: '已叫 UNO!',
  drawPile: '牌堆',
  currentLine: '目前路綫',
  direction: '方向',
  clockwise: '順時針',
  anticlockwise: '逆時針',
  yourTurn: '輪到你',
  theirTurn: (who) => `輪到${who}`,
  drawnHint: '你抽到可以出的牌：出牌或過。',
  chooseLine: '轉乘哪條路綫？',
  cancel: '取消',
  interchange: '轉車站',
  transferTo: (station) => `經行人通道轉乘${station}`,
  playAgain: '再玩一局',
  backToSetup: '返回設定',
  menu: '設定',
  away: '離線',
  winner: ({ who, you }) => (you ? '你贏了！' : `${who}贏了`),
  houseRules: '自訂規則',
  galleryTitle: '卡牌及路綫一覽',
  galleryIntro: (cards, lines) => `牌堆全部 ${cards} 張牌及全部 ${lines} 條路綫。`,
  linesHeading: '路綫',
  stationCount: (n) => `${n} 個站`,
  cardsHeading: '卡牌',
  interchangesGroup: '轉車站',
  wildsGroup: '萬用牌',
  backToGame: '← 返回遊戲',
  defaultValue: (v) => `預設：${v}`,
  on: '開',
  off: '關',
  startingCards: '起始手牌',
  fewerCards: '減少起始手牌',
  moreCards: '增加起始手牌',
  drawUntilPlayable: '抽到可出的牌為止',
  drawUntilPlayableHint: '關：只抽 1 張。開：一直抽到有可出的牌，然後必須出那張牌。',
  playDrawnCard: '可以出剛抽到的牌',
  playDrawnCardHint: '只抽 1 張時，如果那張牌相符，可以立即打出。',
  playDrawnCardNA: '「抽到可出的牌為止」開啟時不適用。',
  mixStacking: '+2 與 +4 可以疊加',
  mixStackingHint: '繁忙時間（+2）和八號風球（+4）可以互相疊加。同類卡永遠可以疊加。',
  sameNumbers: '同號碼可以一起出',
  sameNumbersHint: '一回合內可以打出多張相同號碼的車站卡。',
  playUntilLast: '打到剩低一個玩家',
  playUntilLastHint: '有人出完牌後，其他玩家繼續爭名次。關閉：第一個出完牌就結束。',
  place: (n) => `第 ${n} 名`,
  standings: '名次',
  youFinished: (place) => `你得到第 ${place} 名，其他玩家繼續。`,
  resetRules: '回復預設',
  drawN: (n) => `抽 ${n} 張`,
  pendingYou: (n) => `有 ${n} 張牌要你抽：疊加 +2/+4，或抽 ${n} 張。`,
  mustPlayHint: '必須出剛抽到的牌。',
  sameNumberTitle: (n) => `一起出其他 ${n} 號？`,
  sameNumberAdd: '加入這些牌',
  endOn: '最後一張（決定路綫）',
  play: '出牌',
  actionName: { 'signal-fault': '訊號故障', terminus: '總站', 'rush-hour': '繁忙時間' },
  wildName: { octopus: '八達通', typhoon: '八號風球' },
  rejected: {
    'game-over': '這局已經結束。',
    'not-your-turn': '請等你的回合。',
    'unknown-player': '未知玩家。',
    'card-not-in-hand': '這張牌不在你手上。',
    'not-playable': '這張牌與目前路綫或號碼不符。',
    'must-play-drawn-card-or-pass': '出剛抽到的牌，或選擇過。',
    'line-choice-required': '請選擇路綫。',
    'invalid-line': '這張牌不能轉到該路綫。',
    'already-drew': '你這回合已經抽過牌。',
    'cannot-pass': '要先抽牌才可以過。',
    'must-play-drawn-card': '你必須出剛抽到的牌。',
    'cannot-play-together': '這些牌不能一起出。',
  },
  online: {
    playOnline: '網上對戰',
    menuTitle: '網上對戰',
    intro: '和朋友用各自的手機或電腦一起玩。開設房間並分享連結，或輸入房間號碼加入。',
    yourName: '你的名字',
    createRoom: '開設房間',
    orJoin: '或加入房間',
    roomCode: '房間號碼',
    join: '加入',
    back: '返回',
    nameRequired: '請先輸入你的名字。',
    codeInvalid: '房間號碼是 4 個英文字母或數字。',
    lobbyTitle: '房間',
    shareLink: '把這個連結分享給朋友',
    copyLink: '複製連結',
    copied: '已複製',
    seats: '座位',
    emptySeat: '空位',
    addComputer: '加入電腦',
    remove: '移除',
    removeWho: (who) => `移除${who}`,
    host: '房主',
    rulesByHost: '由房主設定房規。',
    needTwo: '最少要有 2 位玩家才可以開始。',
    waitingForHost: '等待房主開始這局。',
    waitingNextRound: '房主會開始下一局。',
    leaveRoom: '離開房間',
    backToLobby: '返回房間',
    connecting: '連線中…',
    reconnecting: '連線中斷，正在重新連線…',
    unavailable: '暫時無法網上對戰。你仍然可以和電腦玩。',
    errors: {
      'room-not-found': '找不到房間。請檢查號碼再試。',
      'room-full': '房間已滿。',
      'in-progress': '房間正在進行一局。請在這局結束後再試。',
      kicked: '房主把你移出了房間。',
      'bad-message': '出了問題，請再試一次。',
      version: '遊戲已更新，請重新載入頁面。',
      'session-expired': '你在該房間的座位已不再保留。',
    },
    lobbyRejected: {
      'not-host': '只有房主可以這樣做。',
      'not-in-lobby': '只可以在房間大廳這樣做。',
      'not-enough-players': '最少要有 2 位玩家才可以開始。',
      'seat-taken': '這個座位已有人。',
      'seat-empty': '這個座位已經是空的。',
      'not-playing': '目前沒有進行中的牌局。',
    },
  },
  ev: {
    played: ({ who }, card) => `${who}出了${card}`,
    lineChanged: (line) => `現在是${line}`,
    unoCalled: ({ who }) => `${who}叫了 UNO！`,
    drew: ({ who }, n) => `${who}抽了 ${n} 張牌`,
    penalty: ({ who }, n) => `${who}忘記叫 UNO！罰抽 ${n} 張`,
    skipped: ({ who }) => `${who}被跳過`,
    reversed: '方向反轉',
    reshuffled: '棄牌已洗回牌堆',
    passed: ({ who }) => `${who}選擇過`,
    drawPending: ({ who }, n) => `${who}要疊加或抽 ${n} 張`,
    finished: ({ who }, place) => `${who}出完牌，得到第 ${place} 名`,
  },
};

export const dictionaries: Record<Lang, Dict> = { en, zh };

export function localName(name: LocalizedName, lang: Lang): string {
  return name[lang];
}

/** Reads the saved language; any storage failure falls back to English. */
export function loadLang(storage: () => Storage | undefined = () => globalThis.localStorage): Lang {
  try {
    const v = storage()?.getItem(STORAGE_KEY);
    return v === 'zh' || v === 'en' ? v : 'en';
  } catch {
    return 'en';
  }
}

/** Saves the language; storage failures are ignored. */
export function saveLang(lang: Lang, storage: () => Storage | undefined = () => globalThis.localStorage): void {
  try {
    storage()?.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
}
