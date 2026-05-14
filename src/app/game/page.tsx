'use client';

import React, { useState } from 'react';
import PokerTable from '@/components/PokerTable';
import { Settings, Info, ArrowLeft, Maximize2, RotateCcw, Play, Home, Clock } from 'lucide-react';
import Link from 'next/link';

export default function GamePage() {
  const [showRanges, setShowRanges] = useState(false);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-hidden flex flex-col font-sans">
      
      {/* Top Tournament Bar (Stars Style) */}
      <div className="h-8 bg-black border-b border-white/5 flex items-center justify-between px-4 text-[10px] text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Home size={10} /> SCOOP 62-H: $10,300 NLHE [Progressive KO]</span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-white font-bold"><Clock size={10} /> 12 min</span>
          <span className="text-gray-600">|</span>
          <span>14th of 15</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Blinds: 15,000 / 30,000 (Ante 3,750)</span>
          <div className="flex items-center gap-1 bg-neutral-800 px-2 rounded tracking-tighter">
            <span className="text-poker-gold font-bold">$86.8K</span> Gtd
          </div>
        </div>
      </div>

      {/* Game Header / Icons */}
      <div className="h-12 flex items-center justify-between px-6 bg-transparent border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft size={16} className="text-gray-400" />
          </Link>
          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
            <RotateCcw size={16} className="text-gray-400" />
          </div>
          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
            <Play size={16} className="text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowRanges(!showRanges)}
            className={`flex items-center gap-2 text-[11px] font-bold px-4 py-1.5 rounded-md border transition-all ${showRanges ? 'bg-poker-gold text-black border-poker-gold' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
          >
            <Info size={14} />
            INFO RANGOS
          </button>
          <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center">
            <Settings size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Main Table Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <PokerTable />
          
          {/* Action Area (Modern & Clean) */}
          <div className="mt-8 w-full max-w-4xl flex items-end justify-between px-4">
            
            {/* Info Box (Bottom Left Style) */}
            <div className="w-64 bg-black/60 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
              <div className="flex border-b border-white/5">
                {['Chat', 'Hands', 'Notes', 'Stats', 'Info'].map((tab) => (
                  <button key={tab} className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${tab === 'Info' ? 'bg-neutral-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-3 text-[10px] space-y-1 text-gray-400 h-24 overflow-y-auto">
                <div className="flex justify-between"><span>Position:</span> <span className="text-white">14 of 15</span></div>
                <div className="flex justify-between"><span>Bounties:</span> <span className="text-poker-gold">$0</span></div>
                <div className="flex justify-between"><span>Avg Stack:</span> <span className="text-white">45.2 BB</span></div>
                <div className="flex justify-between"><span>Blinds:</span> <span className="text-white">15K/30K (3.7K)</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col items-center gap-4">
              {/* Slider / Sizing */}
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
                <button className="w-40 py-4 rounded-xl bg-red-700 hover:bg-red-600 font-black text-xs uppercase tracking-tighter border-b-4 border-black/40 shadow-lg shadow-red-900/20">
                  RAISE TO 150
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
