import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { LOCATION_ORDER, DIFFICULTY_PRESETS, meetsEducation } from '../engine/constants';
import jobsData from '../data/jobs.json';
import itemsData from '../data/items.json';
import educationData from '../data/education.json';
import housingData from '../data/housing.json';
import stocksData from '../data/stocks.json';

// ─── Location config: label, emoji, board position (% from top-left) ─────────
const LOCATIONS_CONFIG = {
  leasing_office:  { emoji: '🏢', label: 'Leasing',       color: '#9333ea', pos: { x: 5,  y: 10 } },
  quick_eats:      { emoji: '🍔', label: 'Quick Eats',    color: '#ea580c', pos: { x: 38, y: 2  } },
  public_library:  { emoji: '📚', label: 'Library',       color: '#059669', pos: { x: 72, y: 2  } },
  trendsetters:    { emoji: '👕', label: 'TrendSetters',  color: '#db2777', pos: { x: 88, y: 20 } },
  coffee_shop:     { emoji: '☕', label: 'Coffee Shop',   color: '#78350f', pos: { x: 88, y: 55 } },
  blacks_market:   { emoji: '🕶️', label: "Black's Mkt",  color: '#1e293b', pos: { x: 72, y: 80 } },
  city_college:    { emoji: '🎓', label: 'City College',  color: '#2563eb', pos: { x: 38, y: 80 } },
  tech_store:      { emoji: '📱', label: 'Tech Store',    color: '#475569', pos: { x: 5,  y: 80 } },
  neobank:         { emoji: '🏦', label: 'NeoBank',       color: '#4f46e5', pos: { x: 5,  y: 45 } },
};

