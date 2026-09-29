import { describe, expect, it } from 'vitest'
import { STEPS } from '../music'
import { applyOrderPreset, clampEvent, defaultShape, filledSteps, moveLane, presetRhythm, soundingAt, type ShapeState } from '../rhythm'

const sample = (): ShapeState => ({
  order: [10, 7, 4, 1],
  notes: [{ start: 0, length: 4, octave: 4 }, null, { start: 8, length: 2, octave: 5 }, { start: 12, length: 4, octave: 3 }],
})

describe('presets', () => {
  it('sequence splits the bar evenly', () => {
    expect(presetRhythm('sequence', 4).map((n) => n && [n.start, n.length])).toEqual([[0, 4], [4, 4], [8, 4], [12, 4]])
    expect(presetRhythm('sequence', 12).every((n) => n && n.length === 1)).toBe(true)
  })

  it('every preset stays inside the bar', () => {
    for (const kind of ['sequence', 'chord', 'staircase', 'random'] as const) {
      for (const count of [2, 3, 4, 6, 12]) {
        for (const n of presetRhythm(kind, count)) {
          if (!n) continue
          expect(n.start).toBeGreaterThanOrEqual(0)
          expect(n.start + n.length).toBeLessThanOrEqual(STEPS)
          expect(n.length).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })

  it('default shape plays clockwise', () => {
    expect(defaultShape(3, 1).order).toEqual([1, 4, 7, 10])
  })
})

describe('ordering', () => {
  it('moving a lane carries its rhythm along', () => {
    const s = moveLane(sample(), 0, 1)
    expect(s.order).toEqual([7, 10, 4, 1])
    expect(s.notes[0]).toBeNull()
    expect(s.notes[1]).toEqual({ start: 0, length: 4, octave: 4 })
  })

  it('moving out of bounds is a no-op', () => {
    const s = sample()
    expect(moveLane(s, 0, -1)).toBe(s)
    expect(moveLane(s, 3, 1)).toBe(s)
  })

  it('order presets keep each note with its rhythm', () => {
    const cw = applyOrderPreset(sample(), 3, 1, 'clockwise')
    expect(cw.order).toEqual([1, 4, 7, 10])
    expect(cw.notes).toEqual([{ start: 12, length: 4, octave: 3 }, { start: 8, length: 2, octave: 5 }, null, { start: 0, length: 4, octave: 4 }])

    const ccw = applyOrderPreset(sample(), 3, 1, 'counterclockwise')
    expect(ccw.order).toEqual([1, 10, 7, 4])

    const sh = applyOrderPreset(sample(), 3, 1, 'shuffle', () => 0.5)
    expect([...sh.order].sort((a, b) => a - b)).toEqual([1, 4, 7, 10])
    sh.order.forEach((p, i) => {
      const before = sample()
      expect(sh.notes[i]).toEqual(before.notes[before.order.indexOf(p)])
    })
  })
})

describe('playback helpers', () => {
  it('finds sounding lanes', () => {
    expect(soundingAt(sample(), 0)).toEqual([0])
    expect(soundingAt(sample(), 3)).toEqual([0])
    expect(soundingAt(sample(), 4)).toEqual([])
    expect(soundingAt(sample(), 9)).toEqual([2])
  })

  it('marks filled steps', () => {
    const f = filledSteps(sample())
    expect(f.filter(Boolean)).toHaveLength(10)
    expect(f[4]).toBe(false)
  })

  it('clamps events into the bar', () => {
    expect(clampEvent({ start: 20, length: 99, octave: 9 })).toEqual({ start: 15, length: 1, octave: 7 })
    expect(clampEvent({ start: -3, length: 0, octave: 0 })).toEqual({ start: 0, length: 1, octave: 1 })
    expect(clampEvent({ start: 'x' })).toEqual({ start: 0, length: 1, octave: 4 })
  })
})
