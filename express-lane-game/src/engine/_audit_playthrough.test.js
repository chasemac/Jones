/**
 * Fuzz / invariant regression test.
 *
 * Drives the real reducer through many seeded multiplayer playthroughs (1–4
 * players, 16+ weeks each) and asserts core invariants after EVERY action:
 * stat bounds, non-negative money/savings/debt, time bounds, turn order &
 * coverage, active-player attribution on warnings/events, and that state stays
 * JSON-serializable (localStorage persistence). Seeded RNG => deterministic.
 */
import { describe, it, expect } from 'vitest';
import { gameReducer } from './gameReducer';
import jobsData from '../data/jobs.json';
import itemsData from '../data/items.json';
import educationData from '../data/education.json';
import housingData from '../data/housing.json';

// seedable RNG so runs are reproducible and we can sweep seeds
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NUM = (v) => typeof v === 'number' && Number.isFinite(v);
const inRange = (v, lo, hi) => NUM(v) && v >= lo - 1e-9 && v <= hi + 1e-9;

function checkInvariants(state, anomalies, ctx) {
  const note = (msg) => anomalies.push(`[${ctx}] ${msg}`);
  if (!state || !Array.isArray(state.players)) { note('state/players missing'); return; }
  const ended = state.gameStatus === 'won' || state.gameStatus === 'lost';
  if (!ended && !inRange(state.activePlayerIndex, 0, state.players.length - 1))
    note(`activePlayerIndex out of range: ${state.activePlayerIndex}`);
  if (!NUM(state.week) || state.week < 1) note(`bad week ${state.week}`);
  state.players.forEach((p, i) => {
    if (!inRange(p.happiness, 0, 100)) note(`P${i} happiness=${p.happiness}`);
    if (!inRange(p.dependability, 0, 100)) note(`P${i} dependability=${p.dependability}`);
    if (!inRange(p.relaxation, 0, 100)) note(`P${i} relaxation=${p.relaxation}`);
    if (!inRange(p.hunger, 0, 100)) note(`P${i} hunger=${p.hunger}`);
    if (!NUM(p.money) || p.money < 0) note(`P${i} money=${p.money}`);
    if (!NUM(p.savings) || p.savings < 0) note(`P${i} savings=${p.savings}`);
    if (!NUM(p.debt) || p.debt < 0) note(`P${i} debt=${p.debt}`);
    if (p.debt > 5000 + 260) note(`P${i} debt exceeds cap+interest: ${p.debt}`);
    if (!NUM(p.timeRemaining) || p.timeRemaining < 0) note(`P${i} timeRemaining=${p.timeRemaining}`);
    if (p.timeRemaining > p.maxTime) note(`P${i} timeRemaining ${p.timeRemaining} > maxTime ${p.maxTime}`);
    if (!NUM(p.maxTime) || p.maxTime < 20) note(`P${i} maxTime=${p.maxTime}`);
    Object.entries(p.portfolio || {}).forEach(([sym, q]) => {
      if (!NUM(q) || q < 0) note(`P${i} portfolio ${sym}=${q}`);
    });
    if (!p.color) note(`P${i} missing color`);
    if (!p.emoji) note(`P${i} missing emoji`);
  });
  try {
    const round = JSON.parse(JSON.stringify(state));
    if (round.players.length !== state.players.length) note('persistence: player count drift');
  } catch (e) {
    note(`persistence: not serializable (${e.message})`);
  }
}

// drain post-week modals the way the UI would, asserting one-warning-at-a-time
function drainModals(state, dispatch, anomalies, ctx) {
  let guard = 0;
  while (guard++ < 30) {
    const before = state;
    if (state.pendingEvent) {
      if (state.players.length > 1 && !state.pendingEvent.playerName)
        anomalies.push(`[${ctx}] multiplayer event has no playerName attribution`);
      state = dispatch(state, { type: 'DISMISS_EVENT' });
    } else if (state.players.some(p => p.hungerWarning)) {
      const n = state.players.filter(p => p.hungerWarning).length;
      const w = state.players.find(p => p.hungerWarning).hungerWarning;
      if (!w.playerName) anomalies.push(`[${ctx}] hungerWarning missing playerName`);
      state = dispatch(state, { type: 'DISMISS_HUNGER_WARNING' });
      const after = state.players.filter(p => p.hungerWarning).length;
      if (after !== n - 1) anomalies.push(`[${ctx}] DISMISS_HUNGER_WARNING cleared ${n - after} (expected 1)`);
    } else if (state.players.some(p => p.clothingWarning)) {
      const n = state.players.filter(p => p.clothingWarning).length;
      state = dispatch(state, { type: 'DISMISS_CLOTHING_WARNING' });
      const after = state.players.filter(p => p.clothingWarning).length;
      if (after !== n - 1) anomalies.push(`[${ctx}] DISMISS_CLOTHING_WARNING cleared ${n - after} (expected 1)`);
    } else if (state.weekSummary) {
      state = dispatch(state, { type: 'DISMISS_WEEK_SUMMARY' });
    } else break;
    if (state === before) { anomalies.push(`[${ctx}] modal dismiss was a no-op (stuck)`); break; }
  }
  return state;
}

function entryJobAt(loc) {
  return jobsData.find(j => j.location === loc && (!j.requirements || Object.keys(j.requirements).length === 0));
}
const food = itemsData.find(i => i.type === 'food') || { id: 'snack', name: 'Snack', type: 'food', cost: 12, hungerRestore: 30 };
const groceries = itemsData.find(i => i.id === 'groceries');
const businessCasual = itemsData.find(i => i.id === 'business_casual');
const bike = itemsData.find(i => i.id === 'bicycle');

