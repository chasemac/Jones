# Life in the Express Lane — Game Design Document

> **Version:** 3.0 (reflects current implementation)
> **Last Updated:** June 2025
> **Platform:** Web Browser (React + Vite + Tailwind CSS)

---

## 1. Overview

**Life in the Express Lane** is a satirical life-simulation board game that runs in the browser. Players navigate a ring-shaped city board, managing weekly budgets of **Time** and **Money** to achieve life goals before their opponents — or before the AI rival "Jones" leaves them behind.

Inspired by the 1990s classic *Jones in the Fast Lane*, the game teaches financial literacy, time management, and career planning through fast-paced, turn-based gameplay.

### 1.1 Players
- 1–4 human players, plus the AI opponent "Jones."

### 1.2 Tech Stack
| Layer | Technology |
|-------|-----------|
| UI | React 19 + JSX |
| Build | Vite (rolldown) |
| Styling | Tailwind CSS 4 |
| State | `useReducer` + React Context |
| Audio | Web Audio API (chiptune SFX) |
| Testing | Vitest |
| Data | Static JSON files (`jobs`, `items`, `education`, `events`, `housing`, `stocks`) |

---

## 2. Winning & Losing

### 2.1 Victory
The first player to achieve **all four goals simultaneously** wins:

| Difficulty | Net Worth | Happiness | Education | Dependability |
|------------|-----------|-----------|-----------|---------------|
| **Easy** "Baby Steps" | $2,000 | 60 | Associate's | 50 |
| **Normal** "Standard" | $10,000 | 80 | Bachelor's | 65 |
| **Hard** "High Roller" | $25,000 | 85 | Master's | 80 |

Net Worth = Money + Savings − Debt.

### 2.2 Defeat
All players simultaneously reach happiness ≤ 0, money ≤ 0, and savings ≤ 0.

### 2.3 Starting Money
Easy: $1,500 · Normal: $1,000 · Hard: $500

---

## 3. Turn Structure (The Week)

Each turn represents **one week** with 60 hours of discretionary time.

1. **Action Phase** — Move around the board and perform actions (work, eat, shop, study, bank, rest) until time runs out or the player ends their turn.
2. **End of Week** — Automatic processing:
   - Rent deducted (debt accrued on shortfall).
   - Hunger increases (+20 luxury housing, +25 otherwise).
   - Happiness adjusts (housing bonus, job status, inventory effects).
   - Dependability decays (−3/week; extra −5 if unemployed).
   - Relaxation decays (−5/week; hot tub +3, luxury condo +3).
   - Clothing wears down (−7/week; lost clothing = lost job if required).
   - Debt interest (5%) and savings interest (1%) applied.
   - Weekly meal/coffee plans consumed.
   - Hunger→time penalty calculated for next week.
   - Economy may shift; stock market ticks.
   - Jones AI advances.
   - Random event may fire (40% chance).

---

## 4. The Board (12 Locations)

The board is a **ring of 12 locations**. Travel costs 1 hour per step (minimum distance around the ring, clockwise or counterclockwise). Vehicles reduce travel cost (minimum 1 hour).

| # | Location | Emoji | Purpose |
|---|----------|-------|---------|
| 0 | Leasing Office | 🏠 | Housing selection |
| 1 | Quick Eats | 🍔 | Fast food + gig work |
| 2 | Public Library | 📚 | Job board (all locations) + reading |
| 3 | TrendSetters | 👕 | Clothing store |
| 4 | Coffee Shop | ☕ | Coffee + barista jobs |
| 5 | MegaMart | 🏪 | Groceries, appliances, jobs |
| 6 | Black's Market | 🕶️ | Sell items (pawn), concerts |
| 7 | Grocery Store | 🛒 | Fresh food |
| 8 | City College | 🎓 | Enroll & study |
| 9 | Tech Store | 📱 | Electronics + tech jobs |
| 10 | Home | 🏠 | Rest, eat stored food, work remotely |
| 11 | NeoBank | 🏦 | Savings, debt, stocks |

---

## 5. Economy System

The economy cycles through three states, shifting every 4–7 weeks:

| State | Wage Multiplier | Price Multiplier | Pawn Sell Rate |
|-------|-----------------|------------------|---------------|
| Depression | 0.8× | 0.7× | 40% |
| Normal | 1.0× | 1.0× | 50% |
| Boom | 1.3× | 1.4× | 60% |

---

## 6. Career System

### 6.1 Job Tracks (25 jobs across 6+ locations)

