/**
 * Karplus-Strong plucked string.
 * A burst of noise circulates in a delay line of one period; averaging adjacent samples
 * acts as a low-pass filter, so the tone darkens and decays like a real string.
 * The delay uses linear interpolation so high notes stay in tune.
 */
export function renderPluck(
  sampleRate: number,
  frequency: number,
  seconds: number,
  sustain: number,
  rand: () => number = Math.random,
): Float32Array {
  const len = Math.max(1, Math.floor(sampleRate * seconds))
  const y = new Float32Array(len)
  // the two-point average adds half a sample of delay
  const period = sampleRate / frequency - 0.5
  const n0 = Math.max(1, Math.floor(period))
  const frac = period - n0

  for (let n = 0; n <= n0 + 1 && n < len; n++) y[n] = rand() * 2 - 1
  for (let n = 1; n <= n0 + 1 && n < len; n++) y[n] = (y[n]! + y[n - 1]!) * 0.5 // soften the pick

  const at = (i: number) => (i < 0 ? 0 : y[i]!)
  for (let n = n0 + 2; n < len; n++) {
    const a = at(n - n0) * (1 - frac) + at(n - n0 - 1) * frac
    const b = at(n - n0 - 1) * (1 - frac) + at(n - n0 - 2) * frac
    y[n] = sustain * 0.5 * (a + b)
  }
  return y
}
