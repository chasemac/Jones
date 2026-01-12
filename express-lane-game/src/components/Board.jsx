import React, { useState } from 'react';
import { useGame, LOCATION_ORDER } from '../context/GameContext';
import jobsData from '../data/jobs.json';
import itemsData from '../data/items.json';
import educationData from '../data/education.json';
import housingData from '../data/housing.json';
import stocksData from '../data/stocks.json';

// --- Configuration ---
const LOCATIONS_CONFIG = {
  leasing_office: { 
    emoji: '🏢', 
    label: 'Leasing', 
    color: '#9333ea', // purple-600
    posClass: 'top-4 left-4',
    svgPoint: { x: 15, y: 15 }
  },
  quick_eats: { 
    emoji: '🍔', 
    label: 'Quick Eats', 
    color: '#ea580c', // orange-600
    posClass: 'top-4 left-1/2 -translate-x-1/2',
    svgPoint: { x: 50, y: 10 }
  },
  public_library: { 
    emoji: '📚', 
    label: 'Library', 
    color: '#059669', // emerald-600
    posClass: 'top-4 right-4',
    svgPoint: { x: 85, y: 15 }
  },
  trendsetters: { 
    emoji: '👕', 
    label: 'TrendSetters', 
    color: '#db2777', // pink-600
    posClass: 'top-1/2 right-4 -translate-y-1/2',
    svgPoint: { x: 90, y: 50 }
  },
  coffee_shop: {
    emoji: '☕',
    label: 'Coffee Shop',
    color: '#78350f', // amber-900
    posClass: 'bottom-32 right-4',
    svgPoint: { x: 85, y: 85 }
  },
  city_college: { 
    emoji: '🎓', 
    label: 'College', 
    color: '#2563eb', // blue-600
    posClass: 'bottom-32 left-1/2 -translate-x-1/2',
    svgPoint: { x: 50, y: 90 }
  },
  tech_store: { 
    emoji: '📱', 
    label: 'Tech Store', 
    color: '#475569', // slate-600
    posClass: 'bottom-32 left-4',
    svgPoint: { x: 15, y: 85 }
  },
  neobank: { 
    emoji: '🏦', 
    label: 'NeoBank', 
    color: '#4f46e5', // indigo-600
    posClass: 'top-1/2 left-4 -translate-y-1/2',
    svgPoint: { x: 10, y: 50 }
  },
  blacks_market: {
    emoji: '🕶️',
    label: "Black's Market",
    color: '#1e293b', // slate-800
    posClass: 'bottom-4 right-4',
    svgPoint: { x: 90, y: 90 }
  }
};

const TRACK_POSITIONS = {
  leasing_office: { top: '0%', left: '0%' },
  quick_eats: { top: '0%', left: '50%' },
  public_library: { top: '0%', left: '100%' },
  trendsetters: { top: '50%', left: '100%' },
  coffee_shop: { top: '75%', left: '100%' },
  blacks_market: { top: '100%', left: '100%' },
  city_college: { top: '100%', left: '50%' },
  tech_store: { top: '100%', left: '0%' },
  neobank: { top: '50%', left: '0%' }
};

// --- Sub-Components ---

const InnerTrack = ({ currentLocation, isTraveling, jonesLocation }) => {
  const pos = TRACK_POSITIONS[currentLocation] || { top: '50%', left: '50%' };
  const jonesPos = TRACK_POSITIONS[jonesLocation] || { top: '50%', left: '50%' };

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] border-8 border-slate-200/50 rounded-3xl pointer-events-none z-0">
       {/* Track Line */}
       <div className="absolute inset-0 border-4 border-dashed border-slate-400/30 rounded-2xl" />
       
       {/* Jones Token */}
       <div 
         className="absolute w-14 h-14 bg-red-500 border-4 border-white rounded-full flex items-center justify-center text-2xl shadow-xl transition-all duration-1000 ease-in-out z-0 opacity-80"
         style={{ 
            top: jonesPos.top, 
            left: jonesPos.left,
            transform: 'translate(-50%, -50%)'
         }}
         title="The Joneses"
       >
         🤑
       </div>

       {/* Player Token */}
       <div 
         className={`absolute w-16 h-16 bg-yellow-400 border-4 border-white rounded-full flex items-center justify-center text-3xl shadow-xl transition-all duration-700 ease-in-out z-10
            ${isTraveling ? 'animate-spin' : 'animate-bounce'}
         `}
         style={{ 
            top: pos.top, 
            left: pos.left,
            transform: 'translate(-50%, -50%)'
         }}
       >
         😎
       </div>
    </div>
  );
};

