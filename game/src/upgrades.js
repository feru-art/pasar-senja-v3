// The shop between nights: six upgrades, each bought once, each changing the
// market for the nights that follow. Coins are the only currency; a bought
// upgrade never comes back to the shelf.

import { UPGRADES } from './config.js';
import { spendCoins } from './economy.js';
import { unlockStall } from './stalls.js';

/** A fresh shop: nothing bought yet. */
export function createShop() {
  return { bought: new Set() };
}

/** The upgrades still on the shelf (bought ones are gone). */
export function upgradeChoices(shop) {
  return UPGRADES.filter((item) => !shop.bought.has(item.id));
}

/** The upgrades already bought — shown in the shop with a DIMILIKI badge. */
export function boughtUpgrades(shop) {
  return UPGRADES.filter((item) => shop.bought.has(item.id));
}

/** Can the purse afford this upgrade right now? */
export function canAffordUpgrade(purse, item) {
  return purse.coins >= item.price;
}

/** Buy an upgrade: pay, mark it bought, apply its effect. Returns true on success. */
export function buyUpgrade(shop, purse, stalls, unlocked, item) {
  if (shop.bought.has(item.id)) return false;
  if (!spendCoins(purse, item.price)) return false;
  shop.bought.add(item.id);
  applyUpgrade(shop, stalls, unlocked, item.id);
  return true;
}

/** Apply one upgrade's effect to the market (also used when re-applying state). */
export function applyUpgrade(shop, stalls, unlocked, upgradeId) {
  if (upgradeId === 'goreng') {
    unlockStall(stalls, 'goreng');
    unlocked.add('goreng');
  } else if (upgradeId === 'tehmanis') {
    unlocked.add('tehmanis');
  } else if (upgradeId === 'pisang') {
    unlocked.add('pisang');
  }
  // 'kompor' (speed) and 'kursi' (seats) and 'pelayan' (helper) are read live
  // from shop.bought by the world, so they need no state change here.
  return shop.bought.has(upgradeId);
}

/** Cooking speed multiplier from the Kompor Cepat upgrade. */
export function cookingSpeed(shop) {
  return shop.bought.has('kompor') ? 1.4 : 1.0;
}

/** Extra seats from the Kursi Tambahan upgrade. */
export function extraSeats(shop) {
  return shop.bought.has('kursi') ? 2 : 0;
}

/** Whether the helper (Pelayan Pembantu) is on the payroll. */
export function helperActive(shop) {
  return shop.bought.has('pelayan');
}
