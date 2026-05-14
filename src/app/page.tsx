'use client';

import React, { useState } from 'react';
import PokerTable from '@/components/PokerTable';
import { Settings, Info, RotateCcw, Play, Home, Clock, Maximize2, StepForward } from 'lucide-react';
import { generateDeck, INITIAL_PLAYERS, PlayerData, CardData, GamePhase } from '@/lib/poker';

export default function MainPage() {
  const [showRanges, setShowRanges] = useState(false);
  const [currentTable, setCurrentTable] = useState('/img/mesa.png');
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Game State
  const [deck, setDeck] = useState<CardData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>(INITIAL_PLAYERS);
  const [communityCards, setCommunityCards] = useState<CardData[]>([]);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [pot, setPot] = useState(0);

  const tables = [
    { id: 'mesa1', name: 'Mesa Azul', path: '/img/mesa.png' },
    { id: 'mesa2', name: 'Mesa 2', path: '/img/mesa2.png' },
    { id: 'mesa3', name: 'Mesa 3', path: '/img/mesa3.png' },
  ];

  const startDeal = async () => {
    if (phase !== 'idle' && phase !== 'showdown') return;
    setPhase('dealing');
    
    let currentDeck = generateDeck();
    let currentPlayers = INITIAL_PLAYERS.map(p => ({ ...p, cards: [], bet: 0 }));
    setPlayers(currentPlayers);
    setCommunityCards([]);
    setPot(150); // Setup initial blinds (e.g. 50 + 100)

    // Deal 2 cards each, one by one around the table
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < currentPlayers.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Delay between each card
        const card = currentDeck.pop()!;
        currentPlayers = [...currentPlayers];
        currentPlayers[i] = {
          ...currentPlayers[i],
          cards: [...currentPlayers[i].cards, card]
        };
        setPlayers(currentPlayers);
      }
    }
    setDeck(currentDeck);
    setPhase('preflop');
  };

  const nextPhase = async () => {
    let currentDeck = [...deck];
    if (phase === 'preflop') {
      setPhase('flop');
      currentDeck.pop(); // burn card
      const flop = [currentDeck.pop()!, currentDeck.pop()!, currentDeck.pop()!];
      setCommunityCards(flop);
      setDeck(currentDeck);
    } else if (phase === 'flop') {
      setPhase('turn');
      currentDeck.pop(); // burn
      setCommunityCards(prev => [...prev, currentDeck.pop()!]);
      setDeck(currentDeck);
    } else if (phase === 'turn') {
      setPhase('river');
      currentDeck.pop(); // burn
      setCommunityCards(prev => [...prev, currentDeck.pop()!]);
      setDeck(currentDeck);
    } else if (phase === 'river') {
      setPhase('showdown');
    }
  };

  const resetGame = () => {
    setPhase('idle');
    setPlayers(INITIAL_PLAYERS);
    setCommunityCards([]);
    setPot(0);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-hidden flex flex-col font-sans">
      
      {/* Top Tournament Bar */}
      <div className="h-8 bg-black border-b border-white/5 flex items-center justify-between px-4 text-[10px] text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Home size={10} /> Entrenamiento - Mesa Principal</span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-white font-bold"><Clock size={10} /> Nivel 1</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ciegas: 50 / 100</span>
        </div>
      </div>

      {/* Game Header / Icons */}
      <div className="h-12 flex items-center justify-between px-6 bg-transparent border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={resetGame} className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10" title="Reiniciar">
            <RotateCcw size={16} className="text-gray-400" />
          </button>
          <button onClick={startDeal} disabled={phase !== 'idle' && phase !== 'showdown'} className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${phase === 'idle' || phase === 'showdown' ? 'bg-poker-gold text-black hover:bg-yellow-400' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`} title="Repartir">
            <Play size={16} />
          </button>
          {phase !== 'idle' && phase !== 'showdown' && phase !== 'dealing' && (
            <button onClick={nextPhase} className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500" title="Siguiente Fase">
              <StepForward size={16} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Table Selector Toggle */}
          <div className="relative z-50">
            <button 
              onClick={() => setShowTableSelector(!showTableSelector)}
              className={`flex items-center gap-2 text-[11px] font-bold px-4 py-1.5 rounded-md border transition-all bg-white/5 text-gray-400 border-white/10 hover:border-white/20`}
            >
              CAMBIAR MESA
            </button>
            
            {showTableSelector && (
              <div className="absolute top-12 right-0 w-48 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl p-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setCurrentTable(table.path);
                      setShowTableSelector(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded text-[11px] font-bold transition-colors ${currentTable === table.path ? 'bg-poker-gold text-black' : 'hover:bg-white/5 text-gray-400'}`}
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowRanges(!showRanges)}
            className={`flex items-center gap-2 text-[11px] font-bold px-4 py-1.5 rounded-md border transition-all ${showRanges ? 'bg-poker-gold text-black border-poker-gold' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
          >
            <Info size={14} />
            INFO RANGOS
          </button>
          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10">
            <Settings size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Main Table Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <PokerTable tableImage={currentTable} players={players} communityCards={communityCards} pot={pot} />
          
          {/* Action Area (Modern & Clean) */}
          <div className="mt-8 w-full max-w-4xl flex items-end justify-between px-4 z-20">
            
            {/* Info Box */}
            <div className="w-64 bg-black/60 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
              <div className="flex border-b border-white/5">
                {['Info', 'Stats'].map((tab) => (
                  <button key={tab} className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${tab === 'Info' ? 'bg-neutral-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-3 text-[10px] space-y-1 text-gray-400 h-24 overflow-y-auto">
                <div className="flex justify-between"><span>Fase:</span> <span className="text-poker-gold uppercase">{phase}</span></div>
                <div className="flex justify-between"><span>Posición:</span> <span className="text-white">Hero (UTG)</span></div>
                <div className="flex justify-between"><span>Stack Promedio:</span> <span className="text-white">45.2 BB</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2 mb-2">
                {['Min', '2x', '3x', 'Pot', 'All-In'].map((size) => (
                  <button key={size} className="px-3 py-1 bg-black/40 border border-white/10 rounded text-[10px] font-bold hover:bg-white/10 transition-colors uppercase">
                    {size}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button className="w-32 py-4 rounded-xl bg-[#222] hover:bg-[#333] font-black text-xs uppercase tracking-tighter border-b-4 border-black/40 shadow-lg">
                  FOLD
                </button>
                <button className="w-32 py-4 rounded-xl bg-[#222] hover:bg-[#333] font-black text-xs uppercase tracking-tighter border-b-4 border-black/40 shadow-lg">
                  CALL
                </button>
                <button onClick={nextPhase} className="w-40 py-4 rounded-xl bg-red-700 hover:bg-red-600 font-black text-xs uppercase tracking-tighter border-b-4 border-black/40 shadow-lg shadow-red-900/20">
                  {phase === 'idle' ? 'ESPERANDO...' : 'SIGUIENTE FASE'}
                </button>
              </div>
            </div>

            {/* Spr / Odds Info */}
            <div className="w-32 text-right space-y-1">
              <div className="text-[10px] font-bold text-gray-500">SPR: <span className="text-red-500 font-black">4.4</span></div>
              <div className="text-[10px] font-bold text-gray-500">BLUFF EQ: <span className="text-white font-black">--</span></div>
              <div className="text-[10px] font-bold text-gray-500">ODDS: <span className="text-blue-400 font-black">0%</span></div>
            </div>
          </div>
        </div>

        {/* Ranges Sidebar */}
        <div className={`transition-all duration-500 overflow-hidden bg-[#111] border-l border-white/5 ${showRanges ? 'w-80' : 'w-0'}`}>
          <div className="w-80 p-6">
            <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-poker-gold uppercase italic tracking-wider">
              <Maximize2 size={16} />
              REFERENCIA DE RANGOS
            </h3>
            <div className="space-y-6">
              <div className="bg-black/40 rounded-xl border border-white/10 p-2">
                <div className="aspect-square bg-neutral-900 rounded-lg flex items-center justify-center text-[10px] text-gray-600 text-center p-8 uppercase font-bold tracking-widest leading-relaxed">
                  Las imágenes de /img/ se cargarán dinámicamente aquí según la situación
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[10px] text-gray-500 font-bold uppercase border-b border-white/5 pb-2">Posición actual: UTG</div>
                <div className="text-[10px] text-gray-400 leading-relaxed italic">
                  "En esta situación deberías abrir aproximadamente el 15% de tus manos más fuertes."
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

