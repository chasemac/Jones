import { describe, it, expect } from 'vitest';
import {
  meetsEducation,
  getEducationProgress,
  calculateNetWorth,
  calculateDeposit,
  travelCost,
  rideFare,
  gigEarnings,
  getCareerPerk,
  BASE_SAVINGS_RATE,
  CAREER_PERKS,
} from './constants';

describe('meetsEducation', () => {
  it('returns true when requirement is empty', () => {
    expect(meetsEducation('High School', null)).toBe(true);
    expect(meetsEducation('High School', undefined)).toBe(true);
  });
  it('compares by rank, not string equality', () => {
    expect(meetsEducation("Bachelor's", "Associate's")).toBe(true);
    expect(meetsEducation('High School', "Bachelor's")).toBe(false);
  });
  it('treats top-tier trade certs as Bachelor-equivalent', () => {
    expect(meetsEducation('Engineering Certificate', "Bachelor's")).toBe(true);
    expect(meetsEducation('Master Plumber Certification', "Bachelor's")).toBe(true);
  });
});

describe('getEducationProgress', () => {
  it('is 0 at High School and 100 when goal met', () => {
    expect(getEducationProgress('High School', "Bachelor's")).toBe(0);
    expect(getEducationProgress("Bachelor's", "Bachelor's")).toBe(100);
  });
  it('caps at 100 when over-qualified', () => {
    expect(getEducationProgress("Master's", "Associate's")).toBe(100);
  });
});

describe('calculateNetWorth', () => {
  it('sums money + savings + equity minus debt', () => {
    expect(calculateNetWorth({ money: 1000, savings: 500, debt: 200, housingEquity: 300 })).toBe(1600);
  });
  it('treats missing housingEquity as 0', () => {
    expect(calculateNetWorth({ money: 100, savings: 0, debt: 0 })).toBe(100);
  });
});

describe('calculateDeposit', () => {
  it('is two weeks rent on an upgrade', () => {
    expect(calculateDeposit(500, 200)).toBe(1000);
  });
  it('is zero on a lateral move or downgrade', () => {
    expect(calculateDeposit(200, 200)).toBe(0);
    expect(calculateDeposit(200, 500)).toBe(0);
  });
});

describe('travelCost', () => {
  it('is 0 to the same location', () => {
    expect(travelCost('home', 'home')).toBe(0);
  });
  it('takes the shorter way around the ring (symmetric)', () => {
    expect(travelCost('leasing_office', 'neobank')).toBe(1); // adjacent the other way
    expect(travelCost('neobank', 'leasing_office')).toBe(1);
  });
  it('falls back to 1 for unknown ids', () => {
    expect(travelCost('nowhere', 'home')).toBe(1);
  });
});

describe('rideFare', () => {
  it('is base $15 plus $8 per ring step', () => {
    expect(rideFare('home', 'home')).toBe(15);
    expect(rideFare('leasing_office', 'neobank')).toBe(15 + 8);
  });
});

describe('gigEarnings', () => {
  it('scales the base $60 gig payout with the economy', () => {
    expect(gigEarnings('Normal')).toBe(60);
    expect(gigEarnings('Boom')).toBe(Math.floor(60 * 1.3));
    expect(gigEarnings('Depression')).toBe(Math.floor(60 * 0.8));
  });
  it('defaults to the base payout for an unknown economy', () => {
    expect(gigEarnings('???')).toBe(60);
  });
});

describe('getCareerPerk', () => {
  it('returns the perk for the player job location', () => {
    expect(getCareerPerk({ job: { location: 'neobank' } })).toBe(CAREER_PERKS.neobank);
  });
  it('returns null when unemployed or no perk', () => {
    expect(getCareerPerk({ job: null })).toBeNull();
    expect(getCareerPerk({ job: { location: 'blacks_market' } })).toBeNull();
  });
});

describe('BASE_SAVINGS_RATE', () => {
  it('is the 1.5% weekly base rate', () => {
    expect(BASE_SAVINGS_RATE).toBeCloseTo(0.015, 6);
  });
});
