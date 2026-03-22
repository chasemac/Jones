/** Hunger emoji fill helper — hunger 0-100: fills 4 slots */
export const hungerEmojiFill = (hunger) => {
  const filledSlots = Math.round((hunger / 100) * 4);
  return Array.from({ length: 4 }, (_, i) => i < filledSlots ? '🍕' : '⬜').join('');
};
