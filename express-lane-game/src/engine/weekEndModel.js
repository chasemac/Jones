/**
 * weekEndModel.js — End-of-week processing logic extracted from the reducer.
 *
 * Pure functions that compute the next state for each player at week's end,
 * Jones AI progression, random events, and economy/market transitions.
 */
import {
  ECONOMY_STATES,
  ECONOMY_WAGE_MULTIPLIER,
  LOCATION_ORDER,
  JONES_CAREER_TRACK,
  JONES_EDUCATION_TRACK,
} from './constants';
import eventsData from '../data/events.json';
import stocksData from '../data/stocks.json';

const BASE_MAX_TIME = 60;

/**
 * Process a single player's end-of-week upkeep.
 * Returns { player, logEntries } with the mutated player copy and log messages.
 */
export function processPlayerWeekEnd(player) {
  const np = { ...player };
  const logEntries = [];

  // 1. Rent
  const moneyAfterRent = np.money - np.housing.rent;
  if (moneyAfterRent < 0) {
    const shortfall = Math.abs(moneyAfterRent);
    logEntries.push(`${np.name}: couldn't pay rent! $${shortfall} debt added.`);
    np.debt += shortfall;
    np.money = 0;
    np.happiness = Math.max(0, np.happiness - 5);
  } else {
    np.money = moneyAfterRent;
    logEntries.push(`${np.name}: rent paid $${np.housing.rent}.`);
  }

  // 2. Hunger increase
  const hungerIncrease = np.housing.homeType === 'luxury_condo' ? 20 : 25;
  np.hunger = Math.min(100, np.hunger + hungerIncrease);

  // 3. Happiness
  let happinessDelta = -3;
  happinessDelta += np.housing.happiness || 0;
  if (np.job) happinessDelta += 2; else happinessDelta -= 3;
  for (const item of np.inventory) {
    if (item.weeklyHappinessBoost) happinessDelta += item.weeklyHappinessBoost;
    if (item.weeklyFee) {
      np.money = Math.max(0, np.money - item.weeklyFee);
      logEntries.push(`${np.name}: ${item.name} -$${item.weeklyFee}.`);
    }
  }
  np.happiness = Math.min(100, Math.max(0, np.happiness + happinessDelta));

  // 3b. Dependability decay
  let depDelta = -3;
  if (!np.job) {
    depDelta -= 5;
    if (np.dependability < 30) np.happiness = Math.max(0, np.happiness - 2);
  }
  np.dependability = Math.min(100, Math.max(0, np.dependability + depDelta));

  // 3c. Relaxation decay
  let relaxDelta = -5;
  if (np.inventory.some(i => i.id === 'hot_tub')) relaxDelta += 3;
  if (np.housing.id === 'luxury_condo') relaxDelta += 3;
  np.relaxation = Math.max(0, Math.min(100, np.relaxation + relaxDelta));

  // 3d. Clothing wear
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
    logEntries.push(`${np.name}: ${worn.name} wore out!`);
    if (np.job && np.job.requirements?.item === worn.id) {
      const lostJobTitle = np.job.title;
      np.job = null;
      np.clothingWarning = { itemName: worn.name, jobTitle: lostJobTitle, playerName: np.name };
      logEntries.push(`${np.name}: lost their job — need proper clothing!`);
    }
  }

  for (const item of np.inventory) {
    if (item.clothingWear !== undefined && item.clothingWear <= 30 && item.clothingWear > 0) {
      logEntries.push(`${np.name}: ⚠️ ${item.name} is wearing thin! (${item.clothingWear}% left)`);
    }
  }

  // 3e. Relaxation bottomed out → forced doctor visit
  if (np.relaxation <= 0) {
    const hasInsurance = np.inventory.some(i => i.id === 'health_insurance');
    const doctorCost = hasInsurance ? 50 : 200;
    np.money = Math.max(0, np.money - doctorCost);
    np.relaxation = 30;
    np.maxTimeReduction = (np.maxTimeReduction || 0) + 5;
    np.happiness = Math.max(0, np.happiness - 5);
    logEntries.push(`${np.name}: exhaustion sent them to the doctor! -$${doctorCost}, -5h & -5 happiness next week.`);
  }

  // 4. Debt interest
  if (np.debt > 0) {
    const interest = Math.floor(np.debt * 0.05);
    np.debt += interest;
    logEntries.push(`${np.name}: debt interest -$${interest}.`);
  }

  // 5. Savings interest
  if (np.savings > 0) {
    const interest = Math.floor(np.savings * 0.01);
    np.savings += interest;
    if (interest > 0) logEntries.push(`${np.name}: savings +$${interest}.`);
  }

  // 6a. Weekly meal plans
  const meal = np.inventory.find(i => i.type === 'weekly_meal');
  let ateThisWeek = false;
  if (meal) {
    np.inventory = np.inventory.filter(i => i !== meal);
    np.hunger = Math.max(0, np.hunger - (meal.weeklyHungerRestore || 55));
    if (meal.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + meal.weeklyHappinessBoost);
    logEntries.push(`${np.name}: ate weekly meals (${meal.name}). Hunger down.`);
    ateThisWeek = true;
  }

  // 6ab. Weekly coffee plans
  const coffee = np.inventory.find(i => i.type === 'weekly_coffee');
  if (coffee) {
    np.inventory = np.inventory.filter(i => i !== coffee);
    np.hunger = Math.max(0, np.hunger - (coffee.weeklyHungerRestore || 12));
    if (coffee.weeklyHappinessBoost) np.happiness = Math.min(100, np.happiness + coffee.weeklyHappinessBoost);
    logEntries.push(`${np.name}: weekly coffee fix (${coffee.name}). +Happiness.`);
    ateThisWeek = true;
  }

  // 6b. Grocery storage
  const hasFridge = np.inventory.some(i => i.id === 'refrigerator');
  const hasFreezer = np.inventory.some(i => i.id === 'freezer');
  const hasStorage = hasFridge || hasFreezer;
  const groceryItem = np.inventory.find(i => i.id === 'groceries');
  if (groceryItem) {
    if (hasStorage) {
      np.inventory = np.inventory.filter(i => i !== groceryItem);
      np.hunger = Math.max(0, np.hunger - 60);
      logEntries.push(`${np.name}: ate from fridge. Hunger down.`);
      ateThisWeek = true;
    } else {
      np.inventory = np.inventory.filter(i => i.id !== 'groceries');
      np.hunger = Math.min(100, np.hunger + 50);
      logEntries.push(`${np.name}: groceries spoiled (no fridge)! Food poisoning — sick next week.`);
    }
  }

  // 7. Hunger → time penalty
  const ateImmediateFood = np.ateFoodThisWeek || false;
  np.ateFoodThisWeek = false;
  np.hungerWarning = null;
  let hungryPenalty = 0;

  if (ateThisWeek) {
    if (np.hunger >= 80) {
      hungryPenalty = 20;
      logEntries.push(`${np.name}: starving despite eating! -20h next week.`);
    }
  } else if (ateImmediateFood) {
    if (np.hunger >= 80)      hungryPenalty = 10;
    else if (np.hunger >= 50) hungryPenalty = 5;
    if (hungryPenalty > 0) {
      np.hungerWarning = { hunger: np.hunger, penalty: hungryPenalty, hadSomeFood: true, playerName: np.name };
      logEntries.push(`${np.name}: only had snacks — still hungry! -${hungryPenalty}h next week.`);
    }
  } else {
    if (np.hunger >= 80)      hungryPenalty = 20;
    else if (np.hunger >= 50) hungryPenalty = 10;
    else if (np.hunger >= 25) hungryPenalty = 5;
    if (hungryPenalty > 0) {
      np.hungerWarning = { hunger: np.hunger, penalty: hungryPenalty, hadSomeFood: false, playerName: np.name };
      logEntries.push(`${np.name}: went hungry (no food bought)! -${hungryPenalty}h next week.`);
    }
  }

  const reduction = (np.maxTimeReduction || 0) + hungryPenalty;
  np.maxTime = Math.max(20, BASE_MAX_TIME - reduction);
  np.maxTimeReduction = 0;

  // Reset for next week
  np.timeRemaining = np.maxTime;
  np.currentLocation = np.hasChosenHousing ? 'home' : 'leasing_office';
  np.weekDone = false;

  return { player: np, logEntries };
}

