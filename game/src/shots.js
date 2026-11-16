// The screenshot scenes behind ?shot=festival|title|shop|results. Each one
// plays the real rules forward from a fresh market for a fixed stretch,
// steered by an autopilot — it cooks what the oldest waiting customer ordered,
// carries the dish over, serves before patience runs out, and buys upgrades
// between nights — so the frame is what a real game looks like, and the same
// seed always gives the same frame. A scene never edits the world by hand: a
// results frame is a night the autopilot really played, and a festival frame
// is a night it really fumbled (the sloppy autopilot serves late, so red
// patience bars show and the critic sweats).
//
// Autopilot modes: 'normal' (plays well, wins), 'sloppy' (serves late, lets a
// few customers storm off), 'thrifty' (buys almost nothing, so the shop shot
// still has cards on the shelf), 'thriftySloppy' (sloppy play + thrifty buys,
// so the shop shot is also short on coins), 'mixed' (sloppy for the first two
// nights, then normal — wins with a few angry walkouts on the record, for the
// results shot), 'festival' (serves everyone promptly except the critic, who
// waits until nearly out of patience, and keeps all stalls cooking — so the
// cover frame has coin bursts, full woks and a red-barred critic at once).

import { COUNTER, STEP, TOTAL_NIGHTS } from './config.js';
import { resetMarket, startMarketNight, stepMarket, clickStallAt, takeDishAt, serveAt, cancelCarry } from './world.js';
import { buyUpgrade, upgradeChoices } from './upgrades.js';
import { stallRecipes } from './recipes.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Seconds of live night behind the title panel (customers walk in). */
const TITLE_SECONDS = 10;
/** The festival scene stops on night 7, the critic in the frame. */
const FESTIVAL_NIGHT = 7;
/** The shop scene stops after night 2, in the shop, short on coins. */
const SHOP_NIGHT = 2;
/** The longest a scene may simulate, in seconds of game time. */
const SCENE_LIMIT_SECONDS = 1200;

/** The order the autopilot buys upgrades (best value first). */
const AUTOPILOT_BUYS = ['goreng', 'kompor', 'kursi', 'tehmanis', 'pisang', 'pelayan'];

/** What the thrifty autopilot buys, by the night that just ended. */
const THRIFTY_BUYS = { 1: ['goreng', 'tehmanis', 'pisang'], 2: ['kompor'] };

/**
 * The sloppy serve/cook patience thresholds for a mode (null = play promptly).
 * The shop mode is the sloppiest of all — it earns the least, so the shop
 * frame is genuinely short on coins.
 */
function sloppyThresholds(mode, market) {
  if (mode === 'thriftySloppy') return { serve: 0.2, cook: 0.25 };
  if (mode === 'sloppy') return { serve: 0.3, cook: 0.35 };
  if (mode === 'mixed' && market.nights.night <= 2) return { serve: 0.3, cook: 0.35 };
  return null;
}

/** Below this patience ratio a customer gets served (1 = always). */
function serveThreshold(mode, market, customer) {
  if (mode === 'festival') {
    // The first two nights are fumbled, so the festival frame shows a
    // market that has already lost a heart or two — then the keeper
    // sharpens up and serves everyone promptly except the critic.
    if (market.nights.night <= 2) return 0.3;
    return customer.kind === 'kritikus' ? 0.3 : 1;
  }
  const sloppy = sloppyThresholds(mode, market);
  return sloppy ? sloppy.serve : 1;
}

/** Below this patience ratio a customer gets cooked for (1 = always). */
function cookThreshold(mode, market) {
  if (mode === 'festival') {
    if (market.nights.night <= 2) return 0.35;
    return 1;
  }
  const sloppy = sloppyThresholds(mode, market);
  return sloppy ? sloppy.cook : 1;
}

/** Does this mode buy almost nothing in the shop? */
function modeIsThrifty(mode) {
  return mode === 'thrifty' || mode === 'thriftySloppy';
}

/**
 * One autopilot decision per step: serve what is ready, cook what is ordered,
 * buy upgrades in the shop. It plays by the same clicks a human would make.
 */
