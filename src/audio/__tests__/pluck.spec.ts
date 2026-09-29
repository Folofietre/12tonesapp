import { describe, expect, it } from 'vitest'
import { midiToHz } from '@/lib/music'
import { renderPluck } from '../pluck'

const SR = 48000

/** Period (in samples) with the strongest autocorrelation around the expected one. */
function estimatePeriod(y: Float32Array, expected: number): number {
  const seg = y.subarray(Math.floor(SR * 0.05), Math.floor(SR * 0.05) + 4096)
  let best = -Infinity
  let bestLag = 0
  for (let lag = Math.floor(expected * 0.8); lag <= Math.ceil(expected * 1.2); lag++) {
    let s = 0
    for (let i = 0; i + lag < seg.length; i++) s += seg[i]! * seg[i + lag]!
    if (s > best) {
      best = s
      bestLag = lag
    }
  }
  return bestLag
}

const rms = (y: Float32Array, from: number, to: number) => Math.sqrt(y.subarray(from, to).reduce((s, x) => s + x * x, 0) / (to - from))

describe('Karplus-Strong pluck', () => {
  it.each([40, 52, 60, 69, 76])('MIDI %i is in tune and decays', (midi) => {
    const f = midiToHz(midi)
    const y = renderPluck(SR, f, 1.5, 0.996)
    expect(y.every(Number.isFinite)).toBe(true)
    const period = SR / f
    expect(Math.abs(estimatePeriod(y, period) - period)).toBeLessThanOrEqual(1)
    expect(rms(y, SR, SR + 4800)).toBeLessThan(rms(y, 0, 4800))
  })

  it('never exceeds full scale', () => {
    const y = renderPluck(SR, midiToHz(45), 1, 0.999)
    expect(Math.max(...Array.from(y, Math.abs))).toBeLessThanOrEqual(1)
  })
})
