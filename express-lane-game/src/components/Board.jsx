import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { LOCATION_ORDER, DIFFICULTY_PRESETS, meetsEducation, travelCost, ECONOMY_PRICE_MULTIPLIER, EDUCATION_RANK, calculateNetWorth, getEducationProgress, calculateDeposit, JOB_WORK_LOCATION } from '../engine/constants';

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

// ─── Shared promotion eligibility check ──────────────────────────────────────
// Returns the next job if the player meets all its requirements, or null.
const getNextPromotion = (player) => {
  if (!player?.job?.promotion) return null;
  const nextJob = jobsData.find(j => j.id === player.job.promotion);
  if (!nextJob) return null;
  const weeksWorked = player.job.weeksWorked || 0;
  if (nextJob.requirements?.experience && weeksWorked < nextJob.requirements.experience) return null;
  if (nextJob.requirements?.education && !meetsEducation(player.education, nextJob.requirements.education)) return null;
  if (nextJob.requirements?.dependability && player.dependability < nextJob.requirements.dependability) return null;
  if (nextJob.requirements?.item && !player.inventory.some(i => i.id === nextJob.requirements.item)) return null;
  return nextJob;
};

// ─── Location config: label, emoji, board position (% from top-left) ─────────
const LOCATIONS_CONFIG = {
  leasing_office:  { emoji: '🏠', label: 'Leasing',       color: '#9333ea', pos: { x: 5,  y: 8  } },
  quick_eats:      { emoji: '🍔', label: 'Quick Eats',    color: '#ea580c', pos: { x: 38, y: 8  } },
  public_library:  { emoji: '📚', label: 'Library',       color: '#059669', pos: { x: 72, y: 8  } },
  trendsetters:    { emoji: '👕', label: 'TrendSetters',  color: '#db2777', pos: { x: 88, y: 20 } },
  coffee_shop:     { emoji: '☕', label: 'Coffee Shop',   color: '#78350f', pos: { x: 88, y: 50 } },
  megamart:        { emoji: '🏪', label: 'MegaMart',      color: '#dc2626', pos: { x: 75, y: 74 } },
  blacks_market:   { emoji: '🕶️', label: "Black's Mkt",  color: '#1e293b', pos: { x: 60, y: 85 } },
  grocery_store:   { emoji: '🛒', label: 'Fresh Mart',    color: '#16a34a', pos: { x: 44, y: 85 } },
  city_college:    { emoji: '🎓', label: 'City College',  color: '#2563eb', pos: { x: 28, y: 85 } },
  tech_store:      { emoji: '📱', label: 'Tech Store',    color: '#475569', pos: { x: 5,  y: 85 } },
  home:            { emoji: '🏠', label: 'Home',          color: '#7c3aed', pos: { x: 5,  y: 66 } },
  neobank:         { emoji: '🏦', label: 'NeoBank',       color: '#4f46e5', pos: { x: 5,  y: 47 } },
};

// Dynamic home emoji based on housing tier
const homeEmoji = (housing) => {
  if (!housing || housing.homeType === 'moms_house') return '🏠';
  if (housing.homeType === 'luxury_condo') return '🌇';
  return '🏘️'; // apartment
};

