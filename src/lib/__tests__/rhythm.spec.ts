import { describe, expect, it } from 'vitest'
import type { ShapeRef } from '../music'
import {
  applyOrderPreset,
  clampEvent,
  defaultShape,
  filledSteps,
  meterLabel,
  moveLane,
  presetRhythm,
  setShapeSteps,
  soundingAt,
  type ShapeState,
} from '../rhythm'

const SQUARE_B: ShapeRef = { kind: 'nth', split: 3, group: 1 }
const sample = (): ShapeState => ({
  steps: 16,
  order: [10, 7, 4, 1],
  notes: [{ start: 0, length: 4, octave: 4 }, null, { start: 8, length: 2, octave: 5 }, { start: 12, length: 4, octave: 3 }],
})

describe('presets', () => {
  it('sequence splits the bar evenly', () => {
    expect(presetRhythm('sequence', 4).map((n) => n && [n.start, n.length])).toEqual([[0, 4], [4, 4], [8, 4], [12, 4]])
    expect(presetRhythm('sequence', 4, 20).map((n) => n && [n.start, n.length])).toEqual([[0, 5], [5, 5], [10, 5], [15, 5]])
    expect(presetRhythm('sequence', 12).every((n) => n && n.length === 1)).toBe(true)
  })

  it('every preset stays inside the bar, whatever its length', () => {
    for (const steps of [4, 5, 16, 20, 40, 64]) {
      for (const kind of ['sequence', 'chord', 'staircase', 'random'] as const) {
        for (const count of [2, 3, 4, 6, 12]) {
          for (const n of presetRhythm(kind, count, steps)) {
            if (!n) continue
            expect(n.start).toBeGreaterThanOrEqual(0)
            expect(n.start + n.length).toBeLessThanOrEqual(steps)
            expect(n.length).toBeGreaterThanOrEqual(1)
          }
        }
      }
    }
  })

  it('default shape plays clockwise, one bar of 4/4', () => {
    expect(defaultShape(SQUARE_B).order).toEqual([1, 4, 7, 10])
    expect(defaultShape(SQUARE_B).steps).toBe(16)
    expect(defaultShape({ kind: 'run', size: 6, start: 10 }).order).toEqual([10, 11, 0, 1, 2, 3])
  })
})

describe('ordering', () => {
  it('moving a lane carries its rhythm along', () => {
    const s = moveLane(sample(), 0, 1)
    expect(s.order).toEqual([7, 10, 4, 1])
    expect(s.notes[0]).toBeNull()
    expect(s.notes[1]).toEqual({ start: 0, length: 4, octave: 4 })
    expect(s.steps).toBe(16)
  })

  it('moving out of bounds is a no-op', () => {
    const s = sample()
    expect(moveLane(s, 0, -1)).toBe(s)
    expect(moveLane(s, 3, 1)).toBe(s)
  })

  it('order presets keep each note with its rhythm', () => {
    const cw = applyOrderPreset(sample(), SQUARE_B, 'clockwise')
    expect(cw.order).toEqual([1, 4, 7, 10])
    expect(cw.notes).toEqual([{ start: 12, length: 4, octave: 3 }, { start: 8, length: 2, octave: 5 }, null, { start: 0, length: 4, octave: 4 }])

    const ccw = applyOrderPreset(sample(), SQUARE_B, 'counterclockwise')
    expect(ccw.order).toEqual([1, 10, 7, 4])

    const sh = applyOrderPreset(sample(), SQUARE_B, 'shuffle', () => 0.5)
    expect([...sh.order].sort((a, b) => a - b)).toEqual([1, 4, 7, 10])
    sh.order.forEach((p, i) => {
      const before = sample()
      expect(sh.notes[i]).toEqual(before.notes[before.order.indexOf(p)])
    })
  })
})

describe('bar length', () => {
  it('shortening the bar pulls notes inside it', () => {
    const s = setShapeSteps(sample(), 10)
    expect(s.steps).toBe(10)
    expect(s.notes[2]).toEqual({ start: 8, length: 2, octave: 5 })
    expect(s.notes[3]).toEqual({ start: 9, length: 1, octave: 3 })
  })

  it('clamps the bar length', () => {
    expect(setShapeSteps(sample(), 1).steps).toBe(4)
    expect(setShapeSteps(sample(), 500).steps).toBe(64)
  })

  it('names the meter', () => {
    expect(meterLabel(16)).toBe('4/4')
    expect(meterLabel(20)).toBe('5/4')
    expect(meterLabel(40)).toBe('10/4')
    expect(meterLabel(22)).toBe('11/8')
    expect(meterLabel(13)).toBe('13/16')
  })
})

describe('playback helpers', () => {
  it('finds sounding lanes', () => {
    expect(soundingAt(sample(), 0)).toEqual([0])
    expect(soundingAt(sample(), 3)).toEqual([0])
    expect(soundingAt(sample(), 4)).toEqual([])
    expect(soundingAt(sample(), 9)).toEqual([2])
  })

  it('marks filled steps over the whole bar', () => {
    const f = filledSteps(sample())
    expect(f).toHaveLength(16)
    expect(f.filter(Boolean)).toHaveLength(10)
    expect(f[4]).toBe(false)
    expect(filledSteps({ ...sample(), steps: 20 })).toHaveLength(20)
  })

  it('clamps events into the bar', () => {
    expect(clampEvent({ start: 20, length: 99, octave: 9 })).toEqual({ start: 15, length: 1, octave: 7 })
    expect(clampEvent({ start: 20, length: 99, octave: 9 }, 40)).toEqual({ start: 20, length: 20, octave: 7 })
    expect(clampEvent({ start: -3, length: 0, octave: 0 })).toEqual({ start: 0, length: 1, octave: 1 })
    expect(clampEvent({ start: 'x' })).toEqual({ start: 0, length: 1, octave: 4 })
  })
})
