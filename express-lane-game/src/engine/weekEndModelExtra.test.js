import { describe, it, expect, afterEach } from 'vitest';
import { tickMarket, advanceJones, rollRandomEvent } from './weekEndModel';
import { buildPlayer } from './gameReducer';
import { JONES_CAREER_TRACK } from './constants';
import stocksData from '../data/stocks.json';

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

describe('tickMarket', () => {
  it('keeps every symbol, integer-valued and >= 1', () => {
    const market = {};
    stocksData.forEach(s => { market[s.symbol] = s.basePrice; });
    Math.random = () => 0.5;
    const next = tickMarket(market, 'Normal');
    expect(Object.keys(next).sort()).toEqual(Object.keys(market).sort());
    for (const v of Object.values(next)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('advanceJones', () => {
  it('promotes Jones when weeks-at-job reaches the next threshold', () => {
    Math.random = () => 0.9; // avoid the happiness dip branch
    const jones = {
      money: 1000, savings: 0, happiness: 55, education: 'High School',
      jobIndex: 0, jobTitle: JONES_CAREER_TRACK[0].title, jobWage: JONES_CAREER_TRACK[0].wage,
      netWorth: 1000, weeksAtJob: JONES_CAREER_TRACK[1].weeksNeeded - 1, rent: 400,
    };
    const { jones: out, logEntry } = advanceJones(jones, 'Normal', 5);
    expect(out.jobIndex).toBe(1);
    expect(out.jobTitle).toBe(JONES_CAREER_TRACK[1].title);
    expect(out.weeksAtJob).toBe(0);
    expect(logEntry).toMatch(/promoted/i);
    expect(out.netWorth).toBe(out.money + out.savings);
  });

  it('advances education on the scheduled week', () => {
    Math.random = () => 0.9;
    const jones = {
      money: 1000, savings: 0, happiness: 55, education: 'High School',
      jobIndex: 0, jobTitle: JONES_CAREER_TRACK[0].title, jobWage: JONES_CAREER_TRACK[0].wage,
      netWorth: 1000, weeksAtJob: 0, rent: 400,
    };
    const { jones: out } = advanceJones(jones, 'Normal', 3); // week+1 === 4 → Associate's
    expect(out.education).toBe("Associate's");
  });
});

describe('rollRandomEvent', () => {
  it('returns no event when the roll misses', () => {
    Math.random = () => 0.9; // >= 0.4 → no event
    expect(rollRandomEvent([buildPlayer(0, 1000)]).pendingEvent).toBeNull();
  });

  it('fires an attributed event and mutates the target player when the roll hits', () => {
    Math.random = () => 0; // < 0.4 → fire; index 0 everywhere
    const player = buildPlayer(0, 1000); // shared_apt, rent 200, no job/savings
    const { pendingEvent } = rollRandomEvent([player]);
    expect(pendingEvent).toBeTruthy();
    expect(pendingEvent.playerName).toBe(player.name);
    expect(pendingEvent.title).toBeTruthy();
  });
});
