import React, { useEffect, useRef, useState } from 'react';
import { LOCATIONS_CONFIG } from '../../engine/boardModel';

const RING_PATH = "M 5 8 L 38 8 L 72 8 L 88 20 L 88 50 L 75 74 L 60 85 L 44 85 L 28 85 L 5 85 L 5 66 Z";

export const MapBackground = ({ economy }) => {
  const parkFill = economy === 'Boom' ? '#bbf7d0' : economy === 'Depression' ? '#fef2f2' : '#dcfce7';
  const parkInner = economy === 'Boom' ? '#86efac' : economy === 'Depression' ? '#fecaca' : '#bbf7d0';
  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyTint" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#skyTint)" />
      <path d="M 12 12 L 38 12 L 72 12 L 83 22 L 83 48 L 71 72 L 57 81 L 42 81 L 26 81 L 12 81 Z"
        fill={parkFill} stroke="none" />
      <ellipse cx="48" cy="46" rx="14" ry="11" fill={parkInner} opacity="0.6" />
      <path d={RING_PATH} fill="none" stroke="#6b7280" strokeWidth="5" strokeLinejoin="round" />
      <path d={RING_PATH} fill="none" stroke="rgba(15,23,42,0.18)" strokeWidth="7" strokeLinejoin="round" />
      <path d={RING_PATH} fill="none" stroke="#e5e7eb" strokeWidth="3.5" strokeLinejoin="round" />
      <path d={RING_PATH} fill="none" stroke="#fbbf24" strokeWidth="0.6" strokeLinejoin="round"
        strokeDasharray="3 2" opacity="0.8" />
      <text x="38" y="41" fontSize="5" textAnchor="middle">🌳</text>
      <text x="54" y="50" fontSize="5" textAnchor="middle">🌲</text>
      <text x="42" y="62" fontSize="4" textAnchor="middle">🌳</text>
      <text x="60" y="36" fontSize="3.5" textAnchor="middle">🌲</text>
      <text x="30" y="54" fontSize="3" textAnchor="middle">🏠</text>
      <text x="62" y="66" fontSize="3" textAnchor="middle">🏠</text>
      <text x="46" y="36" fontSize="2.5" textAnchor="middle">🪑</text>
      <text x="50" y="56" fontSize="3" textAnchor="middle">⛲</text>
    </svg>
  );
};