// ─── Map background SVG ───────────────────────────────────────────────────────
const MapBackground = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    {/* Green park areas */}
    <ellipse cx="50%" cy="45%" rx="18%" ry="14%" fill="#bbf7d0" opacity="0.6" />
    <circle cx="50%" cy="45%" r="8%" fill="#86efac" opacity="0.5" />
    {/* Road network */}
    <path d="M15% 15% Q50% 5% 85% 15%" stroke="#d1d5db" strokeWidth="3%" fill="none" opacity="0.5" />
    <path d="M15% 85% Q50% 95% 85% 85%" stroke="#d1d5db" strokeWidth="3%" fill="none" opacity="0.5" />
    <path d="M10% 15% Q5% 45% 10% 85%" stroke="#d1d5db" strokeWidth="3%" fill="none" opacity="0.5" />
    <path d="M90% 25% Q95% 45% 90% 75%" stroke="#d1d5db" strokeWidth="3%" fill="none" opacity="0.5" />
    {/* Center-to-edges paths */}
    <line x1="50%" y1="45%" x2="15%" y2="15%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="50%" y2="5%"  stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="88%" y2="25%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="88%" y2="60%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="75%" y2="83%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="50%" y2="83%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="15%" y2="83%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    <line x1="50%" y1="45%" x2="10%" y2="48%" stroke="#fde68a" strokeWidth="1.5%" opacity="0.4" />
    {/* Decorative trees */}
    <text x="45%" y="43%" fontSize="2%" textAnchor="middle">🌳</text>
    <text x="55%" y="43%" fontSize="2%" textAnchor="middle">🌳</text>
    <text x="50%" y="50%" fontSize="2%" textAnchor="middle">🌳</text>
    <text x="30%" y="35%" fontSize="1.5%" textAnchor="middle">🏠</text>
    <text x="65%" y="60%" fontSize="1.5%" textAnchor="middle">🏠</text>
    <text x="35%" y="60%" fontSize="1.5%" textAnchor="middle">🏠</text>
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
      className={`w-16 h-16 bg-white border-4 rounded-xl shadow-lg flex items-center justify-center text-3xl relative
        ${isCurrent ? 'ring-4 ring-yellow-400 scale-110 shadow-2xl' : 'opacity-90 hover:opacity-100'}
      `}
      style={{ borderColor: config.color }}
    >
      {config.emoji}
      {isCurrent && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-black px-1 py-0.5 rounded-full animate-bounce">
          YOU
        </div>
      )}
    </div>
    <div className="mt-1 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow whitespace-nowrap">
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
    <div className="absolute inset-x-4 top-4 bottom-28 bg-white border-4 border-slate-800 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden">
      <div className="bg-slate-100 border-b-2 border-slate-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <span className="text-2xl">{config.emoji}</span> {config.label}
        </h2>
        <button
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-4 py-1.5 rounded-full text-sm shadow transition hover:scale-105 flex items-center gap-1"
        >
          DONE 👉
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
  const netWorth = player.money + player.savings - player.debt;

  const economyColor = economy === 'Boom' ? 'text-green-400' : economy === 'Depression' ? 'text-red-400' : 'text-slate-400';
  const happinessFace = player.happiness >= 80 ? '😁' : player.happiness >= 60 ? '🙂' : player.happiness >= 40 ? '😐' : player.happiness >= 20 ? '😟' : '😫';

  return (
    <div className="absolute bottom-0 left-0 right-0 h-24 bg-slate-900 border-t-4 border-slate-700 flex items-center justify-between px-3 z-30 shadow-2xl gap-2">

      {/* Week + Economy */}
      <div className="flex flex-col items-center min-w-[52px]">
        <div className="text-3xl">🕒</div>
        <div className="text-slate-400 text-[10px] font-bold uppercase">Wk {week}</div>
        <div className={`text-[9px] font-bold ${economyColor}`}>{economy}</div>
      </div>

      {/* Happiness */}
      <div className="flex flex-col items-center" title={`Happiness: ${player.happiness}/100 (Goal: ${goals.happiness})`}>
        <div className="text-3xl">{happinessFace}</div>
        <div className="w-14 h-1.5 bg-slate-700 rounded-full mt-0.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${player.happiness < 30 ? 'bg-red-500' : 'bg-yellow-400'}`}
            style={{ width: `${player.happiness}%` }}
          />
        </div>
        <div className="text-[9px] text-slate-500">{player.happiness}%</div>
      </div>

      {/* Time bar */}
      <div className="flex-grow flex flex-col gap-0.5 min-w-0">
        <div className="flex justify-between text-[9px] text-slate-400 uppercase font-bold">
          <span>Time</span>
          <span>{player.timeRemaining}h / {player.maxTime}h</span>
        </div>
        <div className="h-4 bg-slate-800 rounded-full border border-slate-600 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${player.timeRemaining < 15 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(player.timeRemaining / player.maxTime) * 100}%` }}
          />
        </div>
        {/* Education + Job */}
        <div className="flex gap-2 text-[9px]">
          <span className="text-slate-400">🎓 {player.education}</span>
          <span className="text-slate-400">💼 {player.job ? player.job.title : 'Unemployed'}</span>
        </div>
      </div>

      {/* Money */}
      <div className="flex flex-col items-end gap-1">
        <div className="bg-black/50 px-2 py-1 rounded border border-slate-700 font-mono text-green-400 text-lg min-w-[100px] text-right">
          ${player.money.toFixed(0)}
        </div>
        <div className="text-[9px] text-slate-500 text-right">
          Net Worth: <span className={netWorth < 0 ? 'text-red-400' : 'text-green-400'}>${netWorth.toFixed(0)}</span>
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
        <div className="text-[9px] text-slate-500 text-center mt-0.5">
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
  const netWorth = player.money + player.savings - player.debt;

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
      pct: meetsEducation(player.education, goals.education) ? 100 : 40,
      met: meetsEducation(player.education, goals.education),
    },
    {
      label: 'Career (min. wage)',
      current: player.job ? `${player.job.title} ($${player.job.wage}/hr)` : 'Unemployed',
      goal: `$${goals.careerWage}/hr`,
      pct: Math.min(100, ((player.job?.wage || 0) / goals.careerWage) * 100),
      met: player.job && player.job.wage >= goals.careerWage,
    },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
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

