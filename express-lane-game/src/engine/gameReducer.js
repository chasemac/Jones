import {
  DIFFICULTY_PRESETS,
  ECONOMY_STATES,
  ECONOMY_WAGE_MULTIPLIER,
  meetsEducation,
  LOCATION_ORDER,
  JONES_CAREER_TRACK,
  JONES_EDUCATION_TRACK,
  travelCost,
  calculateDeposit,
  LOCATION_EMPLOYER_NAME,
} from './constants';
import eventsData from '../data/events.json';
import stocksData from '../data/stocks.json';

// ─── Player factory ───────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#facc15', '#34d399', '#f87171', '#818cf8']; // yellow, green, red, purple
const PLAYER_EMOJIS = ['😎', '🤠', '🥸', '🧑‍🚀'];

export const buildPlayer = (index, startingMoney, emoji) => ({
  name: `Player ${index + 1}`,
  color: PLAYER_COLORS[index],
  emoji: emoji || PLAYER_EMOJIS[index],
  money: startingMoney,
  happiness: 50,
  dependability: 50,  // 0-100; career goal metric, decays -3/week, +5 per shift worked
  relaxation: 50,     // 0-100; decays -5/week, hitting 0 forces a Doctor visit
  maxTime: 60,
  maxTimeReduction: 0,
  timeRemaining: 60,
  education: 'High School',
  job: null,
  housing: { id: 'shared_apt', title: 'Shared Apartment', rent: 200, happiness: 0, security: 'Low' },
  hasChosenHousing: false, // flips true after player explicitly picks housing for the first time
  currentLocation: 'leasing_office',
  savings: 0,
  debt: 0,
  hunger: 0,
  portfolio: {},
  currentCourse: null,
  inventory: [],
  weekDone: false, // has this player ended their turn this week?
  ateFoodThisWeek: false, // true if any food (immediate or plan) was purchased this week
});

// ─── Initial State Builder ────────────────────────────────────────────────────
export const buildInitialState = (difficulty = 'normal', playerCount = 1, playerEmojis = null) => {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const market = {};
  stocksData.forEach(s => { market[s.symbol] = s.basePrice; });

  const players = Array.from({ length: playerCount }, (_, i) => buildPlayer(i, preset.startingMoney, playerEmojis?.[i]));

  return {
    gameStatus: 'start',
    difficulty,
    playerCount,
    week: 1,
    economy: 'Normal',
    economyTimer: 5,
    activePlayerIndex: 0,
    players,
    jones: {
      money: preset.startingMoney + 4000,
      happiness: 55,
      education: 'High School',
      jobIndex: 0,
      jobTitle: JONES_CAREER_TRACK[0].title,
      jobWage: JONES_CAREER_TRACK[0].wage,
      netWorth: preset.startingMoney + 4000,
      currentLocation: 'coffee_shop',
      weeksAtJob: 0,
      rent: 400,
    },
    history: [],
    market,
    pendingEvent: null,
    weekStartSnapshot: null, // populated at start of each week for net-worth delta calculation
  };
};

// ─── Helpers for multiplayer state mutation ───────────────────────────────────
// Active player shortcut (read-only helper)
const activePlayer = (state) => state.players[state.activePlayerIndex];

// Returns state with players[activePlayerIndex] replaced by fn(currentPlayer)
const updateActivePlayer = (state, fn) => {
  const idx = state.activePlayerIndex;
  const players = state.players.map((p, i) => i === idx ? fn({ ...p }) : p);
  return { ...state, players };
};

// ─── Helper: add log entry ─────────────────────────────────────────────────────
const log = (state, message) => ({
  ...state,
  history: [`Week ${state.week}: ${message}`, ...state.history].slice(0, 100),
});

// ─── Win / Lose Check ─────────────────────────────────────────────────────────
const checkEndConditions = (state) => {
  const { difficulty } = state;
  const goals = DIFFICULTY_PRESETS[difficulty].goals;

  // Any player wins → game won (first to hit all 4 goals)
  for (const p of state.players) {
    const netWorth = p.money + p.savings - p.debt;
    if (
      netWorth >= goals.wealth &&
      p.happiness >= goals.happiness &&
      meetsEducation(p.education, goals.education) &&
      p.dependability >= goals.careerDependability
    ) {
      return { ...state, gameStatus: 'won', winner: p.name };
    }
  }

  // All players bottomed out → lost (happiness at 0 AND broke)
  if (state.players.every(p => p.happiness <= 0 && p.money <= 0 && p.savings <= 0)) {
    return { ...state, gameStatus: 'lost' };
  }
  return state;
};

// ─── Auto end-week if time hits 0 ─────────────────────────────────────────────
// Instead of ending the week immediately, set a flag so the UI can animate
// the player walking home first, then dispatch END_WEEK.
const autoEndIfNeeded = (s) =>
  activePlayer(s).timeRemaining <= 0 ? { ...s, awaitingEndWeek: true } : s;

// ─── Part-time shift earnings helper ──────────────────────────────────────────
const calcShiftEarnings = (wage, hours, economy) =>
  Math.floor(wage * hours * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));

