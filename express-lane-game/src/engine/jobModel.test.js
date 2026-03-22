import { describe, it, expect } from 'vitest';
import { checkJobRequirements, isEntryLevel, getNextPromotion, difficultyLabel, getJobLocation } from './jobModel';

describe('checkJobRequirements', () => {
  const basePlayer = {
    education: 'High School',
    dependability: 50,
    inventory: [],
    job: null,
  };

  it('passes when job has no requirements', () => {
    const job = { id: 'cashier', title: 'Cashier' };
    const result = checkJobRequirements(basePlayer, job);
    expect(result.canApply).toBe(true);
  });

  it('fails when education is insufficient', () => {
    const job = { id: 'analyst', requirements: { education: "Associate's" } };
    const result = checkJobRequirements(basePlayer, job);
    expect(result.meetsEdu).toBe(false);
    expect(result.canApply).toBe(false);
  });

  it('fails when experience is insufficient', () => {
    const player = { ...basePlayer, job: { weeksWorked: 2 } };
    const job = { id: 'senior', requirements: { experience: 5 } };
    const result = checkJobRequirements(player, job);
    expect(result.meetsExp).toBe(false);
    expect(result.canApply).toBe(false);
  });

  it('fails when required item is missing', () => {
    const job = { id: 'office', requirements: { item: 'business_casual' } };
    const result = checkJobRequirements(basePlayer, job);
    expect(result.meetsItem).toBe(false);
    expect(result.canApply).toBe(false);
  });

  it('passes when required item is present', () => {
    const player = { ...basePlayer, inventory: [{ id: 'business_casual' }] };
    const job = { id: 'office', requirements: { item: 'business_casual' } };
    const result = checkJobRequirements(player, job);
    expect(result.meetsItem).toBe(true);
    expect(result.canApply).toBe(true);
  });

  it('fails when dependability is too low', () => {
    const player = { ...basePlayer, dependability: 30 };
    const job = { id: 'manager', requirements: { dependability: 60 } };
    const result = checkJobRequirements(player, job);
    expect(result.meetsDep).toBe(false);
    expect(result.canApply).toBe(false);
  });
});

describe('isEntryLevel', () => {
  it('returns true for jobs with no requirements', () => {
    expect(isEntryLevel({ id: 'cashier' })).toBe(true);
  });

  it('returns false when education is required', () => {
    expect(isEntryLevel({ id: 'analyst', requirements: { education: "Associate's" } })).toBe(false);
  });

  it('returns false when experience is required', () => {
    expect(isEntryLevel({ id: 'senior', requirements: { experience: 5 } })).toBe(false);
  });
});

describe('difficultyLabel', () => {
  it('returns Easy for low rejection chance', () => {
    expect(difficultyLabel(0.10).text).toBe('Easy');
  });

  it('returns Moderate for medium rejection chance', () => {
    expect(difficultyLabel(0.25).text).toBe('Moderate');
  });

  it('returns Competitive for high rejection chance', () => {
    expect(difficultyLabel(0.50).text).toBe('Competitive');
  });

  it('defaults to Moderate for undefined chance', () => {
    expect(difficultyLabel(undefined).text).toBe('Moderate');
  });
});

describe('getJobLocation', () => {
  it('returns null for null job', () => {
    expect(getJobLocation(null)).toBeNull();
  });

  it('uses workLocation when available', () => {
    expect(getJobLocation({ workLocation: 'neobank', location: 'coffee_shop', type: 'service' })).toBe('neobank');
  });

  it('falls back to location', () => {
    expect(getJobLocation({ location: 'coffee_shop', type: 'service' })).toBe('coffee_shop');
  });

  it('falls back to type-based default', () => {
    expect(getJobLocation({ type: 'tech' })).toBe('tech_store');
  });
});

describe('getNextPromotion', () => {
  it('returns null when player has no job', () => {
    expect(getNextPromotion({ job: null })).toBeNull();
  });

  it('returns null when job has no promotion path', () => {
    expect(getNextPromotion({ job: { title: 'CEO' } })).toBeNull();
  });
});
