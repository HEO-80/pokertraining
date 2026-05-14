'use client';

import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { PlayerData, CardData } from '@/lib/poker';

// Card Sprite mapping
const SUITS = ['s', 'd', 'c', 'h'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const Card = ({ suit, value, className = "" }: { suit: string, value: string, className?: string }) => {
  const suitIndex = SUITS.indexOf(suit.toLowerCase());
  const valueIndex = VALUES.indexOf(value.toUpperCase());

  if (suitIndex === -1 || valueIndex === -1) return null;

  const posX = (valueIndex / 12) * 100;
  const posY = (suitIndex / 4) * 100;

  return (
    <div 
      className={`w-12 h-16 bg-[url('/img/cards%20poker.png')] bg-no-repeat shadow-md rounded-sm border border-black/10 ${className}`}
      style={{
        backgroundSize: '1300% 500%',
        backgroundPosition: `${posX}% ${posY}%`
      }}
    />
  );
};

export const CardBack = ({ className = "" }: { className?: string }) => (
  <div className={`w-12 h-16 bg-blue-900 rounded-sm border-2 border-white/20 shadow-md p-1 ${className}`}>
    <div className="w-full h-full border border-blue-400/50 rounded-sm opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#fff_2px,#fff_4px)]"></div>
  </div>
);

const PlayerPod = ({ player }: { player: PlayerData }) => {
  const { name, chips, positionClass, isActive, cards, bet, isDealer, alignLeft = true, isHero } = player;
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!cards || cards.length === 0) return;
    
    const ctx = gsap.context(() => {
      // Find the newly added card (we animate all if they just appeared)
      gsap.from('.dealt-card', {
        x: () => window.innerWidth / 2 - (cardsContainerRef.current?.getBoundingClientRect().left || 0),
        y: () => window.innerHeight / 2 - (cardsContainerRef.current?.getBoundingClientRect().top || 0),
        scale: 0,
        rotation: 720,
        duration: 0.5,
        ease: "back.out(1.2)",
        stagger: 0.1,
        clearProps: "all" // clear transform after animation so CSS takes over
      });
    }, cardsContainerRef);

    return () => ctx.revert();
  }, [cards.length]);

  return (
    <div className={`absolute ${positionClass} flex flex-col items-center gap-1 z-10`}>
      {bet > 0 && (
        <div className={`absolute ${alignLeft ? '-right-16 top-1/2 -translate-y-1/2' : '-left-16 top-1/2 -translate-y-1/2'} flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white`}>
          <div className="w-3 h-3 bg-blue-500 rounded-full border border-white/40 shadow-sm"></div>
          {bet}
        </div>
      )}
      
      <div className={`relative flex items-center ${alignLeft ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`relative z-20 w-16 h-16 rounded-full border-2 ${isActive ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'border-gray-400'} bg-neutral-800 overflow-hidden flex items-center justify-center shadow-2xl`}>
          <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-900 flex items-center justify-center">
            <span className="text-2xl font-bold text-white/20 uppercase">{name[0]}</span>
          </div>
        </div>

        <div className={`-ml-4 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 rounded-r-full pl-6 pr-6 py-1.5 min-w-[140px] shadow-xl ${alignLeft ? '' : 'ml-0 -mr-4 rounded-l-full rounded-r-none pl-6 pr-6'}`}>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white tracking-tight leading-none mb-1">{name}</span>
            <span className="text-[13px] font-black text-green-400 leading-none">{chips}</span>
          </div>
        </div>
        
        {/* Cards container */}
        <div ref={cardsContainerRef} className={`absolute ${isHero ? '-top-10 left-[55%] scale-125' : '-top-6 left-1/2 -translate-x-1/2'} flex -space-x-4 opacity-90 z-10`}>
          {cards.map((card, i) => (
             <div key={i} className={`dealt-card ${isHero ? (i === 0 ? 'rotate-[-5deg]' : 'rotate-[5deg]') : (i === 0 ? 'rotate-[-10deg]' : 'rotate-[10deg]')}`}>
                {isHero ? (
                  <Card suit={card.suit} value={card.value} />
                ) : (
                  <CardBack />
                )}
             </div>
          ))}
        </div>

        {isDealer && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center text-[10px] font-black text-black shadow-lg z-30">
            D
          </div>
        )}
      </div>
    </div>
  );
};

export const PokerTable = ({ tableImage = "/img/mesa.png", players = [], communityCards = [], pot = 0 }: { tableImage?: string, players: PlayerData[], communityCards: CardData[], pot: number }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (communityCards.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.from('.community-card', {
        y: -50,
        opacity: 0,
        rotationX: 180,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.5)'
      });
    }, tableRef);
    return () => ctx.revert();
  }, [communityCards.length]);

  return (
    <div ref={tableRef} className="relative w-full max-w-[1100px] aspect-[16/9] flex items-center justify-center">
      
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <img 
          src={tableImage} 
          alt="Poker Table" 
          className="w-full h-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,1)] transition-all duration-700"
        />
      </div>

      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 z-10">
        {communityCards.map((card, i) => (
          <div key={i} className="community-card">
            <Card suit={card.suit} value={card.value} className="scale-110 shadow-2xl" />
          </div>
        ))}
        {/* Empty slots for missing community cards */}
        {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
          <div key={`empty-${i}`} className="w-12 h-16 bg-black/20 border border-white/5 rounded-sm backdrop-blur-sm"></div>
        ))}
      </div>

      <div className="absolute top-[34%] left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full border border-white/10 text-[11px] font-bold shadow-lg z-10 backdrop-blur-sm">
        Pot: <span className="text-white">{pot}</span>
      </div>

      {players.map(p => (
        <PlayerPod key={p.id} player={p} />
      ))}
    </div>
  );
};

export default PokerTable;

