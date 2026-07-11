export const POKER_NAMES = [
  'AceHunter99','SilentBet42','GhostRiver','SharkBait22','BluffKing777','AllInAndy',
  'RiverRat88','PokerFace21','CheckRaiser','RunBadRex','FishFinder','TiltProof',
  'StackBuildr','NitPickr','LAGtastic','ButtonStealer','FlopHero','TurnGrinder',
  'RiverGod','PotOdds_X','EV_Pusher','HeroCallr','EquityEdge','RangeAdvntg',
  'SolverBot99','GTOFreq','ExploitMax','BetSizer_R','OverbetOr','BlockBet_B',
  'DonkBetDave','ContinuBet','BarrelGun','TripBrrlr','TightWin','LooseAgg',
  'AirSc00p','ForTheTwin','TwoBNotTwoB','DiagonAlley','MagicMike88','TripleJFTW',
  'PokerStar_X','CardSlinger','DeadMoneyD','BroadwaySt','NutFlushFr','BackdoorBo',
  'DrawHeavy','ComboDrawr','ICMShove','PushFold_X','FinalTblFr','BubbleBoy9',
  'CashOrCrash','PKOHunter','BountyShot','KnockoutK','KingOfDrtd','QueenHighQ',
  'JackPot_JJ','NineClubN','EightWayE','SevenDeutch','SixGunSlnr','FiveBetFr',
  'AceKicker_A','KingKicker','QueenKickr','DomHand_D','FlippingF','CoinFlipCl',
  'Hustler_H','Grinder_G','Shark_S99','Fish_F001','Whale_W888','Rock_R555',
  'Maniac_M77','NightOwlN','DawnRaidDr','LateNiteL','EarlyBirdE','ViennaVick',
  'BerlinBet','ParisPlay','LondonLuck','MadridMike','RomaBet_R','DublinDec',
  'BrusselsB','CopenKing','OsloOmaha','StockholmS','WarsawWin','PraguePoker',
  'BudapestB','AthenAces','MoscowMrk','RigaRaise','TalinnTilt','VilniusVpr',
  'TbilisiT','BakuBluff','AshgabtA','TashkentT','AlmatyAce','BishkekBet',
  'TehranT99','DubaiDeal','AbuDhabiA','DohaDouble','KuwaitKng','MuscatMss',
  'DarkHorse_D','NightStalker','SilverBullt','GoldenAce','IronFist99','SteelNerve',
  'ColdBlood_C','FrozenFace','StoneWall_S','DiamondHnd','RubyBluff','EmeraldBet',
  'SapphireAce','TopazKing','OnyxRaise','JadeFlush','PearlStraight','CoralFold',
  'AmberShove','QuartzPot','GraniteStack','MarbleBlind','SlateCheck','SlashBet',
  'CrashKing','BashRaise','DashFold','FlashCall','SmashPot','TrashHand',
  'CacheChips','HashCards','FluxBet99','VortexAce','NexusKing','PixelPoker',
  'ByteBluff','CodeRaise','DataFold','LogicCall','AlgoShove','NeuralAce',
  'QuantumBet','FusionKing','PlasmaPot','NovaStar_N','OrionBet','CassiopeiaC',
  'AndromedaA','PerseusPkr','HerculesH','OrpheusBet','AchillesAce','UlyssesU',
  'OdysseyO','TheseusTh','JasonJJ99','OrionOrn','MidasMike','AtlasAce99',
];

const usedSet = new Set<string>();

export function generateUniqueName(): string {
  const shuffled = [...POKER_NAMES].sort(() => Math.random() - 0.5);
  for (const name of shuffled) {
    if (!usedSet.has(name)) { usedSet.add(name); return name; }
  }
  const n = `Player${Math.floor(Math.random() * 9999)}`;
  usedSet.add(n);
  return n;
}

export function resetNames(): void {
  usedSet.clear();
}
