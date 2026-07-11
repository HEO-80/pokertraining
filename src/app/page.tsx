'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { RotateCcw, Play, Clock, Users, Trophy, X } from 'lucide-react';
import PokerTable from '@/components/PokerTable';
import TournamentPanel from '@/components/TournamentPanel';
import BettingPanel from '@/components/BettingPanel';
import {
  generateDeck, buildTablePlayers, generateTournamentPlayers,
  getBestHand, estimateHandStrength,
  CardData, PlayerData, TournamentPlayer, GamePhase,
  BLIND_LEVELS, HANDS_PER_LEVEL, TABLE_POSITIONS,
} from '@/lib/poker';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const TABLE_IMAGES = [
  { id: 'mesa1', name: 'Clásica', path: '/img/mesa.png'  },
  { id: 'mesa2', name: 'Noche',   path: '/img/mesa2.png' },
  { id: 'mesa3', name: 'Stars',   path: '/img/mesa3.png' },
];

const INITIAL_PLAYERS: PlayerData[] = [
  {
    id: 'hero', name: 'TÚ (HERO)', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: true, isDealer: true, isSB: false, isBB: false,
    positionClass: TABLE_POSITIONS[0].positionClass, alignLeft: true, chipDir: 'up',
  },
  {
    id: 'p1', name: 'AirSc00p', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: false, isDealer: false, isSB: true, isBB: false,
    positionClass: TABLE_POSITIONS[1].positionClass, alignLeft: true, chipDir: 'right',
  },
  {
    id: 'p2', name: 'ForTheTwin', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: false, isDealer: false, isSB: false, isBB: true,
    positionClass: TABLE_POSITIONS[2].positionClass, alignLeft: true, chipDir: 'right',
  },
  {
    id: 'p3', name: 'TwoBNotTwoB', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: false, isDealer: false, isSB: false, isBB: false,
    positionClass: TABLE_POSITIONS[3].positionClass, alignLeft: true, chipDir: 'down',
  },
  {
    id: 'p4', name: 'DiagonAlley', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: false, isDealer: false, isSB: false, isBB: false,
    positionClass: TABLE_POSITIONS[4].positionClass, alignLeft: false, chipDir: 'left',
  },
  {
    id: 'p5', name: 'MagicMike', chips: 10000, cards: [], bet: 0,
    isActive: true, hasFolded: false, isHero: false, isDealer: false, isSB: false, isBB: false,
    positionClass: TABLE_POSITIONS[5].positionClass, alignLeft: false, chipDir: 'left',
  },
];

// Helper: clear lastAction from all players
function clearActions(pl: PlayerData[]): PlayerData[] {
  return pl.map(p => ({ ...p, lastAction: null as PlayerData['lastAction'], lastRaiseAmount: undefined }));
}

