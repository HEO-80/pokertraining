'use client';
import React from 'react';

type Props = {
  heroChips: number;
  pot: number;
  currentBet: number;
  betAmount: number;
  bigBlind: number;
  phase: string;
  canNextPhase: boolean;
  heroTimeLeft: number;
  onBetAmountChange: (v: number) => void;
  onFold: () => void;
  onCall: () => void;
  onRaise: () => void;
  onNextPhase: () => void;
};

export default function BettingPanel({
  heroChips, pot, currentBet, betAmount, bigBlind,
  phase, canNextPhase, heroTimeLeft,
  onBetAmountChange, onFold, onCall, onRaise, onNextPhase,
}: Props) {
  const presets = [
    { label: '1/4', amount: Math.max(currentBet, Math.floor(pot * 0.25)) },
    { label: '1/2', amount: Math.max(currentBet, Math.floor(pot * 0.5))  },
    { label: 'Pot', amount: Math.max(currentBet, pot)                    },
    { label: 'All', amount: heroChips                                     },
  ];

  const timerPct   = Math.max(0, (heroTimeLeft / 30) * 100);
  const circumf    = 2 * Math.PI * 14;
  const dash       = (timerPct / 100) * circumf;
  const timerColor = heroTimeLeft > 15 ? '#22c55e' : heroTimeLeft > 7 ? '#f59e0b' : '#ef4444';
  const isCheck    = currentBet === 0;

  return (
    <div
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl border border-white/10"
      style={{ background: 'rgba(6,10,6,0.95)', backdropFilter: 'blur(20px)' }}
    >
      {/* Countdown circle */}
      <div className="shrink-0">
        <svg width={36} height={36} viewBox="0 0 36 36">
          <circle cx={18} cy={18} r={14} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
          <circle
            cx={18} cy={18} r={14}
            fill="none"
            stroke={timerColor}
            strokeWidth={3}
            strokeDasharray={`${dash} ${circumf}`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray 0.9s linear, stroke 0.4s' }}
          />
          <text x={18} y={22} textAnchor="middle" fontSize={11} fontWeight="bold" fill={timerColor}>
            {heroTimeLeft}
          </text>
        </svg>
      </div>

      {/* Bet controls */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {/* Slider row */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={Math.max(currentBet, bigBlind * 2)}
            max={heroChips}
            step={Math.max(bigBlind, 1)}
            value={betAmount}
            onChange={e => onBetAmountChange(Number(e.target.value))}
            className="flex-1 h-1.5 cursor-pointer accent-[#d4af37]"
          />
          <span className="text-[12px] font-black text-white tabular-nums w-16 text-right shrink-0">
            {betAmount.toLocaleString()}
          </span>
        </div>

        {/* Preset buttons */}
        <div className="flex gap-1.5">
          {presets.map(({ label, amount }) => (
            <button
              key={label}
              onClick={() => onBetAmountChange(Math.min(Math.max(amount, Math.max(currentBet, bigBlind)), heroChips))}
              className="flex-1 py-1 rounded-lg border border-white/10 hover:border-white/25 transition-colors text-center"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div className="text-[9px] font-black text-gray-300">{label}</div>
              <div className="text-[8px] text-gray-500">
                {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onFold}
          className="flex flex-col items-center justify-center rounded-xl font-black text-[11px] uppercase tracking-wide transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{
            background: 'rgba(127,29,29,0.5)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#fca5a5',
            minWidth: 64, height: 52, padding: '0 12px',
          }}
        >
          FOLD
        </button>

        <button
          onClick={onCall}
          className="flex flex-col items-center justify-center rounded-xl font-black text-[11px] uppercase tracking-wide transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{
            background: 'rgba(30,58,138,0.5)',
            border: '1px solid rgba(96,165,250,0.4)',
            color: '#93c5fd',
            minWidth: 72, height: 52, padding: '0 12px',
          }}
        >
          {isCheck ? 'CHECK' : 'CALL'}
          {!isCheck && (
            <span className="text-[8px] mt-0.5 opacity-70 font-bold">{currentBet.toLocaleString()}</span>
          )}
        </button>

        {canNextPhase ? (
          <button
            onClick={onNextPhase}
            className="flex flex-col items-center justify-center rounded-xl font-black text-[11px] uppercase tracking-wide transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: 'rgba(20,83,45,0.5)',
              border: '1px solid rgba(74,222,128,0.4)',
              color: '#86efac',
              minWidth: 82, height: 52, padding: '0 12px',
            }}
          >
            {phase === 'river' ? 'SHOWDOWN' : 'NEXT'}
          </button>
        ) : (
          <button
            onClick={onRaise}
            className="flex flex-col items-center justify-center rounded-xl font-black text-[11px] uppercase tracking-wide transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: 'rgba(20,83,45,0.5)',
              border: '1px solid rgba(74,222,128,0.4)',
              color: '#86efac',
              minWidth: 82, height: 52, padding: '0 12px',
            }}
          >
            RAISE
            <span className="text-[8px] mt-0.5 opacity-70 font-bold">{betAmount.toLocaleString()}</span>
          </button>
        )}
      </div>

      {/* Pot + stack */}
      <div className="shrink-0 text-right space-y-0.5 min-w-[60px]">
        <div className="text-[8px] text-gray-600 uppercase">Pot</div>
        <div className="text-[13px] font-black tabular-nums leading-none" style={{ color: '#d4af37' }}>
          {pot.toLocaleString()}
        </div>
        <div className="text-[8px] text-gray-600 uppercase mt-1">Stack</div>
        <div className="text-[11px] font-black text-green-400 tabular-nums leading-none">
          {heroChips.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