// ─── Shared "Jobs Here" card used by every location panel ────────────────────
const JobsHereCard = ({ locationId, player, actions }) => {
  const [open, setOpen] = useState(false);
  const jobs = jobsData.filter(j => j.location === locationId);
  if (jobs.length === 0) return null;
  const entryCount = jobs.filter(j => !j.requirements?.education && !j.requirements?.experience && !j.requirements?.dependability && !j.requirements?.item).length;

  const diffLabel = (chance) => chance <= 0.15 ? { t: 'Easy', c: 'bg-green-100 text-green-700' }
    : chance <= 0.30 ? { t: 'Moderate', c: 'bg-yellow-100 text-yellow-700' }
    : { t: 'Competitive', c: 'bg-red-100 text-red-600' };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition"
      >
        <span>🧾 {jobs.length} Position{jobs.length !== 1 ? 's' : ''} Available Here {entryCount > 0 ? `· ${entryCount} entry level` : ''}</span>
        <span>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="p-2 space-y-2 bg-white">
          {jobs.map(job => {
            const meetsExp = !job.requirements?.experience || (player.job?.weeksWorked || 0) >= job.requirements.experience;
            const meetsEdu = !job.requirements?.education || meetsEducation(player.education, job.requirements.education);
            const meetsDep = !job.requirements?.dependability || player.dependability >= job.requirements.dependability;
            const meetsItm = !job.requirements?.item || player.inventory.some(i => i.id === job.requirements.item);
            const canApply = meetsExp && meetsEdu && meetsDep && meetsItm;
            const isCurrent = player.job?.id === job.id;
            const diff = diffLabel(job.rejectionChance || 0.25);
            const isEntry = !job.requirements?.education && !job.requirements?.experience && !job.requirements?.dependability && !job.requirements?.item;
            return (
              <div key={job.id} className={`border rounded-lg p-2 text-xs ${isCurrent ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-bold">{job.title}</span>
                    {isCurrent && <span className="ml-1 text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">current</span>}
                    {job.remote && <span className="ml-1 text-[9px] bg-violet-100 text-violet-700 px-1 rounded">remote</span>}
                    <div className="text-slate-400 text-[9px] mt-0.5">{job.description}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-mono font-black text-green-700">${job.wage}/hr</div>
                    <span className={`text-[9px] px-1 rounded ${diff.c}`}>{diff.t}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {isEntry
                    ? <span className="text-[9px] text-green-600">✓ Open to everyone</span>
                    : <>
                      {job.requirements?.education && <span className={`text-[9px] px-1 rounded ${meetsEdu ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎓 {job.requirements.education}</span>}
                      {job.requirements?.experience && <span className={`text-[9px] px-1 rounded ${meetsExp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>⏱ {job.requirements.experience}wks</span>}
                      {job.requirements?.dependability && <span className={`text-[9px] px-1 rounded ${meetsDep ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎯 {job.requirements.dependability} dep</span>}
                      {job.requirements?.item && <span className={`text-[9px] px-1 rounded ${meetsItm ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>📦 {job.requirements.item.replace(/_/g, ' ')}</span>}
                    </>
                  }
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => actions.applyForJob(job)}
                    disabled={player.timeRemaining < 2}
                    className={`w-full py-1 rounded text-[10px] font-bold text-white transition active:scale-95 disabled:opacity-40 ${canApply ? 'bg-slate-700 hover:bg-slate-800' : 'bg-slate-400 hover:bg-slate-500'}`}
                  >
                    {canApply ? '📋 Apply (2 hrs)' : '🚫 Apply anyway'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Map background SVG ───────────────────────────────────────────────────────
// viewBox="0 0 100 100" maps coordinates 1:1 with % positions so building
// coords (e.g. x:5, y:8) match exactly. Path data only accepts numeric units,
// not "5%" strings, so the viewBox is required for % equivalence.
// Ring road traces all 11 building positions in LOCATION_ORDER (Monopoly-style).
// megamart sits at (75,74) on the bottom-right diagonal; bottom row buildings spread evenly.
const RING_PATH = "M 5 8 L 38 8 L 72 8 L 88 20 L 88 50 L 75 74 L 60 85 L 44 85 L 28 85 L 5 85 L 5 66 Z";

const MapBackground = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100" preserveAspectRatio="none">
    {/* Green interior park fill — inset from the ring */}
    <path d="M 12 12 L 38 12 L 72 12 L 83 22 L 83 48 L 71 72 L 57 81 L 42 81 L 26 81 L 12 81 Z"
      fill="#dcfce7" stroke="none" />
    <ellipse cx="48" cy="46" rx="14" ry="11" fill="#bbf7d0" opacity="0.6" />

    {/* Ring road — asphalt base (5 units = 5% of width) */}
    <path d={RING_PATH} fill="none" stroke="#6b7280" strokeWidth="5" strokeLinejoin="round" />
    {/* Ring road — lighter road surface */}
    <path d={RING_PATH} fill="none" stroke="#e5e7eb" strokeWidth="3.5" strokeLinejoin="round" />
    {/* Yellow dashed center line */}
    <path d={RING_PATH} fill="none" stroke="#fbbf24" strokeWidth="0.6" strokeLinejoin="round"
      strokeDasharray="3 2" opacity="0.8" />

    {/* Decorative trees & houses in park interior */}
    <text x="38" y="41" fontSize="5" textAnchor="middle">🌳</text>
    <text x="54" y="50" fontSize="5" textAnchor="middle">🌲</text>
    <text x="42" y="62" fontSize="4" textAnchor="middle">🌳</text>
    <text x="60" y="36" fontSize="3.5" textAnchor="middle">🌲</text>
    <text x="30" y="54" fontSize="3" textAnchor="middle">🏠</text>
    <text x="62" y="66" fontSize="3" textAnchor="middle">🏠</text>
  </svg>
);

// ─── Building node ────────────────────────────────────────────────────────────
const BuildingNode = ({ id, config, isCurrent, isTraveling, onClick, warningBadge, travelHours, isPromoReady }) => (
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
        ${isPromoReady && !isCurrent ? 'ring-2 ring-green-400 animate-pulse' : ''}
      `}
      style={{ borderColor: config.color }}
    >
      {config.emoji}
      {isCurrent && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-yellow-400 text-black text-[9px] sm:text-[10px] font-black px-1 py-0.5 rounded-full animate-bounce">
          YOU
        </div>
      )}
      {warningBadge && !isCurrent && (
        <div className={`absolute -top-1 -left-1 sm:-top-2 sm:-left-2 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse ${warningBadge.color}`}>
          {warningBadge.icon}
        </div>
      )}
      {isPromoReady && !isCurrent && (
        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-green-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full animate-bounce">
          🆙
        </div>
      )}
    </div>
    <div className="mt-0.5 sm:mt-1 bg-slate-800 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow whitespace-nowrap">
      {config.label}
    </div>
    {/* Travel time hint — only show on hover when not current location */}
    {!isCurrent && travelHours != null && (
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 bg-slate-900/80 text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
        ⏱ {travelHours}h
      </div>
    )}
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
    <div className="absolute inset-x-2 sm:inset-x-4 top-4 bottom-16 sm:bottom-24 bg-white border-4 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden"
      style={{ borderColor: config.color }}>
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0"
        style={{ background: config.color + '18', borderBottom: `2px solid ${config.color}40` }}>
        <h2 className="text-xl font-black uppercase tracking-wide flex items-center gap-2" style={{ color: config.color }}>
          <span className="text-2xl">{config.emoji}</span> {config.label}
        </h2>
        <button
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-4 py-1.5 rounded-full text-sm shadow transition hover:scale-105 active:scale-95 flex items-center gap-1"
        >
          MAP 🗺️
        </button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto bg-white">
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
          <span className="hidden sm:inline">Time</span>
          <span>{player.timeRemaining}h / {player.maxTime}h</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full border border-slate-600 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${player.timeRemaining < 15 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
            style={{ width: `${(player.timeRemaining / player.maxTime) * 100}%` }}
          />
        </div>
        {/* Emergency stat pills — always visible on mobile when critical */}
        <div className="flex gap-1 md:hidden flex-wrap">
          {player.hunger >= 60 && (
            <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">🍽️ {player.hunger}</span>
          )}
          {(player.relaxation ?? 50) <= 20 && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">🛁 {player.relaxation ?? 50}</span>
          )}
          {player.happiness < 25 && (
            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">💔 {player.happiness}</span>
          )}
        </div>
        {/* Secondary stats — hidden on mobile to save space */}
        <div className="hidden md:contents">
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
          {/* Hunger — always shown */}
          <div className="flex items-center gap-1">
            <span className={`text-[8px] w-16 shrink-0 ${player.hunger >= 80 ? 'text-red-400 font-bold animate-pulse' : player.hunger >= 60 ? 'text-orange-400' : 'text-slate-400'}`}>🍽️ {player.hunger >= 80 ? 'STARVING' : player.hunger >= 60 ? 'Hungry' : 'Hunger'} {player.hunger}</span>
            <div className="flex-grow h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${player.hunger >= 80 ? 'bg-red-500 animate-pulse' : player.hunger >= 60 ? 'bg-orange-400' : player.hunger >= 30 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${player.hunger}%` }} />
            </div>
          </div>
          {/* Education + Job + clothing durability warning */}
          <div className="flex gap-2 text-[8px] flex-wrap items-center">
            <span className="text-slate-400">🎓 {player.education}</span>
            <span className="text-slate-400">💼 {player.job ? player.job.title : 'Unemployed'}</span>
            {(() => {
              const v = player.inventory?.find(i => i.type === 'vehicle');
              const reqId = player.job?.requirements?.item;
              const worn = reqId ? player.inventory?.find(i => i.id === reqId && i.clothingWear !== undefined) : null;
              return (
                <>
                  {v && <span className="text-slate-400">{v.id === 'car' ? '🚗' : '🚲'}</span>}
                  {worn && worn.clothingWear < 40 && (
                    <span className="text-orange-400 animate-pulse font-bold" title={`${worn.name}: ${worn.clothingWear}% durability left`}>
                      👔{worn.clothingWear}%
                    </span>
                  )}
                </>
              );
            })()}
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
        <div className="hidden md:block text-[9px] text-slate-500 text-center mt-0.5">
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

  const allMet = items.every(i => i.met);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-black uppercase flex items-center gap-2">🎯 Goals</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{DIFFICULTY_PRESETS[difficulty].label}</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none">✕</button>
          </div>
        </div>
        {allMet ? (
          <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-center text-sm font-bold text-green-700 mb-3 animate-pulse">
            🏆 All goals achieved! Head to Leasing and end the week to win!
          </div>
        ) : (
          <p className="text-xs text-slate-400 mb-3">Achieve ALL four goals simultaneously to win.</p>
        )}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className={`rounded-xl p-3 border ${item.met ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className={`text-sm font-bold ${item.met ? 'text-green-700' : 'text-slate-700'}`}>
                  {item.met ? '✅' : '⬜'} {item.label}
                </span>
                <span className={`text-xs font-mono font-bold ${item.met ? 'text-green-600' : 'text-slate-500'}`}>{item.current} / {item.goal}</span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${item.met ? 'bg-green-500' : item.pct > 75 ? 'bg-blue-500' : item.pct > 40 ? 'bg-blue-400' : 'bg-slate-400'}`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <div className="text-[9px] text-right mt-0.5 font-bold" style={{ color: item.met ? '#16a34a' : '#64748b' }}>
                {item.met ? 'COMPLETE' : `${Math.round(item.pct)}%`}
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full bg-slate-800 text-white font-bold py-2 rounded-xl hover:bg-slate-700 transition text-sm">
          Got it
        </button>
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

// ─── Hunger warning modal ────────────────────────────────────────────────────
const HungerWarningModal = ({ warning, onClose }) => {
  const { hunger, penalty, hadSomeFood } = warning;
  const severity = hunger >= 80 ? 'starving' : hunger >= 50 ? 'very hungry' : 'hungry';
  const emoji = hunger >= 80 ? '😵' : hunger >= 50 ? '😫' : '😟';
  const borderColor = hunger >= 80 ? 'border-red-500' : hunger >= 50 ? 'border-orange-400' : 'border-yellow-400';
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-white border-4 ${borderColor} rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4`}>
        <div className="text-center text-5xl mb-3">{emoji}</div>
        <h3 className="text-xl font-black text-center text-slate-800 mb-1">
          {hadSomeFood ? 'Still Hungry!' : 'You Went Hungry!'}
        </h3>
        <p className="text-slate-600 text-center text-sm mb-4">
          {hadSomeFood
            ? `Snacks helped a little, but you ended the week ${severity} (${hunger}/100). A weekly meal plan covers you properly.`
            : `You didn't buy any food last week. You're ${severity} (${hunger}/100 hunger).`}
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center mb-4">
          <div className="text-2xl font-black text-red-600">-{penalty} hours</div>
          <div className="text-xs text-red-400">
            {hadSomeFood ? 'reduced penalty — snacks helped a bit' : 'deducted from this week\'s time'}
          </div>
        </div>
        <p className="text-[11px] text-slate-400 text-center mb-4">
          {hadSomeFood
            ? 'Buy a weekly plan at Quick Eats or Coffee Shop to avoid the penalty entirely!'
            : 'Visit Quick Eats or Coffee Shop to buy a weekly food plan next week!'}
        </p>
        <button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition text-sm">
          Got it — I'll eat better next week 🍔
        </button>
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

  // Critical alerts — shown at any week
  const alerts = [];
  const requiredItemId = player.job?.requirements?.item;
  if (requiredItemId) {
    const worn = player.inventory.find(i => i.id === requiredItemId && i.clothingWear !== undefined);
    if (worn && worn.clothingWear < 40) {
      alerts.push({ emoji: '⚠️', text: `${worn.name} is at ${worn.clothingWear}% — replace it at TrendSetters soon!` });
    }
  }
  const promoJob = getNextPromotion(player);
  if (promoJob) {
    const workLocId = JOB_WORK_LOCATION[player.job?.type];
    const loc = LOCATIONS_CONFIG[workLocId];
    alerts.push({ emoji: '🆙', text: `Promotion ready! Go to ${loc?.label ?? 'work'} to become ${promoJob.title}` });
  }
  if (player.hunger >= 80) {
    alerts.push({ emoji: '🍽️', text: 'STARVING! -20hrs next week. Eat at Quick Eats immediately!' });
  }
  if ((player.relaxation ?? 50) <= 10) {
    alerts.push({ emoji: '😴', text: 'Exhaustion risk! Rest at home or buy a Concert Ticket soon.' });
  }
  if (player.happiness < 20) {
    alerts.push({ emoji: '💔', text: 'Happiness critical — near game over! Buy something fun.' });
  }

  // Tutorial tips — first 5 weeks only
  const tutorialTips = [];
  if (week <= 5) {
    if (!player.hasChosenHousing) {
      tutorialTips.push({ emoji: '🏠', text: 'Go to Leasing Office and pick a place to live first' });
    }
    if (!player.job) {
      tutorialTips.push({ emoji: '📚', text: 'Visit the Library to browse jobs and get hired' });
    }
    const hasFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage');
    if (!hasFood) {
      tutorialTips.push({ emoji: '🍔', text: "Visit Quick Eats and grab a week's worth of meals" });
    }
    if (player.job && player.timeRemaining >= 8) {
      const workLocId = JOB_WORK_LOCATION[player.job.type];
      const loc = LOCATIONS_CONFIG[workLocId];
      tutorialTips.push({ emoji: loc?.emoji ?? '💼', text: `Head to ${loc?.label ?? 'your workplace'} and work a shift` });
    }
    if (player.money >= 200 && !player.job) {
      tutorialTips.push({ emoji: '🏦', text: 'Deposit cash at NeoBank to earn 1% interest per week' });
    }
  }

  const tips = [...alerts, ...tutorialTips];
  if (tips.length === 0) return null;

  return (
    <>
      {/* Expanded panel — bottom sheet on mobile, floats on sm+ */}
      {open && (
        <div className="absolute bottom-16 sm:bottom-40 left-0 right-0 sm:left-auto sm:right-4 sm:w-52 bg-amber-50 border-t-2 sm:border-2 border-amber-300 sm:rounded-xl p-3 shadow-xl z-40 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-black uppercase text-amber-600">💡 What to do next</div>
            <button onClick={() => setOpen(false)} className="text-amber-500 hover:text-amber-800 text-lg leading-none font-bold px-1">×</button>
          </div>
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
        <div className="absolute bottom-16 sm:bottom-40 left-0 right-0 sm:left-auto sm:right-[14rem] sm:w-52 bg-white/95 backdrop-blur border-t-2 sm:border-2 border-red-300 sm:rounded-xl p-3 shadow-xl z-40 max-h-52 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🤑</div>
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500">The Joneses</div>
                <div className="text-xs font-bold">{jones.jobTitle}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none font-bold px-1">×</button>
          </div>
          {/* Stats */}
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
          {/* You vs Jones */}
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
const FullLogModal = ({ history, onClose }) => {
  // Color-code log entries by keyword
  const entryColor = (entry) => {
    const e = entry.toLowerCase();
    if (e.includes('hungry') || e.includes('starving') || e.includes('fired') || e.includes('evict')) return 'text-red-400';
    if (e.includes('earned') || e.includes('worked') || e.includes('hired') || e.includes('promoted') || e.includes('enrolled')) return 'text-green-400';
    if (e.includes('bought') || e.includes('moved') || e.includes('paid')) return 'text-blue-400';
    if (e.includes('week') && e.includes('rent')) return 'text-slate-400';
    return 'text-slate-300';
  };
  const entryIcon = (entry) => {
    const e = entry.toLowerCase();
    if (e.includes('worked') || e.includes('earned')) return '💰';
    if (e.includes('hired') || e.includes('promoted')) return '🎉';
    if (e.includes('hungry') || e.includes('starving')) return '🍽️';
    if (e.includes('moved') || e.includes('rent')) return '🏠';
    if (e.includes('bought') || e.includes('enrolled')) return '🛒';
    return '·';
  };
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border-2 border-slate-600 rounded-2xl shadow-2xl p-4 max-w-sm w-full mx-4 max-h-[80%] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-black text-base">📋 Event Log</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="text-[9px] text-slate-500 mb-2 uppercase tracking-wide">{history.length} events · newest first</div>
        <div className="flex-grow overflow-y-auto space-y-0.5 pr-1">
          {history.length === 0
            ? <div className="text-slate-500 italic text-xs text-center py-4">No events yet.</div>
            : [...history].reverse().map((entry, i) => (
                <div key={i} className={`text-[11px] flex gap-1.5 items-start border-b border-slate-800 last:border-0 py-1 ${entryColor(entry)}`}>
                  <span className="shrink-0 w-4 text-center">{entryIcon(entry)}</span>
                  <span>{entry}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
};

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
      <div className="bg-white border-4 border-indigo-500 rounded-2xl shadow-2xl p-5 max-w-xs w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="text-center text-3xl mb-1">🌙</div>
        <h3 className="text-lg font-black text-center text-indigo-800 mb-1">Week {summary.week} Complete!</h3>
        <p className="text-[10px] text-center text-slate-400 mb-3">Auto-closing in 4s · tap to dismiss</p>
        <div className="space-y-2 mb-4">
          {summary.lines.map((p, i) => (
            <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold">{p.emoji} {p.name}</span>
                <span className={`text-base font-black ${p.netWorthDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {p.netWorthDelta >= 0 ? '+' : ''}${p.netWorthDelta.toFixed(0)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
                <span className="text-slate-500">💰 Cash: <span className="text-slate-700 font-bold">${p.money.toFixed(0)}</span></span>
                <span className="text-slate-500">😊 Happy: <span className={`font-bold ${p.happiness < 30 ? 'text-red-500' : 'text-slate-700'}`}>{p.happiness}</span></span>
                <span className="text-slate-500">🎯 Dep: <span className="text-slate-700 font-bold">{p.dependability}</span></span>
                <span className="text-slate-400 truncate">💼 {p.job}</span>
              </div>
            </div>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="sm:col-span-2"><JobsHereCard locationId="quick_eats" player={player} actions={actions} /></div>
      <div>
        <h3 className="font-bold text-sm border-b border-orange-200 pb-1 mb-2">🍔 Weekly Meal Plans</h3>
        {storedMeal ? (
          <div className="p-2.5 bg-green-50 border-2 border-green-300 rounded-xl text-xs text-green-800 mb-2 flex items-center gap-2">
            <span className="text-lg">✅</span>
            <div>
              <div className="font-bold">{storedMeal.name} ready!</div>
              <div className="text-green-600">You're covered for this week.</div>
            </div>
          </div>
        ) : (
          <div className={`p-2 rounded-lg border text-xs mb-2 ${player.hunger > 50 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            ⚠️ <strong>No food for this week</strong> — buy a plan below to avoid the hunger penalty!
          </div>
        )}
        <p className="text-[10px] text-slate-400 mb-2">Auto-eaten at week's end. No fridge needed.</p>
        {weeklyMeals.map(item => {
          const price = adjustedPrice(item.cost, economy);
          const owned = !!storedMeal;
          const canAfford = player.money >= price;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={owned || !canAfford}
              className={`w-full text-left p-2.5 border-2 rounded-xl mb-1.5 text-sm transition active:scale-95
                ${owned ? 'bg-green-50 border-green-200 opacity-60' :
                  canAfford ? 'bg-white border-orange-200 hover:border-orange-400 hover:bg-orange-50' :
                  'bg-slate-50 border-slate-200 opacity-50'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">🍔 {item.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{item.effect}</div>
                </div>
                <span className="font-mono font-bold text-sm shrink-0 ml-2">${price}<span className="text-[9px] font-normal text-slate-400">/wk</span></span>
              </div>
            </button>
          );
        })}
        {/* Hunger meter */}
        <div className="mt-3 p-2 rounded-lg border" style={{ background: player.hunger >= 80 ? '#fef2f2' : player.hunger >= 60 ? '#fff7ed' : '#f0fdf4', borderColor: player.hunger >= 80 ? '#fca5a5' : player.hunger >= 60 ? '#fdba74' : '#86efac' }}>
          <div className="flex justify-between text-[10px] font-bold mb-1" style={{ color: player.hunger >= 80 ? '#dc2626' : player.hunger >= 60 ? '#ea580c' : '#16a34a' }}>
            <span>🍽️ Hunger</span>
            <span>{player.hunger}/100 {player.hunger >= 80 ? '— STARVING!' : player.hunger >= 60 ? '— Getting bad' : player.hunger >= 30 ? '— OK' : '— Well fed'}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${player.hunger >= 80 ? 'bg-red-500 animate-pulse' : player.hunger >= 60 ? 'bg-orange-400' : player.hunger >= 30 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${player.hunger}%` }} />
          </div>
        </div>
        <div className="mt-1 text-[10px] text-slate-400 italic">💡 Fresh Mart groceries save money — need a fridge from MegaMart</div>
      </div>
      <div className="space-y-3">
        {/* Work shift for Quick Eats employees */}
        {player.job?.location === 'quick_eats' && (
          <div>
            <h3 className="font-bold text-sm border-b border-orange-200 pb-1 mb-2">💼 Your Shift</h3>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-orange-50 border-2 border-orange-300 rounded-xl hover:bg-orange-100 disabled:opacity-50 text-sm transition active:scale-95"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">🍔 Work Shift (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-orange-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
                  🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </div>
        )}

        {/* Gig work section */}
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">🚗 Gig Work (4hrs)</h3>
          {hasPhone ? (
            <button
              onClick={actions.gigWork}
              disabled={player.timeRemaining < 4}
              className="w-full p-3 bg-green-50 border-2 border-green-300 rounded-xl hover:bg-green-100 disabled:opacity-50 text-sm transition active:scale-95"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">🚗 Delivery Run (4h)</div>
                <div className="font-mono font-black text-green-600">+${Math.floor(60 * (state.economy === 'Boom' ? 1.3 : state.economy === 'Depression' ? 0.8 : 1.0))}</div>
              </div>
              <div className="text-xs text-green-700 mt-0.5">Economy: {state.economy} · flexible hours</div>
            </button>
          ) : (
            <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="font-bold text-slate-600 mb-1">🚗 Gig Delivery (locked)</div>
              <div className="text-slate-400 mb-2">Earn extra cash between jobs — any time, any week.</div>
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                <span>📱</span>
                <span className="text-blue-700 text-[10px] font-bold">Buy a Smartphone at Tech Store to unlock</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Location groupings for the Library job board
const LIBRARY_LOCATION_GROUPS = [
  { id: 'quick_eats',     emoji: '🍔', label: 'Quick Eats' },
  { id: 'coffee_shop',    emoji: '☕', label: 'Coffee Shop' },
  { id: 'megamart',       emoji: '🏪', label: 'MegaMart' },
  { id: 'trendsetters',   emoji: '👕', label: 'TrendSetters' },
  { id: 'tech_store',     emoji: '📱', label: 'Tech Store' },
  { id: 'neobank',        emoji: '🏦', label: 'NeoBank' },
  { id: 'public_library', emoji: '📚', label: 'Library (Trade)' },
  { id: 'home',           emoji: '🏠', label: 'Remote / WFH' },
];


const LibraryContent = ({ state, actions }) => {
  const { player } = state;
  const isTradeEmployee = player.job?.type === 'trade';
  const [selectedLocation, setSelectedLocation] = useState(null);

  const diffLabel = (chance) => {
    if (chance <= 0.15) return { t: 'Easy', c: 'bg-green-100 text-green-700' };
    if (chance <= 0.30) return { t: 'Moderate', c: 'bg-yellow-100 text-yellow-700' };
    return { t: 'Competitive', c: 'bg-red-100 text-red-600' };
  };

  const locationJobs = selectedLocation
    ? jobsData.filter(j => j.location === selectedLocation.id)
    : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      {/* Left: Job board by location */}
      <div className="flex flex-col min-h-0">
        {!selectedLocation ? (
          <>
            <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📋 Job Board — Browse by Location</h3>
            <div className="flex-grow overflow-y-auto space-y-1.5">
              {LIBRARY_LOCATION_GROUPS.map(loc => {
                const jobs = jobsData.filter(j => j.location === loc.id);
                if (jobs.length === 0) return null;
                const entryCount = jobs.filter(j => !j.requirements?.education && !j.requirements?.experience && !j.requirements?.dependability && !j.requirements?.item).length;
                const isCurrentWorkplace = player.job?.location === loc.id;
                const isRemote = loc.id === 'home';
                return (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocation(loc)}
                    className={`w-full text-left p-2.5 border-2 rounded-xl transition active:scale-95
                      ${isCurrentWorkplace ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{loc.emoji}</span>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            {loc.label}
                            {isCurrentWorkplace && <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">your employer</span>}
                            {isRemote && <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded">WFH</span>}
                          </div>
                          {entryCount > 0 && <div className="text-[9px] text-green-600 font-semibold">✓ {entryCount} entry-level opening{entryCount !== 1 ? 's' : ''}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-500">{jobs.length} position{jobs.length !== 1 ? 's' : ''}</div>
                        <div className="text-slate-400 text-sm">›</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[9px] text-slate-400 italic text-center">Browse listings here, then visit the location to apply in person (or apply remotely for WFH jobs).</div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 border-b border-slate-300 pb-1">
              <button onClick={() => setSelectedLocation(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none font-bold">‹</button>
              <span className="text-lg">{selectedLocation.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm leading-tight">{selectedLocation.label}</h3>
                <p className="text-[9px] text-slate-500">{locationJobs.length} position{locationJobs.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2">
              {locationJobs.map(job => {
                const meetsExp = !job.requirements?.experience || (player.job?.weeksWorked || 0) >= job.requirements.experience;
                const meetsEdu = !job.requirements?.education || meetsEducation(player.education, job.requirements.education);
                const meetsDep = !job.requirements?.dependability || player.dependability >= job.requirements.dependability;
                const meetsItm = !job.requirements?.item || player.inventory.some(i => i.id === job.requirements.item);
                const canApply = meetsExp && meetsEdu && meetsDep && meetsItm;
                const isCurrent = player.job?.id === job.id;
                const isEntry = !job.requirements?.education && !job.requirements?.experience && !job.requirements?.dependability && !job.requirements?.item;
                const diff = diffLabel(job.rejectionChance || 0.25);
                return (
                  <div key={job.id} className={`border-2 rounded-xl p-2.5 ${isCurrent ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300' : canApply ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="font-bold text-xs flex items-center gap-1">
                          {job.title}
                          {isCurrent && <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded">current</span>}
                          {job.remote && <span className="text-[9px] bg-violet-100 text-violet-700 px-1 rounded">remote</span>}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{job.description}</div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-mono font-black text-sm text-green-700">${job.wage}/hr</div>
                        <span className={`text-[9px] px-1 rounded ${diff.c}`}>{diff.t}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {isEntry
                        ? <span className="text-[9px] text-green-600 font-semibold">✓ Open to everyone</span>
                        : <>
                          {job.requirements?.education && <span className={`text-[9px] px-1 rounded ${meetsEdu ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎓 {job.requirements.education}</span>}
                          {job.requirements?.experience && <span className={`text-[9px] px-1 rounded ${meetsExp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>⏱ {job.requirements.experience}wks exp</span>}
                          {job.requirements?.dependability && <span className={`text-[9px] px-1 rounded ${meetsDep ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>🎯 {job.requirements.dependability} dep</span>}
                          {job.requirements?.item && <span className={`text-[9px] px-1 rounded ${meetsItm ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>📦 {job.requirements.item.replace(/_/g, ' ')}</span>}
                        </>
                      }
                    </div>
                    {isCurrent ? (
                      <div className="text-[10px] text-center text-emerald-700 font-semibold py-1">✓ Currently employed here</div>
                    ) : (
                      <button
                        onClick={() => actions.applyForJob(job)}
                        disabled={player.timeRemaining < 2}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold text-white transition active:scale-95 disabled:opacity-40 ${canApply ? 'bg-slate-700 hover:bg-slate-900' : 'bg-slate-400 hover:bg-slate-500'}`}
                      >
                        {canApply ? '📋 Apply (2 hrs)' : '🚫 Apply anyway (likely rejected)'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Right: Trade Dispatch */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">🔧 Trade Dispatch</h3>
          {isTradeEmployee ? (
            <button onClick={actions.work} disabled={player.timeRemaining < 8} className="w-full p-3 bg-yellow-50 border-2 border-yellow-300 rounded-xl hover:bg-yellow-100 disabled:opacity-50 text-sm transition active:scale-95">
              <div className="flex justify-between items-center">
                <div className="font-bold">🔧 Go to Site (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-yellow-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
          ) : (
            <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Trade workers (electricians, plumbers, laborers) pick up dispatch jobs here.</div>
          )}
          {isTradeEmployee && (() => {
            const nextJob = getNextPromotion(player);
            if (!nextJob) return null;
            return (
              <button onClick={() => actions.applyForJob(nextJob, true)} className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
                🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
              </button>
            );
          })()}
        </div>
        {/* Books section */}
        <div>
          <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📖 Read a Book (2h)</h3>
          <div className="space-y-2">
            {[
              { title: 'The Great Novel',      emoji: '📕', genre: 'Fiction',    hours: 2, happinessGain: 8, relaxGain: 5,  depGain: 0, desc: 'Escape into a story. Pure bliss.' },
              { title: 'Think & Grow Rich',    emoji: '📗', genre: 'Self-Help',  hours: 2, happinessGain: 4, relaxGain: 0,  depGain: 3, desc: '+happiness, +dependability' },
              { title: 'How Things Work',      emoji: '📘', genre: 'Technical',  hours: 2, happinessGain: 3, relaxGain: 0,  depGain: 2, desc: 'Dry but useful. You feel smarter.' },
              { title: 'Travel & Adventures',  emoji: '📙', genre: 'Travel',     hours: 2, happinessGain: 10, relaxGain: 8, depGain: 0, desc: 'Best happiness boost, pure joy.' },
            ].map(book => (
              <button
                key={book.title}
                onClick={() => actions.readBook(book)}
                disabled={player.timeRemaining < book.hours}
                className="w-full text-left p-2.5 border rounded-xl bg-white hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-40 transition active:scale-95 border-slate-200"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{book.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs">{book.title}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">{book.desc}</div>
                    <div className="flex gap-2 mt-1">
                      {book.happinessGain > 0 && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">+{book.happinessGain} 😊</span>}
                      {book.relaxGain > 0 && <span className="text-[9px] bg-teal-100 text-teal-700 px-1 rounded">+{book.relaxGain} relax</span>}
                      {book.depGain > 0 && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">+{book.depGain} dep</span>}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 shrink-0">{book.hours}h</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TrendSettersContent = ({ state, actions }) => {
  const { player, economy } = state;
  const clothing = itemsData.filter(i => i.type === 'clothing');
  const ownedClothing = clothing.filter(c => player.inventory.find(i => i.id === c.id));
  const wornItems = ownedClothing.map(c => ({ ...c, ...player.inventory.find(i => i.id === c.id) }));
  const hasWornClothing = wornItems.some(c => c.clothingWear !== undefined && c.clothingWear < 60);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="trendsetters" player={player} actions={actions} /></div>
      {/* Left: current wardrobe status */}
      <div>
        <h3 className="font-bold text-sm border-b border-pink-200 pb-1 mb-2">👗 Clothing</h3>
        {clothing.map(item => {
          const owned = player.inventory.find(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const wear = owned?.clothingWear;
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              className={`w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition hover:scale-[1.01] active:scale-[0.99]
                ${owned ? (wear < 30 ? 'bg-red-50 border-red-300' : wear < 60 ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200') : 'bg-white border-slate-200 hover:border-pink-400'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold">{item.name}</span>
                <span className="font-mono font-bold text-slate-700">${price}</span>
              </div>
              {owned && wear !== undefined ? (
                <div>
                  <div className="flex justify-between text-[9px] mb-0.5">
                    <span className={wear < 30 ? 'text-red-600 font-bold' : wear < 60 ? 'text-amber-600' : 'text-green-600'}>
                      {wear < 30 ? '⚠️ Needs replacing!' : wear < 60 ? 'Getting worn' : 'Good condition'}
                    </span>
                    <span className="text-slate-400">{wear}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${wear < 30 ? 'bg-red-500' : wear < 60 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${wear}%` }} />
                  </div>
                  <div className="text-[9px] text-pink-600 mt-1 font-bold">🔄 Replace — ${price}</div>
                </div>
              ) : (
                <div className="text-[9px] text-slate-400">{item.effect}</div>
              )}
            </button>
          );
        })}
      </div>
      {/* Right: vehicles + style tip */}
      <div>
        <h3 className="font-bold text-sm border-b border-pink-200 pb-1 mb-2">🚗 Vehicles</h3>
        {itemsData.filter(i => i.type === 'vehicle').map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const hasVehicle = player.inventory.some(i => i.type === 'vehicle');
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition hover:border-pink-400 hover:bg-pink-50 disabled:opacity-60"
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-bold">{item.name} {hasVehicle && !owned ? <span className="text-amber-600 font-normal">(upgrade)</span> : ''}</span>
                <span className="font-mono font-bold">{owned ? '✅' : `$${price}`}</span>
              </div>
              <div className="text-[9px] text-slate-400">{item.effect}</div>
            </button>
          );
        })}
        <div className="mt-3 bg-pink-50 rounded-xl p-3 border border-pink-200">
          <div className="text-xs font-bold text-pink-800 mb-1">💡 Style Tips</div>
          <div className="text-[10px] text-pink-700 space-y-1">
            <div>• Some jobs require specific attire</div>
            <div>• Clothes wear out — check durability</div>
            <div>• Replace before it hits 0%!</div>
          </div>
        </div>
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
  const canBuy = (n) => storedServings + n <= maxStorage && player.money >= groceryPrice * n;

  // How many can we buy at once (up to storage cap)
  const slotsOpen = maxStorage - storedServings;
  const bulkOptions = hasStorage
    ? Array.from({ length: slotsOpen }, (_, i) => i + 1).filter(n => player.money >= groceryPrice * n)
    : [1]; // no fridge: can only hold 1 at a time anyway

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="flex flex-col items-center justify-center bg-green-50 rounded-lg p-4">
        <div className="text-7xl mb-2">🛒</div>
        <div className="text-xs font-bold text-green-800 text-center">Fresh Mart</div>
        <div className="text-[10px] text-green-600 mt-1 text-center">Affordable groceries — get a fridge to stock up!</div>
        <div className="mt-2 text-[10px] text-slate-500">Hunger: {player.hunger}/100</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Groceries</h3>

        {/* Spoilage warning if no fridge */}
        {!hasStorage && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded text-[10px] text-amber-800">
            ⚠️ <strong>No fridge!</strong> Food spoils at week's end. Buy a fridge at MegaMart to store up to 2 weeks.
          </div>
        )}

        {storedServings >= maxStorage ? (
          <div className="p-2 bg-green-50 border border-green-300 rounded text-xs text-green-800 mb-2">
            ✅ Stocked up! ({storedServings}/{maxStorage} weeks stored)
          </div>
        ) : (
          <div className="space-y-1">
            {bulkOptions.map(n => (
              <button
                key={n}
                onClick={() => {
                  // Buy n servings one by one (reducer handles each individually)
                  for (let i = 0; i < n; i++) actions.buyItem({ ...groceryItem, cost: groceryPrice });
                }}
                disabled={!canBuy(n)}
                className="w-full flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 text-sm"
              >
                <div>
                  <div className="font-bold">🥦 {n === 1 ? '1 week' : `${n} weeks`} of groceries</div>
                  {n > 1 && <div className="text-[10px] text-green-600">Stock up & save trips!</div>}
                </div>
                <span className="font-mono text-xs">${groceryPrice * n}</span>
              </button>
            ))}
          </div>
        )}

        {hasStorage && (
          <div className="text-[10px] text-green-700 mt-2">
            🧊 {hasFreezer ? 'Freezer' : 'Fridge'}: {storedServings}/{maxStorage} weeks stored — auto-eaten each week.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── MegaMart (Target-style big-box store) ────────────────────────────────────
const MegaMartContent = ({ state, actions }) => {
  const { player, economy } = state;
  const appliances = itemsData.filter(i => i.type === 'appliance');
  const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
  const hasFreezer = player.inventory.some(i => i.id === 'freezer');
  const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');
  const hasStorage = hasFridge || hasFreezer;
  const isRetailEmployee = player.job?.location === 'megamart';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
      <div className="sm:col-span-2"><JobsHereCard locationId="megamart" player={player} actions={actions} /></div>
      {/* Left: Home status dashboard */}
      <div className="space-y-2">
        <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🏠 Your Home Setup</h3>
        <div className={`p-2.5 rounded-lg border text-xs ${hasStorage ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">{hasStorage ? (hasFreezer ? '🧊 Chest Freezer' : '❄️ Refrigerator') : '❌ No Food Storage'}</span>
            {hasStorage ? <span className="text-green-600 font-bold">✅</span> : <span className="text-amber-600 text-[9px]">buy one!</span>}
          </div>
          {hasStorage
            ? <div className="text-slate-500 mt-0.5">{hasFreezer ? 'Stores 4 weeks of groceries' : 'Stores 2 weeks of groceries'}</div>
            : <div className="text-amber-700 mt-0.5">Without a fridge, food spoils at week's end</div>}
        </div>
        <div className={`p-2.5 rounded-lg border text-xs ${hasHotTub ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">{hasHotTub ? '🛁 Hot Tub' : '❌ No Hot Tub'}</span>
            {hasHotTub ? <span className="text-green-600 font-bold">✅</span> : <span className="text-slate-400 text-[9px]">luxury</span>}
          </div>
          <div className="text-slate-500 mt-0.5">{hasHotTub ? '+3 Relaxation/week automatically' : 'Prevents exhaustion burnout'}</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 mt-2">
          <div className="text-xs font-bold text-red-800 mb-1">💡 Shopping Tips</div>
          <div className="text-[10px] text-red-700 space-y-1">
            <div>• Fridge → buy groceries in bulk at Fresh Mart</div>
            <div>• Freezer → stock 4 weeks of food at once</div>
            <div>• Hot Tub → auto-relaxation, avoid burnout</div>
          </div>
        </div>
      </div>
      {/* Right: Work shift + Buy appliances */}
      <div>
        {isRetailEmployee && (
          <div className="mb-3">
            <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🏪 Staff Only</h3>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-red-50 border-2 border-red-300 rounded-xl hover:bg-red-100 disabled:opacity-50 text-sm transition active:scale-95 mb-2"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">🛒 Work Shift (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-red-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
                  🆙 Promote → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </div>
        )}
        <h3 className="font-bold text-sm border-b border-red-200 pb-1 mb-2">🛒 Appliances</h3>
        {appliances.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          const price = adjustedPrice(item.cost, economy);
          const upgrading = item.id === 'freezer' && hasFridge;
          const isRecommended = !hasStorage && (item.id === 'refrigerator');
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className={`w-full text-left p-2.5 border rounded-lg mb-1.5 text-xs transition
                ${owned ? 'bg-green-50 border-green-200 opacity-70' :
                  isRecommended ? 'bg-amber-50 border-amber-300 hover:border-red-400 hover:bg-red-50' :
                  'bg-white border-slate-200 hover:border-red-400 hover:bg-red-50'}`}
            >
              <div className="flex justify-between items-start mb-0.5">
                <span className="font-bold">
                  {owned ? '✅ ' : isRecommended ? '⭐ ' : ''}{item.name}
                  {upgrading ? <span className="text-amber-600 font-normal"> (upgrade)</span> : ''}
                </span>
                <span className="font-mono font-bold">{owned ? 'Owned' : `$${price}`}</span>
              </div>
              <div className="text-slate-400">{item.effect}</div>
              {isRecommended && !owned && <div className="text-amber-600 font-bold text-[9px] mt-0.5">Recommended first purchase!</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CoffeeShopContent = ({ state, actions }) => {
  const { player, economy } = state;
  // Only coffee_shop location jobs work here
  const isServiceEmployee = player.job?.location === 'coffee_shop';
  const espressoPrice = adjustedPrice(5, economy);
  const pastryPrice = adjustedPrice(8, economy);
  const coffeeWeeklyPlans = itemsData.filter(i => i.type === 'weekly_coffee');
  const storedCoffee = player.inventory.find(i => i.type === 'weekly_coffee');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="coffee_shop" player={player} actions={actions} /></div>
      {/* Left: Weekly Plans + Quick Bites */}
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">☕ Weekly Plans</h3>
        <p className="text-[10px] text-slate-500 mb-2">Covers your coffee for the whole week — auto-applied at week's end.</p>
        {storedCoffee && (
          <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-800 mb-2">
            ✅ <strong>{storedCoffee.name}</strong> ready for this week.
          </div>
        )}
        {coffeeWeeklyPlans.map(item => {
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => actions.buyItem({ ...item, cost: price })}
              disabled={!!storedCoffee || player.money < price}
              className="w-full flex justify-between items-start p-2 bg-white border rounded hover:bg-amber-50 disabled:opacity-50 mb-1 text-sm"
            >
              <div className="text-left">
                <div className="font-medium">☕ {item.name}</div>
                <div className="text-[10px] text-slate-500">{item.effect}</div>
              </div>
              <span className="font-mono text-xs ml-2 shrink-0">${price}/wk</span>
            </button>
          );
        })}
        <div className="mt-3 border-t border-slate-200 pt-2">
          <h3 className="font-bold text-xs text-slate-600 mb-1">Quick Bites</h3>
          <button
            onClick={() => actions.buyItem({ id: 'espresso', name: 'Espresso', cost: espressoPrice, type: 'food', hungerRestore: 10, happinessBoost: 8, timeToEat: 0.5 })}
            disabled={player.money < espressoPrice}
            className="w-full flex justify-between items-center p-1.5 bg-white border rounded hover:bg-amber-50 disabled:opacity-50 mb-1 text-xs"
          >
            <span>☕ Espresso <span className="text-slate-400">(+8😊 now)</span></span>
            <span className="font-mono">${espressoPrice}</span>
          </button>
          <button
            onClick={() => actions.buyItem({ id: 'pastry', name: 'Croissant', cost: pastryPrice, type: 'food', hungerRestore: 20, happinessBoost: 6, timeToEat: 0.5 })}
            disabled={player.money < pastryPrice}
            className="w-full flex justify-between items-center p-1.5 bg-white border rounded hover:bg-amber-50 disabled:opacity-50 text-xs"
          >
            <span>🥐 Croissant <span className="text-slate-400">(-20🍽️ now)</span></span>
            <span className="font-mono">${pastryPrice}</span>
          </button>
        </div>
      </div>
      {/* Right: Work / Staff */}
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Staff Only</h3>
        {isServiceEmployee ? (
          <>
            <button
              onClick={actions.work}
              disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-amber-50 border-2 border-amber-300 rounded-xl hover:bg-amber-100 disabled:opacity-50 text-sm transition active:scale-95"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">☕ Work Shift (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-amber-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {/* Experience progress */}
            {player.job.promotion && (() => {
              const nextJob = jobsData.find(j => j.id === player.job.promotion);
              const expNeeded = nextJob?.requirements?.experience || 0;
              const weeksWorked = player.job.weeksWorked || 0;
              if (expNeeded === 0) return null;
              const expPct = Math.min(100, (weeksWorked / expNeeded) * 100);
              return (
                <div className="mt-1 text-[10px] text-amber-700">
                  <div className="flex justify-between mb-0.5">
                    <span>Experience</span>
                    <span>{weeksWorked}/{expNeeded} wks</span>
                  </div>
                  <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${expPct}%` }} />
                  </div>
                </div>
              );
            })()}
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button
                  onClick={() => actions.applyForJob(nextJob, true)}
                  className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95"
                >
                  🆙 Promote → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </>
        ) : (
          <div className="text-xs italic text-slate-400 p-3 bg-slate-100 rounded-lg">
            <div className="font-bold text-slate-500 mb-1">👔 Staff Area</div>
            Apply for a service job at the Library to work here.
          </div>
        )}
      </div>
    </div>
  );
};

const BlacksMarketContent = ({ state, actions, onLotteryResult }) => {
  const { player, economy } = state;
  const concertTicket = itemsData.find(i => i.id === 'concert_ticket');
  const concertPrice = adjustedPrice(concertTicket.cost, economy);
  const [confirmIdx, setConfirmIdx] = React.useState(null);
  // Consumables (food, weekly plans, coffee plans) can't be pawned — they have no resale value
  const UNSELLABLE_TYPES = new Set(['food', 'weekly_meal', 'weekly_coffee', 'food_storage', 'entertainment']);
  const pawnable = player.inventory.filter(item => !UNSELLABLE_TYPES.has(item.type));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Pawn Shop</h3>
        <p className="text-xs italic text-slate-500 mb-2">"50¢ on the dollar, take it or leave it."</p>
        {pawnable.length === 0 ? (
          <div className="text-xs text-slate-400 italic">Nothing to sell.{player.inventory.length > 0 ? ' (Food & consumables can\'t be pawned.)' : ''}</div>
        ) : pawnable.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-2 bg-white border rounded mb-1 text-xs">
            <span className="truncate mr-1">{item.name}</span>
            {confirmIdx === i ? (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { actions.sellItem(item); setConfirmIdx(null); }}
                  className="bg-red-600 text-white px-2 py-0.5 rounded font-bold hover:bg-red-700"
                >Sell!</button>
                <button
                  onClick={() => setConfirmIdx(null)}
                  className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded hover:bg-slate-300"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmIdx(i)}
                className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold hover:bg-red-200 shrink-0"
              >
                ${Math.floor(item.cost * 0.5)}
              </button>
            )}
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
              const win = Math.random() < 0.05;
              actions.buyItem({ id: `lottery_${Date.now()}`, name: 'Lottery Ticket', cost: 10, type: 'entertainment', happinessBoost: win ? 50 : -2, relaxationBoost: 0 });
              onLotteryResult?.(win);
            }
          }}
          disabled={player.money < 10}
          className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 disabled:opacity-50 mb-2 text-sm"
        >
          <div className="font-bold">🎰 Lottery ($10)</div>
          <div className="text-xs text-yellow-700">5% to win big (+50 😊)</div>
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
  const { player, economy } = state;
  const studyBonus = player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0);
  const textbook = itemsData.find(i => i.id === 'textbook');
  const textbookPrice = adjustedPrice(textbook.cost, economy);
  const ownsTextbook = player.inventory.some(i => i.id === 'textbook');

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Current course — prominent progress card */}
      {player.currentCourse ? (
        <div className="bg-blue-600 text-white p-3 rounded-xl shadow">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-[10px] uppercase font-bold opacity-70 tracking-wide">Currently Enrolled</div>
              <div className="font-black text-sm">{player.currentCourse.title}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70">{player.currentCourse.progress}/{player.currentCourse.totalHours} hrs</div>
              <div className="text-xs font-bold">{Math.round((player.currentCourse.progress / player.currentCourse.totalHours) * 100)}%</div>
            </div>
          </div>
          <div className="w-full bg-blue-800 h-3 rounded-full overflow-hidden mb-2">
            <div className="bg-yellow-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%` }} />
          </div>
          {studyBonus > 0 && (
            <div className="text-[10px] text-blue-200 mb-1">📚 Study bonus active: +{studyBonus}h/session</div>
          )}
          <button
            onClick={actions.study}
            disabled={player.timeRemaining < 10}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-2 rounded-lg disabled:opacity-50 text-sm transition active:scale-95"
          >
            📖 Study {10 + studyBonus}hrs
            <span className="text-xs font-normal ml-1">({player.timeRemaining}h left this week)</span>
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          <div className="font-bold mb-1">🎓 Currently: {player.education}</div>
          <div className="text-slate-500">Enroll in a course below to advance your education.</div>
        </div>
      )}

      {/* Textbook purchase */}
      {!ownsTextbook && (
        <button
          onClick={() => actions.buyItem({ ...textbook, cost: textbookPrice })}
          disabled={player.money < textbookPrice}
          className="w-full flex justify-between items-center p-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 text-xs transition"
        >
          <div>
            <div className="font-bold">📚 Buy Textbook <span className="text-green-600 font-normal">(saves time!)</span></div>
            <div className="text-slate-500">+2hrs per study session</div>
          </div>
          <span className="font-mono font-bold">${textbookPrice}</span>
        </button>
      )}

      <div className="flex-grow overflow-y-auto space-y-1.5">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Available Courses</div>
        {educationData.map(course => {
          const eduReq = course.requirements?.education;
          const itemReq = course.requirements?.item;
          const eduOk = !eduReq || meetsEducation(player.education, eduReq);
          const itemOk = !itemReq || player.inventory.some(i => i.id === itemReq);
          const canEnroll = eduOk && itemOk;
          const alreadyDone = meetsEducation(player.education, course.degree);
          const isActive = player.currentCourse?.id === course.id;
          return (
            <button
              key={course.id}
              onClick={() => canEnroll && !alreadyDone && !player.currentCourse && actions.enroll(course)}
              disabled={!canEnroll || alreadyDone || !!player.currentCourse}
              className={`w-full flex justify-between items-start p-2.5 border rounded-lg text-xs transition
                ${alreadyDone ? 'bg-green-50 border-green-200 opacity-70' :
                  isActive ? 'bg-blue-50 border-blue-400' :
                  canEnroll && !player.currentCourse ? 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer' :
                  'bg-slate-50 border-slate-100 opacity-50'}`}
            >
              <div className="text-left">
                <div className="font-bold flex items-center gap-1">
                  {alreadyDone ? '✅' : isActive ? '📖' : !canEnroll ? '🔒' : '🎓'}
                  <span>{course.title}</span>
                  <span className="text-slate-400 font-normal">→ {course.degree}</span>
                </div>
                <div className="text-slate-500 mt-0.5">
                  {course.totalHours}h total
                  {eduReq && !eduOk ? <span className="text-red-500 ml-1">· Need {eduReq}</span> : ''}
                  {itemReq && !itemOk ? <span className="text-red-500 ml-1">· Need {itemReq.replace(/_/g, ' ')}</span> : ''}
                  {canEnroll && !alreadyDone && !isActive ? <span className="text-slate-400 ml-1">· {course.description}</span> : ''}
                </div>
              </div>
              <span className="font-mono font-bold ml-2 shrink-0 text-slate-700">${course.cost}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TechStoreContent = ({ state, actions }) => {
  const { player, economy } = state;
  const isTechEmployee = player.job?.location === 'tech_store';
  const electronics = itemsData.filter(i => i.type === 'electronics');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="tech_store" player={player} actions={actions} /></div>
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
          const price = adjustedPrice(item.cost, economy);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem({ ...item, cost: price })}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-blue-50 disabled:opacity-60 text-xs mt-2"
            >
              <div className="text-left">
                <div className="font-bold">{item.name}</div>
                <div className="text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono">{owned ? '✅' : `$${price}`}</span>
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
              className="w-full p-3 bg-blue-50 border-2 border-blue-300 rounded-xl hover:bg-blue-100 disabled:opacity-50 text-sm transition active:scale-95"
            >
              <div className="flex justify-between items-center">
                <div className="font-bold">💻 Code Sprint (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-blue-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {/* Promotion check */}
            {(() => {
              const nextJob = getNextPromotion(player);
              if (!nextJob) return null;
              return (
                <button onClick={() => actions.applyForJob(nextJob, true)} className="mt-2 w-full p-2 bg-green-100 border border-green-300 rounded hover:bg-green-200 text-xs font-bold text-green-800">
                  🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
                </button>
              );
            })()}
          </>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Tech employees work here. See job openings above ↑</div>
        )}
      </div>
    </div>
  );
};

const NeoBankContent = ({ state, actions }) => {
  const { player } = state;
  const goals = DIFFICULTY_PRESETS[state.difficulty].goals;
  const netWorth = calculateNetWorth(player);
  const wealthPct = Math.min(100, Math.max(0, (netWorth / goals.wealth) * 100));
  const AMOUNTS = [50, 100, 250, 500];
  const isBankEmployee = player.job?.location === 'neobank';
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="neobank" player={player} actions={actions} /></div>
      <div className="space-y-3">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1">Banking</h3>
        {/* Wealth goal progress */}
        <div className="bg-slate-50 rounded p-2 border border-slate-200">
          <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
            <span>🎯 Wealth Goal</span>
            <span className={netWorth >= goals.wealth ? 'text-green-600 font-bold' : ''}>${Math.max(0, netWorth).toLocaleString()} / ${goals.wealth.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${netWorth >= goals.wealth ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${wealthPct}%` }} />
          </div>
        </div>
        {/* Savings */}
        <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
          <div className="text-xs font-bold text-indigo-700 mb-1">Savings (1%/wk)</div>
          <div className="text-2xl font-mono">${player.savings.toLocaleString()}</div>
          {player.savings > 0 ? (
            <div className="text-[10px] text-green-600 font-semibold mb-2">+${Math.round(player.savings * 0.01).toLocaleString()} interest next week</div>
          ) : (
            <div className="text-[10px] text-indigo-400 mb-2 italic">Deposit to earn 1%/wk interest</div>
          )}
          <div className="text-[9px] text-indigo-500 mb-1 font-semibold uppercase tracking-wide">Deposit</div>
          <div className="grid grid-cols-4 gap-1 mb-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('deposit', amt)}
                disabled={player.money < amt}
                className="bg-white border border-indigo-200 rounded py-1 text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-40 transition">
                ${amt}
              </button>
            ))}
          </div>
          {player.money > 0 && (
            <button onClick={() => actions.bankTransaction('deposit', Math.floor(player.money))}
              className="w-full bg-indigo-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-indigo-700 transition mb-2">
              💰 Deposit All (${Math.floor(player.money).toLocaleString()})
            </button>
          )}
          <div className="text-[9px] text-indigo-500 mb-1 font-semibold uppercase tracking-wide">Withdraw</div>
          <div className="grid grid-cols-4 gap-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('withdraw', amt)}
                disabled={player.savings < amt}
                className="bg-white border border-indigo-200 rounded py-1 text-[10px] font-bold hover:bg-indigo-100 disabled:opacity-40 transition">
                ${amt}
              </button>
            ))}
          </div>
        </div>
        {/* Debt */}
        <div className="bg-red-50 p-3 rounded border border-red-100">
          <div className="text-xs font-bold text-red-700 mb-1">Debt (5%/wk interest)</div>
          <div className={`text-2xl font-mono mb-2 ${player.debt > 0 ? 'text-red-600' : 'text-slate-400'}`}>${player.debt.toLocaleString()}</div>
          {player.debt > 0 && (
            <>
              <div className="text-[9px] text-red-500 mb-1 font-semibold uppercase tracking-wide">Repay</div>
              <div className="grid grid-cols-4 gap-1 mb-1">
                {AMOUNTS.map(amt => (
                  <button key={amt} onClick={() => actions.bankTransaction('repay', amt)}
                    disabled={player.money < amt || player.debt === 0}
                    className="bg-white border border-red-200 rounded py-1 text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 transition">
                    ${amt}
                  </button>
                ))}
              </div>
              <button onClick={() => actions.bankTransaction('repay', player.debt)}
                disabled={player.money < player.debt}
                className="w-full bg-red-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-red-700 disabled:opacity-40 transition">
                Repay All (${player.debt.toLocaleString()})
              </button>
            </>
          )}
          <div className="text-[9px] text-red-500 mb-1 font-semibold uppercase tracking-wide mt-2">Borrow</div>
          <div className="grid grid-cols-4 gap-1">
            {AMOUNTS.map(amt => (
              <button key={amt} onClick={() => actions.bankTransaction('borrow', amt)}
                disabled={player.debt + amt > 5000}
                className="bg-white border border-red-200 rounded py-1 text-[10px] font-bold hover:bg-red-100 disabled:opacity-40 transition">
                ${amt}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-red-400 mt-1">⚠️ Max $5,000 debt. 5%/wk interest!</div>
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
        {isBankEmployee && (
          <div className="mb-3">
            <h3 className="font-bold text-sm border-b border-indigo-200 pb-1 mb-2">🏦 Staff Only</h3>
            <button onClick={actions.work} disabled={player.timeRemaining < 8}
              className="w-full p-3 bg-indigo-50 border-2 border-indigo-300 rounded-xl hover:bg-indigo-100 disabled:opacity-50 text-sm transition active:scale-95 mb-2">
              <div className="flex justify-between items-center">
                <div className="font-bold">💼 Work Shift (8h)</div>
                <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
              </div>
              <div className="text-xs text-indigo-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
            </button>
            {(() => { const nj = getNextPromotion(player); return nj ? <button onClick={() => actions.applyForJob(nj, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded text-xs font-bold text-green-800 hover:bg-green-200">🆙 Promote → {nj.title}</button> : null; })()}
          </div>
        )}
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
            const pctChange = Math.round(((currentPrice - stock.basePrice) / stock.basePrice) * 100);
            return (
              <div key={stock.symbol} className="bg-white p-2 rounded border text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-bold">{stock.symbol}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>{isUp ? '+' : ''}{pctChange}%</span>
                    <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>${currentPrice}</span>
                  </div>
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

// ─── Home ─────────────────────────────────────────────────────────────────────
const HomeContent = ({ state, actions }) => {
  const { player } = state;
  const relax = player.relaxation ?? 50;
  const isLowRelax = relax <= 20;
  const homeType = player.housing?.homeType;
  const emoji = homeEmoji(player.housing);
  const homeName = homeType === 'luxury_condo' ? 'Luxury Condo' : homeType === 'apartment' ? 'Your Apartment' : "Mom's House";
  const isWFH = player.job?.workLocation === 'home';
  const isCorpRemote = player.job?.type === 'corporate' && !isWFH;
  const hasLaptop = player.inventory.some(i => i.id === 'laptop');
  const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="sm:col-span-2"><JobsHereCard locationId="home" player={player} actions={actions} /></div>
      {/* Left: sleep + rest */}
      <div className="space-y-3">
        {/* Sleep / End Week */}
        <button
          onClick={actions.endWeek}
          className={`w-full text-white font-black py-3 rounded-xl shadow-lg text-base flex items-center justify-center gap-2 transition-all active:scale-95
            ${player.timeRemaining <= 10 ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-500'}
          `}
        >
          😴 Sleep — End Week
          <span className="text-xs font-normal opacity-75">({player.timeRemaining}h left)</span>
        </button>

        {/* Current home card */}
        <div className={`rounded-xl border-2 p-3 ${homeType === 'luxury_condo' ? 'bg-yellow-50 border-yellow-300' : homeType === 'apartment' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-black text-sm">{homeName}</div>
              <div className="text-[10px] text-slate-500">{player.housing?.title} · ${player.housing?.rent ?? 0}/wk</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>🔒 {player.housing?.security ?? 'High'} security</span>
            {hasHotTub && <span>🛁 Hot tub</span>}
          </div>
        </div>

        {/* Rest options */}
        <div>
          <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wide mb-1.5">Relax at Home</h3>
          <div className="flex gap-2">
            {[2, 4].map(hrs => (
              <button
                key={hrs}
                onClick={() => actions.rest(hrs)}
                disabled={player.timeRemaining < hrs}
                className={`flex-1 py-2 border-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-40
                  ${isLowRelax ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'}
                `}
              >
                <div className="text-lg">🛁</div>
                <div>Rest {hrs}h</div>
                <div className="text-[9px] opacity-75">+{hrs * 5} relax</div>
              </button>
            ))}
          </div>
          <div className="mt-1 text-[9px] text-slate-400 text-center">Relaxation: {relax}/100 {isLowRelax ? '⚠️ Burnout risk!' : ''}</div>
        </div>
      </div>

      {/* Right: WFH work */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">💻 Work from Home</h3>

        {/* Data Entry — WFH, no laptop needed */}
        {isWFH && (
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-violet-50 border-2 border-violet-300 rounded-xl hover:bg-violet-100 disabled:opacity-50 text-sm transition active:scale-95"
          >
            <div className="flex justify-between items-center">
              <div className="font-bold">🖥️ Work Shift (8h)</div>
              <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
            </div>
            <div className="text-xs text-violet-700 mt-0.5">{player.job.title} · WFH — no commute!</div>
          </button>
        )}

        {/* Corporate remote — needs laptop */}
        {isCorpRemote && hasLaptop && (
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl hover:bg-emerald-100 disabled:opacity-50 text-sm transition active:scale-95"
          >
            <div className="flex justify-between items-center">
              <div className="font-bold">🏢 Work Remotely (8h)</div>
              <div className="font-mono font-black text-green-600">+${player.job.wage * 8}</div>
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">{player.job.title} · ${player.job.wage}/hr</div>
          </button>
        )}
        {isCorpRemote && !hasLaptop && (
          <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">Need a 💻 Laptop to work remotely from home.</div>
        )}

        {!isWFH && !isCorpRemote && (
          <div className="text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">
            {player.job ? `${player.job.title}s report in-person — head to your work location.` : 'Get a remote job to work from home.'}
          </div>
        )}

        {/* Promotion at home for WFH/remote workers */}
        {(isWFH || isCorpRemote) && (() => {
          const nextJob = getNextPromotion(player);
          if (!nextJob) return null;
          return (
            <button onClick={() => actions.applyForJob(nextJob, true)} className="w-full p-2 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 text-xs font-bold text-green-800 transition active:scale-95">
              🆙 Get Promoted → {nextJob.title} (${nextJob.wage}/hr)
            </button>
          );
        })()}
      </div>
    </div>
  );
};

// ─── Leasing Office ───────────────────────────────────────────────────────────
const LeasingOfficeContent = ({ state, actions }) => {
  const { player } = state;
  const isFirstVisit = state.week === 1 && !player.hasChosenHousing;
  return (
    <div className="space-y-3">
      {isFirstVisit && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 mb-1">
          <div className="font-black text-base text-indigo-900 mb-1">👋 Welcome to Life in the Express Lane!</div>
          <p className="text-xs text-indigo-700 mb-3">First things first — choose a place to live. Your rent comes out each week, so pick what you can afford.</p>
          <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside mb-2">
            <li>📚 <strong>Library</strong> — browse companies &amp; apply for jobs</li>
            <li>🍔 <strong>Quick Eats</strong> — buy weekly meals so you don't starve</li>
            <li>☕ <strong>Coffee Shop</strong> — weekly coffee plans &amp; work shifts</li>
            <li>🏠 <strong>Home</strong> — sleep, rest, and work from home</li>
          </ul>
          <div className="text-[10px] text-indigo-500">Hunger grows +25/week. Hit 80 and you lose 20hrs next week!</div>
        </div>
      )}

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
        {isFirstVisit ? '🏠 Choose your home to begin:' : '🔄 Change Your Lease'}
      </div>

      <div className="space-y-2">
        {housingData.map(h => {
          const deposit = calculateDeposit(h.rent, player.housing?.rent ?? 0);
          const isCurrent = player.housing?.id === h.id;
          const tierEmoji = h.homeType === 'luxury_condo' ? '🌇' : h.homeType === 'apartment' ? '🏘️' : '🏠';
          return (
            <button
              key={h.id}
              onClick={() => actions.rentApartment(h)}
              disabled={isCurrent}
              className={`w-full flex justify-between items-center p-3 border-2 rounded-xl text-sm transition-all active:scale-[0.99]
                ${isCurrent ? 'bg-purple-100 border-purple-400 cursor-default' : 'hover:bg-purple-50 border-slate-200 hover:border-purple-300'}
              `}
            >
              <div className="text-left flex items-start gap-2">
                <span className="text-xl mt-0.5">{tierEmoji}</span>
                <div>
                  <div className="font-bold">{h.title} {isCurrent && '✅'}</div>
                  <div className="text-xs text-slate-400">{h.description}</div>
                  {deposit > 0 && <div className="text-[10px] text-orange-600">+${deposit} deposit</div>}
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="font-mono font-bold">{h.rent === 0 ? 'Free' : `$${h.rent}/wk`}</div>
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
  const { state, travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, dismissEvent, dismissWeekSummary, dismissHungerWarning, toggleMute, rest } = useGame();

  const actions = { travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, toggleMute, rest };

  const [showPanel, setShowPanel] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [animLocation, setAnimLocation] = useState(null); // overrides token display pos during travel
  const [floats, setFloats] = useState([]);
  const [weekFlash, setWeekFlash] = useState(false);
  const [lotteryResult, setLotteryResult] = useState(null); // {win: bool}
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
    const home = state.player.hasChosenHousing ? 'home' : 'leasing_office';

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

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Ignore when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const { player } = state;
      switch (e.key.toLowerCase()) {
        case 'i': setShowInventory(v => !v); break;
        case 'g': setShowGoals(v => !v); break;
        case 'l': setShowLog(v => !v); break;
        case 'w': {
          // Work if at work location and has time
          if (player.job && player.timeRemaining >= 8) {
            const loc = JOB_WORK_LOCATION[player.job.type];
            if (loc === player.currentLocation) actions.work();
          }
          break;
        }
        case 'e': {
          // End week if at leasing office
          if ((player.currentLocation === 'home' || player.currentLocation === 'leasing_office') && player.hasChosenHousing) actions.endWeek();
          break;
        }
        default: break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state]);

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
      case 'public_library': return <LibraryContent state={state} actions={actions} />;
      case 'trendsetters':   return <TrendSettersContent state={state} actions={actions} />;
      case 'megamart':       return <MegaMartContent state={state} actions={actions} />;
      case 'coffee_shop':    return <CoffeeShopContent state={state} actions={actions} />;
      case 'blacks_market':  return <BlacksMarketContent state={state} actions={actions} onLotteryResult={(win) => { setLotteryResult({ win }); setTimeout(() => setLotteryResult(null), 2000); }} />;
      case 'grocery_store':  return <GroceryStoreContent state={state} actions={actions} />;
      case 'city_college':   return <CityCollegeContent state={state} actions={actions} />;
      case 'tech_store':     return <TechStoreContent state={state} actions={actions} />;
      case 'neobank':        return <NeoBankContent state={state} actions={actions} />;
      case 'home':           return <HomeContent state={state} actions={actions} />;
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

      {/* Lottery result splash */}
      {lotteryResult && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none ${lotteryResult.win ? 'bg-yellow-400/80' : 'bg-slate-800/70'}`}
          style={{ animation: 'weekFlash 2s ease-out forwards' }}>
          <div className="text-center">
            <div className="text-6xl mb-2">{lotteryResult.win ? '🎰' : '💸'}</div>
            <div className={`text-2xl font-black ${lotteryResult.win ? 'text-yellow-900' : 'text-white'}`}>
              {lotteryResult.win ? 'JACKPOT! +50 Happiness!' : 'Better luck next time!'}
            </div>
          </div>
        </div>
      )}

      {/* Padded map area — keeps buildings away from container edges */}
      <div className="absolute inset-x-2 sm:inset-x-5 top-1 bottom-16 sm:bottom-24">
        {/* Map background */}
        <MapBackground />

        {/* Economy pill — top-center, tucked just below top edge */}
        {(() => {
          const { economy, week } = state;
          const bg = economy === 'Boom' ? 'bg-green-600' : economy === 'Depression' ? 'bg-red-600' : 'bg-slate-500';
          const icon = economy === 'Boom' ? '📈' : economy === 'Depression' ? '📉' : '➡️';
          return (
            <div className={`absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 ${bg} text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 pointer-events-none opacity-80`}>
              <span>{icon}</span><span>{economy}</span><span className="opacity-60">·</span><span>Wk {week}</span>
            </div>
          );
        })()}

        {/* Buildings */}
        {(() => {
          const { player } = state;
          const promoJob = getNextPromotion(player);
          const workLocId = player.job ? (player.job.workLocation || player.job.location || JOB_WORK_LOCATION[player.job.type] || null) : null;
          return LOCATION_ORDER.map(id => {
            // Warning badges
            let warningBadge = null;
            if (id === 'quick_eats' && player.hunger >= 60) {
              warningBadge = { icon: '!', color: 'bg-orange-500' };
            } else if (id === 'home' && (player.relaxation ?? 50) <= 20) {
              warningBadge = { icon: '!', color: 'bg-amber-500' };
            }
            const isPromoReady = !!(promoJob && id === workLocId);
            const travelHours = player.currentLocation !== id
              ? travelCost(player.currentLocation, id)
              : null;
            const config = id === 'home'
              ? { ...LOCATIONS_CONFIG.home, emoji: homeEmoji(player.housing), label: player.housing?.homeType === 'luxury_condo' ? 'Condo' : player.housing?.homeType === 'apartment' ? 'Apartment' : 'Home' }
              : LOCATIONS_CONFIG[id];
            return (
              <BuildingNode
                key={id}
                id={id}
                config={config}
                isCurrent={state.player.currentLocation === id}
                isTraveling={isMoving}
                onClick={() => handleTravel(id)}
                warningBadge={warningBadge}
                travelHours={travelHours}
                isPromoReady={isPromoReady}
              />
            );
          });
        })()}

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
      {!state.weekSummary && !state.pendingEvent && state.players?.some(p => p.hungerWarning) && (
        <HungerWarningModal
          warning={state.players.find(p => p.hungerWarning).hungerWarning}
          onClose={dismissHungerWarning}
        />
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
