import React, { useEffect } from 'react';
import { LOCATIONS_CONFIG } from '../../engine/boardModel';
import { LOCATION_ORDER } from '../../engine/constants';

// ─── Ring geometry ─────────────────────────────────────────────────────────
// 12 shops at 30° intervals, clockwise from top. Used by both desktop circle
// (rx=ry=42) and landscape ellipse (rx=42, ry=38). Percentages.
// eslint-disable-next-line react-refresh/only-export-components
export const ringPosition = (locationId, { ellipse = false } = {}) => {
  const i = LOCATION_ORDER.indexOf(locationId);
  if (i < 0) return { x: 50, y: 50 };
  const theta = (i * 30) * Math.PI / 180;
  const rx = 42;
  const ry = ellipse ? 38 : 42;
  return {
    x: 50 + rx * Math.sin(theta),
    y: 50 - ry * Math.cos(theta),
  };
};

// Map building colors (from LOCATIONS_CONFIG) to design-system accent dots.
const ACCENT_FOR = {
  leasing_office: '#7C5CFF',
  quick_eats: '#FF6B4A',
  public_library: '#10A876',
  trendsetters: '#EC4899',
  coffee_shop: '#92400E',
  megamart: '#E4413A',
  blacks_market: '#7C5CFF',
  grocery_store: '#10A876',
  city_college: '#3B82F6',
  tech_store: '#475569',
  home: '#7C5CFF',
  neobank: '#6366F1',
};

// ─── Shop card on the ring (used by Board) ─────────────────────────────────
export const ShopNode = ({
  id, config, isCurrent, isTraveling, isJoneses, isWarn,
  badge, isJob, promoReady,
  onClick, travelHours, sizeClass = 'w-[72px] h-[72px] sm:w-[88px] sm:h-[88px]',
}) => {
  const accent = ACCENT_FOR[id] || config.color;
  const warnLabel = isCurrent ? '' : isWarn ? ' — needs attention' : promoReady ? ' — promotion available' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isTraveling}
      aria-label={`${config.label}${isCurrent ? ' — current location' : travelHours != null ? ` — travel ${travelHours}h` : ''}${warnLabel}`}
      className={`ds-shop ${sizeClass} ${isCurrent ? 'current' : ''} ${isJoneses ? 'joneses' : ''} ${isWarn ? 'warn' : ''} ${isTraveling ? 'pointer-events-none opacity-60' : ''}`}
      style={{
        // clamp keeps pole/side shops fully inside the safe area on narrow
        // phones instead of clipping at the viewport edge (audit B4)
        left: `clamp(38px, ${config.pos.x}%, calc(100% - 38px))`,
        top: `clamp(38px, ${config.pos.y}%, calc(100% - 38px))`,
        ...(isJob && !isCurrent ? { boxShadow: `0 0 0 2px ${accent}, var(--sh-1)` } : null),
      }}
      data-shop-id={id}
    >
      {/* accent dot top-right */}
      <span
        aria-hidden="true"
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
        style={{ background: accent, boxShadow: '0 0 0 2px var(--surface)' }}
      />
      {isJoneses && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-display font-bold tracking-wider uppercase whitespace-nowrap"
          style={{ background: 'var(--accent-strong)', color: '#fff' }}
        >
          Joneses
        </span>
      )}
      {isWarn && !isCurrent && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[12px]"
          style={{ background: 'var(--warn)', color: 'var(--ink)', boxShadow: '0 2px 6px rgba(244,184,42,0.5)' }}
        >{badge || '!'}</span>
      )}
      {promoReady && !isCurrent && !isWarn && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center font-display font-bold text-[11px] animate-pulse"
          style={{ background: 'var(--money)', color: '#fff', boxShadow: '0 2px 6px rgba(16,168,118,0.5)' }}
        >⬆</span>
      )}
      <span className="text-[22px] sm:text-[26px] leading-none" aria-hidden="true">{config.emoji}</span>
      <span className={`text-[9px] sm:text-[10px] font-semibold leading-tight ${isCurrent ? 'text-white/90' : ''}`}>{config.label}</span>
      {!isCurrent && travelHours != null && (
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-[2px] rounded-full font-display font-bold text-[9px] tracking-wide whitespace-nowrap"
          style={{ background: 'var(--ink)', color: '#fff' }}
        >
          {travelHours}h
        </span>
      )}
    </button>
  );
};

// ─── Floating "+$" overlay ────────────────────────────────────────────────
export const FloatingMoney = ({ amount, onDone }) => {
  const isPositive = amount >= 0;
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className="absolute pointer-events-none font-display font-bold text-lg z-50 select-none"
      style={{
        left: '50%',
        bottom: '54%',
        transform: 'translateX(-50%)',
        color: isPositive ? 'var(--money-ink)' : 'var(--debt-ink)',
        textShadow: '0 2px 4px rgba(255,255,255,0.6)',
        animation: 'ds-float-up 1.2s ease-out forwards',
      }}
    >
      {isPositive ? '+' : ''}{amount < 0 ? '-' : ''}${Math.abs(amount)}
    </div>
  );
};

