# Claude Instructions — Jones / Life in the Express Lane

This file defines reusable, named tasks you can ask Claude to run on this repo. Each task has a trigger phrase, a goal, the sub-agent roles Claude should spin up, deliverables, and guardrails.

---

## Repo quick-facts

- Game lives in `express-lane-game/` (React 19 + Vite + Tailwind)
- State: single `gameReducer` in `src/engine/gameReducer.js`, context in `src/context/GameContext.jsx`, persisted to `localStorage` under key `jones_v2_state`
- Tests: `npm test` runs Vitest (engine/pure-logic tests live next to source as `*.test.js`)
- Lint: `npm run lint` (pre-existing warnings exist; don't introduce new ones)
- Build: `npm run build`
- Dev server: `npm run dev` on port 5173
- Playwright (for UI tests) is a dev dependency — install Chromium once with `npx playwright install chromium`

---

## Task: Multiplayer Playthrough Audit

**Trigger phrases** (any of these should run this task):

- "Run the Multiplayer Playthrough Audit"
- "Do the playthrough audit"
- "Play the full game and audit it"

### Goal

Play a complete multiplayer game of *Life in the Express Lane* end-to-end, then deliver a prioritized punch list of bugs, UX improvements, and code-quality fixes — with tests that lock in the fixes.

### Workflow

Claude runs three specialized sub-agents **in parallel** for the audit phase, then consolidates findings and implements fixes. The three roles are non-overlapping — each agent reports independently, and Claude synthesizes.

#### 1. QA Playthrough Agent

**Role:** Top-tier game QA lead. Plays the game the way real humans would.

**Plays:**

- Start a fresh multiplayer game (2–4 players, mix of emojis, Normal difficulty) via the real start-screen wizard — never seed past the wizard unless specifically probing an edge case
- Play at least **15 in-game weeks**, hitting every location at least once across players
- Deliberately exercise: keyboard shortcuts (I, G, L, M, W, E, R, S, N, Esc), modal stacking (week summary + event + warnings), the stranded Ride Home flow, hunger/clothing warnings, debt spiral, job application + promotion, enrollment + study + graduation, stock buys/sells during Boom→Depression transitions, housing upgrades with deposits, page reload mid-week (persistence check)
- Exercise per-player turn handoff — attribution (the right name/color on banners and logs), sequential warnings (one modal per player), HUD active-player badge

**Logs:**

- Any console error, pageerror, crash, or blank screen
- State that survives a page reload but shouldn't, or state that gets wiped but shouldn't
- UI that claims X but the game does Y (numbers, tooltips, forecast vs. actual week-end result)
- Keyboard shortcuts that fire through modals, or modals that don't close on Esc
- Multiplayer turn-order or attribution bugs

**Deliverable:** A numbered bug list with reproduction steps, severity (blocker / major / minor / polish), and a screenshot path per bug under `/sessions/<session>/screenshots/`.

#### 2. UI/UX Director Agent

**Role:** Top UI/UX director at a AAA studio. Never touches code — only critiques and designs.

**Reviews:**

- First-run experience: is the wizard's intent clear? Are defaults sensible? Does "what do I do next?" ever stall?
- Readability: density of the HUD at 375px / 768px / 1280px / 1920px; color contrast (WCAG AA); font sizing; emoji legibility
- Feedback loops: does the player always know what just changed (money, hunger, week)? Are floating numbers enough? Is the week-summary scannable in < 5 s?
- Information scent: does every button preview its cost/outcome before the click? Are warning badges on the board legible at a glance?
- Multiplayer handoff: is it obvious whose turn it is at a glance, even when handing a phone around?
- Accessibility: keyboard-only navigation, `aria-live` region correctness, focus traps in modals, reduced-motion respected

**Deliverable:** A prioritized list of improvements with:

- Problem (1 line)
- Proposed solution (1–3 lines; may include a rough mock described in prose)
- Effort estimate (S / M / L)
- Expected impact (low / med / high)

**Prototype in Claude Design, not in prose.** For every improvement scored med/high impact, this agent must build the redesign in [Claude Design](https://claude.com/design) and paste the prototype URL alongside the written problem/solution. Suggested flow:

1. Seed Claude Design with the repo on first run so it ingests colors, typography, and existing components into a design system.
2. Upload the current-state screenshots from `/sessions/<session>/screenshots/` as the "before" reference for each flow.
3. Produce prototypes for, at minimum: the 4-step start wizard, the HUD at 375 / 768 / 1280 px, the multiplayer turn banner + handoff, the week-summary modal, the stranded Ride Home screen, and any warning modal redesigned for stackability.
4. Export each prototype as a shareable URL (PDF/PPTX optional) and paste URLs into the PR description so the implementer can reference pixels instead of guessing.

Do **not** implement the code — this agent designs only.

#### 3. Staff Software Engineer Agent

**Role:** Staff-level software engineer. Cares about DRY, SOLID, testability, and long-term maintainability.

**Reviews:**

- Duplicated logic (e.g. travel-bonus math that used to be copy-pasted — flag anything similar)
- Reducer cases that mutate state in ways inconsistent with the rest of the reducer
- Effects with suspicious dependency arrays or cascading `setState`
- Components that own state that should live in context (or vice versa)
- Magic numbers that belong in `constants.js`
- Missing unit tests: **every pure function in `src/engine/*.js` must have direct tests**; every reducer case must have at least one happy-path test
- Missing UI tests: critical flows (start wizard, travel, work, end week, stranded ride home, modal keyboard handling, mute sync) must have Playwright tests

**Deliverable:**

- Refactor proposals (before/after sketch, files affected, risk)
- A list of untested pure functions and untested reducer actions
- A list of critical UI flows without Playwright coverage

After Claude synthesizes, this agent's proposals drive the "Implement fixes" phase.

### Implement fixes phase

After the three agents report, Claude:

1. **Asks the user via `AskUserQuestion`** which tranche of fixes to implement now (blockers only / blockers + majors / everything) — do not silently commit to a scope
2. Implements the chosen fixes on a new branch named `claude/playthrough-audit-<YYYYMMDD>`
3. For every logic change, **adds or updates a Vitest test** in the matching `*.test.js`
4. For every fixed UI flow, **adds a Playwright test** under `express-lane-game/tests/ui/` (create the folder if it doesn't exist) — tests must reset `localStorage` between runs and must not depend on each other
5. Runs `npm test`, `npm run lint`, `npm run build`, and the new Playwright suite — all must be green before commit
6. Commits in logical chunks (one concern per commit), pushes the branch, and opens a PR summarizing the three agents' findings, the chosen scope, and what was deferred

### Guardrails

- **Never skip the wizard** in the QA agent unless deliberately probing a specific edge case (and note it in the report)
- **Never commit** `playthrough*.mjs` scratch scripts to the repo — put them in `/sessions/<session>/` or add them to `.gitignore` if kept in-repo
- **Don't silently widen scope** — if the three agents surface a rewrite-sized idea, surface it to the user via `AskUserQuestion` before touching code
- **Don't disable or `.skip` existing tests** to make the suite pass — fix or delete with a reason
- **Respect pre-existing lint warnings** on `main` (don't "fix" them in this PR unless directly related to a change). Don't introduce new ones.
- Final output to the user: a short summary + PR URL + the punch list of deferred items so nothing is lost

### Definition of done

- All three sub-agent reports are captured in the PR description
- `npm test`, `npm run lint`, `npm run build` all pass
- New Playwright tests pass headless
- Fixes ship with tests that would have caught the original bug
- Deferred items are listed so the user can greenlight a follow-up pass
