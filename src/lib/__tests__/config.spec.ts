import { describe, expect, it } from 'vitest'
import { ConfigError, fromConfig, parseConfigText, toConfig } from '../config'
import { CIRCLE_OF_FIFTHS } from '../music'
import type { ProjectData } from '../project'

const ROW = 'C G D A E B F# C# G# D# A# F'.split(' ')
const base = { format: 'twelve-tone-shapes', version: 1, row: ROW }

const project = (): ProjectData => ({
  bpm: 120,
  instrument: 'guitar-dist',
  row: [...CIRCLE_OF_FIFTHS],
  shapes: {
    '3:1': {
      order: [10, 7, 4, 1],
      notes: [{ start: 0, length: 4, octave: 4 }, null, { start: 8, length: 2, octave: 5 }, { start: 12, length: 4, octave: 3 }],
    },
  },
  arrangement: [{ split: 3, group: 1 }, { split: 4, group: 2 }],
})

describe('config files', () => {
  it('round-trips a project', () => {
    const cfg = toConfig(project())
    expect(cfg.row).toEqual(ROW)
    expect(fromConfig(JSON.parse(JSON.stringify(cfg)))).toEqual(project())
  })

  it.each([
    [{ format: 'other', version: 1 }, 'not a Twelve Tone Shapes'],
    [{ ...base, version: 2 }, 'Unsupported config version'],
    [{ ...base, row: ['C', 'C'] }, '12 distinct notes'],
    [{ ...base, shapes: [{ split: 3, group: 0, order: [0, 3, 6, 6] }] }, 'positions 0, 3, 6, 9'],
    [{ ...base, shapes: [{ split: 5, group: 0, order: [] }] }, 'Invalid shape'],
    [{ ...base, shapes: [{ split: 3, group: 3, order: [] }] }, 'Invalid shape'],
  ])('rejects %j', (raw, message) => {
    expect(() => fromConfig(raw)).toThrow(ConfigError)
    expect(() => fromConfig(raw)).toThrow(message)
  })

  it('rejects invalid JSON with a readable message', () => {
    expect(() => parseConfigText('{oops')).toThrow('not valid JSON')
  })

  it('clamps out-of-range values and fills defaults', () => {
    const p = fromConfig({
      ...base,
      row: ROW.map((n) => n.toLowerCase()),
      bpm: 5000,
      instrument: 'banjo',
      shapes: [{ split: 4, group: 0, order: [8, 0, 4], notes: [{ start: 20, length: 99, octave: 9 }] }],
      arrangement: [{ split: 4, group: 0 }, { split: 7, group: 0 }, 'junk'],
    })
    expect(p.bpm).toBe(300)
    expect(p.instrument).toBe('synth')
    expect(p.shapes['4:0']).toEqual({ order: [8, 0, 4], notes: [{ start: 15, length: 1, octave: 7 }, null, null] })
    expect(p.arrangement).toEqual([{ split: 4, group: 0 }])
  })

  it('accepts a minimal file', () => {
    const p = fromConfig(base)
    expect(p.shapes).toEqual({})
    expect(p.arrangement).toEqual([])
    expect(p.bpm).toBe(96)
  })
})
