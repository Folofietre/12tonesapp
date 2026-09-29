import { describe, expect, it } from 'vitest'
import {
  CIRCLE_OF_FIFTHS,
  groupPositions,
  layoutOf,
  layoutRefs,
  midiOf,
  midiToHz,
  noteName,
  parseNote,
  parseRow,
  parseShapeKey,
  sameRef,
  shapeColor,
  shapeKey,
  shapeLabel,
  shuffle,
  type ShapeRef,
} from '../music'

const nth = (split: 1 | 2 | 3 | 4 | 6, group: number): ShapeRef => ({ kind: 'nth', split, group })
const run = (size: 2 | 3 | 4 | 6 | 12, start: number): ShapeRef => ({ kind: 'run', size, start })

describe('notes and rows', () => {
  it('parses sharps, flats and lower case', () => {
    expect(parseNote('C#')).toBe(1)
    expect(parseNote('db')).toBe(1)
    expect(parseNote(' Bb ')).toBe(10)
    expect(parseNote('H')).toBeUndefined()
    expect(noteName(13)).toBe('C#')
  })

  it('accepts a row of 12 distinct notes only', () => {
    expect(parseRow('C G D A E B F# C# G# D# A# F')).toEqual(CIRCLE_OF_FIFTHS)
    expect(parseRow('c,g,d,a,e,b,gb,db,ab,eb,bb,f')).toEqual(CIRCLE_OF_FIFTHS)
    expect(parseRow('C G D A E B F# C# G# D# A#')).toBeNull() // 11 notes
    expect(parseRow('C C D A E B F# C# G# D# A# F')).toBeNull() // duplicate
    expect(parseRow('C X D A E B F# C# G# D# A# F')).toBeNull() // unknown
  })
})

describe('every Nth note', () => {
  it('takes every Nth position', () => {
    expect(groupPositions(nth(3, 0))).toEqual([0, 3, 6, 9])
    expect(groupPositions(nth(3, 2))).toEqual([2, 5, 8, 11])
    expect(groupPositions(nth(4, 1))).toEqual([1, 5, 9])
    expect(groupPositions(nth(6, 5))).toEqual([5, 11])
    expect(groupPositions(nth(1, 0))).toHaveLength(12)
  })

  it('labels shapes by size and letter', () => {
    expect(shapeLabel(nth(3, 0))).toBe('4-A')
    expect(shapeLabel(nth(4, 2))).toBe('3-C')
    expect(shapeLabel(nth(1, 0))).toBe('Full')
  })
})

describe('runs of neighbours (fragmented rows)', () => {
  it('takes consecutive positions and wraps around 12', () => {
    expect(groupPositions(run(6, 2))).toEqual([2, 3, 4, 5, 6, 7])
    expect(groupPositions(run(6, 10))).toEqual([10, 11, 0, 1, 2, 3])
    expect(groupPositions(run(4, 5))).toEqual([5, 6, 7, 8])
  })

  it('rotates the cut with the offset', () => {
    expect(layoutRefs('run', 2, 4)).toEqual([run(6, 4), run(6, 10)])
    expect(layoutRefs('run', 2, 2)).toEqual([run(6, 2), run(6, 8)])
    expect(layoutRefs('run', 2, 6)).toEqual(layoutRefs('run', 2, 0)) // offset wraps at the group size
    expect(layoutRefs('run', 3, -1)).toEqual([run(4, 3), run(4, 7), run(4, 11)])
  })

  it('finds the layout of a run back', () => {
    expect(layoutOf(run(6, 10))).toEqual({ mode: 'run', split: 2, offset: 4, group: 1 })
    expect(layoutOf(run(4, 5))).toEqual({ mode: 'run', split: 3, offset: 1, group: 1 })
    expect(layoutOf(nth(4, 2))).toEqual({ mode: 'nth', split: 4, offset: 0, group: 2 })
  })

  it('labels runs by size and first clock position', () => {
    expect(shapeLabel(run(6, 10))).toBe('R6@10')
    expect(shapeLabel(run(6, 0))).toBe('R6@12')
  })

  it('gives different colors to the groups of one layout', () => {
    for (const split of [2, 3, 4, 6] as const) {
      for (let offset = 0; offset < 12 / split; offset++) {
        const colors = layoutRefs('run', split, offset).map(shapeColor)
        expect(new Set(colors).size).toBe(split)
      }
    }
  })
})

describe('both modes', () => {
  it('cover each position exactly once, for every split and rotation', () => {
    for (const split of [1, 2, 3, 4, 6] as const) {
      for (const [mode, offset] of [['nth', 0], ['run', 0], ['run', 1], ['run', 5]] as const) {
        const all = layoutRefs(mode, split, offset).flatMap(groupPositions)
        expect([...all].sort((a, b) => a - b)).toEqual([...Array(12).keys()])
      }
    }
  })

  it('round-trips shape keys', () => {
    for (const r of [nth(3, 1), nth(1, 0), run(6, 10), run(2, 11), run(12, 3)]) {
      expect(parseShapeKey(shapeKey(r))).toEqual(r)
    }
    expect(parseShapeKey('run5@0')).toBeNull()
    expect(parseShapeKey('3:3')).toBeNull()
    expect(sameRef(run(6, 4), { kind: 'run', size: 6, start: 4 })).toBe(true)
    expect(sameRef(run(6, 4), nth(2, 0))).toBe(false)
  })
})

describe('pitch', () => {
  it('maps C4 to MIDI 60 and A4 to 440 Hz', () => {
    expect(midiOf(0, 4)).toBe(60)
    expect(midiToHz(midiOf(9, 4))).toBeCloseTo(440)
  })

  it('shuffle returns a permutation without touching the input', () => {
    const input = [...Array(12).keys()]
    const out = shuffle(input, () => 0.3)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
    expect(input).toEqual([...Array(12).keys()])
  })
})
