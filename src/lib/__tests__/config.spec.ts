import { describe, expect, it } from 'vitest'
import { ConfigError, fromConfig, parseConfigText, toConfig } from '../config'
import { CIRCLE_OF_FIFTHS } from '../music'
import type { ProjectData } from '../project'

const ROW = 'C G D A E B F# C# G# D# A# F'.split(' ')
const base = { format: 'twelve-tone-shapes', version: 2, row: ROW }

const project = (): ProjectData => ({
  title: 'Test',
  credits: 'Someone, https://example.org',
  bpm: 120,
  instrument: 'guitar-dist',
  row: [...CIRCLE_OF_FIFTHS],
  shapes: {
    '3:1': {
      steps: 16,
      order: [10, 7, 4, 1],
      notes: [{ start: 0, length: 4, octave: 4 }, null, { start: 8, length: 2, octave: 5 }, { start: 12, length: 4, octave: 3 }],
    },
    'run6@10': {
      steps: 20,
      order: [2, 3, 11, 10, 0, 1],
      notes: [{ start: 0, length: 3, octave: 1 }, null, null, null, null, { start: 18, length: 2, octave: 2 }],
    },
  },
  arrangement: [
    { kind: 'nth', split: 3, group: 1 },
    { kind: 'run', size: 6, start: 10 },
  ],
})

describe('config files', () => {
  it('round-trips a project with both kinds of shapes', () => {
    const cfg = toConfig(project())
    expect(cfg.version).toBe(2)
    expect(cfg.row).toEqual(ROW)
    expect(cfg.arrangement).toEqual([{ split: 3, group: 1 }, { run: { start: 10, size: 6 } }])
    expect(fromConfig(JSON.parse(JSON.stringify(cfg)))).toEqual(project())
  })

  it('still reads version 1 files (16-step bars, every Nth note)', () => {
    const p = fromConfig({
      format: 'twelve-tone-shapes',
      version: 1,
      bpm: 96,
      instrument: 'synth',
      row: ROW,
      shapes: [{ split: 3, group: 1, order: [10, 7, 4, 1], notes: [{ start: 0, length: 4, octave: 4 }, null, null, null] }],
      arrangement: [{ split: 3, group: 1 }],
    })
    expect(p.shapes['3:1']!.steps).toBe(16)
    expect(p.arrangement).toEqual([{ kind: 'nth', split: 3, group: 1 }])
    expect(p.title).toBeUndefined()
  })

  it.each([
    [{ format: 'other', version: 1 }, 'not a Twelve Tone Shapes'],
    [{ ...base, version: 3 }, 'Unsupported config version'],
    [{ ...base, row: ['C', 'C'] }, '12 distinct notes'],
    [{ ...base, shapes: [{ split: 3, group: 0, order: [0, 3, 6, 6] }] }, 'positions 0, 3, 6, 9'],
    [{ ...base, shapes: [{ run: { start: 10, size: 6 }, order: [10, 11, 0, 1, 2, 4] }] }, 'positions 0, 1, 2, 3, 10, 11'],
    [{ ...base, shapes: [{ split: 5, group: 0, order: [] }] }, 'Invalid shape'],
    [{ ...base, shapes: [{ run: { start: 12, size: 6 }, order: [] }] }, 'Invalid shape'],
    [{ ...base, shapes: [{ run: { start: 0, size: 5 }, order: [] }] }, 'Invalid shape'],
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
      title: '   ',
      shapes: [
        { split: 4, group: 0, order: [8, 0, 4], notes: [{ start: 20, length: 99, octave: 9 }] },
        { run: { start: 4, size: 6 }, steps: 999, order: [4, 5, 6, 7, 8, 9], notes: [{ start: 60, length: 9, octave: 3 }] },
      ],
      arrangement: [{ split: 4, group: 0 }, { split: 7, group: 0 }, 'junk', { run: { start: 4, size: 6 } }],
    })
    expect(p.bpm).toBe(300)
    expect(p.instrument).toBe('synth')
    expect(p.title).toBeUndefined()
    expect(p.shapes['4:0']).toEqual({ steps: 16, order: [8, 0, 4], notes: [{ start: 15, length: 1, octave: 7 }, null, null] })
    expect(p.shapes['run6@4']!.steps).toBe(64)
    expect(p.shapes['run6@4']!.notes[0]).toEqual({ start: 60, length: 4, octave: 3 })
    expect(p.arrangement).toEqual([{ kind: 'nth', split: 4, group: 0 }, { kind: 'run', size: 6, start: 4 }])
  })

  it('accepts a minimal file', () => {
    const p = fromConfig(base)
    expect(p.shapes).toEqual({})
    expect(p.arrangement).toEqual([])
    expect(p.bpm).toBe(96)
  })
})
