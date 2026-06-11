/**
 * @module economyModel
 * Economy-related calculations: price adjustments, wage adjustments, and economy transitions.
 *
 * The game cycles through three economy states (Depression → Normal → Boom)
 * that affect wages and shop prices via multipliers.
 */

import { ECONOMY_PRICE_MULTIPLIER, ECONOMY_WAGE_MULTIPLIER, ECONOMY_STATES, CAREER_PERKS } from './constants';

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
 * The employee-perk discount rate for an item type, given the player's job.
 * MegaMart staff get a discount on appliances; TrendSetters staff on clothing & vehicles.
 * This is the SINGLE source of truth for purchase discounts — both the UI
 * (display prices) and the reducer (charged prices) must use it so they can never drift.
 * @param {object} player - The player (job.location determines the perk).
 * @param {string} itemType - The item's type ('appliance' | 'clothing' | 'vehicle' | ...).
 * @returns {number} Discount fraction (0 if no perk applies).
 */
export const perkDiscountFor = (player, itemType) => {
  if (player?.job?.location === 'megamart' && itemType === 'appliance') {
    return CAREER_PERKS.megamart.applianceDiscount || 0;
  }
  if (player?.job?.location === 'trendsetters' && (itemType === 'clothing' || itemType === 'vehicle')) {
    return CAREER_PERKS.trendsetters.clothingDiscount || 0;
  }
  return 0;
};

/**
 * The final price a player pays for a shop item: economy-adjusted base price
 * with any employee-perk discount applied. Use this for DISPLAY; dispatch the
 * economy-adjusted (undiscounted) cost and let the reducer apply the discount.
 * Mirrors BUY_ITEM exactly: floor(adjustedPrice × (1 − perkDiscount)).
 * @param {object} item - The raw item ({ cost, type }).
 * @param {string} economy - Current economy state.
 * @param {object} player - The purchasing player.
 * @returns {number} The price the reducer will actually charge.
 */
export const effectiveItemPrice = (item, economy, player) => {
  const base = adjustedPrice(item.cost, economy);
  const discount = perkDiscountFor(player, item.type);
  return discount > 0 ? Math.floor(base * (1 - discount)) : base;
};

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
