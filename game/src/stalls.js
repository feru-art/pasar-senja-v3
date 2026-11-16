// Stalls: the cooking counters along the bottom. Each stall cooks one dish at a
// time; finished dishes wait on its counter (two at most) to be carried to a
// customer. Locked stalls open only when their upgrade is bought.

import { STALLS } from './config.js';
import { startCooking, tickCooking } from './recipes.js';

/** A fresh row of stalls: two open, Gorengan locked. */
export function createStalls() {
  return STALLS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    x: spec.x,
    y: spec.y,
    color: spec.color,
    roof: spec.roof,
    locked: spec.locked,
    selectedDish: null,
    cooking: null,
    counter: [],
    smoke: 0,
  }));
}

/** Open a locked stall (the Gorengan upgrade). */
export function unlockStall(stalls, stallId) {
  const stall = stalls.find((s) => s.id === stallId);
  if (stall) stall.locked = false;
  return stall;
}

/** Is this stall open for business? */
export function stallIsBusy(stall) {
  return stall.cooking !== null;
}

/** How far along the current cooking job is (0 idle, 1 done). */
export function stallCookProgress(stall) {
  if (!stall.cooking) return 0;
  return 1 - stall.cooking.left / stall.cooking.total;
}

/** Start cooking the stall's selected dish (or its signature dish). */
export function startStallCooking(stall, dishId, unlocked, speed) {
  if (stall.locked || stall.cooking) return null;
  const job = startCooking(dishId, unlocked, speed);
  if (!job) return null;
  stall.cooking = job;
  stall.selectedDish = dishId;
  return job;
}

/** Tick every stall's cooking; returns the dishes that just finished. */
export function tickStalls(stalls, step) {
  const finished = [];
  for (const stall of stalls) {
    if (!stall.cooking) continue;
    if (tickCooking(stall.cooking, step)) {
      if (stall.counter.length < 2) {
        stall.counter.push(stall.cooking.dishId);
        finished.push({ stall, dishId: stall.cooking.dishId });
      }
      stall.cooking = null;
      stall.smoke = 0.6;
    }
  }
  return finished;
}

/** Take a finished dish off a stall's counter (to carry it). */
export function takeDish(stall, index) {
  if (index < 0 || index >= stall.counter.length) return null;
  return stall.counter.splice(index, 1)[0];
}

/** The dishes waiting on this stall's counter. */
export function counterDishes(stall) {
  return stall.counter;
}

/** How many stalls are open right now? */
export function openStallCount(stalls) {
  return stalls.filter((s) => !s.locked).length;
}
