import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { LOCATION_ORDER, travelCost } from '../engine/constants';
import { getNextPromotion, getJobLocation } from '../engine/jobModel';
import { ringPath, LOCATIONS_CONFIG, homeEmoji } from '../engine/boardModel';
import { MapBackground, BuildingNode, PlayerToken, FloatingMoney, LocationPanel } from './ui/MapComponents';
import HUD from './ui/HUD';
import { GoalsModal, NotificationModal, InventoryModal, HungerWarningModal, ClothingWarningModal, EventModal, FullLogModal, WeekSummaryModal } from './ui/Modals';
import { RingTips, JonesSidebar, NotificationFeed } from './ui/SidebarWidgets';
import {
  QuickEatsContent, LibraryContent, TrendSettersContent,
  GroceryStoreContent, MegaMartContent, CoffeeShopContent,
  BlacksMarketContent, CityCollegeContent, TechStoreContent,
  NeoBankContent, HomeContent, LeasingOfficeContent,
} from './locations';

const Board = () => {
  const { state, travel, applyForJob, work, workOvertime, partTimeWork, gigWork, network, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, sellStockAll, endWeek, dismissEvent, dismissWeekSummary, dismissHungerWarning, dismissClothingWarning, toggleMute, rest, readBook } = useGame();

  const actions = { travel, applyForJob, work, workOvertime, partTimeWork, gigWork, network, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, sellStockAll, endWeek, toggleMute, rest, readBook };

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
  const [travelBlocked, setTravelBlocked] = useState(false);
  const [endWeekHint, setEndWeekHint] = useState(false);
  const animTimers = useRef([]);

  const addFloat = (amount) => {
    const id = Date.now() + Math.random();
    setFloats(f => [...f, { id, amount }]);
  };

  const showJobResultNotification = useEffectEvent((result) => {
    setNotification({
      title: result.success ? "You're Hired!" : "Application Rejected",
      message: result.message,
      type: result.success ? 'success' : 'error',
    });
  });

  const flashWeekChange = useEffectEvent(() => {
    setWeekFlash(true);
    setTimeout(() => setWeekFlash(false), 600);
  });

  const animateEndWeek = useEffectEvent((from, home) => {
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
  });

  // Watch for job application results
  const prevJobResult = useRef(state.lastJobResult);
  useEffect(() => {
    if (state.lastJobResult && state.lastJobResult !== prevJobResult.current) {
      showJobResultNotification(state.lastJobResult);
      prevJobResult.current = state.lastJobResult;
    }
  }, [state.lastJobResult]);

  // Flash on end week
  const prevWeek = useRef(state.week);
  useEffect(() => {
    if (state.week !== prevWeek.current) {
      flashWeekChange();
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
    animateEndWeek(from, home);
  }, [state.awaitingEndWeek, state.player.currentLocation, state.player.hasChosenHousing]);

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
        case 'm': { toggleMute(); break; }
        case 'escape': {
          // Close any open modal/panel
          if (showInventory) setShowInventory(false);
          else if (showGoals) setShowGoals(false);
          else if (showLog) setShowLog(false);
          else if (showPanel) setShowPanel(false);
          break;
        }
        case 'w': {
          // Work if at work location and has time
          if (player.job) {
            const loc = getJobLocation(player.job);
            if (loc === player.currentLocation) {
              if (player.timeRemaining >= 8) work();
              else if (player.timeRemaining >= 4) partTimeWork();
            }
          }
          break;
        }
        case 'e': {
          // End week if at home
          if ((player.currentLocation === 'home' || player.currentLocation === 'leasing_office') && player.hasChosenHousing) {
            endWeek();
          } else if (player.hasChosenHousing) {
            setEndWeekHint(true);
            setTimeout(() => setEndWeekHint(false), 2000);
          }
          break;
        }
        case 'r': {
          // Rest 2h if at home
          if (player.currentLocation === 'home' && player.timeRemaining >= 2) rest(2);
          break;
        }
        case 's': {
          // Study if at city_college and enrolled
          if (player.currentLocation === 'city_college' && player.currentCourse && player.timeRemaining >= 10) study();
          break;
        }
        case 'n': {
          // Network if at coffee_shop
          if (player.currentLocation === 'coffee_shop' && player.timeRemaining >= 1) network();
          break;
        }
        default: break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [endWeek, showGoals, showInventory, showLog, showPanel, state, toggleMute, work, partTimeWork, rest, study, network]);

  const handleTravel = (id) => {
    if (state.player.currentLocation === id) {
      setShowPanel(true);
      return;
    }

    // Check if player can afford travel
    const travelBonus = state.player.inventory.reduce((max, item) => Math.max(max, item.travelBonus || 0), 0);
    const cost = Math.max(1, travelCost(state.player.currentLocation, id) - travelBonus);
    if (state.player.timeRemaining < cost) {
      setTravelBlocked(true);
      setTimeout(() => setTravelBlocked(false), 1500);
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
      case 'leasing_office': return <LeasingOfficeContent state={state} actions={actions} onMoveIn={() => setShowPanel(false)} />;
      default:               return <div className="text-slate-400 italic text-center p-8">Nothing here yet.</div>;
    }
  };

  return (
    <div className="relative w-full flex-1 lg:flex-none overflow-hidden border-[3px] border-slate-900/90 bg-[linear-gradient(180deg,#cdeeff_0%,#dff7ff_32%,#eefbf5_100%)] shadow-[0_30px_80px_rgba(15,23,42,0.45)] select-none lg:h-[min(720px,_calc(100dvh-2rem))] xl:h-[min(780px,_calc(100dvh-2rem))] lg:rounded-[1.75rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),transparent_32%),linear-gradient(180deg,transparent,rgba(15,23,42,0.08))]" />

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
        @keyframes borderPulse {
          0%   { opacity: 0.8; }
          100% { opacity: 0.2; }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* Week-end flash overlay */}
      {weekFlash && (
        <div
          className="absolute inset-0 bg-indigo-100/80 pointer-events-none z-40"
          style={{ animation: 'weekFlash 0.6s ease-out forwards' }}
        />
      )}

      {/* Low time warning border pulse */}
      {state.player.timeRemaining > 0 && state.player.timeRemaining <= 8 && !isMoving && (
        <div className="absolute inset-0 pointer-events-none z-30 border-4 border-red-500 rounded-lg"
          style={{ animation: 'borderPulse 1s ease-in-out infinite alternate' }} />
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

      {/* Travel blocked toast */}
      {travelBlocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-red-600/90 text-white font-black text-sm px-4 py-2 rounded-full shadow-xl"
            style={{ animation: 'weekFlash 1.5s ease-out forwards' }}>
            ⚡ Not enough time!
          </div>
        </div>
      )}

      {/* End week hint toast */}
      {endWeekHint && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-indigo-700/90 text-white font-black text-sm px-4 py-2 rounded-full shadow-xl"
            style={{ animation: 'weekFlash 2s ease-out forwards' }}>
            🏠 Go home first to end the week!
          </div>
        </div>
      )}

      {/* Padded map area — keeps buildings away from container edges */}
      <div className="absolute inset-x-2 sm:inset-x-5 top-2 bottom-[5.3rem] sm:bottom-24">
        {/* Map background */}
        <MapBackground economy={state.economy} />

        {/* Economy pill — top-center */}
        {(() => {
          const { economy, week, economyTimer } = state;
          const bg = economy === 'Boom' ? 'bg-green-600' : economy === 'Depression' ? 'bg-red-600' : 'bg-slate-600';
          const icon = economy === 'Boom' ? '📈' : economy === 'Depression' ? '📉' : '📊';
          return (
            <div className={`absolute top-1.5 ${state.players?.length > 1 ? 'left-2' : 'left-1/2 -translate-x-1/2'} flex items-center gap-1 ${bg} text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg z-10 pointer-events-none border border-white/20`}>
              <span>{icon}</span><span>{economy}</span><span className="opacity-50">·</span><span>Wk {week}</span>
              {economyTimer <= 2 ? (
                <span className="opacity-90 animate-pulse bg-white/20 px-1 rounded">→shift in {economyTimer}wk</span>
              ) : economyTimer <= 4 ? (
                <span className="opacity-60">{economyTimer}wk left</span>
              ) : null}
            </div>
          );
        })()}

        {/* Buildings */}
        {(() => {
          const { player } = state;
          const promoJob = getNextPromotion(player);
          const workLocId = getJobLocation(player.job);
          return LOCATION_ORDER.map(id => {
            // Warning badges
            let warningBadge = null;
            const hasAnyFood = player.inventory.some(i => i.type === 'weekly_meal' || i.type === 'food_storage' || i.type === 'weekly_coffee');
            if (id === 'quick_eats' && (player.hunger >= 60 || (!hasAnyFood && player.hunger >= 25))) {
              warningBadge = { icon: '!', color: player.hunger >= 60 ? 'bg-orange-500' : 'bg-yellow-500' };
            } else if (id === 'grocery_store' && !hasAnyFood && player.hunger >= 40) {
              warningBadge = { icon: '!', color: 'bg-orange-500' };
            } else if (id === 'trendsetters' && player.inventory.some(i => i.clothingWear !== undefined && i.clothingWear < 30)) {
              warningBadge = { icon: '!', color: 'bg-red-500' };
            } else if (id === 'home' && (player.relaxation ?? 50) <= 20) {
              warningBadge = { icon: '!', color: 'bg-amber-500' };
            } else if (id === 'neobank' && player.debt > 0 && player.debt >= 2000) {
              warningBadge = { icon: '!', color: 'bg-red-500' };
            } else if (id === 'leasing_office' && !player.hasChosenHousing) {
              warningBadge = { icon: '!', color: 'bg-purple-500' };
            } else if (id === 'city_college' && player.currentCourse && player.timeRemaining >= 10) {
              warningBadge = { icon: '📖', color: 'bg-blue-500' };
            }
            const isPromoReady = !!(promoJob && id === workLocId);
            const travelBonus = player.inventory.reduce((max, item) => Math.max(max, item.travelBonus || 0), 0);
            const travelHours = player.currentLocation !== id
              ? Math.max(1, travelCost(player.currentLocation, id) - travelBonus)
              : null;
            const config = id === 'home'
              ? { ...LOCATIONS_CONFIG.home, emoji: homeEmoji(player.housing), label: player.housing?.homeType === 'luxury_condo' ? 'Condo' : player.housing?.homeType === 'apartment' ? 'Apartment' : 'Home' }
              : LOCATIONS_CONFIG[id];
            return (
              <BuildingNode
                key={id}
                config={config}
                isCurrent={state.player.currentLocation === id}
                isTraveling={isMoving}
                onClick={() => handleTravel(id)}
                warningBadge={warningBadge}
                travelHours={travelHours}
                isPromoReady={isPromoReady}
                hasJob={getJobLocation(player.job) === id}
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
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full font-black text-sm shadow-lg text-white flex items-center gap-2 border border-white/25 backdrop-blur"
          style={{ background: state.player?.color || '#6366f1' }}
        >
          {state.player?.emoji} {state.player?.name}'s Turn
          <span className="text-xs font-normal opacity-75">Wk {state.week}</span>
        </div>
      )}

      {/* Jones + Tips + Bell — icon row bottom-right */}
      <JonesSidebar jones={state.jones} player={state.player} />
      <RingTips player={state.player} week={state.week} />
      <NotificationFeed history={state.history} onOpenLog={() => setShowLog(true)} />

      {/* Location panel */}
      {showPanel && !isMoving && (
        <LocationPanel locationId={state.player.currentLocation} player={state.player} onClose={() => setShowPanel(false)}>
          {renderPanelContent(state.player.currentLocation)}
        </LocationPanel>
      )}

      {/* Floating money popups */}
      {floats.map(f => (
        <FloatingMoney
          key={f.id}
          amount={f.amount}
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
      {!state.weekSummary && !state.pendingEvent && !state.players?.some(p => p.hungerWarning) && state.players?.some(p => p.clothingWarning) && (
        <ClothingWarningModal
          warning={state.players.find(p => p.clothingWarning).clothingWarning}
          onClose={dismissClothingWarning}
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

      {/* Screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state.history?.[0] || ''}
      </div>
    </div>
  );
};

export default Board;