function autopilot(market, mode) {
  // Between nights: buy upgrades, then open the next night.
  if (market.inShop) {
    const choices = upgradeChoices(market.shop);
    const want = modeIsThrifty(mode) ? (THRIFTY_BUYS[market.nights.night] ?? []) : AUTOPILOT_BUYS;
    for (const id of want) {
      const item = choices.find((c) => c.id === id);
      if (!item) continue;
      if (market.purse.coins >= item.price) {
        if (buyUpgrade(market.shop, market.purse, market.stalls, market.unlocked, item)) {
          market.stats.upgradesBought += 1;
        }
      }
    }
    startMarketNight(market);
    return;
  }
  if (!market.nightActive) {
    startMarketNight(market);
    return;
  }
  const waiting = market.customers.filter((c) => !c.leaving);
  // Serve: a ready dish that a waiting customer ordered goes over at once.
  // The sloppy autopilot only serves customers whose patience is nearly gone
  // (below 30%) — fresh customers wait, so red bars appear and a few walk
  // out angry. The festival autopilot serves everyone promptly except the
  // critic, who waits until nearly out of patience (red bar, still seated).
  const serveable = waiting.filter((c) => c.patience / c.maxPatience <= serveThreshold(mode, market, c));
  serveable.sort((a, b) => a.patience - b.patience);
  for (const stall of market.stalls) {
    if (stall.locked) continue;
    for (let i = 0; i < stall.counter.length; i += 1) {
      const dishId = stall.counter[i];
      const customer = serveable.find((c) => c.orders.includes(dishId));
      if (!customer) continue;
      takeDishAt(market, stall.x - 70 + i * 70, COUNTER.dishY);
      serveAt(market, customer.x, customer.y);
      return;
    }
  }
  // Cook: the most urgent waiting customer's order, at the stall that makes it.
  // The sloppy autopilot only starts cooking once the customer is already
  // impatient (below 35%) — the dish finishes while the bar is red. The
  // festival autopilot cooks for everyone, so all three woks stay busy.
  const cookable = waiting.filter((c) => c.patience / c.maxPatience <= cookThreshold(mode, market));
  cookable.sort((a, b) => a.patience - b.patience);
  for (const customer of cookable) {
    for (const dishId of customer.orders) {
      const stall = market.stalls.find((s) => !s.locked && !s.cooking && stallRecipes(s.id).some((d) => d.id === dishId && (!d.locked || market.unlocked.has(d.id))));
      if (!stall) continue;
      // Already one of these on a counter? Then serve it instead of cooking more.
      const stocked = market.stalls.some((s) => s.counter.includes(dishId));
      if (stocked) continue;
      stall.selectedDish = dishId;
      clickStallAt(market, stall.x, 520);
      return;
    }
  }
  // Nothing to serve or cook: put a carried dish back on its counter.
  if (market.carried) cancelCarry(market);
}

/** Run the autopilot for `seconds` of game time (or until `stop` says to stop). */
function simulate(market, seconds, stop, mode = 'normal') {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    autopilot(market, mode);
    stepMarket(market, STEP);
    if (stop && stop(market)) break;
    if (market.won || market.lost) break;
  }
}

/** Run the market with no autopilot: customers walk in, nobody cooks yet. */
function simulateTitle(market, seconds) {
  startMarketNight(market);
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    stepMarket(market, STEP);
  }
}

/**
 * The festival cover is only taken when the frame is the real rush: night 7,
 * the critic waiting, a red patience bar, a coin burst visibly mid-air
 * (bright coins, not just the "+N" float), fireworks in the sky, a dish on
 * the serving counter, every open stall cooking, and at least four customers
 * waiting. Anything less is not the cover.
 */
export function festivalStopCondition(state) {
  if (state.nights.night < FESTIVAL_NIGHT) return false;
  const waiting = state.customers.filter((c) => !c.leaving);
  if (waiting.length < 4) return false;
  const criticWaiting = waiting.some((c) => c.kind === 'kritikus');
  if (!criticWaiting) return false;
  const redBar = waiting.some((c) => c.patience / c.maxPatience < 0.25);
  if (!redBar) return false;
  const coinBurst = state.particles.some((p) => p.kind === 'coin' && p.life > 0.4);
  if (!coinBurst) return false;
  const fireworks = state.particles.some((p) => p.kind === 'firework' && p.life > 0.3);
  if (!fireworks) return false;
  const dishOnCounter = state.stalls.some((s) => s.counter.length > 0);
  if (!dishOnCounter) return false;
  const open = state.stalls.filter((s) => !s.locked);
  if (open.length < 3) return false;
  if (!open.every((s) => s.cooking)) return false;
  return true;
}

/**
 * Set `market` to the named scene (festival, title, shop or results; any other
 * name is the title) and return the screen to draw over it and the best
 * income to show.
 */
export function stageShot(name, market) {
  resetMarket(market);
  if (name === 'festival') {
    simulate(market, SCENE_LIMIT_SECONDS, festivalStopCondition, 'festival');
    return { screen: SCREEN_PLAY, best: market.purse.totalIncome };
  }
  if (name === 'shop') {
    simulate(market, SCENE_LIMIT_SECONDS, (state) => state.inShop && state.nights.night >= SHOP_NIGHT, 'thriftySloppy');
    return { screen: SCREEN_SHOP, best: market.purse.totalIncome };
  }
  if (name === 'results') {
    simulate(market, SCENE_LIMIT_SECONDS, (state) => state.won || state.lost, 'mixed');
    if (market.won) return { screen: SCREEN_WIN, best: market.purse.totalIncome };
    // The autopilot lost this night; show the defeat it really earned.
    return { screen: SCREEN_LOSE, best: market.purse.totalIncome };
  }
  simulateTitle(market, TITLE_SECONDS);
  return { screen: SCREEN_TITLE, best: 0 };
}

/** Which night the festival scene shows, for the log. */
export function festivalSceneNight() {
  return FESTIVAL_NIGHT;
}

/** The total nights of a full festival run, for the log. */
export function totalNights() {
  return TOTAL_NIGHTS;
}
