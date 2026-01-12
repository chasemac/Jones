# Jones in the Fast Lane - Comprehensive Game Design Document

> **Version:** 1.0  
> **Date:** December 5, 2025  
> **Status:** Final Specification for Development  

---

## 1. Executive Summary

**Jones in the Fast Lane** is a satirical life-simulation strategy game played on a board-game-like map. Up to four players (human or AI) compete to achieve success in the "rat race" of modern life. The game combines time management, financial strategy, and career progression into a humorous, turn-based experience.

### 1.1 Core Concept
Players navigate a single week per turn, allocating limited **Time** to perform essential tasks: working, studying, eating, and sleeping. The goal is to balance immediate survival (paying rent, buying food) with long-term investment (education, career advancement) to reach specific life goals before the opponents.

### 1.2 Target Platforms & Audience
*   **Platform:** PC (Windows/macOS), Web (WebGL).
*   **Audience:** Casual strategy fans, retro gamers.
*   **Tone:** Lighthearted, humorous, 1990s aesthetic.

---

## 2. Gameplay Mechanics

### 2.1 Winning Conditions
The game is won by the first player to simultaneously achieve 100% in four goal categories. The specific numerical targets depend on the chosen difficulty level.

| Difficulty | Wealth Goal | Happiness Goal | Education Goal | Career Goal |
| :--- | :--- | :--- | :--- | :--- |
| **Baby Steps** | $2,000 | 600 | Trade School | Foreman / Secretary |
| **Standard** | $10,000 | 1,000 | College Degree | Manager |
| **High Roller** | $20,000 | 1,500 | Master's Degree | VP / Plant Manager |
| **Jones** | *Exceed AI* | *Exceed AI* | *Exceed AI* | *Exceed AI* |

### 2.2 Turn Structure (The Week)
Each turn represents one week.
1.  **Weekend Event:** A random text event occurs (e.g., "You won $50" or "You got sick").
2.  **Status Check:** Review bills due, rent status, and economy state.
3.  **Action Phase:** Players move and act until their **Time Bar** is depleted.
4.  **End of Week:**
    *   Rent/Bills deducted.
    *   Food consumed (Hunger increases if no food).
    *   Stats update (Happiness, Energy).

### 2.3 Time Management
*   **Time Units:** Players have a "Time Bar" representing ~60-80 hours of free time.
*   **Costs:**
    *   **Movement:** Small cost per location.
    *   **Work:** Large cost (e.g., 40% of bar).
    *   **Class:** Medium cost (e.g., 20% of bar).
    *   **Eating/Shopping:** Small cost.
*   **Fatigue:** Ending a turn with 0 time may result in a "Drag" penalty next week (less time available). Saving time banks it as "Rest".

---

## 3. World & Locations

The game board is a loop of buildings. Players move a token to these locations.

### 3.1 Monolith Burger
*   **Type:** Fast Food & Entry-Level Jobs.
*   **Actions:**
    *   **Eat:** Fries ($2-4), Burger ($3-6), Value Meal ($6-10). Quick but unhealthy.
    *   **Work:** Apply for Cook/Clerk jobs. No education required.

### 3.2 Z-Mart
*   **Type:** Department Store.
*   **Actions:** Buy household items and electronics.
*   **Inventory:**
    *   **Microwave ($180-250):** Reduces home eating time by 50%.
    *   **Freeze-Dried Food Maker ($300-450):** Drastically reduces eating time.
    *   **TV/Stereo/VCR ($250-500):** Passive Happiness generation.
    *   **Home Computer ($800-1200):** Enables weekend freelance income.
    *   **Groceries ($40-80/week):** Essential for eating at home (cheaper than Monolith).

### 3.3 QT's Fashions
*   **Type:** Clothing Store.
*   **Actions:** Buy clothes required for jobs. Clothes degrade over time.
*   **Inventory:**
    *   **Casual ($30-50):** Basic requirement.
    *   **Dress Clothes ($120-180):** Required for Office Clerk/Secretary.
    *   **Suit ($350-500):** Required for Management/Executive roles.

### 3.4 Hi-Tech University
*   **Type:** Education.
*   **Actions:** Enroll in semesters, attend class.
*   **Mechanic:** Degrees require multiple semesters and tuition payments.

### 3.5 Employment Office
*   **Type:** Job Center.
*   **Actions:** View and apply for jobs at The Factory or The Office.
*   **Mechanic:** Listings are filtered by the player's Education and Clothing.

### 3.6 Rent Office
*   **Type:** Housing Management.
*   **Actions:** Pay rent, sign leases, move apartments.
*   **Strategy:** Sign a lease during a "Depression" economy to lock in low rent.

