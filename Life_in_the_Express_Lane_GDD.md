# Life in the Express Lane - Game Design Document

> **Version:** 2.0  
> **Date:** December 5, 2025  
> **Status:** Specification for Modern Web Prototype  
> **Target Audience:** High School Teachers & Students (Educational/Satirical)

---

## 1. Executive Summary

**Life in the Express Lane** is a modern, satirical life-simulation game designed to run in a web browser. It serves as both a nostalgic homage to the 1990s classic *Jones in the Fast Lane* and an engaging educational tool for teaching financial literacy, time management, and career planning.

### 1.1 Core Concept
Players navigate a "Game of Life" style board, managing a weekly budget of **Time** and **Money**. They must balance immediate needs (rent, food, gig work) with long-term goals (education, career climbing, savings). The game satirizes the modern "gig economy" and "hustle culture" while providing realistic lessons about compound interest, debt, and the cost of living.

### 1.2 Target Platforms & Tech Stack
*   **Platform:** Web Browser (Mobile Responsive).
*   **Tech Stack:** HTML5, CSS3, JavaScript (React or Vanilla).
*   **Distribution:** Free-to-play web link (easy for teachers to share via Google Classroom/LMS).

---

## 2. Gameplay Mechanics

### 2.1 Winning Conditions
The game is won by the first player to achieve specific "Life Goals". Teachers can set the difficulty/length of the game.

| Difficulty | Wealth Goal | Happiness Goal | Education Goal | Career Goal |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Short)** | $2,000 Savings | 600 Points | Certificate | Shift Lead |
| **Graduate (Standard)** | $10,000 Savings | 1,000 Points | Associate's/Bachelor's | Manager |
| **Professional (Long)** | $50,000 Savings | 1,500 Points | Master's | Executive |
| **The Joneses** | *Exceed AI* | *Exceed AI* | *Exceed AI* | *Exceed AI* |

### 2.2 Turn Structure (The Week)
1.  **Monday Morning Notification:** A random event (e.g., "Rent Hike", "Stimulus Check", "Flu Season").
2.  **Budget Check:** Review bank balance, upcoming bills, and student loan interest.
3.  **Action Phase:** Players spend **Time Units** (hours) to move and act.
4.  **Weekend Review:**
    *   Rent/Bills auto-deducted.
    *   Food consumed.
    *   Stats update (Happiness, Energy).

### 2.3 Modernized Time Management
*   **Time Units:** ~60 hours of "discretionary time" per week.
*   **Fatigue System:** Overworking (using 100% of time) leads to "Burnout" (reduced time next week).
*   **Rest:** Ending a turn early banks "Energy" for a productivity bonus next week.

---

## 3. World & Locations (Modernized)

The board represents a modern city loop. Players must physically **Travel** to a location to perform actions there.

### 3.0 Travel Mechanics
*   **Movement Cost:** Moving from one location to another costs **1 Time Unit** (1 hour).
*   **Current Location:** Players can only interact with the location they are currently visiting.
*   **Strategy:** Players must group their errands (e.g., eat and work gig at the same place) to minimize travel time.

### 3.1 "Quick Eats" & Gig Hub
*   **Type:** Fast Food & Gig Economy.
*   **Actions:**
    *   **Eat:** Cheap, unhealthy food (saves time, lowers health).
    *   **Gig Work:** "Dash" delivery driver. Instant cash, no requirements, but dead-end pay.

### 3.2 "Tech & Subs" (Electronics Store)
*   **Type:** Modern Retail.
*   **Inventory:**
    *   **Smartphone ($800):** Required for Gig Work and checking emails.
    *   **Laptop ($1200):** Required for Remote Work and Online Classes.
    *   **Streaming Sub ($15/week):** Passive Happiness, small recurring cost.
    *   **Smart Watch ($300):** Boosts health/energy recovery.

