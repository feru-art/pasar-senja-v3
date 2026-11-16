// World: the night market itself. It holds the stalls, the customers, the purse
// and the combo, and advances them all one fixed step at a time. The renderer
// only paints what the world holds; the input only steers it.

import { COUNTER, MAX_HEARTS, SEATS, START_SEATS, TOTAL_NIGHTS } from './config.js';
import { createRandom } from './random.js';
import { createStalls, tickStalls, takeDish, openStallCount, startStallCooking } from './stalls.js';
import { createCustomers, spawnCustomer, updatePatience, updateLeaving, serveCustomer, customerServed, findCustomerForDish, waitingCount } from './customers.js';
import { createPurse, earnCoins, loseReputation, resetNightIncome } from './economy.js';
import { createCombo, registerServe, comboMultiplier, breakCombo } from './combo.js';
import { createShop, cookingSpeed, extraSeats, helperActive } from './upgrades.js';
import { createNights, startNight, isFestivalNight, nightSpawnInterval, triggerRushEvent } from './nights.js';
import { createParticles, spawnCoinBurst, spawnFireworkBurst, spawnSteamPuff, updateParticles } from './particles.js';
import { dishPrice, dishStall, stallRecipes } from './recipes.js';
import { playAngrySound, playCoinSound, playNightHorn, playOrderChime, playSizzleSound } from './audio.js';

export const EVENT_SERVED = 1;
export const EVENT_ANGRY = 2;
export const EVENT_NIGHT_END = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_RUSH = 32;
export const EVENT_CRITIC = 64;
export const EVENT_COOKED = 128;

/** Seconds of calm before the first customer of a night walks in. */
export const FIRST_CUSTOMER_DELAY = 1.5;

/** Make a fresh market from a seed. */
export function createMarket(random) {
  const market = {
    random,
    stalls: createStalls(),
    customers: createCustomers(),
    purse: createPurse(),
    combo: createCombo(),
    shop: createShop(),
    nights: createNights(),
    particles: createParticles(),
    floats: [],
    unlocked: new Set(['sate', 'teh']),
    carried: null,
    selectedStall: 0,
    spawnTimer: 0,
    helperTimer: 0,
    fireworkTimer: 1.2,
    nightActive: false,
    inShop: false,
    time: 0,
    won: false,
    lost: false,
    criticServed: false,
    stars: 0,
    stats: { served: 0, angry: 0, dishesCooked: 0, upgradesBought: 0, nightsCleared: 0 },
  };
  return market;
}

/** Start the market over from scratch, keeping the same seed's random stream. */
export function resetMarket(market) {
  const fresh = createMarket(market.random);
  Object.assign(market, fresh);
}

/** Open the next night: pick its event, target and timer, clear the floor. */
export function startMarketNight(market) {
  market.customers.length = 0;
  market.carried = null;
  market.inShop = false;
  market.nightActive = true;
  market.spawnTimer = FIRST_CUSTOMER_DELAY;
  market.helperTimer = 5;
  resetNightIncome(market.purse);
  startNight(market.nights, market.random);
  const burst = triggerRushEvent(market.nights);
  for (let i = 0; i < burst; i += 1) {
    spawnCustomer(market.random, market.customers, openSeats(market), market.nights.night, market.unlocked, market.nights.event);
  }
  playNightHorn();
  return market.nights;
}

/** The seats customers may use right now (base + Kursi Tambahan). */
export function openSeats(market) {
  return SEATS.slice(0, START_SEATS + extraSeats(market.shop));
}

/** Float a short text up from a point (coins, warnings, bonuses). */
export function floatText(market, x, y, text, color) {
  market.floats.push({ x, y, text, color, life: 1.2 });
}

/** Click on a stall counter: start cooking its selected dish. */
export function clickStallAt(market, x, y) {
  for (const stall of market.stalls) {
    if (stall.locked) continue;
    if (Math.abs(x - stall.x) > 130 || y < 430 || y > 660) continue;
    const recipes = stallRecipes(stall.id).filter((dish) => !dish.locked || market.unlocked.has(dish.id));
    const dishId = stall.selectedDish && recipes.some((d) => d.id === stall.selectedDish)
      ? stall.selectedDish
      : recipes[0]?.id;
    if (!dishId) return false;
    if (stall.cooking) return false;
    const job = startStallCooking(stall, dishId, market.unlocked, cookingSpeed(market.shop));
    if (!job) return false;
    playSizzleSound();
    return true;
  }
  return false;
}