function playGame({ seed, players, weeks, anomalies }) {
  const rng = mulberry32(seed);
  const realRandom = Math.random;
  Math.random = rng;
  const tag = `seed${seed}/p${players}`;
  let actionCount = 0;
  const dispatch = (s, a) => {
    let next;
    try { next = gameReducer(s, a); }
    catch (e) { anomalies.push(`[${tag}] reducer THREW on ${a.type}: ${e.message}`); return s; }
    actionCount++;
    checkInvariants(next, anomalies, `${tag}/${a.type}`);
    return next;
  };
  try {
    const emojis = ['😎', '🤠', '🥸', '🧑‍🚀'].slice(0, players);
    let state = gameReducer(undefined, { type: 'INIT_GAME', difficulty: 'normal', playerCount: players, playerEmojis: emojis });
    state = dispatch(state, { type: 'START_GAME' });
    if (state.gameStatus !== 'playing') anomalies.push(`[${tag}] START_GAME did not set playing`);

    let safety = 0;
    while (state.week <= weeks && state.gameStatus === 'playing' && safety++ < 4000) {
      const startWeek = state.week;
      const turnsThisWeek = new Set();
      let turnGuard = 0;
      while (state.week === startWeek && state.gameStatus === 'playing' && turnGuard++ < 200) {
        turnsThisWeek.add(state.activePlayerIndex);
        const p = state.players[state.activePlayerIndex];
        if (!p.hasChosenHousing && rng() < 0.8) {
          state = dispatch(state, { type: 'RENT_APARTMENT', housing: housingData[Math.floor(rng() * 2)] });
        }
        const locs = ['coffee_shop', 'quick_eats', 'megamart', 'city_college', 'neobank', 'public_library', 'grocery_store', 'tech_store', 'home'];
        state = dispatch(state, { type: 'TRAVEL', locationId: locs[Math.floor(rng() * locs.length)] });
        const cur = state.players[state.activePlayerIndex];
        if (!cur.job && !state.awaitingEndWeek) {
          const j = entryJobAt(cur.currentLocation) || entryJobAt('coffee_shop');
          if (j) state = dispatch(state, { type: 'APPLY_FOR_JOB', job: j });
        }
        const roll = rng();
        const c2 = state.players[state.activePlayerIndex];
        if (!state.awaitingEndWeek) {
          if (c2.job && roll < 0.45) state = dispatch(state, { type: 'WORK', hours: 8, overtime: rng() < 0.2 });
          else if (roll < 0.6) state = dispatch(state, { type: 'BUY_ITEM', item: food });
          else if (roll < 0.7 && groceries) state = dispatch(state, { type: 'BUY_ITEM', item: groceries });
          else if (roll < 0.8) state = dispatch(state, { type: 'BANK_TRANSACTION', transactionType: 'deposit', amount: 50 });
          else if (roll < 0.86) state = dispatch(state, { type: 'BANK_TRANSACTION', transactionType: 'borrow', amount: 300 });
          else if (roll < 0.92 && !c2.currentCourse) state = dispatch(state, { type: 'ENROLL', course: educationData.find(e => !e.requirements) });
          else if (roll < 0.97 && c2.currentCourse && c2.timeRemaining >= 10) state = dispatch(state, { type: 'STUDY' });
          else state = dispatch(state, { type: 'BUY_STOCK', symbol: Object.keys(state.market)[0], quantity: 1 });
        }
        if (rng() < 0.15 && businessCasual) state = dispatch(state, { type: 'BUY_ITEM', item: businessCasual });
        if (rng() < 0.1 && bike) state = dispatch(state, { type: 'BUY_ITEM', item: bike });
        const c3 = state.players[state.activePlayerIndex];
        const ownedSym = Object.keys(c3.portfolio || {}).find(s => c3.portfolio[s] > 0);
        if (ownedSym && rng() < 0.2) state = dispatch(state, { type: 'SELL_STOCK', symbol: ownedSym, quantity: 1 });
        state = dispatch(state, { type: 'END_WEEK' });
        if (state.week !== startWeek) state = drainModals(state, dispatch, anomalies, `${tag}/wk${startWeek}`);
      }
      if (state.gameStatus === 'playing') {
        if (turnsThisWeek.size !== players)
          anomalies.push(`[${tag}] wk${startWeek}: ${turnsThisWeek.size}/${players} players got a turn`);
        if (state.activePlayerIndex !== 0)
          anomalies.push(`[${tag}] wk${startWeek}: after processing activePlayerIndex=${state.activePlayerIndex} (expected 0)`);
        if (state.players.some(p => p.weekDone))
          anomalies.push(`[${tag}] wk${startWeek}: weekDone not reset after processing`);
      }
    }
    return { state, actionCount, weeksReached: state.week };
  } finally {
    Math.random = realRandom;
  }
}

describe('AUDIT: multiplayer playthrough invariants', () => {
  it('plays many seeded multiplayer games without breaking invariants', () => {
    const anomalies = [];
    let totalActions = 0, maxWeek = 0;
    for (let players = 1; players <= 4; players++) {
      for (let seed = 1; seed <= 25; seed++) {
        const r = playGame({ seed, players, weeks: 16, anomalies });
        totalActions += r.actionCount;
        maxWeek = Math.max(maxWeek, r.weeksReached);
      }
    }
    const unique = [...new Set(anomalies)];
    expect(totalActions).toBeGreaterThan(5000);
    expect(maxWeek).toBeGreaterThanOrEqual(16);
    expect(unique, unique.join('\n')).toHaveLength(0);
  });
});