**Service Track**
| Job | Location | Wage | Requirements | Promotes To |
|-----|----------|------|-------------|-------------|
| Crew Member | Quick Eats | $11/h | — | Shift Supervisor |
| Shift Supervisor | Quick Eats | $17/h | 4 wks, 35 dep | — |
| Dash Driver (gig) | Quick Eats | $15/h | Smartphone | — |
| Barista | Coffee Shop | $12/h | — | Shift Lead |
| Shift Lead | Coffee Shop | $16/h | 4 wks, 40 dep, biz casual | Store Manager |
| Store Manager | Coffee Shop | $22/h | 8 wks, 50 dep, Associate's, biz casual | — |
| Cashier | MegaMart | $11/h | — | Dept Lead |
| Dept Lead | MegaMart | $17/h | 5 wks, 35 dep | Store Director |
| Store Director | MegaMart | $28/h | 8 wks, 55 dep, Associate's, biz casual | — |
| Sales Associate | TrendSetters | $11/h | — | Floor Manager |
| Floor Manager | TrendSetters | $20/h | 4 wks, 40 dep, biz casual | — |

**Tech Track**
| Job | Location | Wage | Requirements | Promotes To |
|-----|----------|------|-------------|-------------|
| IT Support | Tech Store | $18/h | Laptop | Junior Dev |
| Junior Developer | Tech Store | $25/h | 35 dep, Bootcamp Cert, laptop | Senior Dev |
| Senior Developer | Tech Store | $40/h | 6 wks, 60 dep, Bachelor's, laptop | Tech Lead |
| Tech Lead | Tech Store | $60/h | 10 wks, 75 dep, Master's, laptop | — |

**Corporate Track**
| Job | Location | Wage | Requirements | Promotes To |
|-----|----------|------|-------------|-------------|
| Bank Teller | NeoBank | $16/h | 40 dep, biz casual | Loan Officer |
| Loan Officer | NeoBank | $30/h | 6 wks, 60 dep, Bachelor's, biz casual | Branch Manager |
| Branch Manager | NeoBank | $50/h | 10 wks, 75 dep, Master's, suit | — |

**Trades Track**
| Job | Location | Wage | Requirements | Promotes To |
|-----|----------|------|-------------|-------------|
| General Laborer | Library | $13/h | — | Electrician |
| Electrician | Library | $28/h | 40 dep, Electrician License | Master Electrician |
| Plumber | Library | $30/h | 40 dep, Plumbing License | — |
| Master Electrician | Library | $45/h | 8 wks, 60 dep, Engineering Cert | — |

**Remote**
| Job | Location | Wage | Requirements | Promotes To |
|-----|----------|------|-------------|-------------|
| Data Entry Clerk | Home | $12/h | — | Virtual Assistant |
| Virtual Assistant | Home | $18/h | 4 wks, 40 dep, laptop | — |
| Freelance Developer | Home | $20/h | Bootcamp Cert, laptop | — |

### 6.2 Dependability (0–100)
- Decays −3/week (−8 total if unemployed).
- Gains: +5 per standard shift, +2 per part-time shift, +7 per overtime, +3 loyalty bonus every 5 weeks at same job, +3–4 from networking.

### 6.3 Work Options
| Type | Hours | Wage | Dep Gain |
|------|-------|------|----------|
| Full shift | 8h | 1× | +5 |
| Part-time | 4h | 1× | +2 |
| Overtime | 12h | 1.5× | +7 |
| Gig work | 3h | varies | +1 |

---

## 7. Education

| Degree | Type | Tuition | Study Hours | Prerequisite |
|--------|------|---------|-------------|-------------|
| Bootcamp Certificate | Tech | $2,500 | 40h | Laptop |
| Associate's | Academic | $1,500 | 80h | — |
| Bachelor's | Academic | $4,000 | 120h | Associate's |
| Master's | Academic | $7,000 | 160h | Bachelor's |
| Graduate Degree | Academic | $10,000 | 200h | Master's |
| Electrician License | Trade | $1,000 | 60h | — |
| Plumbing License | Trade | $1,200 | 70h | — |
| Engineering Cert | Trade | $3,000 | 100h | Electrician License |

- Base study session: 10 hours.
- Laptop: −10h total bonus. Textbooks: −5h each (stackable).
- Completion grants +10 happiness.

---

## 8. Housing

| Option | Rent/wk | Happiness | Security | Notes |
|--------|---------|-----------|----------|-------|
| Mom's Basement | $0 | −5 | High | Free but painful |
| Shared Apartment | $200 | 0 | Low | Roommate may eat your food |
| Studio Apartment | $500 | +5 | Medium | Your own space |
| Luxury Condo | $1,200 | +15 | High | +3 relaxation/week, lower hunger increase |

Deposit to upgrade = 2 weeks' rent. Security level determines Wild Willy robbery chance.

---

## 9. Items (20 items)

### Electronics
| Item | Cost | Effect |
|------|------|--------|
| Smartphone | $800 | Unlocks gig work |
| Laptop | $1,200 | Unlocks bootcamp, −10h study bonus |
| Smart Watch | $300 | +5 happiness/week |
| Streaming Sub | $15 | +4 happiness/week, −$15/week fee |

### Food
| Item | Cost | Effect |
|------|------|--------|
| Combo Meal | $60 | Weekly meal: −55 hunger |
| Healthy Meal Plan | $80 | Weekly meal: −60 hunger, +5 happiness |
| Drip Coffee Plan | $25 | Weekly coffee: −12 hunger, +8 happiness |
| Espresso Pass | $45 | Weekly coffee: −20 hunger, +15 happiness |
| Groceries | $40 | −60 hunger (requires fridge/freezer or spoils) |