const BuildingNode = ({ config, isCurrent, onClick, isTraveling }) => (
  <div 
    onClick={onClick}
    className={`absolute ${config.posClass} flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-110 z-10 group`}
  >
    <div 
      className={`w-20 h-20 md:w-24 md:h-24 bg-white border-4 rounded-xl shadow-lg flex items-center justify-center text-4xl md:text-5xl relative
        ${isCurrent ? 'ring-4 ring-yellow-400 scale-110' : 'opacity-90 hover:opacity-100'}
        ${isTraveling ? 'cursor-wait opacity-50' : ''}
      `}
      style={{ borderColor: config.color }}
    >
      {config.emoji}
      {isCurrent && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce">
          HERE
        </div>
      )}
    </div>
    <div className="mt-2 bg-slate-800 text-white text-xs md:text-sm font-bold px-3 py-1 rounded-full shadow-md border border-slate-600 group-hover:bg-slate-700">
      {config.label}
    </div>
  </div>
);



const CentralPanel = ({ locationId, children, onClose }) => {
  const config = LOCATIONS_CONFIG[locationId];
  if (!config) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl h-[60%] bg-white border-4 border-slate-800 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-slate-100 border-b-2 border-slate-200 p-4 flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <span className="text-3xl">{config.emoji}</span> {config.label}
        </h2>
        <div className="w-10 h-10 bg-white border-2 border-slate-300 rounded-lg flex items-center justify-center text-2xl shadow-inner">
          🙂
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow p-6 overflow-y-auto bg-slate-50">
        {children}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 p-3 flex justify-center">
        <button 
          onClick={onClose}
          className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-8 py-2 rounded-full shadow-lg transform transition hover:scale-105 flex items-center gap-2"
        >
          <span>DONE</span> 👉
        </button>
      </div>
    </div>
  );
};