export const BuildingNode = ({ config, isCurrent, isTraveling, onClick, warningBadge, travelHours, isPromoReady, hasJob }) => (
  <div
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    tabIndex={isTraveling ? -1 : 0}
    role="button"
    aria-label={`${config.label}${travelHours ? ` — ${travelHours} hour travel` : ' — current location'}`}
    className={`absolute flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-110 z-10 group
      ${isTraveling ? 'pointer-events-none opacity-60' : ''}
    `}
    style={{
      left: `${config.pos.x}%`,
      top: `${config.pos.y}%`,
      transform: 'translate(-50%, -50%)',
    }}
  >
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 bg-white/95 border-2 sm:border-4 rounded-xl sm:rounded-2xl shadow-[0_14px_24px_rgba(15,23,42,0.24)] flex items-center justify-center text-2xl sm:text-3xl relative backdrop-blur
        ${isCurrent ? 'ring-4 ring-yellow-400 scale-110 shadow-2xl' : 'opacity-90 hover:opacity-100 hover:shadow-xl'}
        ${isPromoReady && !isCurrent ? 'ring-2 ring-green-400 animate-pulse' : ''}
        ${hasJob && !isCurrent ? 'ring-2 ring-emerald-300' : ''}
      `}
      style={{ borderColor: config.color }}
    >
      {config.emoji}
      {isCurrent && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 text-black text-[9px] sm:text-[10px] font-black px-1 py-0.5 rounded-full animate-bounce shadow">
          YOU
        </div>
      )}
      {warningBadge && !isCurrent && (
        <div className={`absolute -top-1 -left-1 sm:-top-2 sm:-left-2 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow ${warningBadge.color}`}>
          {warningBadge.icon}
        </div>
      )}
      {isPromoReady && !isCurrent && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-green-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full animate-bounce shadow">
          🆙
        </div>
      )}
      {hasJob && !isCurrent && !isPromoReady && (
        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[7px] font-black px-0.5 rounded-full w-3.5 h-3.5 flex items-center justify-center">
          💼
        </div>
      )}
    </div>
    <div className={`mt-0.5 sm:mt-1 text-white text-[8px] sm:text-[9px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow whitespace-nowrap ${isCurrent ? 'bg-yellow-500 text-black' : 'bg-slate-800/95 backdrop-blur'}`}>
      {config.label}
    </div>
    {!isCurrent && travelHours != null && (
      <div className="mt-0.5 text-slate-300 text-[7px] sm:text-[8px] font-semibold whitespace-nowrap">
        ⏱ {travelHours}h
      </div>
    )}
  </div>
);

export const PlayerToken = ({ locationId, isMoving, label, emoji, colorClass, zIndex }) => {
  const config = LOCATIONS_CONFIG[locationId];
  const [trail, setTrail] = useState(null);
  const prevLocation = useRef(locationId);

  useEffect(() => {
    if (locationId !== prevLocation.current) {
      const prev = LOCATIONS_CONFIG[prevLocation.current];
      if (prev) setTrail({ x: prev.pos.x, y: prev.pos.y + 10 });
      prevLocation.current = locationId;
      const t = setTimeout(() => setTrail(null), 500);
      return () => clearTimeout(t);
    }
  }, [locationId]);

  if (!config) return null;
  return (
    <>
      {trail && (
        <div
          className="absolute w-8 h-8 rounded-full pointer-events-none opacity-40 transition-opacity duration-500"
          style={{
            left: `${trail.x}%`,
            top: `${trail.y}%`,
            transform: 'translate(-50%, -50%)',
            background: colorClass.includes('yellow') ? '#facc15' : '#f87171',
            zIndex: zIndex - 1,
          }}
        />
      )}
      <div
        className={`absolute w-10 h-10 ${colorClass} border-2 border-white rounded-full flex items-center justify-center text-xl shadow-xl pointer-events-none`}
        style={{
          left: `${config.pos.x}%`,
          top: `${config.pos.y + 10}%`,
          transform: 'translate(-50%, -50%)',
          zIndex,
          transition: 'left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1)',
          animation: isMoving ? 'tokenBounce 0.3s ease-in-out infinite alternate' : 'none',
        }}
        title={label}
      >
        {emoji}
      </div>
    </>
  );
};

export const FloatingMoney = ({ amount, onDone }) => {
  const isPositive = amount >= 0;
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className={`absolute pointer-events-none font-black text-lg z-50 select-none`}
      style={{
        left: '50%',
        bottom: '80px',
        transform: 'translateX(-50%)',
        color: isPositive ? '#22c55e' : '#ef4444',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        animation: 'floatUp 1.2s ease-out forwards',
      }}
    >
      {isPositive ? '+' : ''}{amount < 0 ? '-' : ''}${Math.abs(amount)}
    </div>
  );
};

export const LocationPanel = ({ locationId, player, children, onClose, isStranded, rideFare, onRideHome }) => {
  const config = LOCATIONS_CONFIG[locationId];
  if (!config) return null;
  const isWorkplace = player?.job?.location === locationId;
  const isLowTime = (player?.timeRemaining ?? 99) < 6;
  const isAtHome = locationId === 'home' || locationId === 'leasing_office';
  return (
    <div className="absolute inset-x-2 sm:inset-x-4 top-3 bottom-[8.5rem] sm:bottom-[8rem] bg-white/96 border-4 rounded-[1.75rem] shadow-[0_24px_60px_rgba(15,23,42,0.35)] z-20 flex flex-col overflow-hidden backdrop-blur"
      style={{ borderColor: config.color }}>
      {isStranded && !isAtHome && (
        <div className="bg-amber-500 text-white px-3 py-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[10px] font-black">
              🚖 Stranded! Only {player.timeRemaining}h left — not enough to walk home.
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onRideHome}
                className="bg-white text-amber-700 font-black text-[10px] px-3 py-1.5 rounded-full shadow active:scale-95 transition whitespace-nowrap"
              >
                🚗 Ride Home — ${rideFare}
              </button>
              <button onClick={onClose} className="text-white/80 underline text-[9px] whitespace-nowrap">walk it →</button>
            </div>
          </div>
          <div className="text-[9px] text-amber-100 mt-0.5">−3 dependability · −2 happiness · ends your week</div>
        </div>
      )}
      {!isStranded && isLowTime && !isAtHome && (
        <div className="bg-red-600 text-white text-[10px] font-black text-center py-1.5 px-2 animate-pulse flex items-center justify-center gap-2 flex-shrink-0">
          ⚡ Only {player.timeRemaining}h left — go home and sleep!
          <button onClick={onClose} className="underline font-black ml-1">Back to map →</button>
        </div>
      )}
      <div className="sticky top-0 z-10 px-4 py-3 flex justify-between items-center flex-shrink-0 backdrop-blur"
        style={{ background: `${config.color}18`, borderBottom: `2px solid ${config.color}40` }}>
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide flex items-center gap-2 truncate" style={{ color: config.color }}>
            <span className="text-xl sm:text-2xl flex-shrink-0">{config.emoji}</span>
            <span className="truncate">{config.label}</span>
          </h2>
          {isWorkplace && (
            <span className="text-[9px] bg-emerald-500 text-white font-black px-1.5 py-0.5 rounded-full flex-shrink-0" title="Press W to work">
              YOUR JOB · W
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Return to map"
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-3.5 py-2 rounded-full text-sm shadow transition hover:scale-105 active:scale-95 flex items-center gap-1 flex-shrink-0 ml-2 min-h-[44px] min-w-[72px] justify-center"
        >
          ← Map
        </button>
      </div>
      <div className="flex-grow p-3 sm:p-4 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))]">
        {children}
      </div>
      <div className="sm:hidden flex-shrink-0 border-t border-slate-100 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onClose}
          className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl text-sm active:scale-95 transition shadow-sm"
        >
          ← Back to Map
        </button>
      </div>
    </div>
  );
};
