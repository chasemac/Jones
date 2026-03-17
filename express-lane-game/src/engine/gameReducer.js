import {
  DIFFICULTY_PRESETS,
  ECONOMY_STATES,
  ECONOMY_WAGE_MULTIPLIER,
  meetsEducation,
  LOCATION_ORDER,
  JONES_CAREER_TRACK,
  JONES_EDUCATION_TRACK,
  travelCost,
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
  currentLocation: 'leasing_office',
  savings: 0,
  debt: 0,
  hunger: 0,
  portfolio: {},
  currentCourse: null,
  inventory: [],
  weekDone: false, // has this player ended their turn this week?
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
      return buildInitialState(action.difficulty, action.playerCount || 1);
    }

    case 'START_GAME': {
      return { ...state, gameStatus: 'playing' };
    }

    // ── Travel ────────────────────────────────────────────────────────────────
    case 'TRAVEL': {
      const { locationId } = action;
      const player = activePlayer(state);
      if (player.currentLocation === locationId) return state;

      const cost = travelCost(player.currentLocation, locationId);
      if (player.timeRemaining < cost) {
        return log(state, `Not enough time to travel there (need ${cost}h, have ${player.timeRemaining}h).`);
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

      const newTime = activePlayer(s).timeRemaining - cost;
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
      const { job } = action;
      const player = activePlayer(state);

      if (job.requirements?.experience) {
        const weeksWorked = player.job?.weeksWorked || 0;
        if (weeksWorked < job.requirements.experience) {
          return { ...log(state, `Rejected! Need ${job.requirements.experience} weeks of experience.`), lastJobResult: { success: false, message: `Need ${job.requirements.experience} weeks of experience.` } };
        }
      }
      if (job.requirements?.education && !meetsEducation(player.education, job.requirements.education)) {
        return { ...log(state, `Rejected! Need a ${job.requirements.education}.`), lastJobResult: { success: false, message: `Need a ${job.requirements.education}.` } };
      }
      if (job.requirements?.item && !player.inventory.some(i => i.id === job.requirements.item)) {
        const itemName = job.requirements.item.replace(/_/g, ' ');
        return { ...log(state, `Rejected! Need: ${itemName}.`), lastJobResult: { success: false, message: `You need: ${itemName}.` } };
      }
      if (job.requirements?.dependability && player.dependability < job.requirements.dependability) {
        return { ...log(state, `Rejected! Need ${job.requirements.dependability} dependability (you have ${player.dependability}).`), lastJobResult: { success: false, message: `Need ${job.requirements.dependability} dependability.` } };
      }

      let s = log(state, `${player.name} hired as ${job.title}!`);
      s = updateActivePlayer(s, p => ({ ...p, job: { ...job, weeksWorked: p.job?.weeksWorked || 0 } }));
      return { ...s, lastJobResult: { success: true, message: `You are now a ${job.title} at $${job.wage}/hr.` } };
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
        }));
        return autoEndIfNeeded(s);
      }

      // Food storage items (groceries): require fridge/freezer, add to inventory as consumable
      if (item.type === 'food_storage') {
        const hasFridge = player.inventory.some(i => i.id === 'refrigerator');
        const hasFreezer = player.inventory.some(i => i.id === 'freezer');
        if (!hasFridge && !hasFreezer) return log(state, "You need a Refrigerator or Freezer to store groceries!");
        const maxStorage = hasFreezer ? 4 : 2;
        const currentServings = player.inventory.filter(i => i.id === 'groceries').length;
        if (currentServings >= maxStorage) return log(state, `Storage full! (${currentServings}/${maxStorage} servings)`);
        let s = log(state, `Bought groceries (+1 week of food stored).`);
        s = updateActivePlayer(s, p => ({ ...p, money: p.money - item.cost, inventory: [...p.inventory, item] }));
        return s;
      }

      // Entertainment items (concert tickets etc): apply boosts immediately, don't add to inventory
      if (item.type === 'entertainment') {
        let s = log(state, `Enjoyed ${item.name}! +${item.happinessBoost || 0} happiness, +${item.relaxationBoost || 0} relaxation.`);
        s = updateActivePlayer(s, p => ({
          ...p,
          money: p.money - item.cost,
          happiness: Math.min(100, p.happiness + (item.happinessBoost || 0)),
          relaxation: Math.min(100, p.relaxation + (item.relaxationBoost || 0)),
        }));
        return s;
      }

      const alreadyOwned = player.inventory.some(i => i.id === item.id);
      if (alreadyOwned && item.type !== 'food') return log(state, `You already own ${item.name}.`);

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
      let s = log(state, `${player.name} moved into ${housing.title}.`);
      s = updateActivePlayer(s, p => ({ ...p, housing }));
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
        if (np.inventory.some(i => i.id === 'smart_watch')) happinessDelta += 5;
        if (np.inventory.some(i => i.id === 'streaming_sub')) {
          happinessDelta += 4;
          np.money = Math.max(0, np.money - 15);
          playerLog.push(`${np.name}: streaming sub -$15.`);
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

        // 3d. Clothing wear (each clothing item loses 10 durability/week)
        const wornOut = [];
        np.inventory = np.inventory.map(item => {
          if (item.clothingWear !== undefined) {
            const newWear = item.clothingWear - 10;
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

        // 3e. Relaxation bottomed out → forced doctor visit
        if (np.relaxation === 0) {
          const doctorCost = 200;
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

        // 6. Food storage — consume 1 serving from fridge/freezer if available
        const hasFridge = np.inventory.some(i => i.id === 'refrigerator');
        const hasFreezer = np.inventory.some(i => i.id === 'freezer');
        const hasStorage = hasFridge || hasFreezer;
        const groceryIdx = np.inventory.findIndex(i => i.id === 'groceries');
        if (hasStorage && groceryIdx !== -1) {
          // Consume one serving of groceries; reduces hunger significantly
          np.inventory = np.inventory.filter((_, idx) => idx !== groceryIdx);
          np.hunger = Math.max(0, np.hunger - 60);
          playerLog.push(`${np.name}: ate from fridge. Hunger down.`);
        }

        // 7. Hunger → time penalty (authentic: flat -20h if starving)
        const reduction = (np.maxTimeReduction || 0) + (np.hunger >= 80 ? 20 : 0);
        np.maxTime = Math.max(20, BASE_MAX_TIME - reduction);
        if (np.hunger >= 80) {
          playerLog.push(`${np.name}: starving! -20h next week.`);
        }

        // 7. Reset time, home, done flag
        np.timeRemaining = np.maxTime;
        np.currentLocation = 'leasing_office';
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
        const event = eventsData[Math.floor(Math.random() * eventsData.length)];
        let effectDesc = '';
        const ep = updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)];
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
      };

      return checkEndConditions(s);
    }

    // ── Dismiss event modal ───────────────────────────────────────────────────
    case 'DISMISS_EVENT': {
      return { ...state, pendingEvent: null };
    }

    default:
      return state;
  }
};
