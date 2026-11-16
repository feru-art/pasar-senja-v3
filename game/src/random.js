// A tiny seeded random stream (mulberry32): the same seed always deals the same
// night, so screenshots and play-tests are reproducible.

/** Make a random function from a 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry from a list with the seeded stream. */
export function randomPick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** Pick a value in [min, max) with the seeded stream. */
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}