export default function PokerGame() {
  const [phase,          setPhase]        = useState<GamePhase>('idle');
  const [deck,           setDeck]         = useState<CardData[]>([]);
  const [players,        setPlayers]      = useState<PlayerData[]>(INITIAL_PLAYERS);
  const [communityCards, setComCards]     = useState<CardData[]>([]);
  const [pot,            setPot]          = useState(0);
  const [currentBet,     setCurrentBet]   = useState(0);
  const [betAmount,      setBetAmount]    = useState(0);
  const [actionLog,      setActionLog]    = useState<string[]>(['Pulsa INICIAR TORNEO para comenzar.']);
  const [heroCanAct,     setHeroCanAct]   = useState(false);
  const [heroTimeLeft,   setHeroTimeLeft] = useState(30);
  const [winnerIds,      setWinnerIds]    = useState<string[]>([]);
  const [winMsg,         setWinMsg]       = useState('');
  const [tableImage,     setTableImage]   = useState('/img/mesa.png');
  const [showTableSel,   setShowTableSel] = useState(false);
  const [showRankings,   setShowRankings] = useState(false);
  const [showPanel,      setShowPanel]    = useState(true);
  const [currentActorId, setActorId]      = useState<string | null>(null);

  const [tournamentStarted, setTournamentStarted] = useState(false);
  const [tourPlayers,       setTourPlayers]        = useState<TournamentPlayer[]>([]);
  const [blindLevel,        setBlindLevel]         = useState(0);
  const [handNumber,        setHandNumber]         = useState(0);
  const [handsUntilUp,      setHandsUntilUp]       = useState(HANDS_PER_LEVEL);

  const isRunning = useRef(false);

  const log = useCallback((msg: string) => {
    setActionLog(prev => [msg, ...prev].slice(0, 25));
  }, []);

  const heroChips = players[0]?.chips ?? 0;

  useEffect(() => {
    setBetAmount(Math.max(currentBet, BLIND_LEVELS[blindLevel].big));
  }, [currentBet, blindLevel]);

  // ── Hero countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!heroCanAct) { setHeroTimeLeft(30); return; }
    const id = setInterval(() => {
      setHeroTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [heroCanAct]);

  // Auto-fold when time runs out
  const heroActionRef = useRef<(action: 'fold'|'call'|'raise') => void>(() => {});

  useEffect(() => {
    if (heroTimeLeft === 0 && heroCanAct) {
      heroActionRef.current('fold');
    }
  }, [heroTimeLeft, heroCanAct]);

  const betPresets = [
    { label: '1/4 Pot', amount: Math.max(currentBet, Math.floor(pot * 0.25)) },
    { label: '1/2 Pot', amount: Math.max(currentBet, Math.floor(pot * 0.5))  },
    { label: 'Pot',     amount: Math.max(currentBet, pot)                    },
    { label: 'All-In',  amount: heroChips                                    },
  ];

  // ── Tournament start ────────────────────────────────────────────────────────
  const startTournament = useCallback(() => {
    const tp = generateTournamentPlayers(500);
    setTourPlayers(tp);
    setTournamentStarted(true);
    setBlindLevel(0); setHandNumber(0); setHandsUntilUp(HANDS_PER_LEVEL);
    const tablePl = buildTablePlayers(tp, 0, 0);
    setPlayers(tablePl);
    setPhase('idle'); setComCards([]); setPot(0); setCurrentBet(0);
    setWinnerIds([]); setWinMsg('');
    setActionLog(['🏆 Torneo iniciado — 500 jugadores. ¡Buena suerte! Pulsa REPARTIR.']);
  }, []);

  // ── Tournament progress sim ─────────────────────────────────────────────────
  const simulateTournamentProgress = useCallback((tp: TournamentPlayer[]) => {
    const active = tp.filter(p => !p.eliminated && !p.isHero);
    if (active.length === 0) return tp;
    const n = Math.min(Math.floor(Math.random() * 3) + 1, active.length - 1);
    const newTp = [...tp];
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    let cnt = 0;
    for (const p of shuffled) {
      if (cnt >= n) break;
      const idx = newTp.findIndex(x => x.id === p.id);
      const remaining = newTp.filter(x => !x.eliminated).length;
      newTp[idx] = { ...newTp[idx], eliminated: true, position: remaining };
      cnt++;
    }
    return newTp;
  }, []);

  // ── Deal hand ───────────────────────────────────────────────────────────────
  const startHand = useCallback(async () => {
    if (isRunning.current) return;
    if (phase !== 'idle' && phase !== 'showdown') return;
    isRunning.current = true;

    const blinds = BLIND_LEVELS[blindLevel];
    let d = generateDeck();
    let pl = clearActions(
      players.map(p => ({ ...p, cards: [] as CardData[], bet: 0, isActive: true, hasFolded: false }))
    );

    const sbIdx = pl.findIndex(p => p.isSB);
    const bbIdx = pl.findIndex(p => p.isBB);
    const sbAmt = Math.min(blinds.small, sbIdx >= 0 ? pl[sbIdx].chips : 0);
    const bbAmt = Math.min(blinds.big,   bbIdx >= 0 ? pl[bbIdx].chips : 0);
    if (sbIdx >= 0) pl[sbIdx] = { ...pl[sbIdx], bet: sbAmt, chips: pl[sbIdx].chips - sbAmt, lastAction: 'call' };
    if (bbIdx >= 0) pl[bbIdx] = { ...pl[bbIdx], bet: bbAmt, chips: pl[bbIdx].chips - bbAmt, lastAction: 'call' };

    let activePot = sbAmt + bbAmt;
    let highBet = bbAmt;
    setCurrentBet(highBet); setPot(activePot);
    setComCards([]); setPhase('dealing');
    setWinnerIds([]); setWinMsg(''); setHeroCanAct(false); setActorId(null);
    setPlayers([...pl]);
    log(`━━ Mano #${handNumber + 1} ━━  ${blinds.small}/${blinds.big}`);

    // Deal 2 cards
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < pl.length; i++) {
        await delay(160);
        const card = d.pop()!;
        pl = pl.map((p, idx) => idx === i ? { ...p, cards: [...p.cards, card] } : p);
        setPlayers([...pl]);
      }
    }
    setDeck(d);
    setPhase('preflop');
    const hc = pl[0].cards;
    log(`Tus cartas: ${hc.map(c => c.value + c.suit.toUpperCase()).join(' ')}`);

    // AI preflop
    await delay(500);
    let updated = [...pl];
    for (let i = 1; i < updated.length; i++) {
      const p = updated[i];
      if (p.hasFolded || p.chips <= 0) continue;
      setActorId(p.id);
      await delay(400 + Math.random() * 350);
      const str = estimateHandStrength(p.cards);
      const rng = Math.random();
      if (str < 0.35 || (str < 0.55 && rng < 0.40)) {
        updated[i] = { ...p, hasFolded: true, lastAction: 'fold' };
        log(`${p.name} se retira`);
      } else if (str > 0.70 && rng < 0.55) {
        const ra = Math.min(highBet * 3, p.chips);
        updated[i] = { ...p, bet: ra, chips: p.chips - ra, lastAction: 'raise', lastRaiseAmount: ra };
        activePot += ra; highBet = ra;
        log(`${p.name} sube a ${ra.toLocaleString()}`);
      } else {
        const ca = Math.min(highBet, p.chips);
        updated[i] = { ...p, bet: ca, chips: p.chips - ca, lastAction: 'call' };
        activePot += ca;
        log(`${p.name} iguala`);
      }
      setPlayers([...updated]);
    }
    setActorId(null);
    setPot(activePot); setCurrentBet(highBet); setPlayers([...updated]);

    const stillActive = updated.filter(p => !p.hasFolded);
    if (stillActive.length <= 1) {
      await resolveWinner(updated, [], activePot, d, handNumber + 1);
    } else {
      setActorId('hero');
      setHeroCanAct(true);
      setBetAmount(Math.min(highBet * 3, heroChips));
      log('→ Tu turno (Pre-flop)');
    }
    isRunning.current = false;
  }, [phase, players, blindLevel, handNumber, heroChips, log]);

  // ── Hero action ─────────────────────────────────────────────────────────────
  const heroAction = useCallback(async (action: 'fold' | 'call' | 'raise') => {
    if (!heroCanAct) return;
    setHeroCanAct(false); setActorId(null);
    const hero = players[0];
    let pl     = [...players];
    let newPot = pot;

    if (action === 'fold') {
      pl[0] = { ...hero, hasFolded: true, lastAction: 'fold' };
      log('Tú: te retiras');
      setPlayers(pl);
      await delay(400);
      const rem = pl.filter(p => !p.hasFolded);
      const w   = rem[0];
      pl = pl.map(p => p.id === w.id ? { ...p, chips: p.chips + newPot } : p);
      setPlayers(pl);
      setWinnerIds([w.id]); setWinMsg(`${w.name} gana el bote`);
      log(`${w.name} gana ${newPot.toLocaleString()}`);
      await endHand(pl); return;
    }

    if (action === 'call') {
      if (currentBet === 0) {
        pl[0] = { ...hero, lastAction: 'check' };
        log('Tú: check');
      } else {
        const ca = Math.min(currentBet, hero.chips);
        pl[0] = { ...hero, bet: ca, chips: hero.chips - ca, lastAction: 'call' };
        newPot += ca;
        log(`Tú: iguales ${ca.toLocaleString()}`);
      }
    } else {
      const ra = Math.min(betAmount, hero.chips);
      pl[0] = { ...hero, bet: ra, chips: hero.chips - ra, lastAction: 'raise', lastRaiseAmount: ra };
      newPot += ra;
      setCurrentBet(ra);
      log(`Tú: subes a ${ra.toLocaleString()}`);
    }
    setPlayers(pl); setPot(newPot);
    await delay(400);
    await dealFlop(pl, newPot, deck);
  }, [heroCanAct, players, pot, currentBet, betAmount, deck, log]);

  // Update ref so countdown can call it
  heroActionRef.current = heroAction;

  // ── Deal flop ───────────────────────────────────────────────────────────────
  const dealFlop = useCallback(async (pl: PlayerData[], p: number, d: CardData[]) => {
    let dk = [...d];
    dk.pop();
    const flop = [dk.pop()!, dk.pop()!, dk.pop()!];
    const resetPl = clearActions(pl);
    setComCards(flop); setPhase('flop'); setDeck(dk);
    setPlayers([...resetPl]);
    log(`── Flop: ${flop.map(c => c.value + c.suit.toUpperCase()).join(' ')}`);
    await delay(500);

    let updated = [...resetPl];
    for (const ap of updated.filter(ap => !ap.isHero && !ap.hasFolded)) {
      setActorId(ap.id);
      await delay(320 + Math.random() * 280);
      if (Math.random() < 0.28) {
        const idx = updated.findIndex(u => u.id === ap.id);
        updated[idx] = { ...updated[idx], hasFolded: true, lastAction: 'fold' };
        log(`${ap.name} se retira`);
      } else {
        const idx = updated.findIndex(u => u.id === ap.id);
        updated[idx] = { ...updated[idx], lastAction: 'check' };
        log(`${ap.name} pasa`);
      }
      setPlayers([...updated]);
    }
    setActorId(null);
    if (updated.filter(ap => !ap.hasFolded).length <= 1) {
      await resolveWinner(updated, flop, p, dk, handNumber + 1); return;
    }
    setPlayers(updated); setActorId('hero'); setHeroCanAct(true);
    log('→ Tu turno (Flop)');
  }, [handNumber, log]);

  // ── Next phase (turn / river / showdown) ────────────────────────────────────
  const nextPhase = useCallback(async () => {
    if (!heroCanAct) return;
    setHeroCanAct(false); setActorId(null);
    let dk = [...deck];

    if (phase === 'flop' || phase === 'turn') {
      dk.pop();
      const card = dk.pop()!;
      const newCards  = [...communityCards, card];
      const newPhase  = phase === 'flop' ? 'turn' : 'river';
      const resetPl   = clearActions([...players]);
      setComCards(newCards); setPhase(newPhase); setDeck(dk); setPlayers(resetPl);
      log(`── ${newPhase === 'turn' ? 'Turn' : 'River'}: ${card.value + card.suit.toUpperCase()}`);
      await delay(500);

      let updated = [...resetPl];
      const active = updated.filter(p => !p.hasFolded);
      for (const ap of active.filter(ap => !ap.isHero)) {
        setActorId(ap.id);
        await delay(300 + Math.random() * 250);
        if (Math.random() < 0.18) {
          const idx = updated.findIndex(u => u.id === ap.id);
          updated[idx] = { ...updated[idx], hasFolded: true, lastAction: 'fold' };
          log(`${ap.name} se retira`);
        } else {
          const idx = updated.findIndex(u => u.id === ap.id);
          updated[idx] = { ...updated[idx], lastAction: 'check' };
          log(`${ap.name} pasa`);
        }
        setPlayers([...updated]);
      }
      setActorId(null);
      if (updated.filter(p => !p.hasFolded).length <= 1) {
        await resolveWinner(updated, newCards, pot, dk, handNumber + 1); return;
      }
      setPlayers(updated); setActorId('hero'); setHeroCanAct(true);
      log(`→ Tu turno (${newPhase === 'turn' ? 'Turn' : 'River'})`);

    } else if (phase === 'river') {
      await resolveWinner(players, communityCards, pot, deck, handNumber + 1);
    }
  }, [heroCanAct, phase, deck, communityCards, players, pot, handNumber, log]);

  // ── Showdown ─────────────────────────────────────────────────────────────────
  const resolveWinner = useCallback(async (
    pl: PlayerData[], community: CardData[], finalPot: number, dk: CardData[], newHN: number,
  ) => {
    setPhase('showdown'); setHeroCanAct(false); setActorId(null);
    const active = pl.filter(p => !p.hasFolded);

    if (active.length === 1) {
      const w = active[0];
      const updated = pl.map(p => p.id === w.id ? { ...p, chips: p.chips + finalPot } : p);
      setPlayers(updated); setWinnerIds([w.id]); setWinMsg(`${w.name} gana el bote`);
      log(`🏆 ${w.name} gana ${finalPot.toLocaleString()}`);
      await endHand(updated); return;
    }

    const results = active.map(p => ({
      player: p,
      hand: community.length >= 3
        ? getBestHand(p.cards, community)
        : { rank: 0, name: 'Carta Alta', score: 0, bestCards: p.cards },
    })).sort((a, b) => b.hand.score - a.hand.score);

    log('━━ SHOWDOWN ━━');
    for (const r of results) log(`${r.player.name}: ${r.hand.name}`);

    const w = results[0];
    const updated = pl.map(p => p.id === w.player.id ? { ...p, chips: p.chips + finalPot } : p);
    setPlayers(updated);
    setWinnerIds([w.player.id]);
    setWinMsg(`${w.player.name} gana con ${w.hand.name}!`);
    log(`🏆 ${w.player.name} gana ${finalPot.toLocaleString()} con ${w.hand.name}`);
    await endHand(updated);
  }, [log]);

  // ── End hand ─────────────────────────────────────────────────────────────────
  const endHand = useCallback(async (pl: PlayerData[]) => {
    const heroChipsNow = pl.find(p => p.isHero)?.chips ?? 0;
    const seats = pl.length;
    const dIdx  = pl.findIndex(p => p.isDealer);
    const nd    = (dIdx + 1) % seats;
    const ns    = (nd   + 1) % seats;
    const nb    = (nd   + 2) % seats;
    const rotated = pl.map((p, i) => ({
      ...p, isDealer: i === nd, isSB: i === ns, isBB: i === nb,
      cards: [], bet: 0, lastAction: null as PlayerData['lastAction'],
    }));

    setHandNumber(n => n + 1);
    setHandsUntilUp(prev => {
      if (prev <= 1) {
        setBlindLevel(l => Math.min(l + 1, BLIND_LEVELS.length - 1));
        return HANDS_PER_LEVEL;
      }
      return prev - 1;
    });

    if (tournamentStarted) {
      setTourPlayers(prev => {
        const n = simulateTournamentProgress(prev);
        const hi = n.findIndex(p => p.isHero);
        if (hi >= 0) n[hi] = { ...n[hi], chips: heroChipsNow };
        return n;
      });
    }

    await delay(2200);
    setPlayers(rotated);
    setPhase('idle'); setComCards([]); setPot(0); setCurrentBet(0);
    setWinnerIds([]); setWinMsg('');
  }, [tournamentStarted, handNumber, simulateTournamentProgress]);

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    isRunning.current = false;
    setPhase('idle'); setPlayers(INITIAL_PLAYERS);
    setComCards([]); setPot(0); setCurrentBet(0); setBetAmount(0);
    setWinnerIds([]); setWinMsg(''); setHeroCanAct(false); setActorId(null);
    setTournamentStarted(false); setTourPlayers([]);
    setHandNumber(0); setBlindLevel(0); setHandsUntilUp(HANDS_PER_LEVEL);
    setActionLog(['Juego reiniciado.']);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const blinds      = BLIND_LEVELS[blindLevel];
  const canDeal     = phase === 'idle' || phase === 'showdown';
  const canNext     = heroCanAct && (phase === 'flop' || phase === 'turn' || phase === 'river');
  const phaseLabel  = { idle:'ESPERANDO', dealing:'REPARTIENDO', preflop:'PRE-FLOP', flop:'FLOP', turn:'TURN', river:'RIVER', showdown:'SHOWDOWN' }[phase];
  const activePlayers = players.filter(p => !p.hasFolded).length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col overflow-hidden select-none"
      style={{ background: 'linear-gradient(160deg, #060e08 0%, #080d10 50%, #060912 100%)' }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div
        className="h-11 shrink-0 flex items-center justify-between px-4 border-b border-white/5"
        style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}
      >
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-black font-black text-base"
              style={{ background: 'linear-gradient(135deg, #d4af37, #8b6914)' }}
            >♠</div>
            <span
              className="text-[13px] font-black tracking-tight"
              style={{ background: 'linear-gradient(90deg, #d4af37, #f5e088)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              POKER TRAINING
            </span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock size={9} />
            <span>Nivel {blindLevel + 1}</span>
            <span className="text-gray-600 mx-1">·</span>
            <span>Ciegas {blinds.small}/{blinds.big}</span>
            {blinds.ante > 0 && <span className="text-gray-600">(ante {blinds.ante})</span>}
          </div>
          {tournamentStarted && (
            <>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Users size={9} />
                <span>{tourPlayers.filter(p => !p.eliminated).length}</span>
                <span className="text-gray-600">/500</span>
              </div>
            </>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
            phase === 'showdown' ? 'bg-green-900/50 text-green-300 border border-green-700/40' :
            phase === 'idle'     ? 'bg-gray-800/50   text-gray-400   border border-gray-700/40' :
                                   'bg-blue-900/50   text-blue-300   border border-blue-700/40'
          }`}>{phaseLabel}</span>

          {/* Table selector */}
          <div className="relative">
            <button
              onClick={() => setShowTableSel(!showTableSel)}
              className="h-7 px-2.5 rounded text-[10px] font-bold text-gray-400 border border-white/8 hover:border-white/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              MESA
            </button>
            {showTableSel && (
              <div
                className="absolute top-9 right-0 w-36 rounded-xl shadow-2xl border border-white/8 overflow-hidden z-50"
                style={{ background: '#111519' }}
              >
                {TABLE_IMAGES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTableImage(t.path); setShowTableSel(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${tableImage === t.path ? 'text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    style={tableImage === t.path ? { background: 'linear-gradient(90deg,#d4af37,#8b6914)' } : {}}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowRankings(!showRankings)}
            className={`h-7 px-2.5 rounded text-[10px] font-bold border transition-colors ${showRankings ? 'text-black border-transparent' : 'text-gray-400 border-white/8 hover:border-white/20'}`}
            style={showRankings ? { background: 'linear-gradient(90deg,#d4af37,#8b6914)' } : { background: 'rgba(255,255,255,0.04)' }}
          >
            RANGOS
          </button>

          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`h-7 px-2.5 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 ${showPanel ? 'text-white border-white/20 bg-white/8' : 'text-gray-400 border-white/8 hover:border-white/20'}`}
            style={!showPanel ? { background: 'rgba(255,255,255,0.04)' } : {}}
          >
            <Users size={10} />TORNEO
          </button>

          <button
            onClick={resetGame}
            title="Reiniciar"
            className="w-7 h-7 rounded flex items-center justify-center text-gray-400 border border-white/8 hover:border-white/20 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Table + action area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">

          {/* Tournament start overlay */}
          {!tournamentStarted && (
            <div
              className="absolute inset-0 z-40 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
            >
              <div className="text-center max-w-xs px-6">
                <div className="text-5xl mb-4">♠</div>
                <h1
                  className="text-2xl font-black mb-1"
                  style={{ background: 'linear-gradient(90deg,#d4af37,#f5e088)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  TORNEO DE 500
                </h1>
                <p className="text-gray-400 text-sm mb-1">$150,900 garantizados · Top 20 premios</p>
                <p className="text-gray-500 text-xs mb-6">10,000 fichas iniciales · Ciegas 25/50</p>
                <button
                  onClick={startTournament}
                  className="w-full py-3.5 rounded-xl font-black text-black text-sm uppercase tracking-wider mb-3 transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(90deg,#d4af37,#f5c518)', boxShadow: '0 0 30px rgba(212,175,55,0.4)' }}
                >
                  <Trophy size={16} className="inline mr-2" />
                  INICIAR TORNEO
                </button>
                <button
                  onClick={() => setTournamentStarted(true)}
                  className="w-full py-3 rounded-xl font-bold text-gray-400 text-sm uppercase tracking-wider border border-white/10 hover:border-white/20 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <Play size={14} className="inline mr-2" />
                  MESA DE PRÁCTICA
                </button>
              </div>
            </div>
          )}

          {/* Winner banner */}
          {winMsg && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-6 py-2.5 rounded-full font-black text-sm text-black shadow-2xl"
              style={{ background: 'linear-gradient(90deg,#d4af37,#f5c518)', boxShadow: '0 0 30px rgba(212,175,55,0.5)' }}
            >
              🏆 {winMsg}
            </div>
          )}

          {/* Poker table */}
          <div className="flex-1 flex items-center justify-center p-3 min-h-0 relative">
            <PokerTable
              tableImage={tableImage}
              players={players}
              communityCards={communityCards}
              pot={pot}
              winnerIds={winnerIds}
              currentActorId={currentActorId}
            />

            {/* Hand log — small overlay bottom-left of table area */}
            <div
              className="absolute bottom-3 left-3 z-20 w-48 rounded-xl border border-white/8 overflow-hidden flex flex-col"
              style={{ background: 'rgba(4,8,4,0.88)', backdropFilter: 'blur(8px)', maxHeight: 120 }}
            >
              <div className="px-2 py-1 border-b border-white/5 text-[8px] font-bold text-gray-600 uppercase tracking-wider">
                Historial
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-px">
                {actionLog.map((msg, i) => (
                  <div key={i} className={`text-[8px] leading-snug ${i === 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                    {msg}
                  </div>
                ))}
              </div>
            </div>

            {/* Mano + deal info — bottom-right */}
            <div className="absolute bottom-3 right-3 z-20 text-right">
              <div className="text-[10px] text-gray-600">Mano #{handNumber}</div>
              <div className="text-[10px] text-gray-700">Activos: {activePlayers}</div>
            </div>
          </div>

          {/* ── Action strip (near hero's cards) ─────────────────────────── */}
          <div
            className="shrink-0 flex items-center justify-center px-4 py-2 border-t border-white/5"
            style={{ background: 'rgba(6,10,6,0.95)', backdropFilter: 'blur(12px)', minHeight: 82 }}
          >
            {heroCanAct ? (
              <div className="w-full max-w-[620px]">
                <BettingPanel
                  heroChips={heroChips}
                  pot={pot}
                  currentBet={currentBet}
                  betAmount={betAmount}
                  bigBlind={blinds.big}
                  phase={phase}
                  canNextPhase={canNext}
                  heroTimeLeft={heroTimeLeft}
                  onBetAmountChange={setBetAmount}
                  onFold={() => heroAction('fold')}
                  onCall={() => heroAction('call')}
                  onRaise={() => heroAction('raise')}
                  onNextPhase={nextPhase}
                />
              </div>
            ) : canDeal && tournamentStarted ? (
              <button
                onClick={startHand}
                className="px-10 py-3 rounded-xl font-black text-black text-sm uppercase tracking-wider transition-all hover:scale-105"
                style={{ background: 'linear-gradient(90deg,#d4af37,#f5c518)', boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}
              >
                <Play size={14} className="inline mr-2" />
                REPARTIR CARTAS
              </button>
            ) : canDeal && !tournamentStarted ? (
              <div className="text-[11px] text-gray-600">Inicia el torneo para empezar</div>
            ) : (
              <div className="text-[11px] text-gray-600 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Esperando jugadas...
              </div>
            )}
          </div>
        </div>

        {/* ── Tournament panel (right) ──────────────────────────────────────── */}
        <div
          className={`transition-all duration-300 overflow-hidden shrink-0 border-l border-white/5 ${showPanel ? 'w-60' : 'w-0'}`}
        >
          <div className="w-60 h-full">
            <TournamentPanel
              players={tournamentStarted ? tourPlayers : []}
              blindLevel={blindLevel}
              currentBlinds={blinds}
              handNumber={handNumber}
              handsUntilNextLevel={handsUntilUp}
            />
          </div>
        </div>

        {/* Hand rankings overlay */}
        {showRankings && (
          <div
            className="absolute right-0 z-50 border-l border-white/5 flex flex-col overflow-hidden"
            style={{ top: 44, bottom: 0, width: 280, background: '#0c1018' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span
                className="text-[11px] font-black uppercase tracking-wider"
                style={{ color: '#d4af37' }}
              >
                Escalera de Jugadas
              </span>
              <button onClick={() => setShowRankings(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <img src="/img/win.png" alt="Rangos" className="w-full object-contain rounded" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
