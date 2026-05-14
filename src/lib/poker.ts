export type CardData = { suit: string; value: string };

export type PlayerData = {
  id: string;
  name: string;
  chips: number;
  cards: CardData[];
  bet: number;
  isActive: boolean;
  isHero: boolean;
  isDealer: boolean;
  positionClass: string;
  alignLeft?: boolean;
};

export type GamePhase = 'idle' | 'dealing' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

const SUITS = ['s', 'd', 'c', 'h'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const generateDeck = (): CardData[] => {
  const deck: CardData[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const INITIAL_PLAYERS: PlayerData[] = [
  { id: 'hero', name: 'TÚ (HERO)', chips: 50000, cards: [], bet: 0, isActive: true, isHero: true, isDealer: true, positionClass: 'bottom-[2%] left-1/2 -translate-x-1/2', alignLeft: true },
  { id: 'p2', name: 'AirSc00p', chips: 20000, cards: [], bet: 0, isActive: true, isHero: false, isDealer: false, positionClass: 'top-[60%] left-[2%]', alignLeft: true },
  { id: 'p3', name: 'ForTheTwin', chips: 31000, cards: [], bet: 0, isActive: true, isHero: false, isDealer: false, positionClass: 'top-[25%] left-[2%]', alignLeft: true },
  { id: 'p4', name: 'TwoBNotTwoB', chips: 44000, cards: [], bet: 0, isActive: true, isHero: false, isDealer: false, positionClass: 'top-[0%] left-1/2 -translate-x-1/2', alignLeft: true },
  { id: 'p5', name: 'DiagonAlley', chips: 25000, cards: [], bet: 0, isActive: true, isHero: false, isDealer: false, positionClass: 'top-[25%] right-[2%]', alignLeft: false },
  { id: 'p6', name: 'MagicMike', chips: 52000, cards: [], bet: 0, isActive: true, isHero: false, isDealer: false, positionClass: 'top-[60%] right-[2%]', alignLeft: false },
];