/** Click a finished dish on a counter: pick it up to carry it. */
export function takeDishAt(market, x, y) {
  if (market.carried) return null;
  for (const stall of market.stalls) {
    if (stall.locked) continue;
    for (let i = 0; i < stall.counter.length; i += 1) {
      const dx = stall.x - 70 + i * 70;
      const dy = COUNTER.dishY;
      if (Math.abs(x - dx) < 34 && Math.abs(y - dy) < 34) {
        market.carried = takeDish(stall, i);
        return market.carried;
      }
    }
  }
  return null;
}

/** Click a customer while carrying a dish: serve it when it matches an order. */
export function serveAt(market, x, y) {
  if (!market.carried) return null;
  const dishId = market.carried;
  for (const customer of market.customers) {
    if (customer.leaving) continue;
    if (Math.abs(x - customer.x) > 60 || Math.abs(y - customer.y) > 90) continue;
    if (!serveCustomer(customer, dishId)) {
      floatText(market, customer.x, customer.y - 60, 'Tidak cocok!', '#ff5964');
      return { served: false, matched: false };
    }
    const pay = Math.round(dishPrice(dishId) * customer.pay * comboMultiplier(market.combo));
    earnCoins(market.purse, pay);
    registerServe(market.combo);
    spawnCoinBurst(market.particles, customer.x, customer.y - 50, 14, market.random);
    floatText(market, customer.x, customer.y - 60, `+${pay}`, '#ffd166');
    playCoinSound();
    market.carried = null;
    market.stats.served += 1;
    if (customer.kind === 'kritikus') market.criticServed = true;
    if (customerServed(customer)) {
      customer.leaving = true;
      customer.leaveTimer = 0.6;
      customer.happy = true;
    }
    return { served: true, matched: true, paid: pay, customer };
  }
  return null;
}

/** Click empty space while carrying: put the dish back on its stall's counter. */
export function cancelCarry(market) {
  if (!market.carried) return;
  const dishId = market.carried;
  const stall = market.stalls.find((s) => s.id === dishStall(dishId));
  if (stall && !stall.locked && stall.counter.length < 2) stall.counter.push(dishId);
  market.carried = null;
}

/** Tick the helper: auto-serve one ready dish every HELPER_SECONDS. */
export function tickHelper(market, step) {
  if (!helperActive(market.shop)) return null;
  market.helperTimer -= step;
  if (market.helperTimer > 0) return null;
  market.helperTimer = 15;
  for (const stall of market.stalls) {
    if (stall.locked) continue;
    for (let i = 0; i < stall.counter.length; i += 1) {
      const dishId = stall.counter[i];
      const customer = findCustomerForDish(market.customers, dishId);
      if (!customer) continue;
      stall.counter.splice(i, 1);
      serveCustomer(customer, dishId);
      const pay = Math.round(dishPrice(dishId) * customer.pay * comboMultiplier(market.combo));
      earnCoins(market.purse, pay);
      registerServe(market.combo);
      spawnCoinBurst(market.particles, customer.x, customer.y - 50, 10, market.random);
      floatText(market, customer.x, customer.y - 60, `+${pay}`, '#ffd166');
      market.stats.served += 1;
      if (customerServed(customer)) {
        customer.leaving = true;
        customer.leaveTimer = 0.6;
        customer.happy = true;
      }
      return { served: true, dishId, customer };
    }
  }
  return null;
}

