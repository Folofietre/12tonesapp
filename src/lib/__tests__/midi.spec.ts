import { describe, expect, it } from 'vitest'
import { buildMidi, sequenceToMidi, TICKS_PER_STEP, vlq } from '../midi'
import { CIRCLE_OF_FIFTHS, type ShapeRef } from '../music'
import { defaultShape, type ShapeState } from '../rhythm'

/** Minimal Standard MIDI File reader, enough to check what buildMidi writes. */
function readMidi(b: Uint8Array) {
  const str = (i: number) => String.fromCharCode(...b.slice(i, i + 4))
  const u32 = (i: number) => ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0
  expect(str(0)).toBe('MThd')
  const header = { length: u32(4), format: (b[8]! << 8) | b[9]!, tracks: (b[10]! << 8) | b[11]!, tpq: (b[12]! << 8) | b[13]! }
  expect(str(14)).toBe('MTrk')
  const end = 22 + u32(18)
  let p = 22
  let t = 0
  const events: { t: number; kind: string; data: number[] }[] = []
  const readVlq = () => {
    let v = 0
    let c: number
    do {
      c = b[p++]!
      v = (v << 7) | (c & 127)
    } while (c & 128)
    return v
  }
  while (p < end) {
    t += readVlq()
    const status = b[p++]!
    if (status === 0xff) {
      const type = b[p++]!
      const len = readVlq()
      events.push({ t, kind: `meta:${type.toString(16)}`, data: [...b.slice(p, p + len)] })
      p += len
    } else if ((status & 0xf0) === 0xc0) {
      events.push({ t, kind: 'program', data: [b[p++]!] })
    } else {
      events.push({ t, kind: status === 0x90 ? 'on' : 'off', data: [b[p++]!, b[p++]!] })
    }
  }
  return { header, events, consumed: p, total: b.length }
}

describe('MIDI export', () => {
  it('encodes variable-length quantities', () => {
    expect(vlq(0)).toEqual([0])
    expect(vlq(127)).toEqual([0x7f])
    expect(vlq(128)).toEqual([0x81, 0x00])
    expect(vlq(1920)).toEqual([0x8f, 0x00])
  })

  it('writes a valid format 0 file with tempo, program and notes', () => {
    const bytes = buildMidi(
      [
        { tick: 0, duration: 480, midi: 60 },
        { tick: 480, duration: 480, midi: 69 },
      ],
      96,
      27,
      'Test',
    )
    const m = readMidi(bytes)
    expect(m.header).toEqual({ length: 6, format: 0, tracks: 1, tpq: 480 })
    expect(m.consumed).toBe(m.total)
    const tempo = m.events.find((e) => e.kind === 'meta:51')!.data
    expect((tempo[0]! << 16) | (tempo[1]! << 8) | tempo[2]!).toBe(625000) // 96 BPM
    expect(m.events.find((e) => e.kind === 'program')!.data).toEqual([27])
    expect(m.events.find((e) => e.kind === 'meta:58')!.data.slice(0, 2)).toEqual([4, 2]) // 4/4
    const notes = m.events.filter((e) => e.kind === 'on' || e.kind === 'off').map((e) => [e.t, e.kind, e.data[0]])
    // at tick 480 the first note ends before the second starts
    expect(notes).toEqual([[0, 'on', 60], [480, 'off', 60], [480, 'on', 69], [960, 'off', 69]])
    expect(m.events[m.events.length - 1]!.kind).toBe('meta:2f')
  })

  it('converts a sequence of bars into notes', () => {
    const row = [...CIRCLE_OF_FIFTHS]
    const ref: ShapeRef = { kind: 'nth', split: 3, group: 0 }
    const { notes, meters } = sequenceToMidi({ row }, [ref, ref], defaultShape)
    expect(notes).toHaveLength(8)
    // shape 4-A = positions 0,3,6,9 = C A F# D#, octave 4, 4 steps each
    expect(notes.slice(0, 4).map((n) => n.midi)).toEqual([60, 69, 66, 63])
    expect(notes[4]!.tick).toBe(16 * TICKS_PER_STEP)
    expect(notes[0]!.duration).toBe(4 * TICKS_PER_STEP)
    expect(meters).toEqual([{ tick: 0, steps: 16 }])
  })

  it('places bars of different lengths back to back and writes each time signature change', () => {
    const row = [...CIRCLE_OF_FIFTHS]
    const a: ShapeRef = { kind: 'run', size: 6, start: 0 }
    const b: ShapeRef = { kind: 'run', size: 6, start: 6 }
    const shapes: Record<string, ShapeState> = {
      a: { ...defaultShape(a), steps: 20, notes: [{ start: 19, length: 1, octave: 4 }, null, null, null, null, null] },
      b: { ...defaultShape(b), steps: 16, notes: [{ start: 0, length: 1, octave: 4 }, null, null, null, null, null] },
    }
    const get = (r: ShapeRef) => (r.kind === 'run' && r.start === 0 ? shapes.a! : shapes.b!)
    const { notes, meters } = sequenceToMidi({ row }, [a, a, b], get)
    expect(notes.map((n) => n.tick / TICKS_PER_STEP)).toEqual([19, 39, 40])
    expect(meters).toEqual([{ tick: 0, steps: 20 }, { tick: 40 * TICKS_PER_STEP, steps: 16 }])

    const m = readMidi(buildMidi(notes, 158, 30, 'x', meters))
    const sigs = m.events.filter((e) => e.kind === 'meta:58').map((e) => [e.t, e.data[0], e.data[1]])
    expect(sigs).toEqual([[0, 5, 2], [40 * TICKS_PER_STEP, 4, 2]]) // 5/4 then 4/4
    const at40 = m.events.filter((e) => e.t === 40 * TICKS_PER_STEP).map((e) => e.kind)
    expect(at40.indexOf('meta:58')).toBeLessThan(at40.indexOf('on'))
  })
})