/**
 * Advance the economy cycle. Returns { economy, economyTimer, logEntry? }.
 */
export function advanceEconomy(currentEconomy, currentTimer) {
  let economy = currentEconomy;
  let economyTimer = currentTimer - 1;
  let logEntry = null;

  if (economyTimer <= 0) {
    const idx = ECONOMY_STATES.indexOf(economy);
    const prevEconomy = economy;
    economy = ECONOMY_STATES[(idx + 1) % ECONOMY_STATES.length];
    economyTimer = 4 + Math.floor(Math.random() * 4);
    const econEmoji = economy === 'Boom' ? '📈' : economy === 'Depression' ? '📉' : '📊';
    const econEffect = economy === 'Boom' ? 'Wages +30%, prices +40%!' : economy === 'Depression' ? 'Wages -20%, prices -30%.' : 'Wages and prices normalized.';
    logEntry = `${econEmoji} Economy shifted from ${prevEconomy} → ${economy}! ${econEffect}`;
  }

  return { economy, economyTimer, logEntry };
}

/**
 * Simulate stock market price changes. Returns the new market object.
 */
export function tickMarket(currentMarket, economy) {
  const newMarket = { ...currentMarket };
  const economyBias = economy === 'Boom' ? 0.02 : economy === 'Depression' ? -0.02 : 0;
  stocksData.forEach(stock => {
    const current = newMarket[stock.symbol] ?? stock.basePrice;
    const change = (Math.random() * stock.volatility * 2) - stock.volatility + economyBias;
    newMarket[stock.symbol] = Math.max(1, Math.floor(current * (1 + change)));
  });
  return newMarket;
}

