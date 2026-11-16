// Best income: kept in this browser only, shown on the title and results
// screens so a returning keeper can chase their own record.

import { BEST_KEY } from './config.js';

/** Read the best income so far (0 when there is none yet). */
export function loadBestIncome() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** Save a new best income (only when it beats the old one). */
export function saveBestIncome(value) {
  try {
    const best = loadBestIncome();
    if (value > best) window.localStorage.setItem(BEST_KEY, String(value));
    return Math.max(best, value);
  } catch {
    return value;
  }
}
