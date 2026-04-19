import { describe, it, expect } from 'vitest';
import { ringPath, effectiveTravelCost, getTravelBonus, LOCATIONS_CONFIG, homeEmoji, LIBRARY_LOCATION_GROUPS } from './boardModel';

describe('ringPath', () => {
  it('returns empty array for same location', () => {
    expect(ringPath('home', 'home')).toEqual([]);
  });

  it('takes shortest clockwise path', () => {
    // leasing_office(0) → public_library(2) is 2 steps CW
    const path = ringPath('leasing_office', 'public_library');
    expect(path).toEqual(['quick_eats', 'public_library']);
  });

  it('takes shortest counterclockwise path when CCW is shorter', () => {
    // leasing_office(0) → neobank(11) is 1 step CCW
    const path = ringPath('leasing_office', 'neobank');
    expect(path).toEqual(['neobank']);
  });

  it('returns empty for invalid location IDs', () => {
    expect(ringPath('nonexistent', 'home')).toEqual([]);
    expect(ringPath('home', 'nonexistent')).toEqual([]);
  });

  it('handles wrapping around the ring', () => {
    // neobank(11) → quick_eats(1) is 2 steps CW
    const path = ringPath('neobank', 'quick_eats');
    expect(path).toEqual(['leasing_office', 'quick_eats']);
  });

  it('includes destination but not start', () => {
    const path = ringPath('home', 'neobank');
    expect(path).toContain('neobank');
    expect(path).not.toContain('home');
  });
});

describe('effectiveTravelCost', () => {
  it('returns base cost when no vehicle', () => {
    // leasing_office(0) → public_library(2) = 2 steps
    expect(effectiveTravelCost('leasing_office', 'public_library', [])).toBe(2);
  });

  it('reduces cost by vehicle travelBonus', () => {
    const inventory = [{ id: 'bicycle', type: 'vehicle', travelBonus: 1 }];
    // base = 2, bonus = 1, effective = 1
    expect(effectiveTravelCost('leasing_office', 'public_library', inventory)).toBe(1);
  });

  it('uses the best vehicle travelBonus from inventory', () => {
    const inventory = [
      { id: 'bicycle', type: 'vehicle', travelBonus: 1 },
      { id: 'reliable_car', type: 'vehicle', travelBonus: 3 },
    ];
    // base = 2, vehicleBonus = 3, but min 1
    expect(effectiveTravelCost('leasing_office', 'public_library', inventory)).toBe(1);
  });

  it('never returns less than 1', () => {
    const inventory = [{ id: 'reliable_car', type: 'vehicle', travelBonus: 10 }];
    expect(effectiveTravelCost('home', 'neobank', inventory)).toBe(1);
  });

  it('smartwatch bonus stacks additively with vehicle bonus', () => {
    const inventory = [
      { id: 'car', type: 'vehicle', travelBonus: 2 },
      { id: 'smart_watch', type: 'electronics', travelBonus: 1 },
    ];
    // leasing_office(0) → trendsetters(3) = 3 steps CW
    // vehicleBonus=2, watchBonus=1, effective = max(1, 3-2-1) = 1
    expect(effectiveTravelCost('leasing_office', 'trendsetters', inventory)).toBe(1);
    // leasing_office(0) → megamart(5) = 5 steps CW
    // vehicleBonus=2, watchBonus=1, effective = max(1, 5-2-1) = 2
    expect(effectiveTravelCost('leasing_office', 'megamart', inventory)).toBe(2);
  });

  it('smartwatch alone reduces cost by 1', () => {
    const inventory = [{ id: 'smart_watch', type: 'electronics', travelBonus: 1 }];
    // leasing_office → public_library = 2 base, watchBonus=1, effective=1
    expect(effectiveTravelCost('leasing_office', 'public_library', inventory)).toBe(1);
  });

  it('non-vehicle non-watch items with travelBonus are ignored', () => {
    // Ensure items without type:'vehicle' and id!='smart_watch' don't contribute
    const inventory = [{ id: 'some_gadget', type: 'electronics', travelBonus: 5 }];
    expect(effectiveTravelCost('leasing_office', 'public_library', inventory)).toBe(2);
  });
});

describe('getTravelBonus', () => {
  it('stacks the best vehicle bonus with a smartwatch', () => {
    const inventory = [
      { id: 'bicycle', type: 'vehicle', travelBonus: 1 },
      { id: 'car', type: 'vehicle', travelBonus: 2 },
      { id: 'smart_watch', type: 'electronics', travelBonus: 1 },
    ];
    expect(getTravelBonus(inventory)).toBe(3);
  });

  it('ignores non-travel items', () => {
    const inventory = [{ id: 'streaming_bundle', type: 'subscription' }];
    expect(getTravelBonus(inventory)).toBe(0);
  });
});

describe('LOCATIONS_CONFIG', () => {
  it('has entries for all 12 locations', () => {
    expect(Object.keys(LOCATIONS_CONFIG)).toHaveLength(12);
  });

  it('every location has emoji, label, color, and pos', () => {
    for (const [, loc] of Object.entries(LOCATIONS_CONFIG)) {
      expect(loc).toHaveProperty('emoji');
      expect(loc).toHaveProperty('label');
      expect(loc).toHaveProperty('color');
      expect(loc.pos).toHaveProperty('x');
      expect(loc.pos).toHaveProperty('y');
    }
  });
});

describe('homeEmoji', () => {
  it('returns house for moms_house', () => {
    expect(homeEmoji({ homeType: 'moms_house' })).toBe('🏠');
  });

  it('returns house for null housing', () => {
    expect(homeEmoji(null)).toBe('🏠');
  });

  it('returns cityscape for luxury_condo', () => {
    expect(homeEmoji({ homeType: 'luxury_condo' })).toBe('🌇');
  });

  it('returns apartment for other housing', () => {
    expect(homeEmoji({ homeType: 'studio' })).toBe('🏘️');
  });
});

describe('LIBRARY_LOCATION_GROUPS', () => {
  it('is a non-empty array', () => {
    expect(LIBRARY_LOCATION_GROUPS.length).toBeGreaterThan(0);
  });

  it('each entry has id, emoji, and label', () => {
    for (const group of LIBRARY_LOCATION_GROUPS) {
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('emoji');
      expect(group).toHaveProperty('label');
    }
  });
});
