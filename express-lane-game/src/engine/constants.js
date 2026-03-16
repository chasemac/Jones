// ─── Education Hierarchy ─────────────────────────────────────────────────────
export const EDUCATION_RANK = {
  'High School': 0,
  'Certificate': 1,
  'Bootcamp Certificate': 1,
  'Electrician License': 1,
  'Plumbing License': 1,
  "Associate's": 2,
  "Bachelor's": 3,
  "Master's": 4,
};

export const meetsEducation = (playerEdu, requiredEdu) => {
  if (!requiredEdu) return true;
  const p = EDUCATION_RANK[playerEdu] ?? 0;
  const r = EDUCATION_RANK[requiredEdu] ?? 0;
  return p >= r;
};

// ─── Economy States ───────────────────────────────────────────────────────────
export const ECONOMY_STATES = ['Depression', 'Normal', 'Boom'];

export const ECONOMY_WAGE_MULTIPLIER = {
  Depression: 0.8,
  Normal: 1.0,
  Boom: 1.3,
};

// ─── Difficulty Presets ───────────────────────────────────────────────────────
// goals.careerWage = minimum hourly wage required to meet career goal
export const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Baby Steps',
    startingMoney: 1500,
    goals: {
      wealth: 2000,       // net worth target
      happiness: 60,      // happiness target (out of 100)
      education: "Associate's", // minimum education
      careerWage: 16,     // minimum job wage to qualify
    },
  },
  normal: {
    label: 'Standard',
    startingMoney: 1000,
    goals: {
      wealth: 10000,
      happiness: 80,
      education: "Bachelor's",
      careerWage: 28,
    },
  },
  hard: {
    label: 'High Roller',
    startingMoney: 500,
    goals: {
      wealth: 25000,
      happiness: 85,
      education: "Master's",
      careerWage: 50,
    },
  },
};

// ─── Location Order (board loop) ─────────────────────────────────────────────
export const LOCATION_ORDER = [
  'leasing_office',
  'quick_eats',
  'public_library',
  'trendsetters',
  'coffee_shop',
  'blacks_market',
  'city_college',
  'tech_store',
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

// Job types → where you work
export const JOB_WORK_LOCATION = {
  service: 'coffee_shop',
  tech: 'tech_store',
  corporate: 'public_library',
  gig: 'quick_eats',
};

// ─── Jones AI Data ────────────────────────────────────────────────────────────
// Jones levels up through this career path each N weeks
export const JONES_CAREER_TRACK = [
  { title: 'Barista', wage: 12, weeksNeeded: 0 },
  { title: 'Admin Assistant', wage: 18, weeksNeeded: 6 },
  { title: 'Shift Lead', wage: 16, weeksNeeded: 4 },
  { title: 'Office Manager', wage: 28, weeksNeeded: 8 },
  { title: 'Senior Developer', wage: 40, weeksNeeded: 10 },
  { title: 'Director', wage: 50, weeksNeeded: 12 },
];

export const JONES_EDUCATION_TRACK = [
  { week: 4, degree: "Associate's" },
  { week: 12, degree: "Bachelor's" },
  { week: 24, degree: "Master's" },
];
