import { generateUniqueName, resetNames } from './names';

// ─── Core Types ───────────────────────────────────────────────────────────────

export type CardData = { suit: string; value: string };

export type GamePhase = 'idle' | 'dealing' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export type PlayerData = {
  id: string;
  name: string;
  chips: number;
  cards: CardData[];
  bet: number;
  isActive: boolean;
  hasFolded: boolean;
  isHero: boolean;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  positionClass: string;
  alignLeft?: boolean;
  chipDir?: 'left' | 'right' | 'up' | 'down';
  lastAction?: 'fold' | 'check' | 'call' | 'raise' | null;
  lastRaiseAmount?: number;
};

export type TournamentPlayer = {
  id: string;
  name: string;
  chips: number;
  isHero: boolean;
  eliminated: boolean;
  position?: number;
  prize?: number;
};

export type HandResult = {
  rank: number;
  name: string;
  score: number;
  bestCards: CardData[];
};

export type BlindLevel = { small: number; big: number; ante: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['s', 'd', 'c', 'h'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const CARD_VAL: Record<string, number> = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14
};

export const BLIND_LEVELS: BlindLevel[] = [
  { small:25,  big:50,   ante:0   },
  { small:50,  big:100,  ante:0   },
  { small:75,  big:150,  ante:0   },
  { small:100, big:200,  ante:25  },
  { small:150, big:300,  ante:25  },
  { small:200, big:400,  ante:50  },
  { small:300, big:600,  ante:75  },
  { small:400, big:800,  ante:100 },
  { small:500, big:1000, ante:100 },
  { small:700, big:1400, ante:150 },
  { small:1000,big:2000, ante:200 },
  { small:1500,big:3000, ante:300 },
  { small:2000,big:4000, ante:500 },
];

export const PRIZE_TABLE = [
  { position:1,  prize:50000, label:'1°' },
  { position:2,  prize:30000, label:'2°' },
  { position:3,  prize:20000, label:'3°' },
  { position:4,  prize:12000, label:'4°' },
  { position:5,  prize:9000,  label:'5°' },
  { position:6,  prize:7000,  label:'6°' },
  { position:7,  prize:5500,  label:'7°' },
  { position:8,  prize:4500,  label:'8°' },
  { position:9,  prize:3500,  label:'9°' },
  { position:10, prize:3000,  label:'10°' },
  { position:11, prize:2500,  label:'11°' },
  { position:12, prize:2200,  label:'12°' },
  { position:13, prize:1900,  label:'13°' },
  { position:14, prize:1700,  label:'14°' },
  { position:15, prize:1500,  label:'15°' },
  { position:16, prize:1300,  label:'16°' },
  { position:17, prize:1200,  label:'17°' },
  { position:18, prize:1100,  label:'18°' },
  { position:19, prize:1000,  label:'19°' },
  { position:20, prize:900,   label:'20°' },
];

export const HANDS_PER_LEVEL = 15;

// ─── Deck Generation ─────────────────────────────────────────────────────────

export const generateDeck = (): CardData[] => {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// ─── Hand Evaluation ─────────────────────────────────────────────────────────

function getCombos5(cards: CardData[]): CardData[][] {
  const result: CardData[][] = [];
  const n = cards.length;
  for (let a = 0; a < n-4; a++)
  for (let b = a+1; b < n-3; b++)
  for (let c = b+1; c < n-2; c++)
  for (let d = c+1; d < n-1; d++)
  for (let e = d+1; e < n; e++)
    result.push([cards[a],cards[b],cards[c],cards[d],cards[e]]);
  return result;
}

function eval5(hand: CardData[]): HandResult {
  const vals = hand.map(c => CARD_VAL[c.value] || 0).sort((a,b) => b-a);
  const suits = hand.map(c => c.suit);
  const isF = new Set(suits).size === 1;
  let isS = vals[0]-vals[4] === 4 && new Set(vals).size === 5;
  let sHi = vals[0];
  if (!isS && vals[0]===14 && vals[1]===5 && vals[2]===4 && vals[3]===3 && vals[4]===2) {
    isS = true; sHi = 5;
  }
  const freq: Record<number,number> = {};
  vals.forEach(v => { freq[v] = (freq[v]||0)+1; });
  const grps = Object.entries(freq)
    .map(([v,c]) => ({ v:+v, c: c as number }))
    .sort((a,b) => b.c-a.c || b.v-a.v);
  const cnts = grps.map(g => g.c);
  const vs = grps.map(g => g.v);
  let rank: number, name: string, score: number;
  if      (isF&&isS&&sHi===14)        { rank=9; name='Escalera Real';    score=9e11; }
  else if (isF&&isS)                  { rank=8; name='Escalera de Color'; score=8e11+sHi; }
  else if (cnts[0]===4)               { rank=7; name='Poker';             score=7e11+vs[0]*100+vs[1]; }
  else if (cnts[0]===3&&cnts[1]===2)  { rank=6; name='Full House';        score=6e11+vs[0]*100+vs[1]; }
  else if (isF)                       { rank=5; name='Color';             score=5e11+vals.reduce((s,v,i)=>s+v*Math.pow(15,4-i),0); }
  else if (isS)                       { rank=4; name='Escalera';          score=4e11+sHi; }
  else if (cnts[0]===3)               { rank=3; name='Trío';              score=3e11+vs[0]*1e4+vs[1]*100+vs[2]; }
  else if (cnts[0]===2&&cnts[1]===2)  { rank=2; name='Doble Pareja';      score=2e11+Math.max(vs[0],vs[1])*1e4+Math.min(vs[0],vs[1])*100+vs[2]; }
  else if (cnts[0]===2)               { rank=1; name='Pareja';            score=1e11+vs[0]*1e6+vs[1]*1e4+vs[2]*100+vs[3]; }
  else                                { rank=0; name='Carta Alta';        score=vals.reduce((s,v,i)=>s+v*Math.pow(15,4-i),0); }
  return { rank, name, score, bestCards: hand };
}

export function getBestHand(hole: CardData[], community: CardData[]): HandResult {
  const all = [...hole, ...community];
  if (all.length < 5) return { rank:0, name:'Carta Alta', score:0, bestCards:all };
  const combos = all.length === 5 ? [all] : getCombos5(all);
  return combos.reduce((best, combo) => {
    const res = eval5(combo);
    return res.score > best.score ? res : best;
  }, eval5(combos[0]));
}

// ─── Pre-flop Hand Strength Estimate ─────────────────────────────────────────

export function estimateHandStrength(cards: CardData[]): number {
  if (cards.length < 2) return 0.3;
  const v1 = CARD_VAL[cards[0].value] || 0;
  const v2 = CARD_VAL[cards[1].value] || 0;
  const hi = Math.max(v1,v2), lo = Math.min(v1,v2);
  const isPair = v1 === v2;
  const isSuited = cards[0].suit === cards[1].suit;
  if (isPair) {
    if (hi>=14) return 1.00;
    if (hi>=13) return 0.95;
    if (hi>=12) return 0.90;
    if (hi>=11) return 0.85;
    if (hi>=10) return 0.78;
    if (hi>=8)  return 0.65;
    if (hi>=6)  return 0.52;
    return 0.40;
  }
  const premiums: Record<string,number> = {
    '14-13':0.85,'14-12':0.78,'14-11':0.72,'14-10':0.67,
    '13-12':0.70,'13-11':0.65,'13-10':0.60,'12-11':0.63,
    '12-10':0.58,'11-10':0.56,'11-9':0.50,'10-9':0.48,
  };
  const p = premiums[`${hi}-${lo}`];
  if (p) return Math.min(p + (isSuited ? 0.04 : 0), 1.0);
  const base = (hi + lo - 4) / 24;
  return Math.min(base + (isSuited ? 0.04 : 0) + (hi-lo<=2?0.03:0), 0.52);
}

// ─── Tournament Generation ────────────────────────────────────────────────────

export function generateTournamentPlayers(count: number): TournamentPlayer[] {
  resetNames();
  return Array.from({ length: count }, (_, i) => ({
    id: `tp-${i}`,
    name: i === 0 ? 'HERO' : generateUniqueName(),
    chips: 10000,
    isHero: i === 0,
    eliminated: false,
  }));
}

// Table positions for 6 players
export const TABLE_POSITIONS: Pick<PlayerData, 'positionClass' | 'alignLeft' | 'chipDir'>[] = [
  { positionClass: 'bottom-[3%] left-1/2 -translate-x-1/2', alignLeft: true,  chipDir: 'up'    },
  { positionClass: 'top-[60%] left-[2%]',                    alignLeft: true,  chipDir: 'right' },
  { positionClass: 'top-[20%] left-[4%]',                    alignLeft: true,  chipDir: 'right' },
  { positionClass: 'top-[2%]  left-1/2  -translate-x-1/2',  alignLeft: true,  chipDir: 'down'  },
  { positionClass: 'top-[20%] right-[4%]',                   alignLeft: false, chipDir: 'left'  },
  { positionClass: 'top-[60%] right-[2%]',                   alignLeft: false, chipDir: 'left'  },
];

export function buildTablePlayers(
  tournamentPlayers: TournamentPlayer[],
  heroIndex: number,
  dealerSeat: number
): PlayerData[] {
  const heroTp = tournamentPlayers[heroIndex];
  // Pick 5 opponents (non-eliminated, non-hero)
  const opponents = tournamentPlayers
    .filter(p => !p.isHero && !p.eliminated)
    .slice(0, 5);

  const seats = [heroTp, ...opponents];
  return seats.map((tp, i) => ({
    id: tp.id,
    name: tp.isHero ? 'TÚ (HERO)' : tp.name,
    chips: tp.chips,
    cards: [],
    bet: 0,
    isActive: true,
    hasFolded: false,
    isHero: tp.isHero,
    isDealer: i === dealerSeat,
    isSB: i === (dealerSeat + 1) % seats.length,
    isBB: i === (dealerSeat + 2) % seats.length,
    positionClass: TABLE_POSITIONS[i].positionClass,
    alignLeft: TABLE_POSITIONS[i].alignLeft,
    chipDir: TABLE_POSITIONS[i].chipDir,
  }));
}
