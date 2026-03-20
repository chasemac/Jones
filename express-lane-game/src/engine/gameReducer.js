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
} from './constants';
import eventsData from '../data/events.json';
import stocksData from '../data/stocks.json';

// ─── Player factory ───────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#facc15', '#34d399', '#f87171', '#818cf8']; // yellow, green, red, purple
const PLAYER_EMOJIS = ['😎', '🤠', '🥸', '🧑‍🚀'];

export const buildPlayer = (index, startingMoney) => ({
  name: `Player ${index + 1}`,
  color: PLAYER_COLORS[index],
  emoji: PLAYER_EMOJIS[index],
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
export const buildInitialState = (difficulty = 'normal', playerCount = 1) => {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const market = {};
  stocksData.forEach(s => { market[s.symbol] = s.basePrice; });

  const players = Array.from({ length: playerCount }, (_, i) => buildPlayer(i, preset.startingMoney));

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
  history: [`Week ${state.week}: ${message}`, ...state.history].slice(0, 50),
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

  // All players bottomed out → lost
  if (state.players.every(p => p.happiness <= 0)) {
    return { ...state, gameStatus: 'lost' };
  }
  return state;
};

// ─── Auto end-week if time hits 0 ─────────────────────────────────────────────
// Instead of ending the week immediately, set a flag so the UI can animate
// the player walking home first, then dispatch END_WEEK.
const autoEndIfNeeded = (s) =>
  activePlayer(s).timeRemaining <= 0 ? { ...s, awaitingEndWeek: true } : s;

// ─── Reducer ──────────────────────────────────────────────────────────────────
export const gameReducer = (state, action) => {
  switch (action.type) {

    // ── Game lifecycle ────────────────────────────────────────────────────────
    case 'INIT_GAME': {
      const s = buildInitialState(action.difficulty, action.playerCount || 1);
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

      // 30% chance when leaving Black's Market in Low-security housing
      if (player.currentLocation === 'blacks_market' && player.housing.security === 'Low' && Math.random() < 0.3) {
        if (hasSuit) {
          s = log(s, `👹 Wild Willy saw your suit and backed off.`);
        } else {
          const stolen = Math.floor(player.money * 0.5);
          if (stolen > 0) {
            s = log(s, `👹 WILD WILLY stole $${stolen} from you!`);
            s = updateActivePlayer(s, p => ({ ...p, money: p.money - stolen }));
          } else {
            s = log(s, `👹 Wild Willy tried to rob you, but you're broke!`);
          }
        }
      }

      // 20% chance when leaving NeoBank with >$500 in Low-security housing
      if (player.currentLocation === 'neobank' && player.housing.security === 'Low' && player.money > 500 && Math.random() < 0.2) {
        if (hasSuit) {
          s = log(s, `👹 Wild Willy clocked your suit and kept walking.`);
        } else {
          const stolen = Math.floor(activePlayer(s).money * 0.3);
          s = log(s, `👹 WILD WILLY ambushed you leaving the bank! Stole $${stolen}!`);
          s = updateActivePlayer(s, p => ({ ...p, money: p.money - stolen }));
        }
      }

      const newTime = activePlayer(s).timeRemaining - effectiveCost;
      s = updateActivePlayer(s, p => ({ ...p, currentLocation: locationId, timeRemaining: newTime }));

      if (newTime <= 0) return { ...s, awaitingEndWeek: true };
      return s;
    }

    // ── Work current job ──────────────────────────────────────────────────────
    case 'WORK': {
      const player = activePlayer(state);
      if (!player.job) return log(state, "You don't have a job!");
      if (player.timeRemaining < 8) return log(state, "Not enough time to work a full shift.");

      const multiplier = ECONOMY_WAGE_MULTIPLIER[state.economy];
      const earnings = Math.floor(player.job.wage * 8 * multiplier);
      const newWeeksWorked = (player.job.weeksWorked || 0) + 1;

      let s = log(state, `${player.name} worked as ${player.job.title}. Earned $${earnings}.`);
      s = updateActivePlayer(s, p => ({
        ...p,
        money: p.money + earnings,
        timeRemaining: p.timeRemaining - 8,
        job: { ...p.job, weeksWorked: newWeeksWorked },
        dependability: Math.min(100, p.dependability + 5),
      }));
      return autoEndIfNeeded(s);
    }

    // ── Gig work (no job required) ────────────────────────────────────────────
    case 'GIG_WORK': {
      const player = activePlayer(state);
      if (!player.inventory.some(i => i.id === 'smartphone')) return log(state, "You need a smartphone to do gig work!");
      if (player.timeRemaining < 4) return log(state, "Not enough time for a gig shift.");

      const earnings = Math.floor(60 * (ECONOMY_WAGE_MULTIPLIER[state.economy] || 1));
      let s = log(state, `Completed gig delivery. Earned $${earnings}.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money + earnings, timeRemaining: p.timeRemaining - 4 }));
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
        if (job.requirements?.experience) {
          const weeksWorked = player.job?.weeksWorked || 0;
          if (weeksWorked < job.requirements.experience) {
            let s = log(stateAfterTime, `Rejected from ${job.company}! Need ${job.requirements.experience} weeks of experience.`);
            return { ...s, lastJobResult: { success: false, message: `${job.company} rejected you — need ${job.requirements.experience} weeks of experience.` } };
          }
        }
        if (job.requirements?.education && !meetsEducation(player.education, job.requirements.education)) {
          let s = log(stateAfterTime, `Rejected from ${job.company}! Need a ${job.requirements.education}.`);
          return { ...s, lastJobResult: { success: false, message: `${job.company} rejected you — need a ${job.requirements.education}.` } };
        }
        if (job.requirements?.item && !player.inventory.some(i => i.id === job.requirements.item)) {
          const itemName = job.requirements.item.replace(/_/g, ' ');
          let s = log(stateAfterTime, `Rejected from ${job.company}! Need: ${itemName}.`);
          return { ...s, lastJobResult: { success: false, message: `${job.company} rejected you — you need: ${itemName}.` } };
        }
        if (job.requirements?.dependability && player.dependability < job.requirements.dependability) {
          let s = log(stateAfterTime, `Rejected from ${job.company}! Need ${job.requirements.dependability} dependability.`);
          return { ...s, lastJobResult: { success: false, message: `${job.company} rejected you — need ${job.requirements.dependability} dependability.` } };
        }

        // Probabilistic rejection — even qualified applicants can be turned down.
        // Higher dependability improves your odds.
        const baseChance = job.rejectionChance || 0.25;
        const depBonus = Math.min(0.7, player.dependability / 150); // max 70% reduction at high dep
        const finalRejectionChance = baseChance * (1 - depBonus);
        if (Math.random() < finalRejectionChance) {
          const rejectionMessages = [
            `${job.company} went with another candidate.`,
            `${job.company} said they'll keep your résumé on file. (They won't.)`,
            `${job.company} ghosted you after the interview.`,
            `${job.company} said you were overqualified. Sure.`,
            `${job.company} passed this time. Try again.`,
          ];
          const msg = rejectionMessages[Math.floor(Math.random() * rejectionMessages.length)];
          let s = log(stateAfterTime, `Rejected by ${job.company}.`);
          return { ...s, lastJobResult: { success: false, message: msg } };
        }

        // Hired! Preserve experience within same career track
        const prevWeeksWorked = (player.job?.type === job.type) ? (player.job?.weeksWorked || 0) : 0;
        let s = log(stateAfterTime, `${player.name} hired at ${job.company} as ${job.title}!`);
        s = updateActivePlayer(s, p => ({ ...p, job: { ...job, weeksWorked: prevWeeksWorked } }));
        return { ...s, lastJobResult: { success: true, message: `${job.company} hired you as ${job.title} at $${job.wage}/hr!` } };
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
      s = updateActivePlayer(s, p => ({ ...p, job: { ...job, weeksWorked: prevWeeksWorked } }));
      return { ...s, lastJobResult: { success: true, message: `Promoted to ${job.title} at $${job.wage}/hr! 🎉` } };
    }

    // ── Rest at home ──────────────────────────────────────────────────────────
    case 'REST': {
      const { hours = 2 } = action;
      const player = activePlayer(state);
      if (player.timeRemaining < hours) return log(state, "Not enough time to rest.");
      const relaxGain = hours * 5;
      const happGain = hours;
      let s = updateActivePlayer(state, p => ({
        ...p,
        timeRemaining: p.timeRemaining - hours,
        relaxation: Math.min(100, (p.relaxation ?? 50) + relaxGain),
        happiness: Math.min(100, p.happiness + happGain),
      }));
      return log(s, `Rested ${hours}h at home. +${relaxGain} relaxation.`);
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
        const isLottery = item.name?.toLowerCase().includes('lottery');
        const isRest = item.id?.startsWith('rest_home');
        const lotteryVerb = hBoost > 0 ? '🎰 JACKPOT!' : '🎰 No luck.';
        const verb = isRest ? `😴 Rested at home.` : isLottery ? lotteryVerb : `Enjoyed ${item.name}!`;
        const hStr = hBoost > 0 ? `+${hBoost}` : hBoost < 0 ? `${hBoost}` : '';
        const parts = [hStr ? `${hStr} happiness` : '', rBoost ? `+${rBoost} relaxation` : ''].filter(Boolean);
        let s = log(state, `${verb}${parts.length ? ' ' + parts.join(', ') + '.' : ''}`);
        if (timeCost > 0 && activePlayer(s).timeRemaining < timeCost) {
          return log(state, `Not enough time to rest (need ${timeCost}h).`);
        }
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
          // Replace old vehicle
          let s = log(state, `Traded in ${existingVehicle.name} for ${item.name}.`);
          s = updateActivePlayer(s, p => ({
            ...p,
            money: p.money - item.cost + Math.floor(existingVehicle.cost * 0.5),
            inventory: [...p.inventory.filter(i => i.id !== existingVehicle.id), item],
          }));
          return s;
        }
      }

      let s = log(state, `Bought ${item.name} for $${item.cost}.`);
      s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item] }));
      return s;
    }

    // ── Sell item ─────────────────────────────────────────────────────────────
    case 'SELL_ITEM': {
      const { item } = action;
      const player = activePlayer(state);
      const sellPrice = Math.floor(item.cost * 0.5);
      const idx = player.inventory.findIndex(i => i.id === item.id);
      if (idx === -1) return state;

      let s = log(state, `Sold ${item.name} for $${sellPrice}.`);
      s = updateActivePlayer(s, p => {
        const inv = [...p.inventory];
        inv.splice(idx, 1);
        return { ...p, money: p.money + sellPrice, inventory: inv };
      });
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

      let s = log(state, `${player.name} enrolled in ${course.title}.`);
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
        let s = log(state, `${player.name} completed ${player.currentCourse.title}! Earned: ${player.currentCourse.degree}.`);
        s = updateActivePlayer(s, p => ({ ...p, education: p.currentCourse.degree, currentCourse: null, timeRemaining: p.timeRemaining - 10 }));
        return autoEndIfNeeded(s);
      }

      let s = log(state, `Studied 10hrs. Progress: ${newProgress}/${player.currentCourse.totalHours}`);
      s = updateActivePlayer(s, p => ({ ...p, timeRemaining: p.timeRemaining - 10, currentCourse: { ...p.currentCourse, progress: newProgress } }));
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

      let s = log(state, `${player.name} moved into ${housing.title}.${deposit > 0 ? ` -$${deposit} deposit.` : ''}`);
      s = updateActivePlayer(s, p => ({ ...p, housing, hasChosenHousing: true, money: p.money - deposit }));
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
        msg = `Deposited $${amount} into savings.`;
      } else if (transactionType === 'withdraw') {
        if (savings < amount) return log(state, "Not enough in savings.");
        savings -= amount; money += amount;
        msg = `Withdrew $${amount} from savings.`;
      } else if (transactionType === 'repay') {
        const payAmount = Math.min(amount, debt);
        if (money < payAmount) return log(state, "Not enough cash to repay.");
        money -= payAmount; debt -= payAmount;
        msg = `Repaid $${payAmount} of debt.`;
      } else if (transactionType === 'borrow') {
        // Loan cap: max $5000 total debt
        if (debt >= 5000) {
          const s2 = updateActivePlayer(
            log(state, `Loan denied! You already have $${debt} in debt.`),
            p => ({ ...p, happiness: Math.max(0, p.happiness - 5) })
          );
          return { ...s2, lastJobResult: { success: false, message: 'Loan denied. -5 happiness.' } };
        }
        debt += amount; money += amount;
        msg = `Borrowed $${amount}.`;
      }

      let s = log(state, msg);
      s = updateActivePlayer(s, p => ({ ...p, money, savings, debt }));
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

      const earnings = state.market[symbol] * quantity;
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

      const updatedPlayers = s.players.map((p, i) => {
        let np = { ...p };
        let playerLog = [];

        // 1. Rent
        const moneyAfterRent = np.money - np.housing.rent;
        if (moneyAfterRent < 0) {
          playerLog.push(`${np.name}: couldn't pay rent! $${Math.abs(moneyAfterRent)} debt added.`);
          np.debt += Math.abs(moneyAfterRent);
          np.money = 0;
        } else {
          np.money = moneyAfterRent;
          playerLog.push(`${np.name}: rent paid $${np.housing.rent}.`);
        }

        // 2. Hunger
        np.hunger = Math.min(100, np.hunger + 25);

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
        if (!np.job) depDelta -= 5; // unemployed penalty
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
            np.job = null;
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
        if (np.relaxation === 0) {
          const hasInsurance = np.inventory.some(i => i.id === 'health_insurance');
          const doctorCost = hasInsurance ? 50 : 200;
          np.money = Math.max(0, np.money - doctorCost);
          np.maxTimeReduction = (np.maxTimeReduction || 0) + 5;
          playerLog.push(`${np.name}: exhaustion sent them to the doctor! -$${doctorCost}, -5h next week.`);
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
        const weeklyMealIdx = np.inventory.findIndex(i => i.type === 'weekly_meal');
        let ateThisWeek = false;
        if (weeklyMealIdx !== -1) {
          const meal = np.inventory[weeklyMealIdx];
          np.inventory = np.inventory.filter((_, idx) => idx !== weeklyMealIdx);
          np.hunger = Math.max(0, np.hunger - (meal.weeklyHungerRestore || 55));
          if (meal.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + meal.weeklyHappinessBoost);
          playerLog.push(`${np.name}: ate weekly meals (${meal.name}). Hunger down.`);
          ateThisWeek = true;
        }

        // 6ab. Weekly coffee plans (Coffee Shop) — auto-applied at week's end
        const weeklyCoffeeIdx = np.inventory.findIndex(i => i.type === 'weekly_coffee');
        if (weeklyCoffeeIdx !== -1) {
          const coffee = np.inventory[weeklyCoffeeIdx];
          np.inventory = np.inventory.filter((_, idx) => idx !== weeklyCoffeeIdx);
          np.hunger = Math.max(0, np.hunger - (coffee.weeklyHungerRestore || 12));
          if (coffee.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + coffee.weeklyHappinessBoost);
          playerLog.push(`${np.name}: weekly coffee fix (${coffee.name}). +Happiness.`);
          ateThisWeek = true;
        }

        // 6b. Grocery storage — consume 1 serving (fridge) or spoil (no fridge → food poisoning)
        const hasFridge = np.inventory.some(i => i.id === 'refrigerator');
        const hasFreezer = np.inventory.some(i => i.id === 'freezer');
        const hasStorage = hasFridge || hasFreezer;
        const groceryIdx = np.inventory.findIndex(i => i.id === 'groceries');
        if (groceryIdx !== -1) {
          if (hasStorage) {
            // Eat one serving — reduces hunger significantly
            np.inventory = np.inventory.filter((_, idx) => idx !== groceryIdx);
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
          // No food at all — full graduated penalty
          if (np.hunger >= 80)      hungryPenalty = 20;
          else if (np.hunger >= 50) hungryPenalty = 10;
          else                      hungryPenalty = 5;
          np.hungerWarning = { hunger: np.hunger, penalty: hungryPenalty, hadSomeFood: false, playerName: np.name };
          playerLog.push(`${np.name}: went hungry (no food bought)! -${hungryPenalty}h next week.`);
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
        economy = ECONOMY_STATES[(idx + 1) % ECONOMY_STATES.length];
        economyTimer = 4 + Math.floor(Math.random() * 4);
        s = log(s, `Economy shifted to ${economy}!`);
      }

      // 9. Stock prices
      const newMarket = { ...s.market };
      stocksData.forEach(stock => {
        const current = newMarket[stock.symbol];
        const change = (Math.random() * stock.volatility * 2) - stock.volatility;
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
              effectDesc = `-$${extra} extra rent`;
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
      const jonesIncome = Math.floor(jones.jobWage * 40 * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));
      const jonesMoney = jones.money + jonesIncome - jones.rent;
      let newJonesJobIndex = jones.jobIndex;
      let newJonesWeeksAtJob = jones.weeksAtJob + 1;
      const nextJobEntry = JONES_CAREER_TRACK[jones.jobIndex + 1];
      if (nextJobEntry && newJonesWeeksAtJob >= nextJobEntry.weeksNeeded) {
        newJonesJobIndex = jones.jobIndex + 1;
        newJonesWeeksAtJob = 0;
        s = log(s, `💼 Jones got promoted to ${nextJobEntry.title}!`);
      }
      const nextEdu = JONES_EDUCATION_TRACK.find(e => e.week === s.week + 1);
      const updatedJones = {
        ...jones,
        money: Math.max(0, jonesMoney),
        netWorth: Math.max(0, jonesMoney),
        currentLocation: LOCATION_ORDER[Math.floor(Math.random() * LOCATION_ORDER.length)],
        happiness: Math.min(100, jones.happiness + 3),
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