// ─── Reducer ──────────────────────────────────────────────────────────────────
export const gameReducer = (state, action) => {
  switch (action.type) {

    // ── Game lifecycle ────────────────────────────────────────────────────────
    case 'INIT_GAME': {
      const s = buildInitialState(action.difficulty, action.playerCount || 1, action.playerEmojis);
      return { ...s, weekStartSnapshot: s.players.map(p => ({ name: p.name, money: p.money, savings: p.savings, debt: p.debt })) };
    }

    case 'START_GAME': {
      // Snapshot player state at week start for accurate weekly net-worth delta
      return { ...state, gameStatus: 'playing', weekStartSnapshot: state.players.map(p => ({ name: p.name, money: p.money, savings: p.savings, debt: p.debt })) };
    }

    // ── Travel ────────────────────────────────────────────────────────────────
    case 'TRAVEL': {
      const { locationId } = action;
      const player = activePlayer(state);
      if (player.currentLocation === locationId) return state;

      const cost = travelCost(player.currentLocation, locationId);
      const travelBonus = player.inventory.reduce((max, item) => Math.max(max, item.travelBonus || 0), 0);
      const effectiveCost = Math.max(1, cost - travelBonus);
      if (player.timeRemaining < effectiveCost) {
        return log(state, `Not enough time to travel there (need ${effectiveCost}h, have ${player.timeRemaining}h).`);
      }

      let s = state;

      // Wild Willy: deterred by a suit
      const hasSuit = player.inventory.some(i => i.id === 'suit');

      // 30% chance when leaving Black's Market in Low-security housing, 10% in Medium
      const blacksChance = player.housing.security === 'Low' ? 0.3 : player.housing.security === 'Medium' ? 0.1 : 0;
      if (player.currentLocation === 'blacks_market' && blacksChance > 0 && Math.random() < blacksChance) {
        if (hasSuit) {
          s = log(s, `👹 Wild Willy saw your suit and backed off.`);
        } else {
          const stolen = Math.floor(player.money * 0.5);
          if (stolen > 0) {
            s = log(s, `👹 WILD WILLY stole $${stolen} from you! -5 happiness.`);
            s = updateActivePlayer(s, p => ({ ...p, money: p.money - stolen, happiness: Math.max(0, p.happiness - 5) }));
          } else {
            s = log(s, `👹 Wild Willy tried to rob you, but you're broke!`);
          }
        }
      }

      // 20% chance when leaving NeoBank with >$500 in Low-security housing, 5% in Medium
      const bankChance = player.housing.security === 'Low' ? 0.2 : player.housing.security === 'Medium' ? 0.05 : 0;
      if (player.currentLocation === 'neobank' && bankChance > 0 && player.money > 500 && Math.random() < bankChance) {
        if (hasSuit) {
          s = log(s, `👹 Wild Willy clocked your suit and kept walking.`);
        } else {
          const stolen = Math.floor(activePlayer(s).money * 0.3);
          s = log(s, `👹 WILD WILLY ambushed you leaving the bank! Stole $${stolen}! -5 happiness.`);
          s = updateActivePlayer(s, p => ({ ...p, money: p.money - stolen, happiness: Math.max(0, p.happiness - 5) }));
        }
      }

      const saved = cost - effectiveCost;
      const newTime = activePlayer(s).timeRemaining - effectiveCost;
      s = updateActivePlayer(s, p => ({ ...p, currentLocation: locationId, timeRemaining: newTime }));
      if (saved > 0) s = log(s, `Traveled to ${locationId.replace(/_/g, ' ')} (${effectiveCost}h — saved ${saved}h with vehicle).`);
      else if (effectiveCost > 1) s = log(s, `Traveled to ${locationId.replace(/_/g, ' ')} (${effectiveCost}h). ${newTime}h remaining.`);

      if (newTime <= 0) return { ...s, awaitingEndWeek: true };
      return s;
    }

    // ── Work current job ──────────────────────────────────────────────────────
    case 'WORK': {
      const { hours: shiftHours = 8, overtime = false } = action;
      const player = activePlayer(state);
      if (!player.job) return log(state, "You don't have a job!");
      const effectiveHours = overtime ? 12 : shiftHours;
      if (player.timeRemaining < effectiveHours) return log(state, `Not enough time for a ${effectiveHours}h shift.`);

      const wageMultiplier = overtime ? 1.5 : 1.0;
      const earnings = calcShiftEarnings(player.job.wage * wageMultiplier, effectiveHours, state.economy);
      const newWeeksWorked = (player.job.weeksWorked || 0) + 1;
      const depBonus = overtime ? 7 : 5;
      // Loyalty bonus: every 5 weeks at the same job earns extra
      const loyaltyBonus = newWeeksWorked > 0 && newWeeksWorked % 5 === 0 ? 3 : 0;
      const happinessEffect = overtime ? -10 : 0;

      const loyaltyMsg = loyaltyBonus > 0 ? ` Loyalty bonus: +${loyaltyBonus} dep!` : '';
      const logMsg = overtime
        ? `${player.name} worked overtime (12h) as ${player.job.title}. Earned $${earnings} (1.5x). -10 happiness.${loyaltyMsg}`
        : `${player.name} worked as ${player.job.title}. Earned $${earnings}.${loyaltyMsg}`;
      let s = log(state, logMsg);
      s = updateActivePlayer(s, p => ({
        ...p,
        money: p.money + earnings,
        timeRemaining: p.timeRemaining - effectiveHours,
        job: { ...p.job, weeksWorked: newWeeksWorked },
        dependability: Math.min(100, p.dependability + depBonus + loyaltyBonus),
        happiness: Math.max(0, Math.min(100, p.happiness + happinessEffect)),
      }));
      return autoEndIfNeeded(s);
    }

    // ── Part-time work (4h) ───────────────────────────────────────────────────
    case 'PART_TIME_WORK': {
      const player = activePlayer(state);
      if (!player.job) return log(state, "You don't have a job!");
      if (player.timeRemaining < 4) return log(state, "Not enough time for a 4h shift.");

      const earnings = calcShiftEarnings(player.job.wage, 4, state.economy);
      let s = log(state, `${player.name} worked a 4h shift as ${player.job.title}. Earned $${earnings}. +1 happiness.`);
      s = updateActivePlayer(s, p => ({
        ...p,
        money: p.money + earnings,
        timeRemaining: p.timeRemaining - 4,
        dependability: Math.min(100, p.dependability + 2),
        happiness: Math.min(100, p.happiness + 1),
      }));
      return autoEndIfNeeded(s);
    }

    // ── Gig work (no job required) ────────────────────────────────────────────
    case 'GIG_WORK': {
      const player = activePlayer(state);
      if (!player.inventory.some(i => i.id === 'smartphone')) return log(state, "You need a smartphone to do gig work!");
      if (player.timeRemaining < 4) return log(state, "Not enough time for a gig shift.");

      const earnings = Math.floor(60 * (ECONOMY_WAGE_MULTIPLIER[state.economy] || 1));
      let s = log(state, `Completed gig delivery. Earned $${earnings}. +2 happiness.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money + earnings, timeRemaining: p.timeRemaining - 4, dependability: Math.min(100, p.dependability + 1), happiness: Math.min(100, p.happiness + 2) }));
      return autoEndIfNeeded(s);
    }

    // ── Apply for job ─────────────────────────────────────────────────────────
    case 'APPLY_FOR_JOB': {
      const { job, isPromotion } = action;
      const player = activePlayer(state);

      // Promotions are earned through work — no time cost, no rejection roll
      if (!isPromotion) {
        // Cost 2 hours to apply
        if (player.timeRemaining < 2) {
          return { ...log(state, `Not enough time to apply.`), lastJobResult: { success: false, message: `Not enough time left to apply this week.` } };
        }
        let stateAfterTime = updateActivePlayer(state, p => ({ ...p, timeRemaining: p.timeRemaining - 2 }));

        // Hard requirement checks (instant disqualification)
        const employer = LOCATION_EMPLOYER_NAME[job.location] || job.title;
        if (job.requirements?.experience) {
          const weeksWorked = player.job?.weeksWorked || 0;
          if (weeksWorked < job.requirements.experience) {
            let s = log(stateAfterTime, `Rejected from ${employer}! Need ${job.requirements.experience} weeks of experience.`);
            return { ...s, lastJobResult: { success: false, message: `${employer} rejected you — need ${job.requirements.experience} weeks of experience.` } };
          }
        }
        if (job.requirements?.education && !meetsEducation(player.education, job.requirements.education)) {
          let s = log(stateAfterTime, `Rejected from ${employer}! Need a ${job.requirements.education}.`);
          return { ...s, lastJobResult: { success: false, message: `${employer} rejected you — need a ${job.requirements.education}.` } };
        }
        if (job.requirements?.item && !player.inventory.some(i => i.id === job.requirements.item)) {
          const itemName = job.requirements.item.replace(/_/g, ' ');
          let s = log(stateAfterTime, `Rejected from ${employer}! Need: ${itemName}.`);
          return { ...s, lastJobResult: { success: false, message: `${employer} rejected you — you need: ${itemName}.` } };
        }
        if (job.requirements?.dependability && player.dependability < job.requirements.dependability) {
          let s = log(stateAfterTime, `Rejected from ${employer}! Need ${job.requirements.dependability} dependability.`);
          return { ...s, lastJobResult: { success: false, message: `${employer} rejected you — need ${job.requirements.dependability} dependability.` } };
        }

        // Probabilistic rejection — even qualified applicants can be turned down.
        // Higher dependability improves your odds.
        const baseChance = job.rejectionChance || 0.25;
        const depBonus = Math.min(0.7, player.dependability / 150); // max 70% reduction at high dep
        const finalRejectionChance = baseChance * (1 - depBonus);
        if (Math.random() < finalRejectionChance) {
          const rejectionMessages = [
            `${employer} went with another candidate.`,
            `${employer} said they'll keep your résumé on file. (They won't.)`,
            `${employer} ghosted you after the interview.`,
            `${employer} said you were overqualified. Sure.`,
            `${employer} passed this time. Try again.`,
          ];
          const msg = rejectionMessages[Math.floor(Math.random() * rejectionMessages.length)];
          let s = log(stateAfterTime, `Rejected by ${employer}.`);
          return { ...s, lastJobResult: { success: false, message: msg } };
        }

        // Hired! Preserve experience within same career track
        const prevWeeksWorked = (player.job?.type === job.type) ? (player.job?.weeksWorked || 0) : 0;
        let s = log(stateAfterTime, `${player.name} hired at ${employer} as ${job.title}!`);
        s = updateActivePlayer(s, p => ({
          ...p,
          job: { ...job, weeksWorked: prevWeeksWorked },
          happiness: Math.min(100, p.happiness + 5), // morale boost from getting hired
        }));
        return { ...s, lastJobResult: { success: true, message: `${employer} hired you as ${job.title} at $${job.wage}/hr! +5 happiness!` } };
      }

      // Promotion path — no time cost, no rejection
      if (job.requirements?.experience) {
        const weeksWorked = player.job?.weeksWorked || 0;
        if (weeksWorked < job.requirements.experience) {
          return { ...log(state, `Need ${job.requirements.experience} weeks of experience for promotion.`), lastJobResult: { success: false, message: `Need ${job.requirements.experience} weeks of experience.` } };
        }
      }
      if (job.requirements?.education && !meetsEducation(player.education, job.requirements.education)) {
        return { ...log(state, `Need a ${job.requirements.education} for promotion.`), lastJobResult: { success: false, message: `Need a ${job.requirements.education}.` } };
      }
      if (job.requirements?.item && !player.inventory.some(i => i.id === job.requirements.item)) {
        const itemName = job.requirements.item.replace(/_/g, ' ');
        return { ...log(state, `Need: ${itemName} for promotion.`), lastJobResult: { success: false, message: `You need: ${itemName}.` } };
      }
      if (job.requirements?.dependability && player.dependability < job.requirements.dependability) {
        return { ...log(state, `Need ${job.requirements.dependability} dependability for promotion.`), lastJobResult: { success: false, message: `Need ${job.requirements.dependability} dependability.` } };
      }
      const prevWeeksWorked = (player.job?.type === job.type) ? (player.job?.weeksWorked || 0) : 0;
      let s = log(state, `${player.name} promoted to ${job.title}!`);
      s = updateActivePlayer(s, p => ({
        ...p,
        job: { ...job, weeksWorked: prevWeeksWorked },
        happiness: Math.min(100, p.happiness + 10), // big morale boost from promotion
      }));
      return { ...s, lastJobResult: { success: true, message: `Promoted to ${job.title} at $${job.wage}/hr! +10 happiness! 🎉` } };
    }

    // ── Network at coffee shop (spend 1h, gain +3 dependability) ─────────────
    case 'NETWORK': {
      const player = activePlayer(state);
      if (player.timeRemaining < 1) return log(state, "Not enough time to network.");
      // Diminishing returns at high dep: full bonus up to 70, then reduced; always at least +1
      const baseDep = player.job ? 4 : 3;
      const depBonus = player.dependability >= 90 ? 1 : player.dependability >= 70 ? Math.max(1, Math.floor(baseDep / 2)) : baseDep;
      const happBonus = 2;
      let s = log(state, `${player.name} networked at the Coffee Shop. +${depBonus} dependability, +${happBonus} happiness.`);
      s = updateActivePlayer(s, p => ({
        ...p,
        timeRemaining: p.timeRemaining - 1,
        dependability: Math.min(100, p.dependability + depBonus),
        happiness: Math.min(100, p.happiness + happBonus),
      }));
      return autoEndIfNeeded(s);
    }

    // ── Rest at home ──────────────────────────────────────────────────────────
    case 'REST': {
      const { hours = 2 } = action;
      const player = activePlayer(state);
      if (player.timeRemaining < hours) return log(state, "Not enough time to rest.");
      const hasHotTub = player.inventory.some(i => i.id === 'hot_tub');
      const isLuxury = player.housing?.homeType === 'luxury_condo';
      const relaxBase = hours * 5;
      const relaxBonus = (hasHotTub ? 3 : 0) + (isLuxury ? 2 : 0);
      const relaxGain = relaxBase + relaxBonus;
      const happGain = hours;
      const newRelax = Math.min(100, (player.relaxation ?? 50) + relaxGain);
      const bonusMsg = relaxBonus > 0 ? ` (+${relaxBonus} from ${[hasHotTub && 'hot tub', isLuxury && 'luxury'].filter(Boolean).join(' & ')})` : '';
      let s = updateActivePlayer(state, p => ({
        ...p,
        timeRemaining: p.timeRemaining - hours,
        relaxation: newRelax,
        happiness: Math.min(100, p.happiness + happGain),
      }));
      return log(s, `Rested ${hours}h at home. +${relaxGain} relaxation${bonusMsg} (now ${newRelax}). +${happGain} happiness.`);
    }

    // ── Read a book at the library ────────────────────────────────────────────
    case 'READ_BOOK': {
      const { book } = action; // { title, hours, happinessGain, relaxGain, depGain }
      const player = activePlayer(state);
      if (player.timeRemaining < book.hours) return log(state, `Not enough time to read ${book.title}.`);
      let s = updateActivePlayer(state, p => ({
        ...p,
        timeRemaining: p.timeRemaining - book.hours,
        happiness: Math.min(100, p.happiness + (book.happinessGain ?? 0)),
        relaxation: Math.min(100, (p.relaxation ?? 50) + (book.relaxGain ?? 0)),
        dependability: Math.min(100, (p.dependability ?? 0) + (book.depGain ?? 0)),
      }));
      const bookEffects = [
        book.happinessGain ? `+${book.happinessGain} happiness` : '',
        book.relaxGain ? `+${book.relaxGain} relaxation` : '',
        book.depGain ? `+${book.depGain} dependability` : '',
      ].filter(Boolean).join(', ');
      return log(s, `Read "${book.title}". ${bookEffects}.`);
    }

    // ── Buy item ──────────────────────────────────────────────────────────────
    case 'BUY_ITEM': {
      const { item } = action;
      const player = activePlayer(state);

      if (player.money < item.cost) return log(state, `Not enough money for ${item.name}.`);

      if (item.type === 'food') {
        const hungerReduction = item.hungerRestore || 30;
        const happinessBoost = item.happinessBoost || 5;
        let s = log(state, `Ate ${item.name}. Yum! (-${hungerReduction} hunger)`);
        s = updateActivePlayer(s, p => ({
          ...p,
          money: p.money - item.cost,
          hunger: Math.max(0, p.hunger - hungerReduction),
          happiness: Math.min(100, p.happiness + happinessBoost),
          timeRemaining: Math.max(0, p.timeRemaining - (item.timeToEat || 1)),
          ateFoodThisWeek: true, // counts toward hunger penalty reduction
        }));
        return autoEndIfNeeded(s);
      }

      // Weekly coffee plans (Coffee Shop): no fridge needed, max 1 week stored at a time
      if (item.type === 'weekly_coffee') {
        const alreadyStored = player.inventory.some(i => i.type === 'weekly_coffee');
        if (alreadyStored) return log(state, 'You already have a weekly coffee plan!');
        let s = log(state, `Bought ${item.name} — auto-applied at week's end.`);
        s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item] }));
        return s;
      }

      // Weekly meal plans (Quick Eats): no fridge needed, no spoilage, max 1 week stored at a time
      if (item.type === 'weekly_meal') {
        const alreadyStored = player.inventory.some(i => i.type === 'weekly_meal');
        if (alreadyStored) return log(state, 'You already have a week\'s worth of meals ready!');
        let s = log(state, `Bought ${item.name} — meals auto-eaten at week's end.`);
        s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item] }));
        return s;
      }

      // Food storage items (groceries): always buyable; without a fridge they'll spoil at week's end
      if (item.type === 'food_storage') {
        const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
        const hasFreezer = player.inventory.some(i => i.id === 'freezer');
        const hasStorage = hasFridge || hasFreezer;
        const maxStorage = hasFreezer ? 4 : hasFridge ? 2 : 1; // no fridge = hold 1 serving max
        const currentServings = player.inventory.filter(i => i.id === 'groceries').length;
        if (currentServings >= maxStorage) {
          return log(state, hasStorage
            ? `Fridge full! (${currentServings}/${maxStorage} weeks stored)`
            : 'You can only hold 1 week of groceries without a fridge.');
        }
        const warning = hasStorage ? '' : ' ⚠️ No fridge — food will spoil at week\'s end!';
        let s = log(state, `Bought groceries (+1 week of food stored).${warning}`);
        s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item] }));
        return s;
      }

      // Entertainment items (concert tickets, rest, etc): apply boosts immediately, don't add to inventory
      if (item.type === 'entertainment') {
        const hBoost = item.happinessBoost || 0;
        const rBoost = item.relaxationBoost || 0;
        const timeCost = item.timeToRest || 0;
        // Check time before spending money
        if (timeCost > 0 && player.timeRemaining < timeCost) {
          return log(state, `Not enough time (need ${timeCost}h).`);
        }
        const isLottery = item.name?.toLowerCase().includes('lottery');
        const isRest = item.id?.startsWith('rest_home');
        const lotteryVerb = hBoost > 0 ? '🎰 JACKPOT!' : '🎰 No luck.';
        const verb = isRest ? `😴 Rested at home.` : isLottery ? lotteryVerb : `Enjoyed ${item.name}!`;
        const hStr = hBoost > 0 ? `+${hBoost}` : hBoost < 0 ? `${hBoost}` : '';
        const parts = [hStr ? `${hStr} happiness` : '', rBoost ? `+${rBoost} relaxation` : ''].filter(Boolean);
        let s = log(state, `${verb}${parts.length ? ' ' + parts.join(', ') + '.' : ''}`);

        s = updateActivePlayer(s, p => ({
          ...p,
          money: Math.max(0, p.money - item.cost),
          happiness: Math.min(100, p.happiness + hBoost),
          relaxation: Math.min(100, p.relaxation + rBoost),
          timeRemaining: Math.max(0, p.timeRemaining - timeCost),
        }));
        return autoEndIfNeeded(s);
      }

      const alreadyOwned = player.inventory.some(i => i.id === item.id);
      if (alreadyOwned && item.type !== 'food') return log(state, `You already own ${item.name}.`);
      // Allow vehicle upgrade (bicycle → car): remove old vehicle when buying a better one
      if (item.type === 'vehicle') {
        const existingVehicle = player.inventory.find(i => i.type === 'vehicle' && i.id !== item.id);
        if (existingVehicle) {
          const tradeIn = Math.floor(existingVehicle.cost * 0.5);
          let s = log(state, `Traded in ${existingVehicle.name} ($${tradeIn} credit) for ${item.name}. +5 happiness!`);
          s = updateActivePlayer(s, p => ({
            ...p,
            money: p.money - item.cost + tradeIn,
            inventory: [...p.inventory.filter(i => i.id !== existingVehicle.id), item],
            happiness: Math.min(100, p.happiness + 5),
          }));
          return s;
        }
      }

      // First vehicle purchase gives happiness
      const isFirstVehicle = item.type === 'vehicle' && !player.inventory.some(i => i.type === 'vehicle');
      const purchaseHappy = isFirstVehicle ? 5 : 0;
      const happyMsg = purchaseHappy ? ' +5 happiness!' : '';
      let s = log(state, `Bought ${item.name} for $${item.cost}.${happyMsg}`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item], happiness: Math.min(100, p.happiness + purchaseHappy) }));
      return s;
    }

    // ── Sell item ─────────────────────────────────────────────────────────────
    case 'SELL_ITEM': {
      const { item } = action;
      const player = activePlayer(state);
      // Pawn shop prices scale with economy: Boom = 60%, Normal = 50%, Depression = 40%
      const economyPawnMultiplier = state.economy === 'Boom' ? 0.60 : state.economy === 'Depression' ? 0.40 : 0.50;
      const sellPrice = Math.floor(item.cost * economyPawnMultiplier);
      const idx = player.inventory.findIndex(i => i.id === item.id);
      if (idx === -1) return state;

      let s = log(state, `Sold ${item.name} for $${sellPrice} (${state.economy} market).`);
      s = updateActivePlayer(s, p => {
        const inv = [...p.inventory];
        inv.splice(idx, 1);
        return { ...p, money: p.money + sellPrice, inventory: inv };
      });
      return s;
    }

    // ── Sell all shares of a stock ────────────────────────────────────────────
    case 'SELL_STOCK_ALL': {
      const { symbol } = action;
      const player = activePlayer(state);
      const qty = player.portfolio?.[symbol] || 0;
      if (qty < 1) return log(state, "No shares to sell.");
      const earnings = Math.floor(state.market[symbol] * qty);
      const basePrice = stocksData.find(s => s.symbol === symbol)?.basePrice ?? state.market[symbol];
      const costBasis = basePrice * qty;
      const profitLoss = earnings - costBasis;
      const plText = profitLoss >= 0 ? `+$${profitLoss} profit` : `-$${Math.abs(profitLoss)} loss`;
      let s = log(state, `Sold all ${qty} shares of ${symbol} for $${earnings}. (${plText})`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money + earnings, portfolio: { ...p.portfolio, [symbol]: 0 } }));
      return s;
    }

    // ── Enroll in course ──────────────────────────────────────────────────────
    case 'ENROLL': {
      const { course } = action;
      const player = activePlayer(state);

      if (player.currentCourse) return log(state, "Already enrolled in a course. Finish it first.");
      if (course.requirements?.education && !meetsEducation(player.education, course.requirements.education)) {
        return log(state, `Need ${course.requirements.education} to enroll in ${course.title}.`);
      }
      if (course.requirements?.item && !player.inventory.some(i => i.id === course.requirements.item)) {
        return log(state, `Need a ${course.requirements.item.replace(/_/g, ' ')} to enroll.`);
      }
      if (player.money < course.cost) return log(state, "Not enough money for tuition.");

      const sessionsNeeded = Math.ceil(course.totalHours / (10 + player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0)));
      let s = log(state, `${player.name} enrolled in ${course.title}. Tuition: $${course.cost}. ~${sessionsNeeded} study sessions needed.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money - course.cost, currentCourse: { ...course, progress: 0 } }));
      return s;
    }

    // ── Study ─────────────────────────────────────────────────────────────────
    case 'STUDY': {
      const player = activePlayer(state);
      if (!player.currentCourse) return log(state, "Not enrolled in any course.");
      if (player.timeRemaining < 10) return log(state, "Need 10 hours to study.");

      // Extra credit: laptop and textbooks each add bonus progress
      const studyBonus = player.inventory.reduce((sum, item) => sum + (item.studyBonus || 0), 0);
      const newProgress = player.currentCourse.progress + 10 + studyBonus;

      if (newProgress >= player.currentCourse.totalHours) {
        let s = log(state, `🎓 ${player.name} completed ${player.currentCourse.title}! Earned: ${player.currentCourse.degree}. +10 happiness!`);
        s = updateActivePlayer(s, p => ({ ...p, education: p.currentCourse.degree, currentCourse: null, timeRemaining: p.timeRemaining - 10, happiness: Math.min(100, p.happiness + 10) }));
        s = { ...s, lastJobResult: { success: true, message: `🎓 Graduated with a ${player.currentCourse.degree}! +10 happiness!` } };
        return autoEndIfNeeded(s);
      }

      const pctDone = Math.round((newProgress / player.currentCourse.totalHours) * 100);
      let s = log(state, `Studied 10hrs. Progress: ${newProgress}/${player.currentCourse.totalHours} (${pctDone}%)`);
      // Small happiness boost from studying — learning is fulfilling
      const studyHappy = pctDone >= 75 ? 3 : 1;
      s = updateActivePlayer(s, p => ({ ...p, timeRemaining: p.timeRemaining - 10, currentCourse: { ...p.currentCourse, progress: newProgress }, happiness: Math.min(100, p.happiness + studyHappy) }));
      return autoEndIfNeeded(s);
    }

    // ── Rent apartment ────────────────────────────────────────────────────────
    case 'RENT_APARTMENT': {
      const { housing } = action;
      const player = activePlayer(state);

      // Moving to more expensive housing requires a deposit (2 weeks rent)
      const deposit = calculateDeposit(housing.rent, player.housing?.rent ?? 0);

      if (deposit > 0 && player.money < deposit) {
        return log(state, `Can't afford the $${deposit} deposit for ${housing.title} (2 weeks rent).`);
      }

      const isUpgrade = housing.rent > (player.housing?.rent ?? 0);
      const happBoost = isUpgrade ? 5 : 0;
      const upgradeMsg = happBoost > 0 ? ` +${happBoost} happiness!` : '';
      let s = log(state, `${player.name} moved into ${housing.title}.${deposit > 0 ? ` -$${deposit} deposit.` : ''}${upgradeMsg}`);
      s = updateActivePlayer(s, p => ({ ...p, housing, hasChosenHousing: true, money: p.money - deposit, happiness: Math.min(100, p.happiness + happBoost) }));
      return s;
    }

    // ── Bank transactions ─────────────────────────────────────────────────────
    case 'BANK_TRANSACTION': {
      const { transactionType, amount } = action;
      if (amount <= 0) return state;
      const player = activePlayer(state);
      let { money, savings, debt } = player;
      let msg = '';

      if (transactionType === 'deposit') {
        if (money < amount) return log(state, "Not enough cash to deposit.");
        money -= amount; savings += amount;
        msg = `Deposited $${amount} into savings. (Balance: $${savings})`;
      } else if (transactionType === 'withdraw') {
        if (savings < amount) return log(state, "Not enough in savings.");
        savings -= amount; money += amount;
        msg = `Withdrew $${amount} from savings. (Remaining: $${savings})`;
      } else if (transactionType === 'repay') {
        const payAmount = Math.min(amount, debt);
        if (money < payAmount) return log(state, "Not enough cash to repay.");
        money -= payAmount; debt -= payAmount;
        msg = debt === 0 ? `Repaid $${payAmount}! Debt-free! 🎉` : `Repaid $${payAmount} of debt.`;
      } else if (transactionType === 'borrow') {
        // Loan cap: max $5000 total debt
        if (debt + amount > 5000) {
          return { ...log(state, `Loan denied! Borrowing $${amount} would exceed the $5000 debt cap.`), lastJobResult: { success: false, message: `Loan denied — max $5,000 debt. Current: $${debt}.` } };
        }
        debt += amount; money += amount;
        msg = `Borrowed $${amount}.`;
      }

      let s = log(state, msg);
      // Happiness boost for paying off all debt
      const wasFreeOfDebt = player.debt === 0;
      const nowDebtFree = debt === 0 && !wasFreeOfDebt && transactionType === 'repay';
      s = updateActivePlayer(s, p => ({ ...p, money, savings, debt, happiness: nowDebtFree ? Math.min(100, p.happiness + 5) : p.happiness }));
      if (nowDebtFree) s = log(s, `${player.name} is debt-free! +5 happiness!`);
      return s;
    }

    // ── Stock trading ─────────────────────────────────────────────────────────
    case 'BUY_STOCK': {
      const { symbol, quantity } = action;
      const player = activePlayer(state);
      const price = state.market[symbol];
      const cost = price * quantity;
      if (player.money < cost) return log(state, "Not enough money to buy stock.");

      const currentQty = player.portfolio[symbol] || 0;
      let s = log(state, `Bought ${quantity} shares of ${symbol} for $${cost}.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money - cost, portfolio: { ...p.portfolio, [symbol]: currentQty + quantity } }));
      return s;
    }

    case 'SELL_STOCK': {
      const { symbol, quantity } = action;
      const player = activePlayer(state);
      const currentQty = player.portfolio[symbol] || 0;
      if (currentQty < quantity) return log(state, "Not enough shares to sell.");

      const earnings = Math.floor(state.market[symbol] * quantity);
      let s = log(state, `Sold ${quantity} shares of ${symbol} for $${earnings}.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money + earnings, portfolio: { ...p.portfolio, [symbol]: currentQty - quantity } }));
      return s;
    }

    // ── End Week ──────────────────────────────────────────────────────────────
    case 'END_WEEK': {
      let s = { ...state, awaitingEndWeek: false };

      // ── Multiplayer: mark active player done, advance if others remain ──────
      s = updateActivePlayer(s, p => ({ ...p, weekDone: true }));

      const nextIdx = s.players.findIndex((p, i) => i !== s.activePlayerIndex && !p.weekDone);
      if (nextIdx !== -1) {
        // Still players who haven't taken their turn — pass to them
        s = log(s, `${activePlayer(s).name} ended their turn. ${s.players[nextIdx].name}'s turn!`);
        return { ...s, activePlayerIndex: nextIdx };
      }

      // ── All players done — process the week for everyone ──────────────────
      const BASE_MAX_TIME = 60;

      const updatedPlayers = s.players.map((p) => {
        let np = { ...p };
        let playerLog = [];

        // 1. Rent
        const moneyAfterRent = np.money - np.housing.rent;
        if (moneyAfterRent < 0) {
          const shortfall = Math.abs(moneyAfterRent);
          playerLog.push(`${np.name}: couldn't pay rent! $${shortfall} debt added.`);
          np.debt += shortfall;
          np.money = 0;
          np.happiness = Math.max(0, np.happiness - 5); // stress from not paying rent
        } else {
          np.money = moneyAfterRent;
          playerLog.push(`${np.name}: rent paid $${np.housing.rent}.`);
        }

        // 2. Hunger (+25/week base, less if they have a good housing tier)
        const hungerIncrease = np.housing.homeType === 'luxury_condo' ? 20 : 25;
        np.hunger = Math.min(100, np.hunger + hungerIncrease);

        // 3. Happiness
        let happinessDelta = -3;
        happinessDelta += np.housing.happiness || 0;
        if (np.job) happinessDelta += 2; else happinessDelta -= 3;
        // Data-driven weekly item effects (weeklyFee, weeklyHappinessBoost)
        for (const item of np.inventory) {
          if (item.weeklyHappinessBoost) happinessDelta += item.weeklyHappinessBoost;
          if (item.weeklyFee) {
            np.money = Math.max(0, np.money - item.weeklyFee);
            playerLog.push(`${np.name}: ${item.name} -$${item.weeklyFee}.`);
          }
        }
        np.happiness = Math.min(100, Math.max(0, np.happiness + happinessDelta));

        // 3b. Dependability decay
        let depDelta = -3;
        if (!np.job) {
          depDelta -= 5; // unemployed penalty
          if (np.dependability < 30) happinessDelta -= 2; // extra sadness when unemployed AND low dep
        }
        np.dependability = Math.min(100, Math.max(0, np.dependability + depDelta));

        // 3c. Relaxation decay
        let relaxDelta = -5;
        if (np.inventory.some(i => i.id === 'hot_tub')) relaxDelta += 3; // hot tub passive
        if (np.housing.id === 'luxury_condo') relaxDelta += 3; // luxury living
        np.relaxation = Math.max(0, Math.min(100, np.relaxation + relaxDelta));

        // 3d. Clothing wear (each clothing item loses 7 durability/week ≈ 20-week lifespan)
        const wornOut = [];
        np.inventory = np.inventory.map(item => {
          if (item.clothingWear !== undefined) {
            const newWear = item.clothingWear - 7;
            if (newWear <= 0) { wornOut.push(item); return null; }
            return { ...item, clothingWear: newWear };
          }
          return item;
        }).filter(Boolean);

        for (const worn of wornOut) {
          playerLog.push(`${np.name}: ${worn.name} wore out!`);
          // If worn item was required for current job, lose the job
          if (np.job && np.job.requirements?.item === worn.id) {
            const lostJobTitle = np.job.title;
            np.job = null;
            np.clothingWarning = { itemName: worn.name, jobTitle: lostJobTitle, playerName: np.name };
            playerLog.push(`${np.name}: lost their job — need proper clothing!`);
          }
        }

        // Warn when clothing is getting low (< 30% durability ≈ 4 weeks left)
        for (const item of np.inventory) {
          if (item.clothingWear !== undefined && item.clothingWear <= 30 && item.clothingWear > 0) {
            playerLog.push(`${np.name}: ⚠️ ${item.name} is wearing thin! (${item.clothingWear}% left)`);
          }
        }

        // 3e. Relaxation bottomed out → forced doctor visit
        if (np.relaxation <= 0) {
          const hasInsurance = np.inventory.some(i => i.id === 'health_insurance');
          const doctorCost = hasInsurance ? 50 : 200;
          np.money = Math.max(0, np.money - doctorCost);
          np.relaxation = 30; // doctor's orders: mandatory rest reset
          np.maxTimeReduction = (np.maxTimeReduction || 0) + 5;
          np.happiness = Math.max(0, np.happiness - 5);
          playerLog.push(`${np.name}: exhaustion sent them to the doctor! -$${doctorCost}, -5h & -5 happiness next week.`);
        }

        // 4. Debt interest
        if (np.debt > 0) {
          const interest = Math.floor(np.debt * 0.05);
          np.debt += interest;
          playerLog.push(`${np.name}: debt interest -$${interest}.`);
        }

        // 5. Savings interest
        if (np.savings > 0) {
          const interest = Math.floor(np.savings * 0.01);
          np.savings += interest;
          if (interest > 0) playerLog.push(`${np.name}: savings +$${interest}.`);
        }

        // 6a. Weekly meal plans (Quick Eats) — auto-eaten at week's end, no fridge needed
        const meal = np.inventory.find(i => i.type === 'weekly_meal');
        let ateThisWeek = false;
        if (meal) {
          np.inventory = np.inventory.filter(i => i !== meal);
          np.hunger = Math.max(0, np.hunger - (meal.weeklyHungerRestore || 55));
          if (meal.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + meal.weeklyHappinessBoost);
          playerLog.push(`${np.name}: ate weekly meals (${meal.name}). Hunger down.`);
          ateThisWeek = true;
        }

        // 6ab. Weekly coffee plans (Coffee Shop) — auto-applied at week's end
        const coffee = np.inventory.find(i => i.type === 'weekly_coffee');
        if (coffee) {
          np.inventory = np.inventory.filter(i => i !== coffee);
          np.hunger = Math.max(0, np.hunger - (coffee.weeklyHungerRestore || 12));
          if (coffee.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + coffee.weeklyHappinessBoost);
          playerLog.push(`${np.name}: weekly coffee fix (${coffee.name}). +Happiness.`);
          ateThisWeek = true;
        }

        // 6b. Grocery storage — consume 1 serving (fridge) or spoil (no fridge → food poisoning)
        const hasFridge = np.inventory.some(i => i.id === 'refrigerator');
        const hasFreezer = np.inventory.some(i => i.id === 'freezer');
        const hasStorage = hasFridge || hasFreezer;
        const groceryItem = np.inventory.find(i => i.id === 'groceries');
        if (groceryItem) {
          if (hasStorage) {
            // Eat one serving — reduces hunger significantly
            np.inventory = np.inventory.filter(i => i !== groceryItem);
            np.hunger = Math.max(0, np.hunger - 60);
            playerLog.push(`${np.name}: ate from fridge. Hunger down.`);
            ateThisWeek = true;
          } else {
            // No fridge — all groceries spoil, food poisoning kicks in next week
            np.inventory = np.inventory.filter(i => i.id !== 'groceries');
            np.hunger = 100;
            playerLog.push(`${np.name}: groceries spoiled (no fridge)! Food poisoning — sick next week.`);
          }
        }

        // 7. Hunger → time penalty (graduated by hunger + what the player ate)
        // Track if they had any quick bites (immediate food like espresso/croissant) and reset flag
        const ateImmediateFood = np.ateFoodThisWeek || false;
        np.ateFoodThisWeek = false; // reset for next week
        np.hungerWarning = null;
        let hungryPenalty = 0;

        if (ateThisWeek) {
          // Had a proper weekly plan — only penalise if still somehow starving (e.g. groceries spoiled)
          if (np.hunger >= 80) {
            hungryPenalty = 20;
            playerLog.push(`${np.name}: starving despite eating! -20h next week.`);
          }
        } else if (ateImmediateFood) {
          // Bought individual food items (espresso/croissant) but no weekly plan
          // Penalty is halved — they made some effort, but it's not enough for a full week
          if (np.hunger >= 80)      hungryPenalty = 10;
          else if (np.hunger >= 50) hungryPenalty = 5;
          // hunger < 50 with some food eaten → no penalty (they managed ok with snacks)
          if (hungryPenalty > 0) {
            np.hungerWarning = { hunger: np.hunger, penalty: hungryPenalty, hadSomeFood: true, playerName: np.name };
            playerLog.push(`${np.name}: only had snacks — still hungry! -${hungryPenalty}h next week.`);
          }
        } else {
          // No food at all — graduated penalty based on hunger level
          if (np.hunger >= 80)      hungryPenalty = 20;
          else if (np.hunger >= 50) hungryPenalty = 10;
          else if (np.hunger >= 25) hungryPenalty = 5;
          // hunger < 25 with no food → minor penalty, they're still okay
          if (hungryPenalty > 0) {
            np.hungerWarning = { hunger: np.hunger, penalty: hungryPenalty, hadSomeFood: false, playerName: np.name };
            playerLog.push(`${np.name}: went hungry (no food bought)! -${hungryPenalty}h next week.`);
          }
        }
        const reduction = (np.maxTimeReduction || 0) + hungryPenalty;
        np.maxTime = Math.max(20, BASE_MAX_TIME - reduction);
        // Reset maxTimeReduction after applying it so doctor visits don't stack permanently
        np.maxTimeReduction = 0;

        // 7. Reset time, home, done flag
        np.timeRemaining = np.maxTime;
        np.currentLocation = np.hasChosenHousing ? 'home' : 'leasing_office';
        np.weekDone = false;

        // Apply log entries
        playerLog.forEach(msg => { s = log(s, msg); });

        return np;
      });

      // 8. Economy
      let { economy, economyTimer } = s;
      economyTimer -= 1;
      if (economyTimer <= 0) {
        const idx = ECONOMY_STATES.indexOf(economy);
        const prevEconomy = economy;
        economy = ECONOMY_STATES[(idx + 1) % ECONOMY_STATES.length];
        economyTimer = 4 + Math.floor(Math.random() * 4);
        const econEmoji = economy === 'Boom' ? '📈' : economy === 'Depression' ? '📉' : '📊';
        const econEffect = economy === 'Boom' ? 'Wages +30%, prices +40%!' : economy === 'Depression' ? 'Wages -20%, prices -30%.' : 'Wages and prices normalized.';
        s = log(s, `${econEmoji} Economy shifted from ${prevEconomy} → ${economy}! ${econEffect}`);
      }

      // 9. Stock prices (economy affects direction bias)
      const newMarket = { ...s.market };
      const economyBias = economy === 'Boom' ? 0.02 : economy === 'Depression' ? -0.02 : 0;
      stocksData.forEach(stock => {
        const current = newMarket[stock.symbol];
        const change = (Math.random() * stock.volatility * 2) - stock.volatility + economyBias;
        newMarket[stock.symbol] = Math.max(1, Math.floor(current * (1 + change)));
      });

      // 10. Random event (applies to first/active player for simplicity)
      let pendingEvent = null;
      if (Math.random() < 0.4) {
        const ep = updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)];
        const hasCar = ep.inventory.some(i => i.id === 'car');
        const hasPaidHousing = ep.housing && ep.housing.rent > 0;
        const hasSavings = ep.savings > 0;
        // Filter events to only those that make sense for the player's current situation
        const eligibleEvents = eventsData.filter(ev => {
          if ((ev.id === 'bonus' || ev.id === 'overtime' || ev.id === 'layoff') && !ep.job) return false;
          if (ev.id === 'car_repair' && !hasCar) return false;
          if ((ev.id === 'rent_hike' || ev.id === 'housing_inspection') && !hasPaidHousing) return false;
          if ((ev.id === 'tech_boom' || ev.id === 'market_crash') && !hasSavings) return false;
          return true;
        });
        const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
        if (event) {
          let effectDesc = '';
          switch (event.effect.type) {
            case 'money':
              ep.money = Math.max(0, ep.money + event.effect.value);
              effectDesc = event.effect.value >= 0 ? `+$${event.effect.value}` : `-$${Math.abs(event.effect.value)}`;
              break;
            case 'time_loss':
              ep.maxTime = Math.max(20, ep.maxTime - Math.floor(ep.maxTime * event.effect.value));
              ep.timeRemaining = ep.maxTime;
              effectDesc = `-${Math.floor(event.effect.value * 100)}% time next week`;
              break;
            case 'rent_increase': {
              const extra = Math.floor(ep.housing.rent * event.effect.value);
              ep.money = Math.max(0, ep.money - extra);
              ep.housing = { ...ep.housing, rent: ep.housing.rent + extra };
              effectDesc = `rent +$${extra}/wk (now $${ep.housing.rent}/wk)`;
              break;
            }
            case 'savings_interest_bonus': {
              const bonus = Math.floor(ep.savings * event.effect.value);
              ep.savings += bonus;
              effectDesc = `+$${bonus} savings bonus`;
              break;
            }
            case 'savings_loss': {
              const loss = Math.floor(ep.savings * event.effect.value);
              ep.savings = Math.max(0, ep.savings - loss);
              effectDesc = `-$${loss} from savings`;
              break;
            }
            case 'happiness':
              ep.happiness = Math.min(100, Math.max(0, ep.happiness + event.effect.value));
              effectDesc = `${event.effect.value > 0 ? '+' : ''}${event.effect.value} happiness`;
              break;
            case 'job_loss':
              if (ep.job) { ep.job = null; effectDesc = 'you lost your job!'; }
              else effectDesc = 'no effect';
              break;
            default: break;
          }
          pendingEvent = { title: event.title, description: event.description, effectDesc, playerName: ep.name };
        }
      }

      // 11. Jones AI
      let { jones } = s;
      // Jones earns ~40h/wk equivalent but occasionally spends on fun/food (randomized)
      const jonesSpending = 50 + Math.floor(Math.random() * 100); // $50-$150 weekly expenses
      const jonesIncome = Math.floor(jones.jobWage * 40 * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));
      const jonesMoney = jones.money + jonesIncome - jones.rent - jonesSpending;
      let newJonesJobIndex = jones.jobIndex;
      let newJonesWeeksAtJob = jones.weeksAtJob + 1;
      const nextJobEntry = JONES_CAREER_TRACK[jones.jobIndex + 1];
      if (nextJobEntry && newJonesWeeksAtJob >= nextJobEntry.weeksNeeded) {
        newJonesJobIndex = jones.jobIndex + 1;
        newJonesWeeksAtJob = 0;
        s = log(s, `💼 Jones got promoted to ${nextJobEntry.title}!`);
      }
      const nextEdu = JONES_EDUCATION_TRACK.find(e => e.week === s.week + 1);
      // Jones happiness fluctuates more realistically
      const jonesHappyDelta = Math.random() < 0.3 ? -2 : 3; // occasionally has a bad week
      const updatedJones = {
        ...jones,
        money: Math.max(0, jonesMoney),
        netWorth: Math.max(0, jonesMoney),
        currentLocation: LOCATION_ORDER[Math.floor(Math.random() * LOCATION_ORDER.length)],
        happiness: Math.min(100, Math.max(10, jones.happiness + jonesHappyDelta)),
        education: nextEdu ? nextEdu.degree : jones.education,
        jobIndex: newJonesJobIndex,
        jobTitle: JONES_CAREER_TRACK[newJonesJobIndex].title,
        jobWage: JONES_CAREER_TRACK[newJonesJobIndex].wage,
        weeksAtJob: newJonesWeeksAtJob,
      };

      // Build a summary of this week's end-of-week results
      // Use weekStartSnapshot (captured at week start) so the delta reflects the full week, not just endWeek processing
      const wkSummary = {
        week: s.week,
        lines: updatedPlayers.map(p => {
          const old = (s.weekStartSnapshot || []).find(op => op.name === p.name) || s.players.find(op => op.name === p.name);
          const oldNetWorth = (old?.money ?? 0) + (old?.savings ?? 0) - (old?.debt ?? 0);
          const newNetWorth = p.money + p.savings - p.debt;
          const nwDiff = newNetWorth - oldNetWorth;
          return {
            emoji: p.emoji,
            name: p.name,
            money: p.money,
            happiness: p.happiness,
            dependability: p.dependability,
            hunger: p.hunger ?? 0,
            relaxation: p.relaxation ?? 50,
            netWorth: newNetWorth,
            netWorthDelta: nwDiff,
            job: p.job?.title || 'Unemployed',
          };
        }),
      };

      // 12. Assemble — reset to Player 1's turn
      s = {
        ...s,
        week: s.week + 1,
        economy,
        economyTimer,
        market: newMarket,
        pendingEvent,
        players: updatedPlayers,
        activePlayerIndex: 0,
        jones: updatedJones,
        weekSummary: wkSummary,
      };

      return checkEndConditions(s);
    }

    // ── Dismiss event modal ───────────────────────────────────────────────────
    case 'DISMISS_EVENT': {
      return { ...state, pendingEvent: null };
    }

    // ── Dismiss hunger warning dialog ────────────────────────────────────────
    case 'DISMISS_HUNGER_WARNING': {
      const cleared = state.players.map(p => ({ ...p, hungerWarning: null }));
      return { ...state, players: cleared };
    }

    case 'DISMISS_CLOTHING_WARNING': {
      const cleared = state.players.map(p => ({ ...p, clothingWarning: null }));
      return { ...state, players: cleared };
    }

    // ── Dismiss week summary modal ────────────────────────────────────────────
    case 'DISMISS_WEEK_SUMMARY': {
      // Snapshot current player state as the new week's baseline for net-worth delta
      const snapshot = state.players.map(p => ({ name: p.name, money: p.money, savings: p.savings, debt: p.debt }));
      return { ...state, weekSummary: null, weekStartSnapshot: snapshot };
    }

    default:
      return state;
  }
};
