/**
 * Seedable Pseudo-Random Number Generator (LCG Algorithm)
 * Ensures 100% deterministic test data across application reloads.
 */
export function createRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];
