/**
 * @module economyModel
 * Economy-related calculations: price adjustments, wage adjustments, and economy transitions.
 *
 * The game cycles through three economy states (Depression → Normal → Boom)
 * that affect wages and shop prices via multipliers.
 */

import { ECONOMY_PRICE_MULTIPLIER, ECONOMY_WAGE_MULTIPLIER, ECONOMY_STATES } from './constants';

/**
 * Adjust an item's base price by the current economy state.
 * @param {number} baseCost - The item's base price in a Normal economy.
 * @param {string} economy - Current economy state ('Depression' | 'Normal' | 'Boom').
 * @returns {number} The economy-adjusted price (rounded to nearest integer).
 */
export const adjustedPrice = (baseCost, economy) =>
  Math.round(baseCost * (ECONOMY_PRICE_MULTIPLIER[economy] || 1));

/**
 * Calculate the effective hourly wage under the current economy.
 * @param {number} baseWage - The job's base hourly wage.
 * @param {string} economy - Current economy state.
 * @returns {number} Economy-adjusted wage (rounded to nearest integer).
 */
export const effectiveWage = (baseWage, economy) =>
  Math.round(baseWage * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));

/**
 * Calculate earnings for a work shift factoring in economy.
 * @param {number} wage - Hourly wage (may include overtime multiplier).
 * @param {number} hours - Hours worked.
 * @param {string} economy - Current economy state.
 * @returns {number} Total earnings (floored to integer).
 */
export const calcShiftEarnings = (wage, hours, economy) =>
  Math.floor(wage * hours * (ECONOMY_WAGE_MULTIPLIER[economy] || 1));

/**
 * Advance the economy to its next state.
 * The cycle is: Depression → Normal → Boom → Depression → ...
 * @param {string} currentEconomy - Current economy state.
 * @returns {string} The next economy state.
 */
export const nextEconomyState = (currentEconomy) => {
  const idx = ECONOMY_STATES.indexOf(currentEconomy);
  return ECONOMY_STATES[(idx + 1) % ECONOMY_STATES.length];
};