// ─── Inventory modal ──────────────────────────────────────────────────────────
const InventoryModal = ({ inventory, onClose, onSell }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-2">
        <h3 className="text-xl font-black uppercase flex items-center gap-2">🎒 Inventory</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
      </div>
      <div className="flex-grow overflow-y-auto space-y-2">
        {inventory.length === 0 ? (
          <div className="text-center text-slate-400 py-8 italic">Your pockets are empty.</div>
        ) : inventory.map((item, i) => (
          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 border rounded-lg">
            <div>
              <div className="font-bold text-sm">{item.name}</div>
              <div className="text-xs text-slate-400">{item.effect}</div>
            </div>
            <div className="text-xs text-slate-500">${item.cost}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Event modal ──────────────────────────────────────────────────────────────
const EventModal = ({ event, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-white border-4 border-yellow-400 rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4">
      <div className="text-center text-4xl mb-2">📰</div>
      <h3 className="text-lg font-black text-center text-slate-800 mb-2">{event.title}</h3>
      <p className="text-slate-600 text-center text-sm mb-2">{event.description}</p>
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

// ─── Jones sidebar ────────────────────────────────────────────────────────────
const JonesSidebar = ({ jones, difficulty }) => {
  const goals = DIFFICULTY_PRESETS[difficulty].goals;
  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border-2 border-red-300 rounded-xl p-3 shadow-xl z-10 w-44 hidden md:block">
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
          <span className="font-mono font-bold text-green-600">${jones.netWorth.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">😊 Happiness</span>
          <span className="font-mono font-bold">{jones.happiness}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">🎓 Education</span>
          <span className="font-mono font-bold">{jones.education}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Notification feed ────────────────────────────────────────────────────────
const NotificationFeed = ({ history }) => (
  <div className="absolute bottom-28 left-4 w-56 max-h-40 overflow-y-auto bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-2 z-10">
    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 sticky top-0 bg-slate-900/90 pb-1">🔔 Log</div>
    {history.length === 0
      ? <div className="text-[10px] text-slate-500 italic">No events yet...</div>
      : history.slice(0, 8).map((entry, i) => (
          <div key={i} className="text-[10px] text-slate-300 border-b border-slate-700 last:border-0 py-0.5">{entry}</div>
        ))}
  </div>
);

// ─── Location panel content renderers ────────────────────────────────────────

const QuickEatsContent = ({ state, actions }) => {
  const { player } = state;
  const hasPhone = player.inventory.some(i => i.id === 'smartphone');
  const foodItems = itemsData.filter(i => i.type === 'food');
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Menu</h3>
        {foodItems.map(item => (
          <button
            key={item.id}
            onClick={() => actions.buyItem(item)}
            className="w-full flex justify-between items-center p-2 bg-white border rounded hover:bg-orange-50 mb-1 text-sm"
          >
            <span>🍔 {item.name}</span>
            <span className="font-mono">${item.cost}</span>
          </button>
        ))}
        <div className="mt-2 text-xs text-slate-400">Hunger: {player.hunger}/100</div>
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
            <span className="font-mono text-green-600">+$60</span>
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
  const hasLaptop = player.inventory.some(i => i.id === 'laptop');

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
                {job.requirements?.experience ? `${job.requirements.experience}wks exp` : ''}
              </div>
            </button>
          ))}
        </div>
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
      </div>
    </div>
  );
};

const TrendSettersContent = ({ state, actions }) => {
  const { player } = state;
  const clothing = itemsData.filter(i => i.type === 'clothing');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center justify-center bg-pink-50 rounded-lg p-4">
        <div className="text-7xl mb-2">👗</div>
        <div className="text-xs font-bold text-pink-800 text-center">Dress for success</div>
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Clothing</h3>
        {clothing.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem(item)}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-pink-50 disabled:opacity-60 text-sm"
            >
              <span>{item.name}</span>
              <span className="font-mono text-xs">{owned ? '✅ OWNED' : `$${item.cost}`}</span>
            </button>
          );
        })}
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
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 disabled:opacity-50 text-sm"
          >
            <div className="font-bold">Work Shift (8h)</div>
            <div className="text-xs text-amber-800">{player.job.title} · ${player.job.wage}/hr</div>
          </button>
        ) : (
          <div className="text-xs italic text-slate-400 p-2 bg-slate-100 rounded">Apply for a service job at the Library to work here.</div>
        )}
      </div>
    </div>
  );
};

const BlacksMarketContent = ({ state, actions }) => {
  const { player } = state;
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
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Ticket Booth</h3>
        <button
          onClick={() => {
            if (player.money >= 10) {
              actions.buyItem({ id: `lottery_${Date.now()}`, name: 'Lottery Ticket', cost: 10, type: 'food', hungerRestore: 0, happinessBoost: Math.random() < 0.05 ? 50 : -2, timeToEat: 0 });
            }
          }}
          disabled={player.money < 10}
          className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded hover:bg-yellow-100 disabled:opacity-50 mb-2 text-sm"
        >
          <div className="font-bold">🎰 Lottery ($10)</div>
          <div className="text-xs text-yellow-700">5% to win big</div>
        </button>
        <button
          onClick={() => actions.buyItem({ id: 'concert', name: 'Concert Ticket', cost: 150, type: 'food', hungerRestore: 0, happinessBoost: 20, timeToEat: 3 })}
          disabled={player.money < 150}
          className="w-full p-3 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-50 text-sm"
        >
          <div className="font-bold">🎸 Rock Concert ($150)</div>
          <div className="text-xs text-purple-700">+20 Happiness</div>
        </button>
      </div>
    </div>
  );
};