// ─── Player token (current player only) ───────────────────────────────────
// We render the active player and the Joneses near their shop. Other players
// are intentionally hidden (GDD §15 hot-seat privacy).
export const PlayerToken = ({ locationId, isMoving, label, emoji, accent = 'var(--brand)', zIndex = 10, offsetY = 12, suffix }) => {
  const config = LOCATIONS_CONFIG[locationId];
  if (!config) return null;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        // clamp keeps tokens (esp. the Joneses at the ring's bottom pole)
        // inside the visible map bounds (audit UX11)
        left: `clamp(24px, ${config.pos.x}%, calc(100% - 24px))`,
        top: `clamp(24px, ${Math.min(96, config.pos.y + offsetY * 0.6)}%, calc(100% - 26px))`,
        transform: 'translate(-50%, -50%)',
        zIndex,
        transition: 'left 0.6s cubic-bezier(0.4,0,0.2,1), top 0.6s cubic-bezier(0.4,0,0.2,1)',
        animation: isMoving ? 'ds-token-bounce 0.3s ease-in-out infinite alternate' : 'none',
      }}
      title={label}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
        style={{
          background: '#fff',
          border: `2px solid ${accent}`,
          boxShadow: '0 4px 12px rgba(26,24,22,0.18)',
        }}
      >
        {emoji}
      </div>
      {suffix && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full font-display font-bold text-[10px] tracking-wide whitespace-nowrap"
          style={{ background: accent === 'var(--debt)' ? 'var(--debt-ink)' : accent, color: '#fff' }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
};

// ─── Background — soft circle for desktop, ellipse for landscape ──────────
export const MapBackground = ({ ellipse = false }) => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true"
       viewBox="0 0 100 100" preserveAspectRatio="none">
    {/* dashed travel ring under the shops */}
    {ellipse ? (
      <ellipse cx="50" cy="50" rx="42" ry="38"
               fill="none"
               stroke="rgba(124,92,255,0.32)"
               strokeWidth="0.6"
               strokeDasharray="1.6 2.2" />
    ) : (
      <circle cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(124,92,255,0.18)"
              strokeWidth="0.5"
              strokeDasharray="1 1.6" />
    )}
  </svg>
);

// ─── LocationPanel — wraps a location's content panel in a card with a
// header that includes the location emoji/name, an optional "Stranded" alert
// banner, and a Close button.
export const LocationPanel = ({
  locationId, player, children, onClose,
  isStranded, rideFare, onRideHome,
  embedded = false, // true when rendered inside the central board stage
}) => {
  const config = LOCATIONS_CONFIG[locationId];
  if (!config) return null;
  const isAtHome = locationId === 'home' || locationId === 'leasing_office';
  const isWorkplace = player?.job?.location === locationId;
  return (
    <div className={`ds-card flex flex-col overflow-hidden ${embedded ? 'w-full h-full' : 'w-full max-w-3xl max-h-[88vh]'}`}>
      {isStranded && !isAtHome && (
        <div className="flex items-center justify-between gap-3 px-4 py-2"
             style={{ background: 'rgba(244,184,42,0.22)', borderBottom: '1px solid rgba(244,184,42,0.5)' }}>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--warn-ink)' }}>
            🚖 Stranded! Only {player.timeRemaining}h left.
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRideHome} className="ds-btn ds-btn-warn !py-1.5 !px-3 !text-[11px]">🚗 Ride home · ${rideFare}</button>
            <button onClick={onClose} className="ds-btn-ghost text-[11px] underline">walk it →</button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 px-5 py-3.5"
           style={{ background: 'linear-gradient(180deg,#FFFFFF 0%,#FBF7EF 100%)', borderBottom: '1px solid var(--border)' }}>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
             style={{ background: 'linear-gradient(135deg,#FDEDE7,#FFE4D4)', border: '1px solid rgba(255,107,74,0.3)' }}>
          {config.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-[18px] leading-tight text-[color:var(--ink)] truncate">
            {config.label}
          </h2>
          <div className="text-[11px] text-[color:var(--muted)] truncate">
            {isWorkplace ? 'Your workplace · press W to clock in' : 'Tap an action to spend time or money'}
          </div>
        </div>
        {isWorkplace && (
          <span className="ds-pill ds-pill-money !text-[10px]" title="Press W to work">YOUR JOB · W</span>
        )}
        <button
          onClick={onClose}
          aria-label="Return to map"
          className="ds-btn ds-btn-dark !py-2 !px-3 !text-[12px]"
        >
          ← Map
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4"
           style={{ background: 'linear-gradient(180deg,#FFFFFF,#FBF7EF)' }}>
        {children}
      </div>
    </div>
  );
};