### 3.7 First National Bank
*   **Type:** Financial Institution.
*   **Actions:** Deposit/Withdraw cash, take loans.
*   **Mechanic:** Cash on hand can be stolen. Banked money earns interest.

### 3.8 Black's Market
*   **Type:** Pawn Shop & Ticket Booth.
*   **Actions:** Sell items (low return), buy Lottery/Concert tickets.
*   **Risk:** High chance of being robbed by "Wild Willy" upon exiting.

### 3.9 Housing (Your Apartment)
*   **Low Cost Housing:** Cheap rent ($250-400), but high risk of burglary.
*   **Security Apartments:** Expensive ($600-900), but immune to burglary.
*   **Actions:** Eat, Sleep/Rest, Relax (uses TV/Stereo).

---

## 4. Systems Detail

### 4.1 Economy States
The economy shifts dynamically between three states, affecting all prices and wages.
1.  **Depression:** Prices -20%, Wages Low. Best time to sign a lease.
2.  **Normal:** Standard baseline.
3.  **Boom:** Prices +30%, Wages High. Best time to ask for a raise or switch jobs.

### 4.2 Career Tracks
Jobs require **Experience** (weeks worked) and **Education**.

#### **Service Track (Monolith Burger)**
*   **Pros:** No requirements. **Cons:** Low pay cap.
*   **Jobs:** Cook ($4-6) -> Clerk -> Asst. Manager -> Manager ($10-14).

#### **Blue Collar Track (The Factory)**
*   **Pros:** Good mid-level pay. **Cons:** Physical work.
*   **Requirements:** Trade School degrees.
*   **Jobs:** Janitor ($7-9) -> Maintenance -> Machinist -> Foreman -> Plant Manager ($30-45).

#### **White Collar Track (The Office)**
*   **Pros:** Highest pay. **Cons:** High education/clothing costs.
*   **Requirements:** High School -> College -> Master's. Suits required for upper tiers.
*   **Jobs:** Clerk ($6-8) -> Secretary -> Sales Rep -> Manager -> VP -> CEO ($80-120+).

### 4.3 Education System
Degrees are earned by completing semesters at Hi-Tech University.
*   **Trade School:** 2 Semesters (~$400 total).
*   **Junior College:** 2 Semesters (~$800 total).
*   **College Degree (BA/BS):** 4 Semesters (~$4000 total).
*   **Master's/PhD:** 4 Semesters (~$7000 total).

### 4.4 The Antagonist: Wild Willy
A criminal NPC who randomly robs players.
*   **Triggers:** Living in Low Cost Housing, walking out of Black's Market.
*   **Theft:** Steals all cash on hand and portable electronics (TV, VCR).
*   **Counter:** Move to Security Apartments, keep money in the Bank.

---

## 5. The AI Opponent ("Jones")
*   **Role:** The standard to beat.
*   **Behavior:**
    *   Plays efficiently (rarely wastes time).
    *   Often gets "lucky" breaks in weekend events.
    *   Serves as a pacing mechanism to keep the game moving.
*   **Transparency:** His stats are visible to show how close he is to winning.

---

## 6. Technical Requirements

### 6.1 Data Structures
All game balance data should be externalized (JSON/YAML) for easy tuning.
*   `jobs.json`: Job titles, wages, requirements, promotion paths.
*   `items.json`: Item names, costs, effects, shop locations.
*   `events.json`: Random event text, probabilities, and effects.

### 6.2 Save/Load System
*   Must save: Current week, all player stats, inventory, active job, education progress, economy state, and AI progress.

### 6.3 Assets
*   **Visuals:** 2D isometric or top-down map. Character portraits. Icons for items.
*   **Audio:** Background music (chiptune/MIDI style), UI sound effects, "mumbling" voice effects for shopkeepers.

---

## 7. User Interface (UX)

### 7.1 HUD
*   **Top Bar:** Current Player, Week Number, Economy State.
*   **Side Panel:**
    *   **Time Bar:** Visual representation of remaining hours.
    *   **Stats:** Money, Happiness, Education Icon, Career Icon.
    *   **Inventory:** Quick view of clothes/appliances.

### 7.2 Interaction
*   **Movement:** Click location to move. Pathfinding auto-calculates time cost.
*   **Shop Screens:** Grid of items with "Buy" buttons. Tooltips show effects.
*   **Feedback:** Floating text for money spent/earned (e.g., "-$50", "+$120").

---

## 8. Development Roadmap

1.  **Prototype:** Core loop (Move -> Work -> End Turn). Time bar logic.
2.  **Alpha:** Economy system, all locations active, basic inventory.
3.  **Beta:** AI (Jones) implementation, Wild Willy, Event system, Audio/Art polish.
4.  **Release:** Balancing, bug fixes, difficulty tuning.

