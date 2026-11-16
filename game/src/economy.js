// Coins and reputation: the market's purse. Coins buy upgrades between nights;
// hearts are lost when a customer walks out angry or a night misses its target.

import { MAX_HEARTS } from './config.js';

/** A fresh purse: no coins yet, a full row of hearts. */
export function createPurse() {
  return { coins: 0, hearts: MAX_HEARTS, nightIncome: 0, totalIncome: 0 };
}

/** Earn coins for a served dish (already multiplied by the combo). */
export function earnCoins(purse, amount) {
  purse.coins += amount;
  purse.nightIncome += amount;
  purse.totalIncome += amount;
  return amount;
}

/** Spend coins in the shop; returns false when the purse is short. */
export function spendCoins(purse, amount) {
  if (purse.coins < amount) return false;
  purse.coins -= amount;
  return true;
}

/** Can the purse afford this price? */
export function canAffordUpgrade(purse, price) {
  return purse.coins >= price;
}

/** The coins on hand right now. */
export function coinBalance(purse) {
  return purse.coins;
}

/** Lose one reputation heart; returns the hearts left. */
export function loseReputation(purse) {
  purse.hearts = Math.max(0, purse.hearts - 1);
  return purse.hearts;
}

/** The hearts still lit. */
export function reputationHearts(purse) {
  return purse.hearts;
}

/** Reset the night's income counter when a new night begins. */
export function resetNightIncome(purse) {
  purse.nightIncome = 0;
}
