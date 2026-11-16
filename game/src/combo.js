// Combo: consecutive serves without an angry walkout. Each serve in the streak
// pays a little more; one walkout breaks the streak back to zero.

import { COMBO } from './config.js';

/** A fresh combo: no streak yet. */
export function createCombo() {
  return { count: 0, best: 0 };
}

/** The longest streak the HUD ever shows (a longer run still pays the cap). */
export const COMBO_DISPLAY_CAP = 20;

/** Register one more serve in the streak; returns the new streak length. */
export function registerServe(combo) {
  combo.count = Math.min(COMBO_DISPLAY_CAP, combo.count + 1);
  if (combo.count > combo.best) combo.best = combo.count;
  return combo.count;
}

/** The pay multiplier for the current streak (1 + step per serve, capped). */
export function comboMultiplier(combo) {
  return Math.min(COMBO.cap, 1 + combo.count * COMBO.step);
}

/** An angry walkout breaks the streak. */
export function breakCombo(combo) {
  combo.count = 0;
}

/** The streak showing on the HUD right now. */
export function comboCount(combo) {
  return combo.count;
}
