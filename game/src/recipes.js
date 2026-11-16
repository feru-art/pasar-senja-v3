// Recipes: what each stall can cook, how long it takes, and what it pays.
// A dish is locked until its upgrade is bought in the shop between nights.

import { DISHES } from './config.js';

/** Start cooking a dish: returns the cooking job (or null when locked). */
export function startCooking(dishId, unlocked, speed) {
  const dish = DISHES[dishId];
  if (!dish) return null;
  if (dish.locked && !unlocked.has(dishId)) return null;
  return { dishId, total: dish.cook / speed, left: dish.cook / speed };
}

/** Tick a cooking job; returns true the moment it finishes. */
export function tickCooking(job, step) {
  if (!job) return false;
  job.left -= step;
  return job.left <= 0;
}

/** The dish is ready to be picked up from the counter. */
export function dishReady(job) {
  return job !== null && job.left <= 0;
}

/** The price one dish pays before the combo multiplier. */
export function dishPrice(dishId) {
  return DISHES[dishId].price;
}

/** The stall that cooks this dish. */
export function dishStall(dishId) {
  return DISHES[dishId].stall;
}

/** Every dish the menu knows, for the title screen and the shop. */
export function recipeList() {
  return Object.entries(DISHES).map(([id, dish]) => ({ id, ...dish }));
}

/** The dishes one stall can cook (locked ones included, flagged). */
export function stallRecipes(stallId) {
  return Object.entries(DISHES)
    .filter(([, dish]) => dish.stall === stallId)
    .map(([id, dish]) => ({ id, ...dish }));
}
