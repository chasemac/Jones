import {
  DIFFICULTY_PRESETS,
  ECONOMY_STATES,
  ECONOMY_WAGE_MULTIPLIER,
  meetsEducation,
  LOCATION_ORDER,
  JONES_CAREER_TRACK,
  JONES_EDUCATION_TRACK,
} from './constants';
import eventsData from '../data/events.json';
import stocksData from '../data/stocks.json';

// ─── Initial State Builder ────────────────────────────────────────────────────
export const buildInitialState = (difficulty = 'normal') => {
  const preset = DIFFICULTY_PRESETS[difficulty];
  const market = {};
  stocksData.forEach(s => { market[s.symbol] = s.basePrice; });

  return {
    gameStatus: 'start',
    difficulty,
    week: 1,
    economy: 'Normal',
    economyTimer: 5,
    player: {
      name: 'Player 1',
      money: preset.startingMoney,
      happiness: 50,
      maxTime: 60,
      timeRemaining: 60,
      education: 'High School',
      job: null,
      housing: { id: 'shared_apt', title: 'Shared Apartment', rent: 200, happiness: 0, security: 'Low' },
      currentLocation: 'leasing_office',
      savings: 0,
      debt: 0,
      hunger: 0,         // 0–100; 100 = starving
      portfolio: {},
      currentCourse: null,
      inventory: [],
    },
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

// ─── Helper: add log entry ─────────────────────────────────────────────────────
const log = (state, message) => ({
  ...state,
  history: [`Week ${state.week}: ${message}`, ...state.history].slice(0, 50),
});

// ─── Win / Lose Check ─────────────────────────────────────────────────────────
const checkEndConditions = (state) => {
  const { player, difficulty } = state;
  const goals = DIFFICULTY_PRESETS[difficulty].goals;
  const netWorth = player.money + player.savings - player.debt;

  const wealthMet = netWorth >= goals.wealth;
  const happinessMet = player.happiness >= goals.happiness;
  const educationMet = meetsEducation(player.education, goals.education);
  const careerMet = player.job && player.job.wage >= goals.careerWage;

  if (wealthMet && happinessMet && educationMet && careerMet) {
    return { ...state, gameStatus: 'won' };
  }
  if (player.happiness <= 0) {
    return { ...state, gameStatus: 'lost' };
  }
  return state;
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
export const gameReducer = (state, action) => {
  switch (action.type) {

    // ── Game lifecycle ────────────────────────────────────────────────────────
    case 'INIT_GAME': {
      return buildInitialState(action.difficulty);
    }

    case 'START_GAME': {
      return { ...state, gameStatus: 'playing' };
    }

    // ── Travel ────────────────────────────────────────────────────────────────
    case 'TRAVEL': {
      const { locationId } = action;
      if (state.player.currentLocation === locationId) return state;
      if (state.player.timeRemaining < 1) {
        return log(state, "Not enough time to travel!");
      }

      let s = state;

      // Wild Willy: 30% chance when leaving Black's Market (only in Low-security housing)
      if (
        state.player.currentLocation === 'blacks_market' &&
        state.player.housing.security === 'Low' &&
        Math.random() < 0.3
      ) {
        const stolen = Math.floor(state.player.money * 0.5);
        if (stolen > 0) {
          s = log(s, `👹 WILD WILLY stole $${stolen} from you!`);
          s = { ...s, player: { ...s.player, money: s.player.money - stolen } };
        } else {
          s = log(s, `👹 Wild Willy tried to rob you, but you're broke!`);
        }
      }

      return {
        ...s,
        player: {
          ...s.player,
          currentLocation: locationId,
          timeRemaining: s.player.timeRemaining - 1,
        },
      };
    }

    // ── Work current job ──────────────────────────────────────────────────────
    case 'WORK': {
      const { player, economy } = state;
      if (!player.job) return log(state, "You don't have a job!");
      if (player.timeRemaining < 8) return log(state, "Not enough time to work a full shift.");

      const multiplier = ECONOMY_WAGE_MULTIPLIER[economy];
      const earnings = Math.floor(player.job.wage * 8 * multiplier);
      const newWeeksWorked = (player.job.weeksWorked || 0) + 1;

      let s = log(state, `Worked shift as ${player.job.title}. Earned $${earnings}.`);
      s = {
        ...s,
        player: {
          ...s.player,
          money: s.player.money + earnings,
          timeRemaining: s.player.timeRemaining - 8,
          job: { ...s.player.job, weeksWorked: newWeeksWorked },
        },
      };
      return s;
    }

    // ── Gig work (no job required) ────────────────────────────────────────────
    case 'GIG_WORK': {
      const hasPhone = state.player.inventory.some(i => i.id === 'smartphone');
      if (!hasPhone) return log(state, "You need a smartphone to do gig work!");
      if (state.player.timeRemaining < 4) return log(state, "Not enough time for a gig shift.");

      const multiplier = ECONOMY_WAGE_MULTIPLIER[state.economy];
      const earnings = Math.floor(60 * multiplier);

      let s = log(state, `Completed gig delivery. Earned $${earnings}.`);
      return {
        ...s,
        player: { ...s.player, money: s.player.money + earnings, timeRemaining: s.player.timeRemaining - 4 },
      };
    }

    // ── Apply for job ─────────────────────────────────────────────────────────
    case 'APPLY_FOR_JOB': {
      const { job } = action;
      const { player } = state;

      if (job.requirements?.experience) {
        const weeksWorked = player.job?.weeksWorked || 0;
        if (weeksWorked < job.requirements.experience) {
          return {
            ...log(state, `Rejected! Need ${job.requirements.experience} weeks of experience.`),
            lastJobResult: { success: false, message: `Need ${job.requirements.experience} weeks of experience.` },
          };
        }
      }

      if (job.requirements?.education) {
        if (!meetsEducation(player.education, job.requirements.education)) {
          return {
            ...log(state, `Rejected! Need a ${job.requirements.education}.`),
            lastJobResult: { success: false, message: `Need a ${job.requirements.education}.` },
          };
        }
      }

      if (job.requirements?.item) {
        const hasItem = player.inventory.some(i => i.id === job.requirements.item);
        if (!hasItem) {
          const itemName = job.requirements.item.replace(/_/g, ' ');
          return {
            ...log(state, `Rejected! Need: ${itemName}.`),
            lastJobResult: { success: false, message: `You need: ${itemName}.` },
          };
        }
      }

      let s = log(state, `Hired as ${job.title}!`);
      return {
        ...s,
        player: { ...s.player, job: { ...job, weeksWorked: player.job?.weeksWorked || 0 } },
        lastJobResult: { success: true, message: `You are now a ${job.title} at $${job.wage}/hr.` },
      };
    }

    // ── Buy item ──────────────────────────────────────────────────────────────
    case 'BUY_ITEM': {
      const { item } = action;
      const { player } = state;

      if (player.money < item.cost) return log(state, `Not enough money for ${item.name}.`);

      // Food items: consume immediately, reduce hunger, boost happiness
      if (item.type === 'food') {
        const hungerReduction = item.hungerRestore || 30;
        const happinessBoost = item.happinessBoost || 5;
        let s = log(state, `Ate ${item.name}. Yum! (-${hungerReduction} hunger)`);
        return {
          ...s,
          player: {
            ...s.player,
            money: s.player.money - item.cost,
            hunger: Math.max(0, s.player.hunger - hungerReduction),
            happiness: Math.min(100, s.player.happiness + happinessBoost),
            timeRemaining: Math.max(0, s.player.timeRemaining - (item.timeToEat || 1)),
          },
        };
      }

      // Subscription items: track separately
      if (item.type === 'subscription') {
        const alreadyOwned = player.inventory.some(i => i.id === item.id);
        if (alreadyOwned) return log(state, `You already have ${item.name}.`);
      }

      // Durable items: don't allow duplicates (except food)
      const alreadyOwned = player.inventory.some(i => i.id === item.id);
      if (alreadyOwned && item.type !== 'food') return log(state, `You already own ${item.name}.`);

      let s = log(state, `Bought ${item.name} for $${item.cost}.`);
      return {
        ...s,
        player: {
          ...s.player,
          money: s.player.money - item.cost,
          inventory: [...s.player.inventory, item],
        },
      };
    }

    // ── Sell item ─────────────────────────────────────────────────────────────
    case 'SELL_ITEM': {
      const { item } = action;
      const sellPrice = Math.floor(item.cost * 0.5);
      const idx = state.player.inventory.findIndex(i => i.id === item.id);
      if (idx === -1) return state;

      const newInventory = [...state.player.inventory];
      newInventory.splice(idx, 1);

      let s = log(state, `Sold ${item.name} for $${sellPrice}.`);
      return {
        ...s,
        player: { ...s.player, money: s.player.money + sellPrice, inventory: newInventory },
      };
    }

    // ── Enroll in course ──────────────────────────────────────────────────────
    case 'ENROLL': {
      const { course } = action;
      const { player } = state;

      if (player.currentCourse) return log(state, "Already enrolled in a course. Finish it first.");

      if (course.requirements?.item) {
        const hasItem = player.inventory.some(i => i.id === course.requirements.item);
        if (!hasItem) {
          return log(state, `Need a ${course.requirements.item.replace(/_/g, ' ')} to enroll.`);
        }
      }

      if (player.money < course.cost) return log(state, "Not enough money for tuition.");

      let s = log(state, `Enrolled in ${course.title}.`);
      return {
        ...s,
        player: {
          ...s.player,
          money: s.player.money - course.cost,
          currentCourse: { ...course, progress: 0 },
        },
      };
    }

    // ── Study ─────────────────────────────────────────────────────────────────
    case 'STUDY': {
      const { player } = state;
      if (!player.currentCourse) return log(state, "Not enrolled in any course.");
      if (player.timeRemaining < 10) return log(state, "Need 10 hours to study.");

      const newProgress = player.currentCourse.progress + 10;

      if (newProgress >= player.currentCourse.totalHours) {
        let s = log(state, `Completed ${player.currentCourse.title}! Earned: ${player.currentCourse.degree}.`);
        return {
          ...s,
          player: {
            ...s.player,
            education: player.currentCourse.degree,
            currentCourse: null,
            timeRemaining: s.player.timeRemaining - 10,
          },
        };
      }

      let s = log(state, `Studied 10hrs. Progress: ${newProgress}/${player.currentCourse.totalHours}`);
      return {
        ...s,
        player: {
          ...s.player,
          timeRemaining: s.player.timeRemaining - 10,
          currentCourse: { ...s.player.currentCourse, progress: newProgress },
        },
      };
    }

    // ── Rent apartment ────────────────────────────────────────────────────────
    case 'RENT_APARTMENT': {
      const { housing } = action;
      let s = log(state, `Moved into ${housing.title}. New rent: $${housing.rent}/week.`);
      return { ...s, player: { ...s.player, housing } };
    }

    // ── Bank transactions ─────────────────────────────────────────────────────
    case 'BANK_TRANSACTION': {
      const { transactionType, amount } = action;
      if (amount <= 0) return state;
      const { player } = state;
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
        debt += amount; money += amount;
        msg = `Borrowed $${amount}.`;
      }

      let s = log(state, msg);
      return { ...s, player: { ...s.player, money, savings, debt } };
    }

    // ── Stock trading ─────────────────────────────────────────────────────────
    case 'BUY_STOCK': {
      const { symbol, quantity } = action;
      const price = state.market[symbol];
      const cost = price * quantity;
      if (state.player.money < cost) return log(state, "Not enough money to buy stock.");

      const currentQty = state.player.portfolio[symbol] || 0;
      let s = log(state, `Bought ${quantity} shares of ${symbol} for $${cost}.`);
      return {
        ...s,
        player: {
          ...s.player,
          money: s.player.money - cost,
          portfolio: { ...s.player.portfolio, [symbol]: currentQty + quantity },
        },
      };
    }

    case 'SELL_STOCK': {
      const { symbol, quantity } = action;
      const currentQty = state.player.portfolio[symbol] || 0;
      if (currentQty < quantity) return log(state, "Not enough shares to sell.");

      const price = state.market[symbol];
      const earnings = price * quantity;
      let s = log(state, `Sold ${quantity} shares of ${symbol} for $${earnings}.`);
      return {
        ...s,
        player: {
          ...s.player,
          money: s.player.money + earnings,
          portfolio: { ...s.player.portfolio, [symbol]: currentQty - quantity },
        },
      };
    }

    // ── End Week (the big one) ────────────────────────────────────────────────
    case 'END_WEEK': {
      let s = { ...state };
      let p = { ...s.player };
      let { jones } = s;

      // 1. Rent deduction
      let moneyAfterRent = p.money - p.housing.rent;
      if (moneyAfterRent < 0) {
        // Can't pay rent → add shortfall to debt
        s = log(s, `Couldn't pay rent ($${p.housing.rent})! $${Math.abs(moneyAfterRent)} added to debt.`);
        p.debt = p.debt + Math.abs(moneyAfterRent);
        p.money = 0;
      } else {
        p.money = moneyAfterRent;
        s = log(s, `Rent paid: $${p.housing.rent}.`);
      }

      // 2. Hunger increases each week (they need to eat)
      p.hunger = Math.min(100, p.hunger + 25);

      // 3. Happiness changes
      let happinessDelta = -3; // base weekly decay
      happinessDelta += p.housing.happiness || 0; // housing modifier
      if (p.job) happinessDelta += 2; // employed bonus
      else happinessDelta -= 3; // unemployed penalty

      // Item effects on happiness
      if (p.inventory.some(i => i.id === 'smart_watch')) happinessDelta += 5;
      if (p.inventory.some(i => i.id === 'streaming_sub')) {
        happinessDelta += 4;
        p.money = Math.max(0, p.money - 15); // streaming fee
        s = log(s, "Streaming sub charged: -$15.");
      }

      p.happiness = Math.min(100, Math.max(0, p.happiness + happinessDelta));

      // 4. Debt interest (5% per week)
      if (p.debt > 0) {
        const interest = Math.floor(p.debt * 0.05);
        p.debt += interest;
        s = log(s, `Debt interest charged: $${interest}.`);
      }

      // 5. Savings interest (1% per week)
      if (p.savings > 0) {
        const interest = Math.floor(p.savings * 0.01);
        p.savings += interest;
        if (interest > 0) s = log(s, `Savings interest earned: $${interest}.`);
      }

      // 6. Apply hunger penalty to next week's max time (authentic mechanic)
      const BASE_MAX_TIME = 60;
      if (p.hunger > 75) {
        p.maxTime = Math.max(30, BASE_MAX_TIME - 15);
        s = log(s, `You're starving! Lost 15hrs of time next week.`);
      } else if (p.hunger > 40) {
        p.maxTime = Math.max(40, BASE_MAX_TIME - 5);
        s = log(s, `Hunger is slowing you down. Lost 5hrs next week.`);
      } else {
        p.maxTime = BASE_MAX_TIME; // restore if well-fed
      }

      // Reset time bar and return player home
      p.timeRemaining = p.maxTime;
      p.currentLocation = 'leasing_office';

      // 7. Update economy state
      let { economy, economyTimer } = s;
      economyTimer -= 1;
      if (economyTimer <= 0) {
        const idx = ECONOMY_STATES.indexOf(economy);
        economy = ECONOMY_STATES[(idx + 1) % ECONOMY_STATES.length];
        economyTimer = 4 + Math.floor(Math.random() * 4); // 4–7 weeks
        s = log(s, `Economy shifted to ${economy}!`);
      }

      // 8. Update stock prices
      const newMarket = { ...s.market };
      stocksData.forEach(stock => {
        const current = newMarket[stock.symbol];
        const change = (Math.random() * stock.volatility * 2) - stock.volatility;
        newMarket[stock.symbol] = Math.max(1, Math.floor(current * (1 + change)));
      });

      // 9. Random event (40% chance)
      let pendingEvent = null;
      if (Math.random() < 0.4) {
        const event = eventsData[Math.floor(Math.random() * eventsData.length)];
        let effectDesc = '';
        switch (event.effect.type) {
          case 'money':
            p.money = Math.max(0, p.money + event.effect.value);
            effectDesc = event.effect.value >= 0 ? `+$${event.effect.value}` : `-$${Math.abs(event.effect.value)}`;
            break;
          case 'time_loss':
            // Time is already reset, so reduce next week's start
            p.maxTime = Math.max(20, p.maxTime - Math.floor(p.maxTime * event.effect.value));
            effectDesc = `-${Math.floor(event.effect.value * 100)}% time next week`;
            break;
          case 'rent_increase':
            const extra = Math.floor(p.housing.rent * event.effect.value);
            p.money = Math.max(0, p.money - extra);
            effectDesc = `-$${extra} extra rent`;
            break;
          case 'savings_interest_bonus':
            const bonus = Math.floor(p.savings * event.effect.value);
            p.savings += bonus;
            effectDesc = `+$${bonus} savings bonus`;
            break;
          case 'savings_loss':
            const loss = Math.floor(p.savings * event.effect.value);
            p.savings = Math.max(0, p.savings - loss);
            effectDesc = `-$${loss} from savings`;
            break;
          case 'happiness':
            p.happiness = Math.min(100, Math.max(0, p.happiness + event.effect.value));
            effectDesc = `${event.effect.value > 0 ? '+' : ''}${event.effect.value} happiness`;
            break;
          case 'job_loss':
            if (p.job) { p.job = null; effectDesc = 'you lost your job!'; }
            else effectDesc = 'no effect (not employed)';
            break;
          default:
            break;
        }
        pendingEvent = { title: event.title, description: event.description, effectDesc };
      }

      // 10. Jones AI turn
      const jonesIncome = Math.floor(jones.jobWage * 40 * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));
      const jonesMoney = jones.money + jonesIncome - jones.rent;
      const jonesHappiness = Math.min(100, jones.happiness + 3);

      // Jones career progression
      let newJonesJobIndex = jones.jobIndex;
      let newJonesWeeksAtJob = jones.weeksAtJob + 1;
      const nextJobEntry = JONES_CAREER_TRACK[jones.jobIndex + 1];
      if (nextJobEntry && newJonesWeeksAtJob >= nextJobEntry.weeksNeeded) {
        newJonesJobIndex = jones.jobIndex + 1;
        newJonesWeeksAtJob = 0;
        s = log(s, `💼 Jones got promoted to ${nextJobEntry.title}!`);
      }

      // Jones education progression
      let jonesEducation = jones.education;
      const nextEdu = JONES_EDUCATION_TRACK.find(e => e.week === s.week + 1);
      if (nextEdu) jonesEducation = nextEdu.degree;

      const jonesLocation = LOCATION_ORDER[Math.floor(Math.random() * LOCATION_ORDER.length)];

      const updatedJones = {
        ...jones,
        money: Math.max(0, jonesMoney),
        netWorth: Math.max(0, jonesMoney),
        currentLocation: jonesLocation,
        happiness: jonesHappiness,
        education: jonesEducation,
        jobIndex: newJonesJobIndex,
        jobTitle: JONES_CAREER_TRACK[newJonesJobIndex].title,
        jobWage: JONES_CAREER_TRACK[newJonesJobIndex].wage,
        weeksAtJob: newJonesWeeksAtJob,
      };

      // 11. Assemble new state
      s = {
        ...s,
        week: s.week + 1,
        economy,
        economyTimer,
        market: newMarket,
        pendingEvent,
        player: p,
        jones: updatedJones,
      };

      // 12. Check win/lose
      s = checkEndConditions(s);

      return s;
    }

    // ── Dismiss event modal ───────────────────────────────────────────────────
    case 'DISMISS_EVENT': {
      return { ...state, pendingEvent: null };
    }

    default:
      return state;
  }
};
