'use client';

import React, { useState } from 'react';
import { TournamentPlayer, BlindLevel, PRIZE_TABLE } from '@/lib/poker';
import { Trophy, Users, ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  players: TournamentPlayer[];
  blindLevel: number;
  currentBlinds: BlindLevel;
  handNumber: number;
  handsUntilNextLevel: number;
};

export default function TournamentPanel({
  players,
  blindLevel,
  currentBlinds,
  handNumber,
  handsUntilNextLevel,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');
  const [showPrizes, setShowPrizes] = useState(false);

  const total    = players.length;
  const active   = players.filter(p => !p.eliminated).length;
  const bubbleAt = PRIZE_TABLE.length; // 20

  const filteredPlayers = players
    .filter(p => {
      if (filter === 'active')    return !p.eliminated;
      if (filter === 'eliminated') return p.eliminated;
      return true;
    })
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      return b.chips - a.chips;
    });

  const heroPlayer = players.find(p => p.isHero);

  return (
    <div className="h-full flex flex-col bg-[#0e0e0e] border-l border-white/5 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-white/5 bg-black/40">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={14} className="text-poker-gold" />
          <span className="text-[11px] font-black uppercase tracking-widest text-poker-gold">
            Torneo 500 Jugadores
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-500 leading-none mb-0.5">Jugadores</div>
            <div className="font-black text-white">{active}<span className="text-gray-500">/{total}</span></div>
          </div>
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-500 leading-none mb-0.5">Mano</div>
            <div className="font-black text-white">#{handNumber}</div>
          </div>
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-500 leading-none mb-0.5">Nivel {blindLevel + 1}</div>
            <div className="font-black text-white">{currentBlinds.small}/{currentBlinds.big}</div>
          </div>
          <div className="bg-white/5 rounded px-2 py-1">
            <div className="text-gray-500 leading-none mb-0.5">Sig. nivel</div>
            <div className={`font-black ${handsUntilNextLevel <= 3 ? 'text-red-400' : 'text-white'}`}>
              {handsUntilNextLevel} manos
            </div>
          </div>
        </div>

        {/* Bubble warning */}
        {active <= bubbleAt + 5 && active > bubbleAt && (
          <div className="mt-2 bg-yellow-500/20 border border-yellow-500/30 rounded px-2 py-1 text-[10px] font-bold text-yellow-400 text-center animate-pulse">
            ⚠ BURBUJA — {active - bubbleAt} jugador{active - bubbleAt !== 1 ? 'es' : ''} fuera del dinero
          </div>
        )}
        {active <= bubbleAt && active > 0 && (
          <div className="mt-2 bg-green-500/20 border border-green-500/30 rounded px-2 py-1 text-[10px] font-bold text-green-400 text-center">
            ✓ EN EL DINERO — TOP {bubbleAt}
          </div>
        )}
      </div>

      {/* Hero stack */}
      {heroPlayer && !heroPlayer.eliminated && (
        <div className="px-3 py-2 border-b border-white/5 bg-poker-gold/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-poker-gold font-bold uppercase">Tu Stack</span>
            <span className="text-[13px] font-black text-green-400">{heroPlayer.chips.toLocaleString()}</span>
          </div>
          <div className="text-[9px] text-gray-500 mt-0.5">
            {(heroPlayer.chips / currentBlinds.big).toFixed(1)} BB
          </div>
        </div>
      )}

      {/* Prize table toggle */}
      <button
        className="flex items-center justify-between px-3 py-2 text-[10px] font-bold text-gray-400 border-b border-white/5 hover:bg-white/3 transition-colors"
        onClick={() => setShowPrizes(!showPrizes)}
      >
        <span className="flex items-center gap-1">
          <Trophy size={10} className="text-poker-gold" /> PREMIOS TOP 20
        </span>
        {showPrizes ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {showPrizes && (
        <div className="border-b border-white/5 max-h-36 overflow-y-auto">
          {PRIZE_TABLE.map(({ position, prize, label }) => (
            <div
              key={position}
              className={`flex items-center justify-between px-3 py-1 text-[9px] ${position <= 3 ? 'text-poker-gold' : 'text-gray-400'}`}
            >
              <span>{label}</span>
              <span className="font-bold">${prize.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex border-b border-white/5 shrink-0">
        {(['all', 'active', 'eliminated'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-[9px] font-bold uppercase transition-colors ${filter === f ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Elim.'}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-1 px-3 py-1 border-b border-white/5 text-[8px] text-gray-600 uppercase font-bold">
          <Users size={8} />
          <span>{filteredPlayers.length} jugadores</span>
        </div>
        {filteredPlayers.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-1.5 border-b border-white/3 transition-colors
              ${p.isHero ? 'bg-poker-gold/8 border-poker-gold/10' : 'hover:bg-white/3'}
              ${p.eliminated ? 'opacity-40' : ''}`}
          >
            <span className="text-[8px] text-gray-600 w-4 shrink-0 text-right">{i + 1}</span>
            <span className={`text-[10px] font-bold flex-1 truncate ${p.isHero ? 'text-poker-gold' : 'text-white'}`}>
              {p.name}
            </span>
            {p.eliminated ? (
              <span className="text-[8px] text-red-500 font-bold shrink-0">
                #{p.position}
              </span>
            ) : (
              <span className="text-[9px] text-green-400 font-bold shrink-0">
                {p.chips >= 1000 ? `${(p.chips / 1000).toFixed(1)}K` : p.chips}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
