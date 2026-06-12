import React, { Component, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { LOCATION_ORDER, rideFare, homeBase } from '../engine/constants';
import { getNextPromotion, getJobLocation } from '../engine/jobModel';
import { effectiveTravelCost, getTravelBonus, ringPath, LOCATIONS_CONFIG, homeEmoji } from '../engine/boardModel';
import { MapBackground, ShopNode, PlayerToken, FloatingMoney, LocationPanel } from './ui/MapComponents';
import HUD from './ui/HUD';
import { GoalsModal, NotificationModal, InventoryModal, HungerWarningModal, ClothingWarningModal, EventModal, FullLogModal, WeekSummaryModal } from './ui/Modals';
import { RingTips, JonesSidebar, NotificationFeed } from './ui/SidebarWidgets';
import {
  QuickEatsContent, LibraryContent, TrendSettersContent,
  GroceryStoreContent, MegaMartContent, CoffeeShopContent,
  BlacksMarketContent, CityCollegeContent, TechStoreContent,
  NeoBankContent, HomeContent, LeasingOfficeContent,
} from './locations';

class BoardErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 p-6">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-2">😵</div>
            <h2 className="text-lg font-black text-red-600 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-600 mb-4">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ error: null })} className="bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Board = () => {
  const { state, travel, applyForJob, work, workOvertime, partTimeWork, gigWork, network, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, sellStockAll, endWeek, rideHome, dismissEvent, dismissWeekSummary, dismissHungerWarning, dismissClothingWarning, toggleMute, rest, readBook } = useGame();

  const actions = { travel, applyForJob, work, workOvertime, partTimeWork, gigWork, network, buyItem, sellItem, enroll, study, rentApartment, bankTransaction, buyStock, sellStock, sellStockAll, endWeek, rideHome, toggleMute, rest, readBook };

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
  // Jackpot splash: the roll happens in the reducer now (audit A6); watch the
  // one-shot result signal instead of receiving a callback from the shop.
  const lastLotterySeq = useRef(state.lastLotteryResult?.seq || 0);
  const showLotterySplash = useEffectEvent((win) => {
    setLotteryResult({ win });
    setTimeout(() => setLotteryResult(null), 2000);
  });
  useEffect(() => {
    const r = state.lastLotteryResult;
    if (r && r.seq !== lastLotterySeq.current) {
      lastLotterySeq.current = r.seq;
      showLotterySplash(r.win);
    }
  }, [state.lastLotteryResult]);
  const [endWeekHint, setEndWeekHint] = useState(false);
  const [showHandoff, setShowHandoff] = useState(false);
  const animTimers = useRef([]);
  const isMultiplayer = (state.players?.length ?? 1) > 1;

  const modalOpen = showHandoff ||
    showInventory ||
    showGoals ||
    showLog ||
    !!notification ||
    !!state.weekSummary ||
    !!state.pendingEvent ||
    state.players?.some(p => p.hungerWarning) ||
    state.players?.some(p => p.clothingWarning);

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

  // Hot-seat hand-off (GDD §15): when the active player changes in multiplayer,
  // cover the board with a "pass the device" screen until the next player is ready.
  const openHandoff = useEffectEvent(() => setShowHandoff(true));

  // Reset transient board UI when a new week begins.
  const resetUiForNewWeek = useEffectEvent(() => {
    setShowPanel(true);
    setIsMoving(false);
    setAnimLocation(null);
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
  });

  const animateEndWeek = useEffectEvent((from, home) => {
    if (from === home) {
      // Already at home — end week immediately and ensure panel shows
      endWeek();
      setShowPanel(true);
      setIsMoving(false);
      setAnimLocation(null);
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
      setShowPanel(true);
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

  // Flash on end week and fully reset UI for the new week
  const prevWeek = useRef(state.week);
  useEffect(() => {
    if (state.week !== prevWeek.current) {
      flashWeekChange();
      resetUiForNewWeek();
      prevWeek.current = state.week;
    }
  }, [state.week]);

  // Track money changes for floating text — gains (green) and spends (red).
  // Skip the frame where the active player switches (multiplayer hand-off), so
  // one player's balance isn't shown as another player's delta.
  const prevMoney = useRef(state.player.money);
  const prevActiveForMoney = useRef(state.activePlayerIndex);
  useEffect(() => {
    if (state.activePlayerIndex !== prevActiveForMoney.current) {
      prevActiveForMoney.current = state.activePlayerIndex;
      prevMoney.current = state.player.money;
      return;
    }
    const diff = Math.round(state.player.money - prevMoney.current);
    if (Math.abs(diff) >= 1) addFloat(diff);
    prevMoney.current = state.player.money;
  }, [state.player.money, state.activePlayerIndex]);

  // Detect active-player changes (multiplayer) → trigger the hand-off screen.
  const prevActiveIndex = useRef(state.activePlayerIndex);
  useEffect(() => {
    if (state.activePlayerIndex !== prevActiveIndex.current) {
      prevActiveIndex.current = state.activePlayerIndex;
      if (isMultiplayer && state.gameStatus === 'playing') openHandoff();
    }
  }, [state.activePlayerIndex, isMultiplayer, state.gameStatus]);

  // When time runs out, animate player walking home then end the week
  useEffect(() => {
    if (!state.awaitingEndWeek) return;

    const from = state.player.currentLocation;
    const home = state.player.hasChosenHousing ? 'home' : 'leasing_office'; // = homeBase(); inlined to keep effect deps narrow
    animateEndWeek(from, home);

    return () => {
      animTimers.current.forEach(clearTimeout);
      animTimers.current = [];
    };
  }, [state.awaitingEndWeek, state.player.currentLocation, state.player.hasChosenHousing]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  // useEffectEvent so the document listener is attached ONCE — the old
  // version depended on the whole `state` object and re-subscribed on every
  // dispatch (audit A11). The handler still always sees fresh state/props.
  const onShortcutKey = useEffectEvent((e) => {
      // Ignore when typing in an input
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable
      ) return;

      // During the hand-off screen, swallow all game shortcuts.
      if (showHandoff) return;

      const key = e.key.toLowerCase();

      if (key === 'escape') {
        if (notification) setNotification(null);
        else if (showInventory) setShowInventory(false);
        else if (showGoals) setShowGoals(false);
        else if (showLog) setShowLog(false);
        else if (state.weekSummary) dismissWeekSummary();
        else if (state.pendingEvent) dismissEvent();
        else if (state.players?.some(p => p.hungerWarning)) dismissHungerWarning();
        else if (state.players?.some(p => p.clothingWarning)) dismissClothingWarning();
        else if (showPanel) setShowPanel(false);
        return;
      }

      if (modalOpen) {
        if (key === 'm') {
          toggleMute();
        } else if (key === 'i' && showInventory) {
          setShowInventory(false);
        } else if (key === 'g' && showGoals) {
          setShowGoals(false);
        } else if (key === 'l' && showLog) {
          setShowLog(false);
        }
        return;
      }

      const { player } = state;
      switch (key) {
        case 'i': setShowInventory(v => !v); break;
        case 'g': setShowGoals(v => !v); break;
        case 'l': setShowLog(v => !v); break;
        case 'm': { toggleMute(); break; }
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
          // End week only from home
          if (player.currentLocation === 'home' && player.hasChosenHousing) {
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
  });
  useEffect(() => {
    const handler = (e) => onShortcutKey(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleTravel = (id) => {
    if (state.player.currentLocation === id) {
      setShowPanel(true);
      return;
    }

    const travelBonus = getTravelBonus(state.player.inventory);
    const pathToTarget = ringPath(state.player.currentLocation, id);
    const cost = effectiveTravelCost(state.player.currentLocation, id, state.player.inventory);
    const canReachDestination = state.player.timeRemaining >= cost;
    const reachableSteps = canReachDestination
      ? pathToTarget.length
      : Math.min(pathToTarget.length, Math.max(0, state.player.timeRemaining + travelBonus));
    const path = pathToTarget.slice(0, reachableSteps);
    const endsTurnAfterTravel = canReachDestination
      ? state.player.timeRemaining - cost <= 0
      : reachableSteps > 0;

    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];

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

    // Dispatch after the animation so partial travel visually matches where the turn ends.
    const total = setTimeout(() => {
      travel(id);
      setAnimLocation(null);
      setIsMoving(false);
      if (!endsTurnAfterTravel) setShowPanel(true);
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
      case 'blacks_market':  return <BlacksMarketContent state={state} actions={actions} />;
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
    <div
      className="relative w-full flex-1 lg:flex-none overflow-hidden select-none lg:h-[min(720px,_calc(100dvh-2rem))] xl:h-[min(780px,_calc(100dvh-2rem))] lg:rounded-[24px]"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF5EB 60%, #F1E7D3 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--sh-3)',
      }}
    >
      <BoardErrorBoundary>
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.6), transparent 40%)' }} />

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

      {/* End week hint toast */}
      {endWeekHint && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-indigo-700/90 text-white font-black text-sm px-4 py-2 rounded-full shadow-xl"
            style={{ animation: 'weekFlash 2s ease-out forwards' }}>
            🏠 Go home first to end the week!
          </div>
        </div>
      )}

      {/* Padded map area — keeps buildings away from container edges and
          above the measured HUD height (audit B4/M10) */}
      <div className="elg-map-area">
        {/* Map background */}
        <MapBackground />

        {/* Economy pill — top-center */}
        {(() => {
          const { economy, week, economyTimer } = state;
          const pillClass =
            economy === 'Boom' ? 'ds-pill ds-pill-money'
            : economy === 'Depression' ? 'ds-pill ds-pill-debt'
            : 'ds-pill ds-pill-dark';
          const icon = economy === 'Boom' ? '📈' : economy === 'Depression' ? '📉' : '📊';
          return (
            <div
              className={`absolute top-2 left-1/2 -translate-x-1/2 ${pillClass} z-10 pointer-events-none font-display`}
              style={{ fontSize: 10 }}
            >
              <span>{icon}</span>
              <span>{economy}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Wk {week}</span>
              {economyTimer <= 2 ? (
                <span className="ml-1 px-1 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }}>shift in {economyTimer}wk</span>
              ) : economyTimer <= 4 ? (
                <span style={{ opacity: 0.6 }} className="ml-1">{economyTimer}wk left</span>
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
            const travelHours = player.currentLocation !== id
              ? effectiveTravelCost(player.currentLocation, id, player.inventory)
              : null;
            const config = id === 'home'
              ? { ...LOCATIONS_CONFIG.home, emoji: homeEmoji(player.housing), label: player.housing?.homeType === 'luxury_condo' ? 'Condo' : player.housing?.homeType === 'apartment' ? 'Apartment' : 'Home' }
              : LOCATIONS_CONFIG[id];
            const isJoneses = state.jones?.currentLocation === id;
            return (
              <ShopNode
                key={id}
                id={id}
                config={config}
                isCurrent={state.player.currentLocation === id}
                isTraveling={isMoving}
                onClick={() => handleTravel(id)}
                isWarn={!!warningBadge}
                badge={warningBadge?.icon}
                travelHours={travelHours}
                isJoneses={isJoneses}
                isJob={getJobLocation(player.job) === id}
                promoReady={isPromoReady}
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
          accent="var(--debt)"
          suffix="Joneses"
          zIndex={9}
        />

        {/* Active player token only — hot-seat privacy (GDD §15): other players'
            positions stay hidden until it's their turn. */}
        {state.player && (
          <PlayerToken
            key={state.player.name}
            locationId={animLocation ? animLocation : state.player.currentLocation}
            isMoving={isMoving}
            label={state.player.name}
            emoji={state.player.emoji}
            accent={state.player.color || 'var(--brand)'}
            suffix={state.players?.length > 1 ? state.player.name : undefined}
            zIndex={11}
          />
        )}

      </div>

      {/* Jones + Tips + Bell — icon row bottom-right */}
      <JonesSidebar jones={state.jones} player={state.player} />
      <RingTips player={state.player} week={state.week} />
      <NotificationFeed history={state.history} onOpenLog={() => setShowLog(true)} />

      {/* Location panel — full-width bottom sheet on phones (audit M6),
          centered overlay inside the ring at ≥640px so the 12 shops stay
          visible around the perimeter. */}
      {showPanel && !isMoving && !state.awaitingEndWeek && !showHandoff && (() => {
        const { player } = state;
        const homeTarget = homeBase(player);
        const isAtHomeBase = ['home', 'leasing_office'].includes(player.currentLocation);
        const effectiveStepsToHome = effectiveTravelCost(player.currentLocation, homeTarget, player.inventory);
        const isStranded = !isAtHomeBase && player.timeRemaining < effectiveStepsToHome && !state.awaitingEndWeek;
        const fare = rideFare(player.currentLocation, homeTarget);
        return (
          <div className="elg-panel-wrap z-20 pointer-events-none">
            <div className="elg-panel-box pointer-events-auto">
              <LocationPanel
                locationId={player.currentLocation}
                player={player}
                onClose={() => setShowPanel(false)}
                isStranded={isStranded}
                rideFare={fare}
                onRideHome={rideHome}
                embedded
              >
                {renderPanelContent(player.currentLocation)}
              </LocationPanel>
            </div>
          </div>
        );
      })()}

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

      {/* Hot-seat hand-off screen — opaque cover so the next player doesn't see
          the previous player's board/HUD until they tap Ready (GDD §15). */}
      {showHandoff && state.player && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Pass the device to ${state.player.name}`}
          style={{ background: 'linear-gradient(180deg,#1A1816 0%,#2A2620 100%)' }}
        >
          <div className="text-center">
            <div className="text-[11px] font-display font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--muted-2)' }}>
              Pass the device
            </div>
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-4"
              style={{ background: '#fff', border: `3px solid ${state.player.color || 'var(--brand)'}`, boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
            >
              {state.player.emoji}
            </div>
            <div className="font-display font-bold text-2xl text-white mb-1">{state.player.name}</div>
            <div className="text-sm mb-6" style={{ color: 'var(--muted-2)' }}>
              Your turn · Week {state.week} · {(state.activePlayerIndex ?? 0) + 1}/{state.players.length}
            </div>
            <button
              autoFocus
              onClick={() => setShowHandoff(false)}
              className="ds-btn ds-btn-primary !px-8 !py-3 !text-base"
              style={{ borderColor: state.player.color, background: state.player.color }}
            >
              I'm ready →
            </button>
          </div>
        </div>
      )}

      {/* Modals (layered, highest z-index last) */}
      {showInventory && (
        <InventoryModal inventory={state.player.inventory} economy={state.economy} onClose={() => setShowInventory(false)} />
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
          playerCount={state.players.length}
          onClose={dismissHungerWarning}
        />
      )}
      {!state.weekSummary && !state.pendingEvent && !state.players?.some(p => p.hungerWarning) && state.players?.some(p => p.clothingWarning) && (
        <ClothingWarningModal
          warning={state.players.find(p => p.clothingWarning).clothingWarning}
          playerCount={state.players.length}
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
      </BoardErrorBoundary>
    </div>
  );
};

export default Board;
