/**
 * @module boardModel
 * Board navigation and travel logic.
 *
 * The game board is a ring of 12 locations. Travel cost is the minimum
 * number of steps around the ring (clockwise or counterclockwise).
 * Players may own vehicles that reduce travel time.
 */

import { LOCATION_ORDER, travelCost } from './constants';

/**
 * Compute the ordered list of intermediate locations the player token
 * must pass through when traveling from one location to another.
 *
 * Uses the shorter direction around the ring (clockwise or counterclockwise).
 * Does NOT include the start location, but DOES include the destination.
 *
 * @param {string} fromId - Starting location ID.
 * @param {string} toId - Destination location ID.
 * @returns {string[]} Ordered array of location IDs on the path.
 */
export const ringPath = (fromId, toId) => {
  const n = LOCATION_ORDER.length;
  const a = LOCATION_ORDER.indexOf(fromId);
  const b = LOCATION_ORDER.indexOf(toId);
  if (a === -1 || b === -1 || a === b) return [];

  const cw = (b - a + n) % n;
  const ccw = (a - b + n) % n;
  const path = [];

  if (cw <= ccw) {
    for (let i = 1; i <= cw; i++) path.push(LOCATION_ORDER[(a + i) % n]);
  } else {
    for (let i = 1; i <= ccw; i++) path.push(LOCATION_ORDER[(a - i + n) % n]);
  }
  return path;
};

/**
 * Calculate the effective travel time after applying vehicle bonuses.
 * Minimum travel time is always 1 hour.
 *
 * @param {string} fromId - Current location ID.
 * @param {string} toId - Destination location ID.
 * @param {Array} inventory - Player's inventory items.
 * @returns {number} Effective travel hours.
 */
export const effectiveTravelCost = (fromId, toId, inventory) => {
  const baseCost = travelCost(fromId, toId);
  const travelBonus = inventory.reduce(
    (max, item) => Math.max(max, item.travelBonus || 0),
    0
  );
  return Math.max(1, baseCost - travelBonus);
};

/**
 * Location display configuration: label, emoji, board position, color.
 * Positions are percentage-based coordinates for responsive layout.
 *
 * @type {Object<string, {emoji: string, label: string, color: string, pos: {x: number, y: number}}>}
 */
export const LOCATIONS_CONFIG = {
  leasing_office: { emoji: '🏠', label: 'Leasing', color: '#9333ea', pos: { x: 5, y: 8 } },
  quick_eats:     { emoji: '🍔', label: 'Quick Eats', color: '#ea580c', pos: { x: 38, y: 8 } },
  public_library: { emoji: '📚', label: 'Library', color: '#059669', pos: { x: 72, y: 8 } },
  trendsetters:   { emoji: '👕', label: 'TrendSetters', color: '#db2777', pos: { x: 88, y: 20 } },
  coffee_shop:    { emoji: '☕', label: 'Coffee Shop', color: '#78350f', pos: { x: 88, y: 50 } },
  megamart:       { emoji: '🏪', label: 'MegaMart', color: '#dc2626', pos: { x: 75, y: 74 } },
  blacks_market:  { emoji: '🕶️', label: "Black's Mkt", color: '#1e293b', pos: { x: 60, y: 85 } },
  grocery_store:  { emoji: '🛒', label: 'Fresh Mart', color: '#16a34a', pos: { x: 44, y: 85 } },
  city_college:   { emoji: '🎓', label: 'City College', color: '#2563eb', pos: { x: 28, y: 85 } },
  tech_store:     { emoji: '📱', label: 'Tech Store', color: '#475569', pos: { x: 5, y: 85 } },
  home:           { emoji: '🏠', label: 'Home', color: '#7c3aed', pos: { x: 5, y: 66 } },
  neobank:        { emoji: '🏦', label: 'NeoBank', color: '#4f46e5', pos: { x: 5, y: 47 } },
};

/**
 * Get the home emoji based on the player's current housing tier.
 * @param {Object} housing - The player's housing object.
 * @returns {string} Emoji representing the home type.
 */
export const homeEmoji = (housing) => {
  if (!housing || housing.homeType === 'moms_house') return '🏠';
  if (housing.homeType === 'luxury_condo') return '🌇';
  return '🏘️';
};

/**
 * Location groupings for the Library job board display.
 * @type {Array<{id: string, emoji: string, label: string}>}
 */
export const LIBRARY_LOCATION_GROUPS = [
  { id: 'quick_eats', emoji: '🍔', label: 'Quick Eats' },
  { id: 'coffee_shop', emoji: '☕', label: 'Coffee Shop' },
  { id: 'megamart', emoji: '🏪', label: 'MegaMart' },
  { id: 'trendsetters', emoji: '👕', label: 'TrendSetters' },
  { id: 'tech_store', emoji: '📱', label: 'Tech Store' },
  { id: 'neobank', emoji: '🏦', label: 'NeoBank' },
  { id: 'public_library', emoji: '📚', label: 'Library (Trade)' },
  { id: 'home', emoji: '🏠', label: 'Remote / WFH' },
];
