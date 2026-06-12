// ─── Education Hierarchy ─────────────────────────────────────────────────────
export const EDUCATION_RANK = {
  'High School': 0,
  'Certificate': 1,
  'Bootcamp Certificate': 1,
  'Electrician License': 1,
  'Plumbing License': 1,
  "Associate's": 2,
  // Top-tier trade certifications are rank 3 — equivalent to a Bachelor's.
  // This means completing the trade path fully satisfies the Normal education goal.
  'Engineering Certificate': 3,
  'Master Plumber Certification': 3,
  "Bachelor's": 3,
  "Master's": 4,
  'Graduate Degree': 5,
};

export const meetsEducation = (playerEdu, requiredEdu) => {
  if (!requiredEdu) return true;
  const p = EDUCATION_RANK[playerEdu] ?? 0;
  const r = EDUCATION_RANK[requiredEdu] ?? 0;
  return p >= r;
};

// Returns 0–100 progress toward education goal using rank hierarchy
export const getEducationProgress = (playerEdu, goalEdu) => {
  const maxRank = EDUCATION_RANK[goalEdu] ?? 1;
  const curRank = EDUCATION_RANK[playerEdu] ?? 0;
  return Math.min(100, Math.round((curRank / maxRank) * 100));
};

// Shared net-worth formula used across HUD, Goals, Victory, Header
export const calculateNetWorth = (player) => player.money + player.savings - player.debt + (player.housingEquity || 0);

// Deposit required when upgrading housing (2 weeks of new rent; 0 for downgrades)
export const calculateDeposit = (newRent, currentRent) => (newRent > currentRent ? newRent * 2 : 0);

// Base weekly savings interest rate (NeoBank "Financial Insider" perk overrides this).
export const BASE_SAVINGS_RATE = 0.015;

// Gig-work payout (Dash gig / smartphone delivery) for the current economy.
export const gigEarnings = (economy) => Math.floor(60 * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));

// ─── Core money/upkeep tuning (audit A13: single source of truth) ─────────────
// Weekly interest charged on outstanding debt (5%/wk).
export const DEBT_INTEREST_RATE = 0.05;
// Hard cap on total debt — loans that would exceed it are denied.
export const MAX_DEBT = 5000;
// Forced doctor visit when relaxation bottoms out.
export const DOCTOR_COST = 200;
export const DOCTOR_COST_INSURED = 50;
// Hunger added at each week end (luxury condos have better kitchens).
export const WEEKLY_HUNGER_INCREASE = 25;
export const WEEKLY_HUNGER_INCREASE_LUXURY = 20;
// Hunger thresholds → next-week hour penalties (see weekEndModel matrix).
export const HUNGER_THRESHOLDS = { peckish: 25, hungry: 50, starving: 80 };
export const HUNGER_PENALTIES = { light: 5, medium: 10, severe: 20 };
// Clothing wears 7 points/week; fresh clothing starts at 150 (≈21 weeks).
export const CLOTHING_WEAR_PER_WEEK = 7;
export const CLOTHING_FRESH_WEAR = 150;
// Trade-in credit when upgrading vehicles.
export const VEHICLE_TRADE_IN_RATE = 0.5;
// Job applications: base rejection odds, dependability divisor, max reduction.
export const JOB_BASE_REJECTION = 0.25;
export const JOB_DEP_REJECTION_DIVISOR = 150;
export const JOB_DEP_REJECTION_CAP = 0.7;
// Hours consumed per study session.
export const STUDY_SESSION_HOURS = 10;
// Chance a random life event fires at week end.
export const WEEKLY_EVENT_CHANCE = 0.4;
// Lottery (Black's Market) — odds/payout config; rolled in the reducer,
// never in a component (audit A6).
export const LOTTERY = { cost: 10, odds: 0.05, winHappiness: 50, loseHappiness: -2 };

// Wild Willy mugging odds/fractions (TRAVEL rolls).
export const WILD_WILLY = {
  blacksMarketChance: { Low: 0.3, Medium: 0.1, High: 0 },
  bankChance: { Low: 0.2, Medium: 0.05, High: 0 },
  bankCashTrigger: 500, // only ambushes bank leavers carrying more than this
  blacksStealFraction: 0.5,
  bankStealFraction: 0.3,
};

// ─── Economy States ───────────────────────────────────────────────────────────
export const ECONOMY_STATES = ['Depression', 'Normal', 'Boom'];

// Item types that cannot be pawned/sold at Black's Market
export const UNSELLABLE_TYPES = new Set(['food', 'weekly_meal', 'weekly_coffee', 'food_storage', 'entertainment']);

// Pawn shop sell prices as fraction of item cost, by economy state
export const ECONOMY_PAWN_MULTIPLIER = {
  Boom: 0.60,
  Normal: 0.50,
  Depression: 0.40,
};

export const ECONOMY_WAGE_MULTIPLIER = {
  Depression: 0.8,
  Normal: 1.0,
  Boom: 1.3,
};

export const ECONOMY_PRICE_MULTIPLIER = {
  Depression: 0.7,
  Normal: 1.0,
  Boom: 1.4,
};

