'use client';

import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { PlayerData, CardData } from '@/lib/poker';

const SUITS  = ['s', 'd', 'c', 'h'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const CARD_SIZES = {
  sm: { width: 42,  height: 58  },
  md: { width: 54,  height: 74  },
  lg: { width: 68,  height: 94  },
};

// ── Card Components ──────────────────────────────────────────────────────────

export const Card = ({
  suit, value, size = 'md', className = '',
}: {
  suit: string; value: string; size?: 'sm'|'md'|'lg'; className?: string;
}) => {
  const suitIndex  = SUITS.indexOf(suit.toLowerCase());
  const valueIndex = VALUES.indexOf(value);
  if (suitIndex === -1 || valueIndex === -1) return null;
  const posX = (valueIndex / 12) * 100;
  const posY = (suitIndex  / 4)  * 100;
  const { width, height } = CARD_SIZES[size];
  return (
    <div
      className={`rounded-[4px] ${className}`}
      style={{
        width, height, flexShrink: 0,
        backgroundImage: "url('/img/cards_Poker.png')",
        backgroundSize: '1300% 500%',
        backgroundPosition: `${posX}% ${posY}%`,
        backgroundRepeat: 'no-repeat',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
      }}
    />
  );
};

export const CardBack = ({ size = 'md', className = '' }: {
  size?: 'sm'|'md'|'lg'; className?: string;
}) => {
  const { width, height } = CARD_SIZES[size];
  return (
    <div
      className={`rounded-[4px] ${className}`}
      style={{
        width, height, flexShrink: 0,
        backgroundImage: "url('/img/cardBack.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
      }}
    />
  );
};

// ── Chip Stack ────────────────────────────────────────────────────────────────

function getChipColors(amount: number): string[] {
  const dens: [number, string][] = [
    [5000, '#f59e0b'],
    [1000, '#a855f7'],
    [500,  '#1c1917'],
    [100,  '#16a34a'],
    [50,   '#2563eb'],
    [25,   '#dc2626'],
    [5,    '#9ca3af'],
    [1,    '#f3f4f6'],
  ];
  const colors: string[] = [];
  let rem = amount;
  for (const [val, col] of dens) {
    while (rem >= val && colors.length < 5) { colors.push(col); rem -= val; }
    if (colors.length >= 5) break;
  }
  return colors.length > 0 ? colors : ['#f3f4f6'];
}

const ChipStack = ({
  amount, dir = 'right',
}: {
  amount: number; dir?: 'left'|'right'|'up'|'down';
}) => {
  const colors   = getChipColors(amount);
  const chipSize = 22;
  const stackH   = chipSize + (colors.length - 1) * 5;

  const posStyle: React.CSSProperties =
    dir === 'right' ? { position:'absolute', left:'100%', marginLeft:10, top:'50%', transform:'translateY(-50%)' } :
    dir === 'left'  ? { position:'absolute', right:'100%', marginRight:10, top:'50%', transform:'translateY(-50%)' } :
    dir === 'up'    ? { position:'absolute', bottom:'100%', marginBottom:8, left:'50%', transform:'translateX(-50%)' } :
                      { position:'absolute', top:'100%', marginTop:8, left:'50%', transform:'translateX(-50%)' };

  return (
    <div style={{ ...posStyle, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      {dir !== 'down' && (
        <div style={{
          padding:'1px 6px', borderRadius:99, fontSize:8, fontWeight:900, color:'#fff',
          background:'rgba(0,0,0,0.88)', border:'1px solid rgba(255,255,255,0.12)',
          whiteSpace:'nowrap',
        }}>
          {amount.toLocaleString()}
        </div>
      )}
      <div style={{ position:'relative', width:chipSize+2, height:stackH }}>
        {colors.map((color, i) => (
          <div key={i} style={{
            position:'absolute', width:chipSize, height:chipSize, borderRadius:'50%',
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 50%, transparent 70%), ${color}`,
            border:'2px solid rgba(255,255,255,0.28)',
            boxShadow:'0 3px 6px rgba(0,0,0,0.7)',
            bottom: i * 5, left: 1,
          }}>
            <div style={{ position:'absolute', inset:3, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.18)' }} />
          </div>
        ))}
      </div>
      {dir === 'down' && (
        <div style={{
          padding:'1px 6px', borderRadius:99, fontSize:8, fontWeight:900, color:'#fff',
          background:'rgba(0,0,0,0.88)', border:'1px solid rgba(255,255,255,0.12)',
          whiteSpace:'nowrap',
        }}>
          {amount.toLocaleString()}
        </div>
      )}
    </div>
  );
};

// ── Player Pod ────────────────────────────────────────────────────────────────

const PlayerPod = ({
  player, isActing = false,
}: {
  player: PlayerData; isActing?: boolean;
}) => {
  const cardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!player.cards || player.cards.length === 0 || !cardsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.dealt-card', {
        x:        () => window.innerWidth / 2  - (cardsRef.current!.getBoundingClientRect().left + 20),
        y:        () => window.innerHeight / 2 - (cardsRef.current!.getBoundingClientRect().top  + 25),
        scale: 0.1, rotation: 540, duration: 0.5,
        ease: 'back.out(1.5)', stagger: 0.14, clearProps: 'all',
      });
    }, cardsRef);
    return () => ctx.revert();
  }, [player.cards.length]);

  const {
    positionClass, alignLeft = true, isHero, isDealer, isSB, isBB,
    name, chips, bet, hasFolded, lastAction, lastRaiseAmount, chipDir,
  } = player;

  const effectiveChipDir = chipDir ?? (isHero ? 'up' : alignLeft ? 'right' : 'left');

  const ringColor = hasFolded
    ? 'rgba(255,255,255,0.06)'
    : isActing
    ? '#facc15'
    : isHero
    ? '#d4af37'
    : 'rgba(255,255,255,0.18)';

  const ringGlow = hasFolded ? 'none'
    : isActing ? '0 0 22px rgba(250,204,21,0.65), 0 0 6px rgba(250,204,21,0.3)'
    : isHero   ? '0 0 18px rgba(212,175,55,0.45)'
    : 'none';

  const actionLabel =
    lastAction === 'raise' ? `RAISE ${(lastRaiseAmount ?? bet).toLocaleString()}`
    : lastAction === 'call'  ? 'CALL'
    : lastAction === 'check' ? 'CHECK'
    : lastAction === 'fold'  ? 'FOLD'
    : null;

  const actionStyle: React.CSSProperties =
    lastAction === 'raise' ? { background:'rgba(20,83,45,0.9)', border:'1px solid #16a34a', color:'#86efac' }
    : lastAction === 'call'  ? { background:'rgba(30,58,138,0.9)', border:'1px solid #2563eb', color:'#93c5fd' }
    : lastAction === 'check' ? { background:'rgba(28,25,23,0.9)', border:'1px solid #57534e', color:'#a8a29e' }
    : { background:'rgba(127,29,29,0.9)', border:'1px solid #b91c1c', color:'#fca5a5' };

  return (
    <div
      className={`absolute ${positionClass} flex flex-col items-center z-20`}
      style={{ opacity: hasFolded ? 0.48 : 1 }}
    >
      {/* Action badge */}
      {actionLabel && (
        <div
          className="mb-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
          style={actionStyle}
        >
          {actionLabel}
        </div>
      )}

      {/* Cards */}
      <div ref={cardsRef} className="flex mb-1.5" style={{ gap: 0 }}>
        {player.cards.map((card, i) => (
          <div
            key={i}
            className="dealt-card"
            style={{ transform: `rotate(${i === 0 ? -6 : 6}deg)`, marginLeft: i > 0 ? -14 : 0 }}
          >
            {isHero ? (
              <Card suit={card.suit} value={card.value} size="lg" />
            ) : (
              <CardBack size="sm" />
            )}
          </div>
        ))}
      </div>

      {/* Pod */}
      <div
        className="relative flex items-center gap-2 rounded-xl px-2 py-1.5 backdrop-blur-sm"
        style={{
          background: isHero ? 'rgba(20,16,4,0.93)' : 'rgba(10,14,10,0.92)',
          border: `1.5px solid ${ringColor}`,
          boxShadow: ringGlow,
        }}
      >
        {/* Chip stack toward table center */}
        {bet > 0 && <ChipStack amount={bet} dir={effectiveChipDir} />}

        {/* Avatar */}
        {isHero ? (
          <div
            className="rounded-full overflow-hidden shrink-0 border-2"
            style={{ width: 36, height: 36, borderColor: '#d4af3799' }}
          >
            <img
              src="/img/person.png"
              alt="Hero"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div
            className="rounded-full shrink-0 flex items-center justify-center text-sm font-black border"
            style={{
              width: 32, height: 32,
              background: isActing
                ? 'linear-gradient(135deg, #facc15, #ca8a04)'
                : 'linear-gradient(135deg, #374151, #1f2937)',
              borderColor: isActing ? 'rgba(250,204,21,0.5)' : 'rgba(255,255,255,0.08)',
              color: isActing ? '#000' : 'rgba(255,255,255,0.45)',
            }}
          >
            {name[0]}
          </div>
        )}

        {/* Name + chips */}
        <div style={{ minWidth: 72, maxWidth: 96 }}>
          <div
            className="text-[9px] font-bold leading-none mb-0.5 truncate"
            style={{ color: isHero ? '#d4af37' : '#e5e7eb' }}
          >
            {name}
          </div>
          <div className="text-[12px] font-black text-green-400 leading-none tabular-nums">
            {chips.toLocaleString()}
          </div>
        </div>

        {/* Position badges */}
        {isDealer && (
          <div
            className="rounded-full flex items-center justify-center text-[8px] font-black text-black shrink-0 border-2 border-gray-300"
            style={{ width: 20, height: 20, background: '#ffffff' }}
          >
            D
          </div>
        )}
        {isSB && !isDealer && (
          <div
            className="rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0"
            style={{ width: 20, height: 20, background: '#1d4ed8', border: '2px solid rgba(147,197,253,0.5)' }}
          >
            SB
          </div>
        )}
        {isBB && !isDealer && (
          <div
            className="rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0"
            style={{ width: 20, height: 20, background: '#7c3aed', border: '2px solid rgba(196,181,253,0.5)' }}
          >
            BB
          </div>
        )}

        {/* Acting underline bar */}
        {isActing && (
          <div
            className="absolute -bottom-0.5 left-2 right-2 rounded-full animate-pulse"
            style={{ height: 2, background: '#facc15' }}
          />
        )}
      </div>

      {hasFolded && (
        <div className="text-[8px] font-black text-red-400/50 uppercase tracking-[0.18em] mt-1">FOLD</div>
      )}
    </div>
  );
};

// ── Pot Chips (center table) ──────────────────────────────────────────────────

const PotDisplay = ({ pot }: { pot: number }) => {
  if (pot <= 0) return null;
  const colors = getChipColors(pot).slice(0, 6);
  return (
    <div className="absolute z-10" style={{ top: '28%', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
        >
          {/* Mini chip stack */}
          <div className="flex">
            {colors.map((color, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 11, height: 11,
                  background: color,
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  marginLeft: i > 0 ? -4 : 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-black text-white tabular-nums">
            POT: {pot.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Poker Table ───────────────────────────────────────────────────────────────

type PokerTableProps = {
  tableImage?: string;
  players: PlayerData[];
  communityCards: CardData[];
  pot: number;
  winnerIds?: string[];
  currentActorId?: string | null;
};

export const PokerTable = ({
  tableImage = '/img/mesa.png',
  players = [],
  communityCards = [],
  pot = 0,
  winnerIds = [],
  currentActorId = null,
}: PokerTableProps) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (communityCards.length === 0 || !tableRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.community-card:last-child', {
        y: -50, opacity: 0, rotationX: 180,
        duration: 0.55, ease: 'back.out(1.5)',
      });
    }, tableRef);
    return () => ctx.revert();
  }, [communityCards.length]);

  return (
    <div ref={tableRef} className="relative w-full max-w-[1050px] aspect-[16/9]">

      {/* Table image */}
      <img
        src={tableImage}
        alt="Mesa de Poker"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: 'drop-shadow(0 30px 80px rgba(0,0,0,0.95))' }}
      />

      {/* Community cards — centered on table */}
      <div
        className="absolute z-10"
        style={{
          top: '44%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          gap: 6,
        }}
      >
        {communityCards.map((card, i) => (
          <div key={i} className="community-card">
            <Card suit={card.suit} value={card.value} size="md" />
          </div>
        ))}
        {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
          <div
            key={`e-${i}`}
            style={{ width: CARD_SIZES.md.width, height: CARD_SIZES.md.height }}
            className="rounded-[4px] bg-black/15 border border-white/6"
          />
        ))}
      </div>

      {/* Pot */}
      <PotDisplay pot={pot} />

      {/* Players */}
      {players.map(p => (
        <PlayerPod
          key={p.id}
          player={{
            ...p,
            isActive: !p.hasFolded && (winnerIds.length === 0 || winnerIds.includes(p.id)),
          }}
          isActing={currentActorId === p.id}
        />
      ))}
    </div>
  );
};

export default PokerTable;