/** End the night: check the target, hand out the shop or the win/lose. */
export function endNight(market) {
  market.nightActive = false;
  market.customers.length = 0;
  market.carried = null;
  // The pans are emptied when the market closes; nothing cooks overnight.
  for (const stall of market.stalls) {
    stall.cooking = null;
    stall.counter.length = 0;
  }
  market.stats.nightsCleared += 1;
  let events = EVENT_NIGHT_END;
  if (market.purse.nightIncome < market.nights.target) {
    loseReputation(market.purse);
    floatText(market, 640, 300, 'Target tidak tercapai! −1 hati', '#ff5964');
  }
  if (market.purse.hearts <= 0) {
    market.lost = true;
    events |= EVENT_LOSE;
    return events;
  }
  if (isFestivalNight(market.nights)) {
    market.won = true;
    market.stars = 1 + (market.criticServed ? 1 : 0) + (market.purse.totalIncome >= 3000 || market.purse.hearts >= 3 ? 1 : 0);
    events |= EVENT_WIN;
    return events;
  }
  market.inShop = true;
  return events;
}

/** Advance the market one fixed step; returns the events that fired. */
export function stepMarket(market, step) {
  let events = 0;
  market.time += step;
  updateParticles(market.particles, step);
  for (let i = market.floats.length - 1; i >= 0; i -= 1) {
    const float = market.floats[i];
    float.life -= step;
    float.y -= 26 * step;
    if (float.life <= 0) market.floats.splice(i, 1);
  }
  if (!market.nightActive || market.won || market.lost) return events;
  // Festival fireworks over the market edges, every couple of seconds.
  if (isFestivalNight(market.nights)) {
    market.fireworkTimer -= step;
    if (market.fireworkTimer <= 0) {
      market.fireworkTimer = 1.2 + market.random() * 0.8;
      const colors = ['#f2c14e', '#e63946', '#2a9d8f', '#7c5cbf'];
      const leftSide = market.random() < 0.5;
      const fx = leftSide ? 60 + market.random() * 240 : 980 + market.random() * 240;
      const fy = 80 + market.random() * 100;
      spawnFireworkBurst(market.particles, fx, fy, colors[Math.floor(market.random() * colors.length)], market.random);
    }
  }
  // Cooking.
  const finished = tickStalls(market.stalls, step);
  for (const done of finished) {
    market.stats.dishesCooked += 1;
    spawnSteamPuff(market.particles, done.stall.x, done.stall.y + 40, market.random);
    playSizzleSound();
    events |= EVENT_COOKED;
  }
  // Customers arrive.
  market.spawnTimer -= step;
  if (market.spawnTimer <= 0) {
    const before = waitingCount(market.customers);
    const arrived = spawnCustomer(market.random, market.customers, openSeats(market), market.nights.night, market.unlocked, market.nights.event);
    if (arrived) {
      playOrderChime();
      if (arrived.kind === 'kritikus') events |= EVENT_CRITIC;
    }
    void before;
    market.spawnTimer = nightSpawnInterval(market.nights) * (0.8 + market.random() * 0.4);
  }
  // Patience drains; angry customers walk out.
  const angry = updatePatience(market.customers, step);
  for (const customer of angry) {
    loseReputation(market.purse);
    breakCombo(market.combo);
    market.stats.angry += 1;
    floatText(market, customer.x, customer.y - 60, 'Pelanggan marah! −1 hati', '#ff5964');
    playAngrySound();
    events |= EVENT_ANGRY;
    if (market.purse.hearts <= 0) {
      market.lost = true;
      market.nightActive = false;
      events |= EVENT_LOSE;
      return events;
    }
  }
  const gone = updateLeaving(market.customers, step);
  for (const customer of gone) {
    const index = market.customers.indexOf(customer);
    if (index !== -1) market.customers.splice(index, 1);
  }
  // The helper serves while the keeper cooks.
  tickHelper(market, step);
  // Night timer.
  market.nights.secondsLeft -= step;
  if (market.nights.secondsLeft <= 0) {
    events |= endNight(market);
  }
  return events;
}

/** The night is over when the timer hits zero (and the shop is open). */
export function nightCleared(market) {
  return !market.nightActive && !market.won && !market.lost;
}

/** How many hearts the market still has (for the HUD and the results). */
export function heartsLeft(market) {
  return Math.max(0, market.purse.hearts);
}

export { MAX_HEARTS, TOTAL_NIGHTS, openStallCount };