const NotificationModal = ({ title, message, type, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 transform scale-100 animate-in zoom-in-95 duration-200">
      <div className={`text-center mb-4 text-4xl ${type === 'success' ? 'animate-bounce' : ''}`}>
        {type === 'success' ? '🎉' : '🚫'}
      </div>
      <h3 className={`text-2xl font-black text-center mb-2 uppercase ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
        {title}
      </h3>
      <p className="text-slate-600 text-center mb-6 font-medium">
        {message}
      </p>
      <button 
        onClick={onClose}
        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition shadow-lg"
      >
        OKAY
      </button>
    </div>
  </div>
);

const JonesStatus = ({ jones }) => (
  <div className="absolute top-32 left-4 bg-white/90 backdrop-blur border-2 border-slate-800 rounded-xl p-3 shadow-xl z-10 w-48 transform -rotate-2 hover:rotate-0 transition-transform duration-300 hidden md:block">
    <div className="flex items-center gap-2 border-b border-slate-300 pb-2 mb-2">
      <div className="text-2xl">😎</div>
      <div>
        <div className="text-xs font-bold uppercase text-slate-500">The Joneses</div>
        <div className="text-sm font-bold leading-none">{jones.jobTitle}</div>
      </div>
    </div>
    <div className="flex justify-between items-end">
      <div className="text-xs text-slate-500 font-bold uppercase">Net Worth</div>
      <div className="font-mono font-bold text-green-600">${jones.netWorth.toLocaleString()}</div>
    </div>
  </div>
);

const InventoryModal = ({ inventory, onClose }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
    <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 transform scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
      <div className="flex justify-between items-center mb-4 border-b-2 border-slate-200 pb-2">
        <h3 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-2">
          <span>🎒</span> Inventory
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
      </div>
      
      <div className="flex-grow overflow-y-auto space-y-2 pr-2">
        {inventory.length === 0 ? (
            <div className="text-center text-slate-500 py-8 italic">Your pockets are empty.</div>
        ) : (
            inventory.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-700">{item.name}</div>
                    <div className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded uppercase font-bold">{item.type}</div>
                </div>
            ))
        )}
      </div>
    </div>
  </div>
);

const HUD = ({ week, money, timeRemaining, maxTime, happiness, onOpenInventory, endWeek }) => {
    // Happiness Face Logic
    let face = '😐';
    if (happiness >= 80) face = '😁';
    else if (happiness >= 60) face = '🙂';
    else if (happiness >= 40) face = '😐';
    else if (happiness >= 20) face = '😟';
    else face = '😫';

    return (
  <div className="absolute bottom-0 left-0 right-0 h-24 bg-slate-900 border-t-4 border-slate-700 flex items-center justify-between px-4 md:px-8 z-30 shadow-2xl">
    
    {/* Week Clock */}
    <div className="flex flex-col items-center">
      <div className="text-4xl">🕒</div>
      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Week {week}</div>
    </div>

    {/* Stats & Time */}
    <div className="flex-grow mx-4 md:mx-8 flex items-center gap-4 md:gap-8">
        {/* Happiness */}
        <div className="flex flex-col items-center" title={`Happiness: ${happiness}%`}>
            <div className="text-4xl">{face}</div>
            <div className="w-16 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden border border-slate-600">
                <div className={`h-full ${happiness < 30 ? 'bg-red-500' : 'bg-yellow-400'}`} style={{ width: `${happiness}%` }}></div>
            </div>
        </div>

        {/* Time Bar (Center) */}
        <div className="flex-grow hidden md:flex flex-col gap-1">
        <div className="flex justify-between text-xs text-slate-400 uppercase font-bold">
            <span>Time Remaining</span>
            <span>{timeRemaining}h / {maxTime}h</span>
        </div>
        <div className="h-6 bg-slate-800 rounded-full border border-slate-600 overflow-hidden relative">
            <div 
            className={`h-full transition-all duration-500 ${timeRemaining < 20 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${(timeRemaining / maxTime) * 100}%` }}
            />
            {/* Grid lines for time */}
            <div className="absolute inset-0 flex justify-between px-2">
                {[...Array(10)].map((_, i) => <div key={i} className="w-px h-full bg-slate-900/20"></div>)}
            </div>
        </div>
        </div>
    </div>

    {/* Actions */}
    <div className="flex items-center gap-4">
      <button 
        onClick={onOpenInventory}
        className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg border border-slate-500 shadow active:translate-y-1 transition"
        title="Inventory"
      >
        🎒
      </button>

      <div className="bg-black/50 p-3 rounded-lg border border-slate-700 font-mono text-green-400 text-xl md:text-2xl shadow-inner min-w-[120px] text-right">
        ${money.toFixed(2)}
      </div>
      <button 
        onClick={endWeek}
        className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-3 rounded-lg shadow border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all text-sm uppercase"
      >
        End Week
      </button>
    </div>
  </div>
)};

const NewsFeed = ({ history }) => (
  <div className="absolute bottom-28 right-4 w-64 max-h-48 overflow-y-auto bg-white/80 backdrop-blur border border-slate-300 rounded-lg shadow-lg p-2 z-20 hidden md:block">
    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 sticky top-0 bg-white/80 backdrop-blur pb-1 border-b border-slate-200">
      🔔 Notifications
    </h4>
    <div className="flex flex-col gap-2">
      {history.length === 0 && <div className="text-xs text-slate-400 italic">No news yet...</div>}
      {history.slice(0, 10).map((entry, i) => (
        <div key={i} className="text-xs border-b border-slate-200 last:border-0 pb-1">
          {entry}
        </div>
      ))}
    </div>
  </div>
);

// --- Main Board Component ---

const Board = () => {
  const { 
    player, jones, week, spendTime, updateMoney, logEvent, endWeek,
    applyForJob, workCurrentJob, buyItem, sellItem, inventory, enroll, study, rentApartment, travelTo, bankTransaction, isTraveling, history,
    market, buyStock, sellStock
  } = useGame();

  const [showPanel, setShowPanel] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

  const handleTravel = async (id) => {
    if (player.currentLocation === id) {
      setShowPanel(true);
    } else {
      setShowPanel(false);
      await travelTo(id);
      setShowPanel(true);
    }
  };

  const handleApply = (job) => {
    const result = applyForJob(job);
    setNotification({ ...result, type: result.success ? 'success' : 'error' });
  };

  // --- Content Renderers ---
  // (Refactored to fit the new 2-column or list layout)

  const renderContent = (id) => {
    switch(id) {
      case 'quick_eats':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Menu</h3>
              <button onClick={() => { if(spendTime(1)) { updateMoney(-10); logEvent("Ate Fast Food"); } }} className="w-full flex justify-between items-center p-3 bg-white border rounded hover:bg-orange-50 transition">
                <span>🍔 Burger Meal</span>
                <span className="font-mono font-bold">$10.00</span>
              </button>
              <div className="text-center text-6xl py-4 opacity-50">🍟</div>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Gigs</h3>
              <button onClick={() => { if(spendTime(10)) { updateMoney(150); logEvent("Worked Gig"); } }} className="w-full flex justify-between items-center p-3 bg-white border rounded hover:bg-green-50 transition">
                <div>
                    <div className="font-bold">🚗 Delivery Driver</div>
                    <div className="text-xs text-slate-500">10 Hours</div>
                </div>
                <span className="font-mono font-bold text-green-600">+$150.00</span>
              </button>
            </div>
          </div>
        );

      case 'public_library': {
        const availableJobs = jobsData.filter(j => j.id !== 'gig_driver');
        return (
          <div className="h-full flex flex-col">
             <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-emerald-800 mb-2">Public Computers</h3>
                <p className="text-sm text-slate-600 mb-4">Use the free internet to apply for jobs or learn new skills.</p>
             </div>
             
             <div className="flex-grow overflow-y-auto space-y-2">
                <h3 className="font-bold text-slate-500 text-sm uppercase mb-2">Job Listings</h3>
                {availableJobs.map(job => (
                    <button key={job.id} onClick={() => handleApply(job)} className="w-full text-left p-3 bg-white border hover:border-emerald-400 rounded flex justify-between items-center group">
                        <div>
                            <div className="font-bold group-hover:text-emerald-600">{job.title}</div>
                            <div className="text-xs text-slate-500">
                                {job.requirements?.experience ? `${job.requirements.experience}y Exp` : 'Entry Level'}
                                {job.requirements?.education ? ` • ${job.requirements.education}` : ''}
                            </div>
                        </div>
                        <span className="font-mono font-bold">${job.wage}/hr</span>
                    </button>
                ))}
             </div>
          </div>
        );
      }

      case 'coffee_shop': {
        const isEmployee = player.job && (player.job.type === 'service');
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Menu</h3>
                    <button onClick={() => { if(spendTime(0.5)) { updateMoney(-5); logEvent("Drank Coffee"); } }} className="w-full flex justify-between items-center p-3 bg-white border rounded hover:bg-amber-50 transition">
                        <span>☕ Espresso</span>
                        <span className="font-mono font-bold">$5.00</span>
                    </button>
                    <button onClick={() => { if(spendTime(0.5)) { updateMoney(-8); logEvent("Ate Pastry"); } }} className="w-full flex justify-between items-center p-3 bg-white border rounded hover:bg-amber-50 transition">
                        <span>🥐 Croissant</span>
                        <span className="font-mono font-bold">$8.00</span>
                    </button>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Staff Only</h3>
                    {isEmployee ? (
                        <button onClick={workCurrentJob} className="w-full flex justify-between items-center p-3 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 transition">
                            <div>
                                <div className="font-bold">Work Shift</div>
                                <div className="text-xs text-amber-800">8 Hours</div>
                            </div>
                            <span className="font-mono font-bold text-amber-900">Earn Wages</span>
                        </button>
                    ) : (
                        <div className="p-4 bg-slate-100 text-slate-500 text-center rounded italic">
                            You don't work here. Apply at the Library!
                        </div>
                    )}
                </div>
            </div>
        );
      }

      case 'trendsetters':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center justify-center bg-pink-50 rounded-lg p-4">
                    <div className="text-8xl mb-4">👗</div>
                    <div className="text-center font-bold text-pink-800">New Arrivals</div>
                </div>
                <div className="space-y-2">
                    {itemsData.filter(i => i.type === 'clothing').map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => buyItem(item)} 
                            disabled={inventory.some(i => i.id === item.id)}
                            className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-400 hover:bg-pink-50 disabled:opacity-50"
                        >
                            <span>{item.name}</span>
                            <span className="font-mono">{inventory.some(i => i.id === item.id) ? 'OWNED' : `$${item.cost}`}</span>
                        </button>
                    ))}
                </div>
            </div>
        );

      case 'tech_store': {
        const isEmployee = player.job && (player.job.type === 'tech');
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Products</h3>
                    {itemsData.filter(i => i.type === 'electronics').map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => buyItem(item)} 
                            disabled={inventory.some(i => i.id === item.id)}
                            className="w-full flex justify-between items-center p-2 border-b border-dotted border-slate-400 hover:bg-blue-50 disabled:opacity-50"
                        >
                            <span>{item.name}</span>
                            <span className="font-mono">{inventory.some(i => i.id === item.id) ? 'OWNED' : `$${item.cost}`}</span>
                        </button>
                    ))}
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Work</h3>
                    {isEmployee ? (
                        <button onClick={workCurrentJob} className="w-full flex justify-between items-center p-3 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 transition">
                            <div>
                                <div className="font-bold">Code Sprint</div>
                                <div className="text-xs text-blue-800">8 Hours</div>
                            </div>
                            <span className="font-mono font-bold text-blue-900">Earn Wages</span>
                        </button>
                    ) : (
                        <div className="p-4 bg-slate-100 text-slate-500 text-center rounded italic">
                            Tech jobs available. Apply at the Library!
                        </div>
                    )}
                </div>
            </div>
        );
      }

      case 'city_college':
        return (
            <div className="h-full flex flex-col">
                {player.currentCourse ? (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4 text-center">
                        <h3 className="font-bold text-blue-800">{player.currentCourse.title}</h3>
                        <div className="w-full bg-blue-200 h-4 rounded-full mt-2 overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{ width: `${(player.currentCourse.progress / player.currentCourse.totalHours) * 100}%` }}></div>
                        </div>
                        <div className="text-xs mt-1">{player.currentCourse.progress}/{player.currentCourse.totalHours} Hours</div>
                        <button onClick={study} className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700">Study (10h)</button>
                    </div>
                ) : (
                    <div className="text-center p-4 text-slate-500">Enroll in a course to advance your career.</div>
                )}
                <div className="flex-grow overflow-y-auto space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-500 text-sm uppercase mb-2">Academic Degrees</h3>
                        <div className="space-y-2">
                            {educationData.filter(c => c.type === 'academic').map(course => (
                                <button key={course.id} onClick={() => enroll(course)} className="w-full flex justify-between items-center p-3 border rounded hover:bg-blue-50">
                                    <div className="text-left">
                                        <div className="font-bold">{course.title}</div>
                                        <div className="text-xs text-slate-500">{course.totalHours} Hours Total</div>
                                    </div>
                                    <span className="font-mono font-bold">${course.cost}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-500 text-sm uppercase mb-2">Trade School</h3>
                        <div className="space-y-2">
                            {educationData.filter(c => c.type === 'trade').map(course => (
                                <button key={course.id} onClick={() => enroll(course)} className="w-full flex justify-between items-center p-3 border rounded hover:bg-orange-50 border-orange-200">
                                    <div className="text-left">
                                        <div className="font-bold text-orange-900">{course.title}</div>
                                        <div className="text-xs text-slate-500">{course.totalHours} Hours Total</div>
                                    </div>
                                    <span className="font-mono font-bold text-orange-700">${course.cost}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );

      case 'leasing_office':
        return (
            <div className="space-y-4">
                <div className="bg-purple-50 p-4 rounded border border-purple-100">
                    <div className="text-xs uppercase text-purple-600 font-bold">Current Residence</div>
                    <div className="text-xl font-bold">{player.housing?.title || "Homeless"}</div>
                    <div className="text-sm">Rent: ${player.housing?.rent || 0}/week</div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {housingData.map(h => (
                        <button key={h.id} onClick={() => rentApartment(h)} disabled={player.housing?.id === h.id} className="flex justify-between items-center p-3 border rounded hover:bg-purple-50 disabled:bg-purple-100 disabled:opacity-70">
                            <span>{h.title}</span>
                            <span className="font-mono">${h.rent}/wk</span>
                        </button>
                    ))}
                </div>
            </div>
        );

      case 'neobank': {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Banking</h3>
                    <div className="bg-indigo-50 p-4 rounded border border-indigo-100">
                        <h3 className="font-bold text-indigo-800 mb-2">Savings (1% APY)</h3>
                        <div className="text-3xl font-mono mb-4">${player.savings}</div>
                        <div className="flex gap-2">
                            <button onClick={() => bankTransaction('deposit', 100)} className="flex-1 bg-white border border-indigo-200 py-1 rounded hover:bg-indigo-100">Dep $100</button>
                            <button onClick={() => bankTransaction('withdraw', 100)} className="flex-1 bg-white border border-indigo-200 py-1 rounded hover:bg-indigo-100">W/D $100</button>
                        </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded border border-red-100">
                        <h3 className="font-bold text-red-800 mb-2">Debt (5% APR)</h3>
                        <div className="text-3xl font-mono mb-4 text-red-600">${player.debt}</div>
                        <div className="flex gap-2">
                            <button onClick={() => bankTransaction('repay', 100)} className="flex-1 bg-white border border-red-200 py-1 rounded hover:bg-red-100">Pay $100</button>
                            <button onClick={() => bankTransaction('borrow', 100)} className="flex-1 bg-white border border-red-200 py-1 rounded hover:bg-red-100">Borrow $100</button>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Stock Market</h3>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2">
                        {stocksData.map(stock => {
                            const currentPrice = market[stock.symbol];
                            const owned = player.portfolio?.[stock.symbol] || 0;
                            const isUp = currentPrice >= stock.basePrice;
                            
                            return (
                                <div key={stock.symbol} className="bg-white p-3 rounded border shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold">{stock.symbol}</span>
                                        <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                                            ${currentPrice}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-2">{stock.name} - {stock.description}</div>
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded mb-2">
                                        <span className="text-xs font-bold text-slate-600">Owned: {owned}</span>
                                        <span className="text-xs text-slate-400">Value: ${owned * currentPrice}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => buyStock(stock.symbol, 1)} className="flex-1 bg-green-100 text-green-800 text-xs font-bold py-1 rounded hover:bg-green-200">Buy</button>
                                        <button onClick={() => buyStock(stock.symbol, 10)} className="flex-1 bg-green-100 text-green-800 text-xs font-bold py-1 rounded hover:bg-green-200">Buy 10</button>
                                        <button onClick={() => sellStock(stock.symbol, 1)} disabled={owned < 1} className="flex-1 bg-red-100 text-red-800 text-xs font-bold py-1 rounded hover:bg-red-200 disabled:opacity-50">Sell</button>
                                        <button onClick={() => sellStock(stock.symbol, owned)} disabled={owned < 1} className="flex-1 bg-red-100 text-red-800 text-xs font-bold py-1 rounded hover:bg-red-200 disabled:opacity-50">Sell All</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
      }

      case 'blacks_market':
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Pawn Shop</h3>
                    <div className="bg-slate-100 p-4 rounded text-sm text-slate-600 mb-2">
                        "I'll give you 50% of what you paid. Take it or leave it."
                    </div>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2">
                        {inventory.length === 0 ? (
                            <div className="text-center text-slate-400 italic py-4">Nothing to sell...</div>
                        ) : (
                            inventory.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white border rounded shadow-sm">
                                    <div>
                                        <div className="font-bold">{item.name}</div>
                                        <div className="text-xs text-slate-500">Paid: ${item.cost}</div>
                                    </div>
                                    <button 
                                        onClick={() => sellItem(item)}
                                        className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-bold hover:bg-red-200"
                                    >
                                        Sell ${Math.floor(item.cost * 0.5)}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b border-slate-300 pb-2">Ticket Booth</h3>
                    <div className="space-y-2">
                        <button 
                            onClick={() => {
                                if (player.money >= 10) {
                                    updateMoney(-10);
                                    if (Math.random() < 0.05) { // 5% chance
                                        updateMoney(500);
                                        logEvent("WINNER! You won $500 in the lottery!");
                                    } else {
                                        logEvent("Lost the lottery. Better luck next time.");
                                    }
                                } else {
                                    logEvent("Not enough money for a ticket.");
                                }
                            }}
                            className="w-full p-4 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200 flex justify-between items-center"
                        >
                            <div className="text-left">
                                <div className="font-bold text-yellow-900">Lottery Ticket</div>
                                <div className="text-xs text-yellow-700">Win Big! (Maybe)</div>
                            </div>
                            <span className="font-mono font-bold text-yellow-800">$10</span>
                        </button>

                        <button 
                            onClick={() => {
                                if (player.money >= 150) {
                                    updateMoney(-150);
                                    // Add happiness directly here since we don't have a setHappiness exposed easily, 
                                    // but we can use a "consumable" pattern or just rely on the fact that we can't easily set happiness from here without exposing it.
                                    // Wait, I can't set happiness directly from here.
                                    // I should probably make a "buyExperience" function or just use buyItem with a special item.
                                    // For now, I'll just log it and maybe add a "Concert Ticket" item that is auto-consumed?
                                    // Actually, let's just use buyItem with a fake item.
                                    buyItem({ id: 'concert', name: 'Concert Ticket', cost: 150, type: 'food', effect: 'Huge Fun' }); 
                                    // Note: buyItem handles 'food' type by adding happiness. I'll use that hack for now or update buyItem.
                                } else {
                                    logEvent("Not enough money for tickets.");
                                }
                            }}
                            className="w-full p-4 bg-purple-100 border border-purple-300 rounded hover:bg-purple-200 flex justify-between items-center"
                        >
                            <div className="text-left">
                                <div className="font-bold text-purple-900">Rock Concert</div>
                                <div className="text-xs text-purple-700">Boost Happiness (+5)</div>
                            </div>
                            <span className="font-mono font-bold text-purple-800">$150</span>
                        </button>
                    </div>
                </div>
            </div>
        );

      default:
        return <div>Select a location</div>;
    }
  };

  return (
    <div className="relative w-full h-[700px] bg-slate-200 rounded-xl overflow-hidden border-4 border-slate-800 shadow-2xl select-none">
      {/* Background Map */}
      <div className="absolute inset-0 bg-[#e2e8f0] opacity-50">
        {/* Decorative city blocks/grid could go here */}
      </div>
      
      {/* Inner Track & Player Token */}
      <InnerTrack 
        currentLocation={player.currentLocation} 
        isTraveling={isTraveling} 
        jonesLocation={jones.currentLocation}
      />

      {/* Jones Status Tracker */}
      <JonesStatus jones={jones} />

      {/* News Feed */}
      <NewsFeed history={history} />

      {/* Buildings */}
      {LOCATION_ORDER.map(id => (
        <BuildingNode 
          key={id}
          id={id}
          config={LOCATIONS_CONFIG[id]}
          isCurrent={player.currentLocation === id}
          isTraveling={isTraveling}
          onClick={() => handleTravel(id)}
        />
      ))}

      {/* Central Panel */}
      {showPanel && !isTraveling && (
        <CentralPanel 
          locationId={player.currentLocation} 
          onClose={() => setShowPanel(false)}
        >
          {renderContent(player.currentLocation)}
        </CentralPanel>
      )}

      {/* HUD */}
      <HUD 
        week={week} 
        money={player.money} 
        timeRemaining={player.timeRemaining} 
        maxTime={player.maxTime}
        happiness={player.happiness}
        onOpenInventory={() => setShowInventory(true)}
        endWeek={endWeek}
      />

      {/* Inventory Modal */}
      {showInventory && (
        <InventoryModal 
            inventory={inventory} 
            onClose={() => setShowInventory(false)} 
        />
      )}

      {/* Notification Modal */}
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
