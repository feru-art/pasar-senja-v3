// Nights: seven of them, the last one the festival. Each night picks a tide
// event, sets its income target and timer, and can throw a rush of customers
// at the market. Night 7 brings the food critic.

import { FESTIVAL_SECONDS, NIGHT_EVENTS, NIGHT_SECONDS, TOTAL_NIGHTS, nightTarget, spawnInterval } from './config.js';
import { randomPick } from './random.js';

/** A fresh night plan: night 1, calm, target set. */
export function createNights() {
  return { night: 0, event: NIGHT_EVENTS[0], target: 0, secondsLeft: 0, burstLeft: 0 };
}

/** Begin the next night: pick its event, target and timer. Returns the plan. */
export function startNight(nights, random) {
  nights.night += 1;
  nights.event = nights.night === 1 ? NIGHT_EVENTS[0] : randomPick(random, NIGHT_EVENTS);
  nights.target = nightTarget(nights.night);
  nights.secondsLeft = nights.night >= TOTAL_NIGHTS ? FESTIVAL_SECONDS : NIGHT_SECONDS;
  nights.burstLeft = nights.event.burst ?? 0;
  return nights;
}

/** Is this the festival night (the last one, with the critic)? */
export function isFestivalNight(nights) {
  return nights.night >= TOTAL_NIGHTS;
}

/** The next night to play (after this one ends). */
export function nextNight(nights) {
  return nights.night + 1;
}

/** Seconds between customer arrivals this night (event-adjusted). */
export function nightSpawnInterval(nights) {
  return spawnInterval(nights.night) * (nights.event.spawn ?? 1.0);
}

/** Fire a rush event: three customers arrive at once. Returns how many to spawn. */
export function triggerRushEvent(nights) {
  const count = nights.burstLeft;
  nights.burstLeft = 0;
  return count;
}

/** A short line announcing the night about to begin. */
export function nightAnnouncement(nights) {
  const festival = isFestivalNight(nights) ? ' — Festival! Kritikus datang!' : '';
  return `Malam ${nights.night}/${TOTAL_NIGHTS}: target ${nights.target} koin. ${nights.event.name}${festival}`;
}