/**
 * Roll for a random event and apply it to the target player (mutated in place).
 * Returns { pendingEvent } or { pendingEvent: null } if no event fires.
 */
export function rollRandomEvent(players) {
  if (Math.random() >= 0.4) return { pendingEvent: null };

  const ep = players[Math.floor(Math.random() * players.length)];
  const hasCar = ep.inventory.some(i => i.id === 'car');
  const hasPaidHousing = ep.housing && ep.housing.rent > 0;
  const hasSavings = ep.savings > 0;

  const eligibleEvents = eventsData.filter(ev => {
    if ((ev.id === 'bonus' || ev.id === 'overtime' || ev.id === 'layoff') && !ep.job) return false;
    if (ev.id === 'car_repair' && !hasCar) return false;
    if ((ev.id === 'rent_hike' || ev.id === 'housing_inspection') && !hasPaidHousing) return false;
    if ((ev.id === 'tech_boom' || ev.id === 'market_crash') && !hasSavings) return false;
    return true;
  });

  const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
  if (!event) return { pendingEvent: null };

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
      // Skip if rent hike would push rent unreasonably high (>$200 increase cap)
      if (extra > 200) { effectDesc = 'landlord backed down (unit controlled)'; break; }
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

  return {
    pendingEvent: { title: event.title, description: event.description, effectDesc, playerName: ep.name },
  };
}

/**
 * Advance the Jones AI by one week.
 * Returns { jones, logEntry? } with the updated Jones state.
 */
export function advanceJones(jones, economy, currentWeek) {
  const jonesSpending = 50 + Math.floor(Math.random() * 100);
  const jonesIncome = Math.floor(jones.jobWage * 40 * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));
  const jonesMoney = jones.money + jonesIncome - jones.rent - jonesSpending;

  let newJobIndex = jones.jobIndex;
  let newWeeksAtJob = jones.weeksAtJob + 1;
  let logEntry = null;

  const nextJobEntry = JONES_CAREER_TRACK[jones.jobIndex + 1];
  if (nextJobEntry && newWeeksAtJob >= nextJobEntry.weeksNeeded) {
    newJobIndex = jones.jobIndex + 1;
    newWeeksAtJob = 0;
    logEntry = `💼 Jones got promoted to ${nextJobEntry.title}!`;
  }

  const nextEdu = JONES_EDUCATION_TRACK.find(e => e.week === currentWeek + 1);
  const jonesHappyDelta = Math.random() < 0.3 ? -2 : 3;

  const updatedJones = {
    ...jones,
    money: Math.max(0, jonesMoney),
    netWorth: Math.max(0, jonesMoney),
    currentLocation: LOCATION_ORDER[Math.floor(Math.random() * LOCATION_ORDER.length)],
    happiness: Math.min(100, Math.max(10, jones.happiness + jonesHappyDelta)),
    education: nextEdu ? nextEdu.degree : jones.education,
    jobIndex: newJobIndex,
    jobTitle: JONES_CAREER_TRACK[newJobIndex].title,
    jobWage: JONES_CAREER_TRACK[newJobIndex].wage,
    weeksAtJob: newWeeksAtJob,
  };

  return { jones: updatedJones, logEntry };
}

/**
 * Build the week summary object for display in the WeekSummaryModal.
 */
export function buildWeekSummary(week, updatedPlayers, weekStartSnapshot, fallbackPlayers) {
  return {
    week,
    lines: updatedPlayers.map(p => {
      const old = (weekStartSnapshot || []).find(op => op.name === p.name) || fallbackPlayers.find(op => op.name === p.name);
      const oldNetWorth = (old?.money ?? 0) + (old?.savings ?? 0) - (old?.debt ?? 0);
      const newNetWorth = p.money + p.savings - p.debt;
      return {
        emoji: p.emoji,
        name: p.name,
        money: p.money,
        happiness: p.happiness,
        dependability: p.dependability,
        hunger: p.hunger ?? 0,
        relaxation: p.relaxation ?? 50,
        netWorth: newNetWorth,
        netWorthDelta: newNetWorth - oldNetWorth,
        job: p.job?.title || 'Unemployed',
        currentCourse: p.currentCourse ?? null,
      };
    }),
  };
}
