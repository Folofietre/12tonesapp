import { describe, expect, it } from 'vitest'
import { CIRCLE_OF_FIFTHS } from '@/lib/music'
import type { ShapeRef } from '@/lib/project'
import { defaultShape, type ShapeState } from '@/lib/rhythm'
import { Transport, type PlayPosition } from '../transport'

/** Transport driven by a fake clock: timers and frames only run when the test says so. */
function setup(opts: { bpm?: number; loop?: boolean; metronome?: boolean; sequence?: ShapeRef[]; shapes?: Record<string, ShapeState> } = {}) {
  let now = 10
  const notes: { midi: number; time: number; duration: number }[] = []
  const clicks: { time: number; accent: boolean }[] = []
  const positions: (PlayPosition | null)[] = []
  let ended = 0
  const sequence = opts.sequence ?? [{ split: 3, group: 0 }]
  const t = new Transport(
    {
      now: () => now,
      sequence: () => sequence,
      shape: (r) => opts.shapes?.[`${r.split}:${r.group}`] ?? defaultShape(r.split, r.group),
      row: () => CIRCLE_OF_FIFTHS,
      bpm: () => opts.bpm ?? 120,
      loop: () => opts.loop ?? true,
      metronome: () => opts.metronome ?? false,
      playNote: (midi, time, duration) => notes.push({ midi, time, duration }),
      click: (time, accent) => clicks.push({ time, accent }),
    },
    (p) => positions.push(p),
    () => ended++,
    { setInterval: () => 1, clearInterval: () => {}, requestFrame: () => 1, cancelFrame: () => {} },
  )
  /** Advances the clock, running the scheduler and one frame. */
  const advance = (seconds: number) => {
    now += seconds
    t.schedule()
    t.frame()
  }
  return { t, notes, clicks, positions, advance, ended: () => ended, start: 10.06 }
}

describe('Transport', () => {
  it('schedules the notes of a bar at the right times (120 BPM: 1 step = 0.125 s)', () => {
    const s = setup()
    s.t.start()
    for (let i = 0; i < 20; i++) s.advance(0.1)
    // 4-A = C A F# D#, 4 steps each
    expect(s.notes.slice(0, 4).map((n) => n.midi)).toEqual([60, 69, 66, 63])
    s.notes.slice(0, 4).forEach((n, i) => {
      expect(n.time).toBeCloseTo(s.start + i * 0.5)
      expect(n.duration).toBeCloseTo(0.5)
    })
  })

  it('follows the audio clock for the displayed position', () => {
    const s = setup()
    s.t.start()
    s.advance(0.06 + 0.125 * 5 + 0.0625) // middle of step 6
    const p = s.positions[s.positions.length - 1]!
    expect(p.step).toBe(5)
    expect(p.bar).toBe(0)
    expect(p.frac).toBeCloseTo(0.5)
  })

  it('plays bars one after the other and loops', () => {
    const s = setup({ sequence: [{ split: 3, group: 0 }, { split: 4, group: 1 }] })
    s.t.start()
    for (let i = 0; i < 45; i++) s.advance(0.1) // 4.5 s = 2 bars + a bit
    const bar2 = s.notes.filter((n) => n.time >= s.start + 2 - 1e-9 && n.time < s.start + 4 - 1e-9)
    // 3-B = positions 1,5,9 = G B D#
    expect(bar2.map((n) => n.midi)).toEqual([67, 71, 63])
    const bar3 = s.notes.filter((n) => n.time >= s.start + 4 - 1e-9)
    expect(bar3[0]!.midi).toBe(60)
  })

  it('stops at the end without loop', () => {
    const s = setup({ loop: false })
    s.t.start()
    for (let i = 0; i < 30; i++) s.advance(0.1)
    expect(s.notes).toHaveLength(4)
    expect(s.ended()).toBe(1)
    expect(s.t.playing).toBe(false)
    expect(s.positions[s.positions.length - 1]).toBeNull()
  })

  it('plays rests as silence and honours custom order and octave', () => {
    const shapes = { '3:0': { order: [9, 0, 3, 6], notes: [{ start: 2, length: 1, octave: 5 }, null, null, null] } }
    const s = setup({ shapes })
    s.t.start()
    for (let i = 0; i < 18; i++) s.advance(0.1)
    expect(s.notes.map((n) => n.midi)).toEqual([75]) // position 9 = D#, octave 5
    expect(s.notes[0]!.time).toBeCloseTo(s.start + 0.25)
  })

  it('clicks on each beat with an accent on the downbeat', () => {
    const s = setup({ metronome: true })
    s.t.start()
    for (let i = 0; i < 20; i++) s.advance(0.1)
    expect(s.clicks.slice(0, 4).map((c) => c.accent)).toEqual([true, false, false, false])
    expect(s.clicks[1]!.time - s.clicks[0]!.time).toBeCloseTo(0.5)
  })

  it('handles an empty sequence without looping forever', () => {
    const s = setup({ sequence: [] })
    s.t.start()
    s.advance(0.2)
    expect(s.notes).toHaveLength(0)
    expect(s.ended()).toBe(1)
  })
})