### Clothing
| Item | Cost | Wear | Notes |
|------|------|------|-------|
| Casual Clothes | $50 | 150 (~21 wks) | Basic wear |
| Business Casual | $200 | 150 | Required for office/manager jobs |
| Professional Suit | $500 | 150 | Required for directors; deters Wild Willy |

### Appliances
| Item | Cost | Effect |
|------|------|--------|
| Refrigerator | $400 | Store groceries (prevents spoilage) |
| Chest Freezer | $600 | Store groceries (prevents spoilage) |
| Hot Tub | $2,000 | +3 relaxation/week |

### Transportation
| Item | Cost | Effect |
|------|------|--------|
| Bicycle | $150 | −1h travel cost |
| Car | $2,000 | −2h travel cost, −$60/week gas |

### Other
| Item | Cost | Effect |
|------|------|--------|
| Textbook | $80 | −5h study bonus (stackable) |
| Concert Ticket | $60 | +20 happiness, +15 relaxation (instant) |
| Health Insurance | $50 | −$50/week; doctor visits cost $50 instead of $200 |

---

## 10. Stock Market

| Symbol | Company | Base Price | Volatility | Risk |
|--------|---------|-----------|-----------|------|
| JNES | Jones Corp | $100 | 10% | Low |
| TECH | TechStart | $50 | 30% | High |
| FOOD | FastFeast | $25 | 5% | Very Low |
| COIN | CryptoMeme | $10 | 80% | Extreme |

Prices fluctuate weekly, biased by economy state (+2% boom, −2% depression).

---

## 11. Random Events (40% chance per week)

20 possible events covering money windfalls, losses, time penalties, job loss, happiness changes, rent hikes, and market swings. Events are filtered by eligibility (e.g., car repair only if you own a car, layoff only if employed).

---

## 12. Hunger & Burnout

### Hunger
- Increases +25/week (+20 in luxury condo). Cap: 100.
- **Week-end time penalty if hungry:**
  - No food at all: −5h (25+), −10h (50+), −20h (80+)
  - Snacks only: −5h (50+), −10h (80+)
  - Meal plan but still 80+: −20h

### Relaxation / Burnout
- Decays −5/week. Hot tub: +3. Luxury condo: +3.
- Resting at home: +5–10 per session.
- **If relaxation hits 0:** forced doctor visit (−$200 or −$50 with insurance), relaxation reset to 30, −5h next week, −5 happiness.

---

## 13. Wild Willy (Robbery)

A random mugger triggered by housing security level when leaving certain locations:

| Trigger | Low Security | Medium Security | High Security |
|---------|-------------|-----------------|---------------|
| Leaving Black's Market | 30% (50% cash stolen) | 10% | 0% |
| Leaving NeoBank (>$500) | 20% (30% cash stolen) | 5% | 0% |

Owning a **Professional Suit** deters Wild Willy regardless of housing.

---

## 14. The Jones AI

Jones is an AI opponent who progresses automatically each week:
- Earns income based on a fixed career track (economy-adjusted wages).
- Spends $50–150/week randomly.
- Promotes through a predefined career ladder on schedule.
- Advances education at set milestones.
- Happiness fluctuates slightly each week.
- Stats are visible to players at all times.

---

## 15. Project Architecture

```
src/
├── engine/              # Pure game logic (testable, no React)
│   ├── constants.js     # Difficulty presets, economy multipliers, travel, education ranks
│   ├── economyModel.js  # Price/wage adjustments, shift earnings, economy transitions
│   ├── jobModel.js      # Career tracks, job requirements, promotions
│   ├── boardModel.js    # Ring navigation, travel cost, location config
│   ├── weekEndModel.js  # End-of-week processing (rent, hunger, economy, Jones AI)
│   └── gameReducer.js   # Central state reducer (all action handlers)
├── data/                # Static JSON game data
│   ├── jobs.json
│   ├── items.json
│   ├── education.json
│   ├── events.json
│   ├── housing.json
│   └── stocks.json
├── context/
│   └── GameContext.jsx   # React Context provider wrapping useReducer
├── components/
│   ├── Board.jsx         # Main game orchestrator (~450 lines)
│   ├── StartScreen.jsx   # Difficulty/player selection
│   ├── VictoryModal.jsx  # Win/loss screen
│   ├── ui/               # Shared UI components
│   │   ├── HUD.jsx
│   │   ├── Modals.jsx
│   │   ├── SidebarWidgets.jsx
│   │   ├── MapComponents.jsx
│   │   ├── JobsHereCard.jsx
│   │   └── GameWidgets.jsx
│   └── locations/        # Per-location content panels (12 files + barrel export)
│       ├── index.js
│       ├── QuickEatsContent.jsx
│       ├── LibraryContent.jsx
│       └── ... (10 more)
└── utils/
    └── sound.js          # Web Audio API chiptune effects
```