// ─── Difficulty Presets ───────────────────────────────────────────────────────
// goals.careerDependability = min dependability required to meet career goal
export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Baby Steps',
    startingMoney: 1500,
    goals: {
      wealth: 2000,
      happiness: 60,
      education: "Associate's",
      careerDependability: 50,
    },
  },
  normal: {
    label: 'Standard',
    startingMoney: 1000,
    goals: {
      wealth: 10000,
      happiness: 80,
      education: "Bachelor's",
      careerDependability: 65,
    },
  },
  hard: {
    label: 'High Roller',
    startingMoney: 500,
    goals: {
      wealth: 25000,
      happiness: 85,
      education: "Master's",
      careerDependability: 80,
    },
  },
};

// Where a player's week starts/ends: home once they've chosen housing,
// otherwise the Leasing Office (audit A12 — was a ternary in 4 files).
export const homeBase = (player) => (player.hasChosenHousing ? 'home' : 'leasing_office');

// ─── Location Order (board loop) ─────────────────────────────────────────────
export const LOCATION_ORDER = [
  'leasing_office',
  'quick_eats',
  'public_library',
  'trendsetters',
  'coffee_shop',
  'megamart',        // bottom-right diagonal, between Coffee Shop and Black's Mkt
  'blacks_market',
  'grocery_store',   // bottom row, between Black's Mkt and City College
  'city_college',
  'tech_store',
  'home',            // left side, between tech_store and neobank
  'neobank',
];

// Travel cost = minimum steps around the ring (clockwise or counterclockwise)
export const travelCost = (fromId, toId) => {
  const n = LOCATION_ORDER.length;
  const a = LOCATION_ORDER.indexOf(fromId);
  const b = LOCATION_ORDER.indexOf(toId);
  if (a === -1 || b === -1) return 1;
  const cw = (b - a + n) % n;
  const ccw = (a - b + n) % n;
  return Math.min(cw, ccw);
};

// Taxi fare for the stranded "Ride Home" escape hatch: base $15 + $8 per ring step.
export const rideFare = (fromId, toId) => 15 + travelCost(fromId, toId) * 8;

// Location ID → employer name (used in job application messages)
export const LOCATION_EMPLOYER_NAME = {
  quick_eats: 'Quick Eats',
  coffee_shop: 'The Grind',
  megamart: 'MegaMart',
  trendsetters: 'TrendSetters',
  tech_store: 'Tech Store',
  neobank: 'NeoBank',
  public_library: 'City Works',
  home: 'Remote',
};

// ─── Career Perks ────────────────────────────────────────────────────────────
// Passive bonuses from working at specific locations
export const CAREER_PERKS = {
  quick_eats: {
    label: 'Kitchen Resilience',
    icon: '🍔',
    desc: 'Hunger penalties delayed — thresholds raised by 15',
    hungerThresholdBonus: 15,
  },
  coffee_shop: {
    label: 'Networking Pro',
    icon: '☕',
    desc: 'Job rejection chance reduced by 30%; +2 happiness & +2 dependability/wk',
    rejectionReduction: 0.30,
    weeklyHappiness: 2,
    weeklyDependability: 2,
  },
  tech_store: {
    label: 'Tech Savvy',
    icon: '💻',
    desc: '+5 bonus progress per study session',
    studyBonus: 5,
  },
  neobank: {
    label: 'Financial Insider',
    icon: '🏦',
    desc: 'Savings interest 2.5% (vs 1.5%); +1 happiness from financial security',
    savingsRate: 0.025,
    weeklyHappiness: 1,
  },
  megamart: {
    label: 'Employee Discount',
    icon: '🛒',
    desc: '25% off appliances at MegaMart',
    applianceDiscount: 0.25,
  },
  trendsetters: {
    label: 'Style Perk',
    icon: '👗',
    desc: '20% off clothing & vehicles at TrendSetters',
    clothingDiscount: 0.20,
  },
  public_library: {
    label: 'Handy Worker',
    icon: '🔧',
    desc: 'Housing equity grows 50% faster from DIY improvements',
    equityMultiplier: 1.5,
  },
};

// Helper: get perk for a player's current job location
export const getCareerPerk = (player) => {
  const loc = player.job?.location;
  return loc ? CAREER_PERKS[loc] || null : null;
};

// ─── Jones AI Data ────────────────────────────────────────────────────────────
// Jones levels up through this career path each N weeks
export const JONES_CAREER_TRACK = [
  { title: 'Barista', wage: 12, weeksNeeded: 0 },
  { title: 'Shift Lead', wage: 16, weeksNeeded: 4 },
  { title: 'Office Manager', wage: 22, weeksNeeded: 6 },
  { title: 'Account Executive', wage: 30, weeksNeeded: 8 },
  { title: 'Senior Developer', wage: 40, weeksNeeded: 10 },
  { title: 'Director', wage: 55, weeksNeeded: 12 },
];

export const JONES_EDUCATION_TRACK = [
  { week: 4, degree: "Associate's" },
  { week: 12, degree: "Bachelor's" },
  { week: 24, degree: "Master's" },
];