const CityCollegeContent = ({ state, actions }) => {
  const { player } = state;
  return (
    <div className="h-full flex flex-col gap-3">
      {player.currentCourse && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <h3 className="font-bold text-blue-800 text-sm">{player.currentCourse.title}</h3>
          <div className="w-full bg-blue-200 h-3 rounded-full mt-1 overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%` }} />
          </div>
          <div className="text-xs mt-1 text-blue-700">{player.currentCourse.progress}/{player.currentCourse.totalHours} hrs</div>
          <button
            onClick={actions.study}
            disabled={player.timeRemaining < 10}
            className="mt-2 bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 text-xs"
          >
            Study 10hrs
          </button>
        </div>
      )}
      <div className="flex-grow overflow-y-auto space-y-1">
        {educationData.map(course => {
          const eduReq = course.requirements?.education;
          const canEnroll = !eduReq || meetsEducation(player.education, eduReq);
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
                  {alreadyDone ? '✅ ' : ''}{course.title}
                </div>
                <div className="text-slate-400">{course.totalHours}hrs · {course.description}</div>
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
  const { player } = state;
  const isTechEmployee = player.job?.type === 'tech';
  const electronics = itemsData.filter(i => i.type === 'electronics');
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">Products</h3>
        {electronics.map(item => {
          const owned = player.inventory.some(i => i.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => !owned && actions.buyItem(item)}
              disabled={owned}
              className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-300 hover:bg-blue-50 disabled:opacity-60 text-xs"
            >
              <div className="text-left">
                <div className="font-bold">{item.name}</div>
                <div className="text-slate-400">{item.effect}</div>
              </div>
              <span className="font-mono">{owned ? '✅' : `$${item.cost}`}</span>
            </button>
          );
        })}
        {/* Streaming sub */}
        {itemsData.filter(i => i.type === 'subscription').map(item => {
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
          <button
            onClick={actions.work}
            disabled={player.timeRemaining < 8}
            className="w-full p-3 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 text-sm"
          >
            <div className="font-bold">Code Sprint (8h)</div>
            <div className="text-xs text-blue-700">{player.job.title} · ${player.job.wage}/hr</div>
          </button>
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
      </div>
      <div>
        <h3 className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">📈 Stocks</h3>
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
  return (
    <div className="space-y-3">
      {/* Sleep / End Week button */}
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
      <div className="space-y-2">
        {housingData.map(h => (
          <button
            key={h.id}
            onClick={() => actions.rentApartment(h)}
            disabled={player.housing?.id === h.id}
            className="w-full flex justify-between items-center p-3 border rounded hover:bg-purple-50 disabled:bg-purple-100 disabled:opacity-70 text-sm"
          >
            <div className="text-left">
              <div className="font-bold">{h.title}</div>
              <div className="text-xs text-slate-400">{h.description}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold">${h.rent}/wk</div>
              <div className="text-xs text-slate-400">{h.security} security</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Board Component ─────────────────────────────────────────────────────
const Board = () => {
  const { state, travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, dismissEvent, toggleMute } = useGame();

  const actions = { travel, applyForJob, work, gigWork, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, endWeek, toggleMute };

  const [showPanel, setShowPanel] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [floats, setFloats] = useState([]);
  const [weekFlash, setWeekFlash] = useState(false);

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

  const handleTravel = (id) => {
    if (state.player.currentLocation === id) {
      setShowPanel(true);
      return;
    }
    setShowPanel(false);
    setIsMoving(true);
    travel(id);
    setTimeout(() => {
      setIsMoving(false);
      setShowPanel(true);
    }, 600);
  };

  const renderPanelContent = (id) => {
    switch (id) {
      case 'quick_eats':     return <QuickEatsContent state={state} actions={actions} />;
      case 'public_library': return <LibraryContent state={state} actions={actions} setNotification={setNotification} />;
      case 'trendsetters':   return <TrendSettersContent state={state} actions={actions} />;
      case 'coffee_shop':    return <CoffeeShopContent state={state} actions={actions} />;
      case 'blacks_market':  return <BlacksMarketContent state={state} actions={actions} />;
      case 'city_college':   return <CityCollegeContent state={state} actions={actions} />;
      case 'tech_store':     return <TechStoreContent state={state} actions={actions} />;
      case 'neobank':        return <NeoBankContent state={state} actions={actions} />;
      case 'leasing_office': return <LeasingOfficeContent state={state} actions={actions} />;
      default:               return <div className="text-slate-400 italic text-center p-8">Nothing here yet.</div>;
    }
  };

  return (
    <div className="relative w-full bg-green-100 rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl select-none" style={{ height: 'min(680px, calc(100vh - 2rem))' }}>

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
        return (
          <PlayerToken
            key={p.name}
            locationId={p.currentLocation}
            isMoving={isActive && isMoving}
            label={p.name}
            emoji={p.emoji}
            colorClass={isActive ? 'bg-yellow-400' : 'bg-slate-400 opacity-60'}
            zIndex={isActive ? 11 : 10}
          />
        );
      })}

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

      {/* Jones sidebar */}
      <JonesSidebar jones={state.jones} difficulty={state.difficulty} />

      {/* Notification feed */}
      <NotificationFeed history={state.history} />

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
      {state.pendingEvent && (
        <EventModal event={state.pendingEvent} onClose={dismissEvent} />
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