### 3.3 "TrendSetters" (Clothing)
*   **Type:** Fashion Retail.
*   **Inventory:**
    *   **Casual Wear:** Basic requirement.
    *   **Business Casual:** Required for Office Admin/Tech Support jobs.
    *   **Professional Suit:** Required for Management/Executive roles.

### 3.4 "City College & Bootcamps"
*   **Type:** Education.
*   **Tracks:**
    *   **Coding Bootcamp:** High cost, short duration (12 weeks), unlocks Tech jobs.
    *   **Community College:** Low cost, medium duration (2 years), unlocks Admin jobs.
    *   **University:** High cost, long duration (4 years), unlocks Management/Exec.
*   **Student Loans:** Players can take loans to pay tuition (teaches interest).

### 3.5 "The Job Board" (App/Location)
*   **Type:** Career Center.
*   **Tracks:**
    *   **Service:** Barista -> Shift Lead -> Store Manager.
    *   **Tech:** Junior Dev -> Senior Dev -> CTO.
    *   **Corporate:** Intern -> Analyst -> Director.
*   **Remote Work:** Some jobs allow working from home (saves commute time).

### 3.6 "Leasing Office"
*   **Type:** Housing.
*   **Options:**
    *   **Mom's Basement:** Free rent, huge Happiness penalty.
    *   **Shared Apartment:** Low rent, random "Bad Roommate" events.
    *   **Studio Apartment:** Moderate rent, standard happiness.
    *   **Luxury Condo:** High rent, high happiness, security.

### 3.7 "NeoBank" (Finance App)
*   **Type:** Banking.
*   **Actions:**
    *   **Savings Account:** Earns 1-2% interest (safe).
    *   **Index Fund:** Earns 5-8% (risky, fluctuates with economy).
    *   **Pay Loans:** Pay down student debt or credit cards.

---

## 4. Educational Systems

### 4.1 The Economy
*   **Inflation:** Prices rise over time.
*   **Recession:** Job market tightens, gig work pays less.
*   **Boom:** High wages, high rent.

### 4.2 Debt & Credit
*   **Credit Cards:** Players can buy items on credit. High interest (20%) if not paid weekly.
*   **Student Loans:** Lower interest, but large principal.

### 4.3 The "Jones" AI
*   **Role:** The "Perfect Peer".
*   **Function:** Demonstrates optimal play but also highlights the unfairness of "luck" (Jones often starts with rich parents or gets lucky breaks).

---

## 5. Technical Requirements (Prototype)

### 5.1 Tech Stack
*   **Frontend:** React.js (Create React App or Vite).
*   **State Management:** React Context or Redux (for game state).
*   **Styling:** Tailwind CSS (for rapid, mobile-friendly UI).
*   **Deployment:** Vercel or GitHub Pages (free hosting).

### 5.2 Data Structure (JSON)
*   `jobs.json`: Modern titles (e.g., "Social Media Manager", "Prompt Engineer").
*   `items.json`: Subscriptions, gadgets.
*   `events.json`: "Server Crash", "Viral Tweet", "Rent Control".

### 5.3 MVP Features (Week 1)
1.  **Turn Loop:** Start Week -> Spend Time -> End Week.
2.  **Basic Stats:** Money, Happiness, Time Bar.
3.  **One Job Track:** Service Industry.
4.  **One Shop:** Food.

---

## 6. Development Roadmap

1.  **Phase 1: The Engine (Text-Based)**
    *   Build the logic for Time subtraction and Money addition.
    *   Simple buttons for "Work", "Eat", "Sleep".
2.  **Phase 2: The UI (Visuals)**
    *   Add the "Board" layout (CSS Grid).
    *   Add Icons for locations.
3.  **Phase 3: The Content (Data)**
    *   Populate JSON files with all jobs and items.
    *   Implement the "Jones" AI logic.
4.  **Phase 4: Polish**
    *   Mobile responsiveness.
    *   Sound effects.

