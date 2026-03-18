import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { LOCATION_ORDER, DIFFICULTY_PRESETS, meetsEducation, travelCost, ECONOMY_PRICE_MULTIPLIER, EDUCATION_RANK, calculateNetWorth, getEducationProgress, calculateDeposit } from '../engine/constants';

// Adjust item price by economy state
const adjustedPrice = (baseCost, economy) =>
  Math.round(baseCost * (ECONOMY_PRICE_MULTIPLIER[economy] || 1));

// Returns the ordered list of locations to step through (not including start, including end)
const ringPath = (fromId, toId) => {
  const n = LOCATION_ORDER.length;
  const a = LOCATION_ORDER.indexOf(fromId);
  const b = LOCATION_ORDER.indexOf(toId);
  if (a === -1 || b === -1 || a === b) return [];
  const cw  = (b - a + n) % n;
  const ccw = (a - b + n) % n;
  const path = [];
  if (cw <= ccw) {
    for (let i = 1; i <= cw; i++) path.push(LOCATION_ORDER[(a + i) % n]);
  } else {
    for (let i = 1; i <= ccw; i++) path.push(LOCATION_ORDER[(a - i + n) % n]);
  }
  return path;
};
import jobsData from '../data/jobs.json';
import itemsData from '../data/items.json';
import educationData from '../data/education.json';

// ─── Career tracks derived from jobs.json promotion chains ───────────────────
const TRACK_META = { service: '☕ Service', tech: '💻 Tech', corporate: '🏢 Corp', trade: '🔧 Trade' };
const CAREER_TRACKS = (() => {
  const promotionTargets = new Set(jobsData.map(j => j.promotion).filter(Boolean));
  const tracks = [];
  for (const [type, label] of Object.entries(TRACK_META)) {
    const typeJobs = jobsData.filter(j => j.type === type);
    const roots = typeJobs.filter(j => !promotionTargets.has(j.id));
    for (const root of roots) {
      const chain = [];
      let cur = root;
      while (cur) { chain.push(cur.id); cur = typeJobs.find(j => j.id === cur.promotion); }
      tracks.push({ label, jobs: chain });
    }
  }
  return tracks;
})();
import housingData from '../data/housing.json';
import stocksData from '../data/stocks.json';

// ─── Location config: label, emoji, board position (% from top-left) ─────────
const LOCATIONS_CONFIG = {
  leasing_office:  { emoji: '🏢', label: 'Leasing',       color: '#9333ea', pos: { x: 5,  y: 10 } },
  quick_eats:      { emoji: '🍔', label: 'Quick Eats',    color: '#ea580c', pos: { x: 38, y: 10 } },
  public_library:  { emoji: '📚', label: 'Library',       color: '#059669', pos: { x: 72, y: 10 } },
  trendsetters:    { emoji: '👕', label: 'TrendSetters',  color: '#db2777', pos: { x: 88, y: 20 } },
  coffee_shop:     { emoji: '☕', label: 'Coffee Shop',   color: '#78350f', pos: { x: 88, y: 50 } },
  megamart:        { emoji: '🏪', label: 'MegaMart',      color: '#dc2626', pos: { x: 75, y: 72 } },
  blacks_market:   { emoji: '🕶️', label: "Black's Mkt",  color: '#1e293b', pos: { x: 60, y: 80 } },
  grocery_store:   { emoji: '🛒', label: 'Fresh Mart',    color: '#16a34a', pos: { x: 44, y: 80 } },
  city_college:    { emoji: '🎓', label: 'City College',  color: '#2563eb', pos: { x: 28, y: 80 } },
  tech_store:      { emoji: '📱', label: 'Tech Store',    color: '#475569', pos: { x: 5,  y: 80 } },
  neobank:         { emoji: '🏦', label: 'NeoBank',       color: '#4f46e5', pos: { x: 5,  y: 45 } },
};

// ─── Map background SVG ───────────────────────────────────────────────────────
// viewBox="0 0 100 100" maps coordinates 1:1 with % positions so building
// coords (e.g. x:5, y:10) match exactly. Path data only accepts numeric units,
// not "5%" strings, so the viewBox is required for % equivalence.
// Ring road traces all 11 building positions in LOCATION_ORDER (Monopoly-style).
// megamart sits at (75,72) on the bottom-right diagonal; bottom row buildings spread evenly.
const RING_PATH = "M 5 10 L 38 10 L 72 10 L 88 20 L 88 50 L 75 72 L 60 80 L 44 80 L 28 80 L 5 80 Z";

const MapBackground = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100" preserveAspectRatio="none">
    {/* Green interior park fill — inset from the ring */}
    <path d="M 12 14 L 38 14 L 72 14 L 83 22 L 83 48 L 71 70 L 57 76 L 42 76 L 26 76 L 12 76 Z"
      fill="#dcfce7" stroke="none" />
    <ellipse cx="48" cy="44" rx="14" ry="10" fill="#bbf7d0" opacity="0.6" />

    {/* Ring road — asphalt base (5 units = 5% of width) */}
    <path d={RING_PATH} fill="none" stroke="#6b7280" strokeWidth="5" strokeLinejoin="round" />
    {/* Ring road — lighter road surface */}
    <path d={RING_PATH} fill="none" stroke="#e5e7eb" strokeWidth="3.5" strokeLinejoin="round" />
    {/* Yellow dashed center line */}
    <path d={RING_PATH} fill="none" stroke="#fbbf24" strokeWidth="0.6" strokeLinejoin="round"
      strokeDasharray="3 2" opacity="0.8" />

    {/* Decorative trees & houses in park interior */}
    <text x="38" y="40" fontSize="5" textAnchor="middle">🌳</text>
    <text x="54" y="48" fontSize="5" textAnchor="middle">🌲</text>
    <text x="42" y="58" fontSize="4" textAnchor="middle">🌳</text>
    <text x="60" y="36" fontSize="3.5" textAnchor="middle">🌲</text>
    <text x="30" y="52" fontSize="3" textAnchor="middle">🏠</text>
    <text x="62" y="62" fontSize="3" textAnchor="middle">🏠</text>
  </svg>
);

// ─── Building node ────────────────────────────────────────────────────────────
const BuildingNode = ({ id, config, isCurrent, isTraveling, onClick }) => (
  <div
    onClick={onClick}
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
      className={`w-10 h-10 sm:w-16 sm:h-16 bg-white border-2 sm:border-4 rounded-lg sm:rounded-xl shadow-lg flex items-center justify-center text-xl sm:text-3xl relative
        ${isCurrent ? 'ring-4 ring-yellow-400 scale-110 shadow-2xl' : 'opacity-90 hover:opacity-100'}
      `}
      style={{ borderColor: config.color }}
    >
      {config.emoji}
      {isCurrent && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 text-black text-[9px] sm:text-[10px] font-black px-1 py-0.5 rounded-full animate-bounce">
          YOU
        </div>
      )}
    </div>
    <div className="mt-0.5 sm:mt-1 bg-slate-800 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow whitespace-nowrap">
      {config.label}
    </div>
  </div>
);

