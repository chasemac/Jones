import { describe, it, expect } from 'vitest';
import { adjustedPrice, effectiveWage, calcShiftEarnings, nextEconomyState } from './economyModel';

describe('adjustedPrice', () => {
  it('returns base cost in Normal economy', () => {
    expect(adjustedPrice(100, 'Normal')).toBe(100);
  });

  it('increases price in Boom economy (1.4x)', () => {
    expect(adjustedPrice(100, 'Boom')).toBe(140);
  });

  it('decreases price in Depression economy (0.7x)', () => {
    expect(adjustedPrice(100, 'Depression')).toBe(70);
  });

  it('rounds to nearest integer', () => {
    expect(adjustedPrice(33, 'Boom')).toBe(46); // 33 * 1.4 = 46.2 → 46
  });

  it('falls back to 1x for unknown economy', () => {
    expect(adjustedPrice(100, 'Unknown')).toBe(100);
  });
});

describe('effectiveWage', () => {
  it('returns base wage in Normal economy', () => {
    expect(effectiveWage(20, 'Normal')).toBe(20);
  });

  it('increases wage in Boom (1.3x)', () => {
    expect(effectiveWage(20, 'Boom')).toBe(26);
  });

  it('decreases wage in Depression (0.8x)', () => {
    expect(effectiveWage(20, 'Depression')).toBe(16);
  });
});

describe('calcShiftEarnings', () => {
  it('calculates normal shift earnings', () => {
    expect(calcShiftEarnings(20, 8, 'Normal')).toBe(160);
  });

  it('applies Boom wage multiplier', () => {
    expect(calcShiftEarnings(20, 8, 'Boom')).toBe(208); // 20 * 8 * 1.3
  });

  it('applies Depression wage multiplier', () => {
    expect(calcShiftEarnings(20, 8, 'Depression')).toBe(128); // 20 * 8 * 0.8
  });

  it('floors fractional earnings', () => {
    expect(calcShiftEarnings(15, 3, 'Boom')).toBe(58); // 15 * 3 * 1.3 = 58.5 → 58
  });
});

describe('nextEconomyState', () => {
  it('cycles Depression → Normal', () => {
    expect(nextEconomyState('Depression')).toBe('Normal');
  });

  it('cycles Normal → Boom', () => {
    expect(nextEconomyState('Normal')).toBe('Boom');
  });

  it('cycles Boom → Depression', () => {
    expect(nextEconomyState('Boom')).toBe('Depression');
  });
});
