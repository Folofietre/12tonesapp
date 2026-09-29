import { describe, expect, it } from 'vitest'
import {
  CIRCLE_OF_FIFTHS,
  groupPositions,
  midiOf,
  midiToHz,
  noteName,
  parseNote,
  parseRow,
  shapeLabel,
  shuffle,
} from '../music'

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

describe('splitting the circle', () => {
  it('takes every Nth position', () => {
    expect(groupPositions(3, 0)).toEqual([0, 3, 6, 9])
    expect(groupPositions(3, 2)).toEqual([2, 5, 8, 11])
    expect(groupPositions(4, 1)).toEqual([1, 5, 9])
    expect(groupPositions(6, 5)).toEqual([5, 11])
    expect(groupPositions(1, 0)).toHaveLength(12)
  })

  it('covers each position exactly once for every split', () => {
    for (const split of [1, 2, 3, 4, 6] as const) {
      const all = Array.from({ length: split }, (_, g) => groupPositions(split, g)).flat()
      expect([...all].sort((a, b) => a - b)).toEqual([...Array(12).keys()])
    }
  })

  it('labels shapes by size and letter', () => {
    expect(shapeLabel(3, 0)).toBe('4-A')
    expect(shapeLabel(4, 2)).toBe('3-C')
    expect(shapeLabel(1, 0)).toBe('Full')
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