// ─── Player & Jones tokens ────────────────────────────────────────────────────
const PlayerToken = ({ locationId, isMoving, label, emoji, colorClass, zIndex }) => {
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
      {/* Fading trail at previous position */}
      {trail && (
        <div
          className="absolute w-10 h-10 rounded-full pointer-events-none opacity-0 transition-opacity duration-500"
          style={{
            left: `${trail.x}%`,
            top: `${trail.y}%`,
            transform: 'translate(-50%, -50%)',
            background: colorClass.includes('yellow') ? '#facc15' : '#f87171',
            zIndex: zIndex - 1,
          }}
        />
      )}
      {/* Main token */}
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

// ─── Floating money popup ──────────────────────────────────────────────────────
const FloatingMoney = ({ amount, id, onDone }) => {
  const isPositive = amount >= 0;
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className={`fixed pointer-events-none font-black text-lg z-50 select-none`}
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

// ─── Central location panel ───────────────────────────────────────────────────
const LocationPanel = ({ locationId, children, onClose }) => {
  const config = LOCATIONS_CONFIG[locationId];
  if (!config) return null;
  return (
    <div className="absolute inset-x-2 sm:inset-x-4 top-4 bottom-16 sm:bottom-28 bg-white border-4 border-slate-800 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden">
      <div className="bg-slate-100 border-b-2 border-slate-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span> {config.label}
        </h2>
        <button
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-4 py-1.5 rounded-full text-sm shadow transition hover:scale-105 flex items-center gap-1"
        >
          NEXT 👉
        </button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto bg-slate-50">
        {children}
      </div>
    </div>
  );
};

// ─── HUD ─────────────────────────────────────────────────────────────────────
const HUD = ({ state, onOpenInventory, onOpenGoals, onToggleMute }) => {
  const [muted, setMuted] = useState(false);
  const { player, week, economy } = state;
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);

  const economyColor = economy === 'Boom' ? 'text-green-400' : economy === 'Depression' ? 'text-red-400' : 'text-slate-400';
  const happinessFace = player.happiness >= 80 ? '😁' : player.happiness >= 60 ? '🙂' : player.happiness >= 40 ? '😐' : player.happiness >= 20 ? '😟' : '😫';

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 md:h-24 bg-slate-900 border-t-4 border-slate-700 flex items-center justify-between px-2 md:px-3 z-30 shadow-2xl gap-1 md:gap-2">

      {/* Week + Economy */}
      <div className="flex flex-col items-center min-w-[52px]">
        <div className="text-xl md:text-3xl">🕒</div>
        <div className="text-slate-400 text-[10px] font-bold uppercase">Wk {week}</div>
        <div className={`text-[9px] font-bold ${economyColor}`}>{economy}</div>
      </div>

      {/* Happiness */}
      <div className="flex flex-col items-center" title={`Happiness: ${player.happiness}/100 (Goal: ${goals.happiness})`}>
        <div className="text-xl md:text-3xl">{happinessFace}</div>
        <div className="w-10 md:w-14 h-1.5 bg-slate-700 rounded-full mt-0.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${player.happiness < 30 ? 'bg-red-500' : 'bg-yellow-400'}`}
            style={{ width: `${player.happiness}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-500">{player.happiness}%</div>
      </div>

      {/* Time bar + stats */}
      <div className="flex-grow flex flex-col gap-0.5 min-w-0">
        <div className="flex justify-between text-[9px] text-slate-400 uppercase font-bold">
          <span>Time</span>
          <span>{player.timeRemaining}h / {player.maxTime}h</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full border border-slate-600 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${player.timeRemaining < 15 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(player.timeRemaining / player.maxTime) * 100}%` }}
          />
        </div>
        {/* Secondary stats — hidden on mobile to save space */}
        <div className="hidden sm:contents">
          {/* Dependability */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-400 w-16 shrink-0">🎯 Dep {player.dependability ?? 50}</span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${player.dependability ?? 50}%` }} />
            </div>
          </div>
          {/* Relaxation */}
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-400 w-16 shrink-0">🛁 Relax {player.relaxation ?? 50}</span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${(player.relaxation ?? 50) < 20 ? 'bg-red-500' : 'bg-teal-400'}`} style={{ width: `${player.relaxation ?? 50}%` }} />
            </div>
          </div>
          {/* Hunger */}
          {player.hunger >= 40 && (
            <div className="flex items-center gap-1">
              <span className="text-[8px] text-slate-400 w-16 shrink-0">🍽️ Hunger {player.hunger}</span>
              <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${player.hunger >= 80 ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${player.hunger}%` }} />
              </div>
            </div>
          )}
          {/* Education + Job */}
          <div className="flex gap-2 text-[8px] flex-wrap">
            <span className="text-slate-400">🎓 {player.education}</span>
            <span className="text-slate-400">💼 {player.job ? player.job.title : 'Unemployed'}</span>
            {(() => { const v = player.inventory?.find(i => i.type === 'vehicle'); return v ? <span className="text-slate-400">{v.id === 'car' ? '🚗' : '🚲'}</span> : null; })()}
          </div>
        </div>
      </div>

      {/* Money */}
      <div className="flex flex-col items-end gap-1">
        <div className="bg-black/50 px-2 py-1 rounded border border-slate-700 font-mono text-green-400 text-sm sm:text-lg min-w-[72px] sm:min-w-[100px] text-right">
          ${player.money.toFixed(0)}
        </div>
        {player.savings > 0 && (
          <div className="text-[9px] text-blue-400 text-right">
            Savings: ${player.savings.toFixed(0)}
          </div>
        )}
        {player.debt > 0 && (
          <div className="text-[9px] text-red-400 text-right">
            Debt: ${player.debt.toFixed(0)}
          </div>
        )}
        <div className="text-[9px] text-slate-500 text-right">
          Net: <span className={netWorth < 0 ? 'text-red-400' : 'text-green-400'}>${netWorth.toFixed(0)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          <button
            onClick={onOpenInventory}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-sm border border-slate-500 transition"
            title="Inventory"
          >🎒</button>
          <button
            onClick={onOpenGoals}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-sm border border-slate-500 transition"
            title="Goals"
          >🎯</button>
          <button
            onClick={() => { onToggleMute(); setMuted(m => !m); }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-sm border border-slate-500 transition"
            title={muted ? 'Unmute' : 'Mute'}
          >{muted ? '🔇' : '🔊'}</button>
        </div>
        <div className="hidden sm:block text-[9px] text-slate-500 text-center mt-0.5">
          Time runs out → new week
        </div>
      </div>
    </div>
  );
};

// ─── Goals modal ──────────────────────────────────────────────────────────────
const GoalsModal = ({ state, onClose }) => {
  const { player, difficulty } = state;
  const goals = DIFFICULTY_PRESETS[difficulty].goals;
  const netWorth = calculateNetWorth(player);

  const items = [
    {
      label: 'Wealth (Net Worth)',
      current: `$${Math.max(0, netWorth).toFixed(0)}`,
      goal: `$${goals.wealth}`,
      pct: Math.min(100, (Math.max(0, netWorth) / goals.wealth) * 100),
      met: netWorth >= goals.wealth,
    },
    {
      label: 'Happiness',
      current: `${player.happiness}`,
      goal: `${goals.happiness}`,
      pct: Math.min(100, (player.happiness / goals.happiness) * 100),
      met: player.happiness >= goals.happiness,
    },
    {
      label: 'Education',
      current: player.education,
      goal: goals.education,
      pct: getEducationProgress(player.education, goals.education),
      met: meetsEducation(player.education, goals.education),
    },
    {
      label: 'Dependability (Career)',
      current: `${player.dependability ?? 50}`,
      goal: `${goals.careerDependability}`,
      pct: Math.min(100, ((player.dependability ?? 50) / goals.careerDependability) * 100),
      met: (player.dependability ?? 50) >= goals.careerDependability,
    },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black uppercase flex items-center gap-2">🎯 Goals <span className="text-xs font-normal text-slate-500 normal-case">({DIFFICULTY_PRESETS[difficulty].label})</span></h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">Achieve ALL four goals to win.</p>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-bold text-slate-700">{item.met ? '✅' : '⬜'} {item.label}</span>
                <span className="text-xs text-slate-500">{item.current} / {item.goal}</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${item.met ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Notification modal ───────────────────────────────────────────────────────
const NotificationModal = ({ title, message, type, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4">
      <div className="text-center text-4xl mb-3">{type === 'success' ? '🎉' : '🚫'}</div>
      <h3 className={`text-xl font-black text-center mb-2 uppercase ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{title}</h3>
      <p className="text-slate-600 text-center text-sm mb-4">{message}</p>
      <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-2 rounded-xl hover:bg-slate-700 transition">OKAY</button>
    </div>
  </div>
);

// ─── Inventory section (module-scope so it isn't recreated on each render) ────
const InventorySection = ({ title, items }) => {
  if (items.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">{title}</div>
      {items.map((item, i) => (
        <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg mb-1">
          <div>
            <div className="font-bold text-sm">{item.name}</div>
            <div className="text-xs text-slate-400">{item.effect}</div>
            {item.clothingWear !== undefined && (
              <div className="mt-0.5">
                <div className="flex items-center gap-1">
                  <div className="flex-grow h-1.5 bg-slate-200 rounded-full overflow-hidden w-20">
                    <div
                      className={`h-full rounded-full ${item.clothingWear <= 20 ? 'bg-red-500' : item.clothingWear <= 40 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${item.clothingWear}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${item.clothingWear <= 20 ? 'text-red-600' : 'text-slate-400'}`}>
                    {item.clothingWear <= 20 ? '⚠️ ' : ''}{item.clothingWear}% durability
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 text-right">
            <div>${item.cost}</div>
            <div className="text-slate-400">resell ${Math.floor(item.cost * 0.5)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Inventory modal ──────────────────────────────────────────────────────────
const InventoryModal = ({ inventory, onClose }) => {
  const clothing = inventory.filter(i => i.clothingWear !== undefined);
  const electronics = inventory.filter(i => i.type === 'electronics' || i.type === 'subscription');
  const appliances = inventory.filter(i => i.type === 'appliance');
  const studyAids = inventory.filter(i => i.type === 'study_aid');
  const groceries = inventory.filter(i => i.id === 'groceries');
  const other = inventory.filter(i =>
    i.clothingWear === undefined &&
    i.type !== 'electronics' && i.type !== 'subscription' &&
    i.type !== 'appliance' && i.type !== 'study_aid' &&
    i.id !== 'groceries'
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 border-b-2 border-slate-200 pb-2">
          <h3 className="text-xl font-black uppercase flex items-center gap-2">🎒 Inventory</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>
        <div className="flex-grow overflow-y-auto pr-1">
          {inventory.length === 0 ? (
            <div className="text-center text-slate-400 py-8 italic">Your pockets are empty.</div>
          ) : (
            <>
              <InventorySection title="👗 Clothing" items={clothing} />
              {groceries.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">🛒 Stored Food</div>
                  <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <span className="font-bold">{groceries.length} week{groceries.length > 1 ? 's' : ''} of groceries</span>
                    <span className="text-xs text-green-700 ml-2">auto-consumed each week</span>
                  </div>
                </div>
              )}
              <InventorySection title="📱 Electronics & Subs" items={electronics} />
              <InventorySection title="🏠 Appliances" items={appliances} />
              <InventorySection title="📚 Study Aids" items={studyAids} />
              <InventorySection title="📦 Other" items={other} />
            </>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-400 text-center">
          Sell items at Black's Market (50% value)
        </div>
      </div>
    </div>
  );
};

// ─── Event modal ──────────────────────────────────────────────────────────────
const EventModal = ({ event, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-white border-4 border-yellow-400 rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4">
      <div className="text-center text-4xl mb-2">📰</div>
      <h3 className="text-lg font-black text-center text-slate-800 mb-2">{event.title}</h3>
      <p className="text-slate-600 text-center text-sm mb-2">{event.description}</p>
      {event.playerName && event.playerName !== 'Player 1' && (
        <div className="text-xs text-slate-500 text-center mb-2">Affects: {event.playerName}</div>
      )}
      {event.effectDesc && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center text-sm font-bold text-yellow-800 mb-4">
          {event.effectDesc}
        </div>
      )}
      <button onClick={onClose} className="w-full bg-slate-800 text-white font-bold py-2 rounded-xl hover:bg-slate-700 transition">
        Got it
      </button>
    </div>
  </div>
);

// ─── Ring Tips ────────────────────────────────────────────────────────────────
const RingTips = ({ player, week }) => {
  const [open, setOpen] = React.useState(false);

  if (week > 5) return null;

  const tips = [];
  if (!player.hasChosenHousing) {
    tips.push({ emoji: '🏠', text: 'Go to Leasing Office and pick a place to live first' });
  }
  if (!player.job) {
    tips.push({ emoji: '📚', text: 'Visit the Library to browse jobs and get hired' });
  }
  const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage');
  if (!hasFood) {
    tips.push({ emoji: '🍔', text: "Visit Quick Eats and grab a week's worth of meals" });
  }
  if (player.job && player.timeRemaining >= 8) {
    const loc = LOCATIONS_CONFIG[player.job.location];
    tips.push({ emoji: loc?.emoji ?? '💼', text: `Head to ${loc?.label ?? player.job.location} and work a shift` });
  }
  if (player.money >= 200 && !player.job) {
    tips.push({ emoji: '🏦', text: 'Deposit cash at NeoBank to earn 1% interest per week' });
  }
  if (tips.length === 0) return null;

  return (
    <>
      {/* Expanded panel — bottom sheet on mobile, floats on sm+ */}
      {open && (
        <div className="absolute bottom-16 sm:bottom-40 left-0 right-0 sm:left-auto sm:right-4 sm:w-52 bg-amber-50 border-t-2 sm:border-2 border-amber-300 sm:rounded-xl p-4 sm:p-3 shadow-xl z-40">
          <div className="text-[10px] font-black uppercase text-amber-600 mb-2">💡 What to do next</div>
          <div className="space-y-2">
            {tips.slice(0, 3).map((tip, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="text-sm leading-tight">{tip.emoji}</span>
                <span className="text-[10px] text-slate-600 leading-tight">{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-[4.5rem] sm:bottom-28 right-16 w-10 h-10 border-2 rounded-full flex items-center justify-center z-10 shadow-lg transition-colors ${open ? 'bg-amber-300 border-amber-500' : 'bg-amber-400/80 border-amber-500 hover:bg-amber-300'}`}
        title="Hints"
      >
        <span className="text-lg leading-none">💡</span>
        {!open && tips.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
            {tips.length}
          </span>
        )}
      </button>
    </>
  );
};

// ─── Jones sidebar ────────────────────────────────────────────────────────────
const JonesSidebar = ({ jones, difficulty, player }) => {
  const [open, setOpen] = React.useState(false);
  const playerNetWorth = calculateNetWorth(player);

  return (
    <>
      {/* Expanded panel — bottom sheet on mobile, floats on sm+ */}
      {open && (
        <div className="absolute bottom-16 sm:bottom-40 left-0 right-0 sm:left-auto sm:right-[14rem] sm:w-52 bg-white/95 backdrop-blur border-t-2 sm:border-2 border-red-300 sm:rounded-xl p-4 sm:p-3 shadow-xl z-40">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
            <div className="text-2xl">🤑</div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-500">The Joneses</div>
              <div className="text-xs font-bold">{jones.jobTitle}</div>
            </div>
          </div>
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">💰 Net Worth</span>
              <span className={`font-mono font-bold ${playerNetWorth >= jones.netWorth ? 'text-green-600' : 'text-red-500'}`}>${jones.netWorth.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">😊 Happiness</span>
              <span className={`font-mono font-bold ${player.happiness >= jones.happiness ? 'text-green-600' : 'text-red-500'}`}>{jones.happiness}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">🎓 Education</span>
              <span className="font-mono font-bold text-slate-600">{jones.education}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">You vs Jones</div>
            <div className="text-[9px] space-y-0.5">
              <div>{playerNetWorth >= jones.netWorth ? '✅' : '❌'} Wealth: {playerNetWorth >= jones.netWorth ? 'Ahead!' : `$${(jones.netWorth - playerNetWorth).toFixed(0)} behind`}</div>
              <div>{player.happiness >= jones.happiness ? '✅' : '❌'} Happiness: {player.happiness >= jones.happiness ? 'Ahead!' : `${jones.happiness - player.happiness} pts behind`}</div>
            </div>
          </div>
        </div>
      )}
      {/* Icon button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`absolute bottom-[4.5rem] sm:bottom-28 right-28 w-10 h-10 border-2 rounded-full flex items-center justify-center z-10 shadow-lg transition-colors ${open ? 'bg-red-200 border-red-400' : 'bg-slate-900/90 border-slate-700 hover:border-slate-400'}`}
        title="The Joneses"
      >
        <span className="text-lg leading-none">🤑</span>
      </button>
    </>
  );
};

// ─── Notification feed ────────────────────────────────────────────────────────
// Collapsed to a small bell button so it doesn't overlap any buildings.
const NotificationFeed = ({ history, onOpenLog }) => (
  <button
    className="absolute bottom-[4.5rem] sm:bottom-28 right-4 w-10 h-10 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-full flex items-center justify-center z-10 hover:border-slate-400 transition-colors shadow-lg"
    onClick={onOpenLog}
    title="Open event log"
  >
    <span className="text-lg leading-none">🔔</span>
    {history.length > 0 && (
      <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
        {Math.min(history.length, 99)}
      </span>
    )}
  </button>
);

// ─── Full log modal ───────────────────────────────────────────────────────────
const FullLogModal = ({ history, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-slate-900 border-2 border-slate-600 rounded-2xl shadow-2xl p-4 max-w-sm w-full mx-4 max-h-[80%] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-black text-base">📋 Full Event Log</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-0.5 pr-1">
        {history.length === 0
          ? <div className="text-slate-500 italic text-xs text-center">No events yet.</div>
          : history.map((entry, i) => (
              <div key={i} className="text-[11px] text-slate-300 border-b border-slate-800 last:border-0 py-1">{entry}</div>
            ))}
      </div>
    </div>
  </div>
);

// ─── Week summary modal ───────────────────────────────────────────────────────
const WeekSummaryModal = ({ summary, onClose }) => {
  // Capture onClose in a ref so the timeout doesn't reset when the parent re-renders
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 4000);
    return () => clearTimeout(t);
  }, []); // intentionally empty — fires once per mount

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border-4 border-indigo-500 rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-center text-3xl mb-1">🌙</div>
        <h3 className="text-lg font-black text-center text-indigo-800 mb-3">Week {summary.week} Complete!</h3>
        <div className="space-y-2 mb-4">
          {summary.lines.map((line, i) => (
            <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono">{line}</div>
          ))}
        </div>
        <button onClick={onClose} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl hover:bg-indigo-700 transition text-sm">
          Start Week {summary.week + 1} →
        </button>
      </div>
    </div>
  );
};

// ─── Location panel content renderers ────────────────────────────────────────

const QuickEatsContent = ({ state, actions }) => {
  const { player, economy } = state;
  const hasPhone = player.inventory.some(i => i.id === 'smartphone');
  const weeklyMeals = itemsData.filter(i => i.type === 'weekly_meal');
  const storedMeal = player.inventory.find(i => i.type === 'weekly_meal');
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Weekly Meal Plans</h3>
        <p className="text-[10px] text-slate-500 mb-2">Each plan feeds you for the whole week — auto-eaten at week's end. No fridge needed.</p>
        {storedMeal ? (
          <div className="p-2 bg-green-50 border border-green-300 rounded text-xs text-green-800 mb-2">
            ✅ <strong>{storedMeal.name}</strong> ready for this week.
          </div>
        ) : null}
        {weeklyMeals.map(item => {
          const price = adjustedPrice(item.cost, economy);
          const owned = !!storedMeal;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={owned || player.money < price}
              className="w-full flex justify-between items-start p-2 bg-white border rounded hover:bg-orange-50 disabled:opacity-50 mb-1 text-sm"
            >
              <div className="text-left">
                <div className="font-medium">🍔 {item.name}</div>
                <div className="text-[10px] text-slate-500">{item.effect}</div>
              </div>
              <span className="font-mono text-xs ml-2 shrink-0">${price}/wk</span>
            </button>
          );
        })}
        <div className="mt-2 text-xs text-slate-400">Hunger: {player.hunger}/100</div>
        <div className="mt-1 text-[10px] text-slate-400 italic">💡 Fresh Mart groceries save money — need a fridge from MegaMart</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Gig Work (4hrs)</h3>
        {hasPhone ? (
          <button
            onClick={actions.gigWork}
            disabled={player.timeRemaining < 4}
            className="w-full flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 text-sm"
          >
            <div>
              <div className="font-bold">🚗 Delivery Run</div>
              <div className="text-xs text-slate-500">Economy adjusted</div>
            </div>
            <span className="font-mono text-green-600">+${Math.floor(60 * (state.economy === 'Boom' ? 1.3 : state.economy === 'Depression' ? 0.8 : 1.0))}</span>
          </button>
        ) : (
          <div className="text-xs text-slate-400 italic p-2 bg-slate-100 rounded">
            Need a 📱 Smartphone to unlock gig work.
          </div>
        )}
      </div>
    </div>
  );
};

const LibraryContent = ({ state, actions, setNotification }) => {
  const { player } = state;
  const availableJobs = jobsData.filter(j => j.id !== 'gig_driver');
  const isCorpEmployee = player.job?.type === 'corporate';
  const isTradeEmployee = player.job?.type === 'trade';
  const hasLaptop = player.inventory.some(i => i.id === 'laptop');
  const [showCareerPaths, setShowCareerPaths] = useState(false);

  const handleApply = (job) => {
    const prev = state;
    actions.applyForJob(job);
    // Notification will come from lastJobResult — handled in Board
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📋 Job Board</h3>
        <div className="flex-grow overflow-y-auto space-y-1">
          {availableJobs.map(job => (
            <button
              key={job.id}
              onClick={() => handleApply(job)}
              className="w-full text-left p-2 bg-white border hover:border-emerald-400 rounded text-xs group"
            >
              <div className="flex justify-between">
                <span className="font-bold group-hover:text-emerald-600">{job.title}</span>
                <span className="font-mono">${job.wage}/hr</span>
              </div>
              <div className="text-slate-400">
                {job.requirements?.education ? `${job.requirements.education} · ` : 'Entry Level · '}
                {job.requirements?.experience ? `${job.requirements.experience}wks · ` : ''}
                {job.requirements?.dependability ? `🎯${job.requirements.dependability} dep` : ''}
              </div>
            </button>
          ))}
        </div>
        {/* Career Paths info */}
        <button
          onClick={() => setShowCareerPaths(s => !s)}
          className="w-full mt-2 text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 py-1 border-t border-slate-200"
        >
          {showCareerPaths ? '▼' : '▶'} Career Paths
        </button>
        {showCareerPaths && (
          <div className="text-[10px] space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
            {CAREER_TRACKS.map(track => (
              <div key={track.label}>
                <div className="font-bold text-slate-600 mb-0.5">{track.label}</div>
                <div className="flex items-center gap-1 flex-wrap">
                  {track.jobs.map((jobId, i) => {
                    const job = jobsData.find(j => j.id === jobId);
                    if (!job) return null;
                    const isCurrent = player.job?.id === jobId;
                    const isNext = player.job?.promotion === jobId;
                    return (
                      <React.Fragment key={jobId}>
                        {i > 0 && <span className="text-slate-400">→</span>}
                        <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${
                          isCurrent ? 'bg-emerald-200 text-emerald-800' :
                          isNext ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {job.title} ${job.wage}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">💻 Remote Work</h3>
        {isCorpEmployee && hasLaptop ? (
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50 text-sm"
          >
            <div className="font-bold">Work Shift (8h)</div>
            <div className="text-xs text-emerald-700">{player.job.title} · ${player.job.wage}/hr</div>
          </button>
        ) : isCorpEmployee && !hasLaptop ? (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Need a 💻 Laptop for remote work.</div>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Corporate employees can work remotely here with a laptop.</div>
        )}
        {/* Promotion check for corp employees */}
        {isCorpEmployee && (() => {
          const nextJob = jobsData.find(j => j.id === player.job?.promotion);
          if (!nextJob) return null;
          const meetsExp = !nextJob.requirements?.experience || (player.job?.weeksWorked || 0) >= nextJob.requirements.experience;
          const meetsEdu = !nextJob.requirements?.education || meetsEducation(player.education, nextJob.requirements.education);
          const meetsDep = !nextJob.requirements?.dependability || player.dependability >= nextJob.requirements.dependability;
          const meetsItem = !nextJob.requirements?.item || player.inventory.some(i => i.id === nextJob.requirements.item);
          if (meetsExp && meetsEdu && meetsDep && meetsItem) {
            return (
              <button
                onClick={() => actions.applyForJob(nextJob)}
                className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800"
              >
                🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
              </button>
            );
          }
          return null;
        })()}

        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2 mt-3">🔧 Trade Dispatch</h3>
        {isTradeEmployee ? (
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 disabled:opacity-50 text-sm"
          >
            <div className="font-bold">Go to Site (8h)</div>
            <div className="text-xs text-yellow-700">{player.job.title} · ${player.job.wage}/hr</div>
          </button>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Trade workers get dispatched here.</div>
        )}
        {/* Promotion check for trade employees */}
        {isTradeEmployee && (() => {
          const nextJob = jobsData.find(j => j.id === player.job?.promotion);
          if (!nextJob) return null;
          const meetsExp = !nextJob.requirements?.experience || (player.job?.weeksWorked || 0) >= nextJob.requirements.experience;
          const meetsEdu = !nextJob.requirements?.education || meetsEducation(player.education, nextJob.requirements.education);
          const meetsDep = !nextJob.requirements?.dependability || player.dependability >= nextJob.requirements.dependability;
          const meetsItem = !nextJob.requirements?.item || player.inventory.some(i => i.id === nextJob.requirements.item);
          if (meetsExp && meetsEdu && meetsDep && meetsItem) {
            return (
              <button
                onClick={() => actions.applyForJob(nextJob)}
                className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800"
              >
                🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
              </button>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
};

const TrendSettersContent = ({ state, actions }) => {
  const { player, economy } = state;
  const clothing = itemsData.filter(i => i.type === 'clothing');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center justify-center bg-pink-50 rounded-lg p-4">
        <div className="text-7xl mb-2">👗</div>
        <div className="text-xs font-bold text-pink-800 text-center">Dress for success</div>
        <div className="text-[10px] text-pink-600 mt-1">Clothes wear out over time!</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Clothing</h3>
        {clothing.map(item => {
          const owned = player.inventory.find(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-pink-50 text-sm"
            >
              <div className="text-left">
                <div>{item.name}</div>
                {owned && <div className="text-[9px] text-slate-400">Durability: {owned.clothingWear}%</div>}
              </div>
              <span className="font-mono text-xs">{owned ? `🔄 $${price}` : `$${price}`}</span>
            </button>
          );
        })}
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2 mt-3">Vehicles</h3>
        {itemsData.filter(i => i.type === 'vehicle').map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const hasVehicle = player.inventory.some(i => i.type === 'vehicle');
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-pink-50 disabled:opacity-60 text-sm"
            >
              <div className="text-left">
                <div>{item.name} {hasVehicle && !owned ? '(upgrade)' : ''}</div>
                <div className="text-[9px] text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono text-xs">{owned ? '✅' : `$${price}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Fresh Mart (grocery store) ───────────────────────────────────────────────
const GroceryStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const groceryItem = itemsData.find(i => i.id === 'groceries');
  const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
  const hasFreezer = player.inventory.some(i => i.id === 'freezer');
  const hasStorage = hasFridge || hasFreezer;
  const storedServings = player.inventory.filter(i => i.id === 'groceries').length;
  const maxStorage = hasFreezer ? 4 : hasFridge ? 2 : 1;
  const groceryPrice = adjustedPrice(groceryItem.cost, economy);
  const full = storedServings >= maxStorage;
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col items-center justify-center bg-green-50 rounded-lg p-4">
        <div className="text-7xl mb-2">🛒</div>
        <div className="text-xs font-bold text-green-800 text-center">Fresh Mart</div>
        <div className="text-[10px] text-green-600 mt-1 text-center">Affordable groceries — get a fridge to store more!</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Groceries</h3>

        {/* Spoilage warning if no fridge */}
        {!hasStorage && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-800">
            ⚠️ <strong>No fridge!</strong> Food spoils at week's end — you'll get food poisoning (−20hrs). Buy a fridge at MegaMart.
          </div>
        )}

        <button
          onClick={() => actions.buyItem({ ...groceryItem, cost: groceryPrice })}
          disabled={full || player.money < groceryPrice}
          className="w-full flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 text-sm mb-1"
        >
          <div>
            <div className="font-bold">🥦 Groceries (1 week)</div>
            <div className="text-[10px] text-slate-500">
              {hasStorage ? `${storedServings}/${maxStorage} weeks stored` : 'Holds 1 week (no fridge)'}
            </div>
          </div>
          <span className="font-mono text-xs">${groceryPrice}</span>
        </button>

        {hasStorage && (
          <div className="text-[10px] text-green-700 mt-1">
            🧊 {hasFreezer ? 'Freezer' : 'Fridge'} stores up to {maxStorage} weeks — auto-eaten each week.
          </div>
        )}

        <div className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-400">
          Hunger: {player.hunger}/100
        </div>
      </div>
    </div>
  );
};

// ─── MegaMart (Target-style big-box store) ────────────────────────────────────
const MegaMartContent = ({ state, actions }) => {
  const { player, economy } = state;
  const appliances = itemsData.filter(i => i.type === 'appliance');
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="flex flex-col items-center justify-center bg-red-50 rounded-lg p-4">
        <div className="text-7xl mb-2">🏪</div>
        <div className="text-xs font-bold text-red-800 text-center">MegaMart</div>
        <div className="text-[10px] text-red-600 mt-1 text-center">Everything for your home</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Appliances</h3>
        {appliances.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const upgrading = item.id === 'freezer' && player.inventory.some(i => i.id === 'refrigerator');
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-red-50 disabled:opacity-60 text-sm"
            >
              <div className="text-left">
                <div>{item.name} {upgrading ? '(upgrade)' : ''}</div>
                <div className="text-[9px] text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono text-xs">{owned ? '✅' : `$${price}`}</span>
            </button>
          );
        })}
        <div className="mt-3 text-[10px] text-slate-400 italic">
          💡 A fridge lets you stock groceries at Fresh Mart — auto-eaten each week so you skip the store.
        </div>
      </div>
    </div>
  );
};

const CoffeeShopContent = ({ state, actions }) => {
  const { player } = state;
  const isServiceEmployee = player.job?.type === 'service';
  const foodItems = itemsData.filter(i => i.type === 'food');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Menu</h3>
        <button
          onClick={() => actions.buyItem({ id: 'espresso', name: 'Espresso', cost: 5, type: 'food', hungerRestore: 10, happinessBoost: 8, timeToEat: 0.5 })}
          className="w-full flex justify-between items-center p-2 bg-white border rounded hover:bg-amber-50 mb-1 text-sm"
        >
          <span>☕ Espresso</span>
          <span className="font-mono">$5</span>
        </button>
        <button
          onClick={() => actions.buyItem({ id: 'pastry', name: 'Pastry', cost: 8, type: 'food', hungerRestore: 20, happinessBoost: 6, timeToEat: 0.5 })}
          className="w-full flex justify-between items-center p-2 bg-white border rounded hover:bg-amber-50 text-sm"
        >
          <span>🥐 Croissant</span>
          <span className="font-mono">$8</span>
        </button>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Staff Only</h3>
        {isServiceEmployee ? (
          <>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50 text-sm"
            >
              <div className="font-bold">Work Shift (8h)</div>
              <div className="text-xs text-amber-800">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {/* Promotion check */}
            {(() => {
              const nextJob = jobsData.find(j => j.id === player.job?.promotion);
              if (!nextJob) return null;
              const meetsExp = !nextJob.requirements?.experience || (player.job?.weeksWorked || 0) >= nextJob.requirements.experience;
              const meetsEdu = !nextJob.requirements?.education || meetsEducation(player.education, nextJob.requirements.education);
              const meetsDep = !nextJob.requirements?.dependability || player.dependability >= nextJob.requirements.dependability;
              const meetsItem = !nextJob.requirements?.item || player.inventory.some(i => i.id === nextJob.requirements.item);
              if (meetsExp && meetsEdu && meetsDep && meetsItem) {
                return (
                  <button
                    onClick={() => actions.applyForJob(nextJob)}
                    className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800"
                  >
                    🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                  </button>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Apply for a service job at the Library to work here.</div>
        )}
      </div>
    </div>
  );
};

const BlacksMarketContent = ({ state, actions }) => {
  const { player, economy } = state;
  const concertTicket = itemsData.find(i => i.id === 'concert_ticket');
  const concertPrice = adjustedPrice(concertTicket.cost, economy);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Pawn Shop</h3>
        <p className="text-xs italic text-slate-500 mb-2">"50¢ on the dollar, take it or leave it."</p>
        {player.inventory.length === 0 ? (
          <div className="text-xs text-slate-400 italic">Nothing to sell.</div>
        ) : player.inventory.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-2 bg-white border rounded mb-1 text-xs">
            <span>{item.name}</span>
            <button
              onClick={() => actions.sellItem(item)}
              className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold hover:bg-red-200"
            >
              ${Math.floor(item.cost * 0.5)}
            </button>
          </div>
        ))}
        <div className="mt-3 text-[10px] text-slate-400 bg-slate-100 p-2 rounded italic">
          ⚠️ Watch out for Wild Willy leaving this area!
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Ticket Booth</h3>
        <button
          onClick={() => {
            if (player.money >= 10) {
              actions.buyItem({ id: `lottery_${Date.now()}`, name: 'Lottery Ticket', cost: 10, type: 'entertainment', happinessBoost: Math.random() < 0.05 ? 50 : -2, relaxationBoost: 0 });
            }
          }}
          disabled={player.money < 10}
          className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 disabled:opacity-50 mb-2 text-sm"
        >
          <div className="font-bold">🎰 Lottery ($10)</div>
          <div className="text-xs text-yellow-700">5% to win big</div>
        </button>
        <button
          onClick={() => actions.buyItem({ ...concertTicket, cost: concertPrice })}
          disabled={player.money < concertPrice}
          className="w-full p-3 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-50 text-sm"
        >
          <div className="font-bold">🎸 Concert Ticket (${concertPrice})</div>
          <div className="text-xs text-purple-700">+{concertTicket.happinessBoost} Happiness, +{concertTicket.relaxationBoost} Relaxation</div>
        </button>
      </div>
    </div>
  );
};

const CityCollegeContent = ({ state, actions }) => {
  const { player } = state;
  const studyBonus = player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0);
  const textbook = itemsData.find(i => i.id === 'textbook');
  const ownsTextbook = player.inventory.some(i => i.id === 'textbook');
  return (
    <div className="h-full flex flex-col gap-3">
      {player.currentCourse && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-800 text-sm">{player.currentCourse.title}</h3>
          <div className="w-full bg-blue-200 h-3 rounded-full mt-1 overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%` }} />
          </div>
          <div className="text-xs mt-1 text-blue-700">{player.currentCourse.progress}/{player.currentCourse.totalHours} hrs</div>
          {studyBonus > 0 && (
            <div className="text-[10px] text-green-600 mt-0.5">📚 Study bonus: +{studyBonus}hrs/session</div>
          )}
          <button
            onClick={actions.study}
            disabled={player.timeRemaining < 10}
            className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 text-xs"
          >
            Study 10hrs {studyBonus > 0 ? `(+${studyBonus} bonus)` : ''}
          </button>
        </div>
      )}
      {/* Textbook purchase */}
      {!ownsTextbook && (
        <button
          onClick={() => actions.buyItem(textbook)}
          disabled={player.money < textbook.cost}
          className="w-full flex justify-between items-center p-2 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 disabled:opacity-50 text-xs"
        >
          <div>
            <div className="font-bold">📚 Buy Textbook</div>
            <div className="text-slate-500">Reduces hours needed per study session</div>
          </div>
          <span className="font-mono">${textbook.cost}</span>
        </button>
      )}
      <div className="flex-grow overflow-y-auto space-y-1">
        {educationData.map(course => {
          const eduReq = course.requirements?.education;
          const itemReq = course.requirements?.item;
          const eduOk = !eduReq || meetsEducation(player.education, eduReq);
          const itemOk = !itemReq || player.inventory.some(i => i.id === itemReq);
          const canEnroll = eduOk && itemOk;
          const alreadyDone = meetsEducation(player.education, course.degree);
          return (
            <button
              key={course.id}
              onClick={() => canEnroll && !alreadyDone && !player.currentCourse && actions.enroll(course)}
              disabled={!canEnroll || alreadyDone || !!player.currentCourse}
              className="w-full flex justify-between items-center p-2 border rounded hover:bg-blue-50 disabled:opacity-50 text-xs"
            >
              <div className="text-left">
                <div className="font-bold">
                  {alreadyDone ? '✅ ' : !canEnroll ? '🔒 ' : ''}{course.title}
                </div>
                <div className="text-slate-400">
                  {course.totalHours}hrs
                  {eduReq && !eduOk ? ` · Needs ${eduReq}` : ''}
                  {itemReq && !itemOk ? ` · Needs ${itemReq.replace(/_/g, ' ')}` : ''}
                  {canEnroll && !alreadyDone ? ` · ${course.description}` : ''}
                </div>
              </div>
              <span className="font-mono font-bold ml-2">${course.cost}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TechStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTechEmployee = player.job?.type === 'tech';
  const electronics = itemsData.filter(i => i.type === 'electronics');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Products</h3>
        {electronics.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-blue-50 disabled:opacity-60 text-xs"
            >
              <div className="text-left">
                <div className="font-bold">{item.name}</div>
                <div className="text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono">{owned ? '✅' : `$${price}`}</span>
            </button>
          );
        })}
        {/* Streaming sub */}
        {itemsData.filter(i => i.type === 'subscription' && i.id !== 'health_insurance').map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem(item)}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-blue-50 disabled:opacity-60 text-xs mt-2"
            >
              <div className="text-left">
                <div className="font-bold">{item.name}</div>
                <div className="text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono">{owned ? '✅' : `$${item.cost}`}</span>
            </button>
          );
        })}
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Tech Work</h3>
        {isTechEmployee ? (
          <>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
            >
              <div className="font-bold">Code Sprint (8h)</div>
              <div className="text-xs text-blue-700">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {/* Promotion check */}
            {(() => {
              const nextJob = jobsData.find(j => j.id === player.job?.promotion);
              if (!nextJob) return null;
              const meetsExp = !nextJob.requirements?.experience || (player.job?.weeksWorked || 0) >= nextJob.requirements.experience;
              const meetsEdu = !nextJob.requirements?.education || meetsEducation(player.education, nextJob.requirements.education);
              const meetsDep = !nextJob.requirements?.dependability || player.dependability >= nextJob.requirements.dependability;
              const meetsItem = !nextJob.requirements?.item || player.inventory.some(i => i.id === nextJob.requirements.item);
              if (meetsExp && meetsEdu && meetsDep && meetsItem) {
                return (
                  <button
                    onClick={() => actions.applyForJob(nextJob)}
                    className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800"
                  >
                    🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                  </button>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Tech employees work here. Apply at the Library.</div>
        )}
      </div>
    </div>
  );
};

const NeoBankContent = ({ state, actions }) => {
  const { player } = state;
  const [depositAmt, setDepositAmt] = useState(100);
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1">Banking</h3>
        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
          <div className="text-xs font-bold text-indigo-700 mb-1">Savings (1%/wk)</div>
          <div className="text-2xl font-mono mb-2">${player.savings}</div>
          <div className="flex gap-1">
            <input
              type="number"
              value={depositAmt}
              onChange={e => setDepositAmt(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 border rounded px-1 py-0.5 text-xs"
              min="1"
            />
            <button onClick={() => actions.bankTransaction('deposit', depositAmt)} className="flex-1 bg-white border border-indigo-200 py-0.5 rounded hover:bg-indigo-100 text-xs">Dep</button>
            <button onClick={() => actions.bankTransaction('withdraw', depositAmt)} className="flex-1 bg-white border border-indigo-200 py-0.5 rounded hover:bg-indigo-100 text-xs">W/D</button>
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-100">
          <div className="text-xs font-bold text-red-700 mb-1">Debt (5%/wk)</div>
          <div className="text-2xl font-mono mb-2 text-red-600">${player.debt}</div>
          <div className="flex gap-1">
            <button onClick={() => actions.bankTransaction('repay', depositAmt)} className="flex-1 bg-white border border-red-200 py-0.5 rounded hover:bg-red-100 text-xs">Pay ${depositAmt}</button>
            <button onClick={() => actions.bankTransaction('borrow', depositAmt)} className="flex-1 bg-white border border-red-200 py-0.5 rounded hover:bg-red-100 text-xs">Borrow</button>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-200">
          <h3 className="font-bold text-xs mb-2 text-slate-600">🛡️ Insurance</h3>
          {itemsData.filter(i => i.id === 'health_insurance').map(item => {
            const owned = player.inventory.some(i => i.id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => !owned && actions.buyItem(item)}
                disabled={owned}
                className="w-full flex justify-between items-center p-2 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-60 text-xs"
              >
                <div className="text-left">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-slate-400">{item.effect}</div>
                </div>
                <span className="font-mono">{owned ? '✅' : `$${item.cost}`}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📈 Stocks</h3>
        {(() => {
          const total = stocksData.reduce((sum, stock) => {
            const owned = player.portfolio?.[stock.symbol] || 0;
            return sum + owned * (state.market[stock.symbol] || 0);
          }, 0);
          if (total === 0) return null;
          return (
            <div className="bg-indigo-50 px-2 py-1 rounded text-xs mb-2 flex justify-between">
              <span className="text-indigo-600 font-bold">Portfolio Value</span>
              <span className="font-mono font-bold text-indigo-700">${total.toLocaleString()}</span>
            </div>
          );
        })()}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {stocksData.map(stock => {
            const currentPrice = state.market[stock.symbol];
            const owned = player.portfolio?.[stock.symbol] || 0;
            const isUp = currentPrice >= stock.basePrice;
            return (
              <div key={stock.symbol} className="bg-white p-2 rounded border text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-bold">{stock.symbol}</span>
                  <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>${currentPrice}</span>
                </div>
                <div className="text-slate-400 mb-1">{stock.name}</div>
                <div className="flex justify-between text-slate-500 mb-1">
                  <span>Owned: {owned}</span>
                  <span>Value: ${owned * currentPrice}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => actions.buyStock(stock.symbol, 1)} className="flex-1 bg-green-100 text-green-800 py-0.5 rounded hover:bg-green-200">Buy</button>
                  <button onClick={() => actions.buyStock(stock.symbol, 10)} className="flex-1 bg-green-100 text-green-800 py-0.5 rounded hover:bg-green-200">Buy10</button>
                  <button onClick={() => actions.sellStock(stock.symbol, 1)} disabled={owned < 1} className="flex-1 bg-red-100 text-red-800 py-0.5 rounded hover:bg-red-200 disabled:opacity-40">Sell</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LeasingOfficeContent = ({ state, actions }) => {
  const { player } = state;
  const isFirstVisit = state.week === 1 && !player.hasChosenHousing;
  return (
    <div className="space-y-3">

      {/* Week 1 onboarding: pick housing before anything else */}
      {isFirstVisit ? (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 mb-1">
          <div className="font-black text-base text-indigo-900 mb-1">👋 Welcome to Life in the Express Lane!</div>
          <p className="text-xs text-indigo-700 mb-3">First things first — choose a place to live. Your rent comes out each week, so pick what you can afford.</p>
          <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside mb-2">
            <li>📚 <strong>Library</strong> — get your first job</li>
            <li>🍔 <strong>Quick Eats</strong> — buy weekly meals so you don't starve</li>
            <li>☕ <strong>Coffee Shop</strong> — work shifts to earn money</li>
            <li>🏦 <strong>NeoBank</strong> — save your money at 1%/week</li>
          </ul>
          <div className="text-[10px] text-indigo-500">Hunger grows +25/week. Hit 80 and you lose 20hrs next week!</div>
        </div>
      ) : (
        <>
          {/* Sleep / End Week button — only shown after housing is set */}
          <button
            onClick={actions.endWeek}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl shadow-lg text-base flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            😴 Sleep — End Week
            <span className="text-xs font-normal opacity-75">({player.timeRemaining}h remaining)</span>
          </button>
          <div className="bg-purple-50 p-3 rounded border border-purple-100">
            <div className="text-xs font-bold text-purple-600 uppercase">Current Home</div>
            <div className="text-lg font-bold">{player.housing?.title || 'Homeless'}</div>
            <div className="text-sm text-slate-500">Rent: ${player.housing?.rent}/week · Security: {player.housing?.security}</div>
          </div>
        </>
      )}

      {/* Housing options — always shown */}
      <div className="space-y-2">
        {isFirstVisit && (
          <div className="text-sm font-black text-slate-700 mb-1">🏠 Choose your home to begin:</div>
        )}
        {housingData.map(h => {
          const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
          const isCurrent = player.housing?.id === h.id;
          return (
            <button
              key={h.id}
              onClick={() => actions.rentApartment(h)}
              disabled={isCurrent}
              className={`w-full flex justify-between items-center p-3 border-2 rounded-lg text-sm transition-all
                ${isCurrent ? 'bg-purple-100 border-purple-400 opacity-70 cursor-default' : 'hover:bg-purple-50 border-slate-200 hover:border-purple-300'}
                ${isFirstVisit && !isCurrent ? 'hover:scale-[1.01] active:scale-[0.99]' : ''}
              `}
            >
              <div className="text-left">
                <div className="font-bold">{h.title} {isCurrent && '✅'}</div>
                <div className="text-xs text-slate-400">{h.description}</div>
                {deposit > 0 && <div className="text-[10px] text-orange-600">+${deposit} deposit to move in</div>}
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">${h.rent}/wk</div>
                <div className="text-xs text-slate-400">{h.security} security</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Board Component ─────────────────────────────────────────────────────
const Board = () => {
  const { state, travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, dismissEvent, dismissWeekSummary, toggleMute } = useGame();

  const actions = { travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, toggleMute };

  const [showPanel, setShowPanel] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [animLocation, setAnimLocation] = useState(null); // overrides token display pos during travel
  const [floats, setFloats] = useState([]);
  const [weekFlash, setWeekFlash] = useState(false);
  const animTimers = useRef([]);

  const addFloat = (amount) => {
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, amount }]);
  };

  // Watch for job application results
  const prevJobResult = useRef(state.lastJobResult);
  useEffect(() => {
    if (state.lastJobResult && state.lastJobResult !== prevJobResult.current) {
      setNotification({
        title: state.lastJobResult.success ? "You're Hired!" : "Application Rejected",
        message: state.lastJobResult.message,
        type: state.lastJobResult.success ? 'success' : 'error',
      });
      prevJobResult.current = state.lastJobResult;
    }
  }, [state.lastJobResult]);

  // Flash on end week
  const prevWeek = useRef(state.week);
  useEffect(() => {
    if (state.week !== prevWeek.current) {
      setWeekFlash(true);
      setTimeout(() => setWeekFlash(false), 600);
      prevWeek.current = state.week;
    }
  }, [state.week]);

  // Track money changes for floating text
  const prevMoney = useRef(state.player.money);
  useEffect(() => {
    const diff = Math.round(state.player.money - prevMoney.current);
    if (Math.abs(diff) >= 1) addFloat(diff);
    prevMoney.current = state.player.money;
  }, [state.player.money]);

  // When time runs out, animate player walking home then end the week
  useEffect(() => {
    if (!state.awaitingEndWeek) return;

    const from = state.player.currentLocation;
    const home = 'leasing_office';

    if (from === home) {
      endWeek();
      return;
    }

    const path = ringPath(from, home);
    const STEP_MS = 300;

    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
    setShowPanel(false);
    setIsMoving(true);
    setAnimLocation(from);

    path.forEach((locId, i) => {
      const t = setTimeout(() => setAnimLocation(locId), (i + 1) * STEP_MS);
      animTimers.current.push(t);
    });

    const done = setTimeout(() => {
      setAnimLocation(null);
      setIsMoving(false);
      endWeek();
    }, (path.length + 1) * STEP_MS);
    animTimers.current.push(done);
  }, [state.awaitingEndWeek]);

  const handleTravel = (id) => {
    if (state.player.currentLocation === id) {
      setShowPanel(true);
      return;
    }

    // Clear any in-flight animation
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];

    const path = ringPath(state.player.currentLocation, id);
    const STEP_MS = 300; // ms per stop

    setShowPanel(false);
    setIsMoving(true);
    setAnimLocation(state.player.currentLocation);

    // Step through intermediate locations visually
    path.forEach((locId, i) => {
      const t = setTimeout(() => {
        setAnimLocation(locId);
      }, (i + 1) * STEP_MS);
      animTimers.current.push(t);
    });

    // Dispatch actual state change immediately (reducer handles time cost)
    travel(id);

    // After animation finishes, clear override and open panel
    const total = setTimeout(() => {
      setAnimLocation(null);
      setIsMoving(false);
      setShowPanel(true);
    }, (path.length + 1) * STEP_MS);
    animTimers.current.push(total);
  };

  const renderPanelContent = (id) => {
    switch (id) {
      case 'quick_eats':     return <QuickEatsContent state={state} actions={actions} />;
      case 'public_library': return <LibraryContent state={state} actions={actions} setNotification={setNotification} />;
      case 'trendsetters':   return <TrendSettersContent state={state} actions={actions} />;
      case 'megamart':       return <MegaMartContent state={state} actions={actions} />;
      case 'coffee_shop':    return <CoffeeShopContent state={state} actions={actions} />;
      case 'blacks_market':  return <BlacksMarketContent state={state} actions={actions} />;
      case 'grocery_store':  return <GroceryStoreContent state={state} actions={actions} />;
      case 'city_college':   return <CityCollegeContent state={state} actions={actions} />;
      case 'tech_store':     return <TechStoreContent state={state} actions={actions} />;
      case 'neobank':        return <NeoBankContent state={state} actions={actions} />;
      case 'leasing_office': return <LeasingOfficeContent state={state} actions={actions} />;
      default:               return <div className="text-slate-400 italic text-center p-8">Nothing here yet.</div>;
    }
  };

  return (
    <div className="relative w-full flex-1 lg:flex-none bg-green-100 lg:rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl select-none lg:h-[min(680px,_calc(100dvh-2rem))]">

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
        }
        @keyframes tokenBounce {
          0%   { transform: translate(-50%, -50%) scale(1); }
          100% { transform: translate(-50%, -50%) scale(1.25); }
        }
        @keyframes weekFlash {
          0%   { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Week-end flash overlay */}
      {weekFlash && (
        <div
          className="absolute inset-0 bg-white pointer-events-none z-40"
          style={{ animation: 'weekFlash 0.6s ease-out forwards' }}
        />
      )}

      {/* Padded map area — keeps buildings away from container edges */}
      <div className="absolute inset-x-2 sm:inset-x-5 top-4 bottom-16 sm:bottom-24">
        {/* Map background */}
        <MapBackground />

        {/* Buildings */}
        {LOCATION_ORDER.map(id => (
          <BuildingNode
            key={id}
            id={id}
            config={LOCATIONS_CONFIG[id]}
            isCurrent={state.player.currentLocation === id}
            isTraveling={isMoving}
            onClick={() => handleTravel(id)}
          />
        ))}

        {/* Jones token */}
        <PlayerToken
          locationId={state.jones.currentLocation}
          isMoving={false}
          label="The Joneses"
          emoji="🤑"
          colorClass="bg-red-400"
          zIndex={9}
        />

        {/* All player tokens */}
        {state.players?.map((p, i) => {
          const isActive = i === state.activePlayerIndex;
          const displayLocation = isActive && animLocation ? animLocation : p.currentLocation;
          return (
            <PlayerToken
              key={p.name}
              locationId={displayLocation}
              isMoving={isActive && isMoving}
              label={p.name}
              emoji={p.emoji}
              colorClass={isActive ? 'bg-yellow-400' : 'bg-slate-400 opacity-60'}
              zIndex={isActive ? 11 : 10}
            />
          );
        })}

      </div>

      {/* Multiplayer turn banner */}
      {state.players?.length > 1 && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full font-black text-sm shadow-lg text-white flex items-center gap-2"
          style={{ background: state.player?.color || '#6366f1' }}
        >
          {state.player?.emoji} {state.player?.name}'s Turn
          <span className="text-xs font-normal opacity-75">Wk {state.week}</span>
        </div>
      )}

      {/* Jones + Tips + Bell — icon row bottom-right */}
      <JonesSidebar jones={state.jones} difficulty={state.difficulty} player={state.player} />
      <RingTips player={state.player} week={state.week} />
      <NotificationFeed history={state.history} onOpenLog={() => setShowLog(true)} />

      {/* Location panel */}
      {showPanel && !isMoving && (
        <LocationPanel locationId={state.player.currentLocation} onClose={() => setShowPanel(false)}>
          {renderPanelContent(state.player.currentLocation)}
        </LocationPanel>
      )}

      {/* Floating money popups */}
      {floats.map(f => (
        <FloatingMoney
          key={f.id}
          amount={f.amount}
          id={f.id}
          onDone={() => setFloats(prev => prev.filter(x => x.id !== f.id))}
        />
      ))}

      {/* HUD */}
      <HUD
        state={state}
        onOpenInventory={() => setShowInventory(true)}
        onOpenGoals={() => setShowGoals(true)}
        onToggleMute={toggleMute}
      />

      {/* Modals (layered, highest z-index last) */}
      {showInventory && (
        <InventoryModal inventory={state.player.inventory} onClose={() => setShowInventory(false)} />
      )}
      {showGoals && (
        <GoalsModal state={state} onClose={() => setShowGoals(false)} />
      )}
      {state.weekSummary && !state.pendingEvent && (
        <WeekSummaryModal summary={state.weekSummary} onClose={dismissWeekSummary} />
      )}
      {state.pendingEvent && (
        <EventModal event={state.pendingEvent} onClose={dismissEvent} />
      )}
      {showLog && (
        <FullLogModal history={state.history} onClose={() => setShowLog(false)} />
      )}
      {notification && (
        <NotificationModal
          title={notification.title}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default Board;
