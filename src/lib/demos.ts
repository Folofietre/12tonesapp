import { CIRCLE_OF_FIFTHS, parseRow, shapeKey, type ShapeRef } from './music'
import { emptyProject, type ProjectData } from './project'
import { presetRhythm, type NoteEvent } from './rhythm'

export interface Demo {
  id: string
  name: string
  create: () => ProjectData
}

const n = (start: number, length: number, octave: number): NoteEvent => ({ start, length, octave })

export const CRETACEOUS_CHASM_CREDITS = [
  'Excerpt of "Cretaceous Chasm" by Blotted Science, from the EP "The Animation Of Entomology".',
  'Music by Jarzombek, Webster and Grossmann. © Spastic Music (BMI). All rights belong to their owners.',
  'Circle ("key"), note groups and riffs transcribed from Ron Jarzombek\'s "12-Tones In Fragmented Rows" page and tab:',
  'https://www.ronjarzombek.com/CretaceousChasmTab1.html',
  'Video: https://www.youtube.com/watch?v=IVyUHFl0iB8',
  'Used here as a study example of the system. Octaves are a reading of the tab (7-string tuned A E A D G B E).',
].join('\n')

/**
 * Blotted Science, "Cretaceous Chasm" (excerpt).
 * The clock pairs minor seconds all around: E F, A# B, F# G, Eb D, A G#, Db C.
 * Every note group is a run of 6 neighbouring positions ("fragmented rows").
 */
export function cretaceousChasm(): ProjectData {
  const p = emptyProject()
  p.title = 'Cretaceous Chasm (excerpt)'
  p.credits = CRETACEOUS_CHASM_CREDITS
  p.bpm = 158
  p.instrument = 'guitar-dist'
  p.row = parseRow('E F A# B F# G Eb D A G# Db C')!

  // "worms": D Eb F# G A# B, positions 2..7, a two-bar phrase of 5/4 (40 sixteenths)
  const worms: ShapeRef = { kind: 'run', size: 6, start: 2 }
  p.shapes[shapeKey(worms)] = {
    steps: 40,
    order: [7, 6, 2, 3, 5, 4], // D Eb A# B G F#
    notes: [n(0, 10, 2), n(10, 4, 2), n(14, 6, 1), n(20, 6, 1), n(26, 6, 2), n(32, 8, 2)],
  }

  // "cricket on back (A#)": A# B C C# E F, positions 10..3, one bar of 5/4
  const cricketAs: ShapeRef = { kind: 'run', size: 6, start: 10 }
  p.shapes[shapeKey(cricketAs)] = {
    steps: 20,
    order: [2, 3, 11, 10, 0, 1], // A# B C C# E F
    notes: [n(0, 3, 1), n(3, 3, 1), n(6, 4, 2), n(10, 2, 2), n(14, 4, 2), n(18, 2, 2)],
  }

  // "cricket on back (A)": A G# G F# Eb D, positions 4..9, same rhythm
  const cricketA: ShapeRef = { kind: 'run', size: 6, start: 4 }
  p.shapes[shapeKey(cricketA)] = {
    steps: 20,
    order: [8, 9, 5, 4, 6, 7], // A G# G F# Eb D
    notes: [n(0, 3, 2), n(3, 3, 2), n(6, 4, 2), n(10, 2, 2), n(14, 4, 3), n(18, 2, 3)],
  }

  p.arrangement = [worms, worms, cricketAs, cricketAs, cricketA, cricketA]
  return p
}

/** The three squares of the circle of fifths, then a triangle. */
export function circleOfFifthsShapes(): ProjectData {
  const p = emptyProject()
  p.title = 'Circle of fifths shapes'
  p.row = [...CIRCLE_OF_FIFTHS]
  const sq = (group: number): ShapeRef => ({ kind: 'nth', split: 3, group })
  p.shapes[shapeKey(sq(1))] = { order: [10, 7, 4, 1], notes: presetRhythm('sequence', 4), steps: 16 }
  p.shapes[shapeKey(sq(2))] = { order: [2, 8, 5, 11], notes: presetRhythm('staircase', 4), steps: 16 }
  p.arrangement = [sq(0), sq(1), sq(2), { kind: 'nth', split: 4, group: 0 }]
  return p
}

export const DEMOS: Demo[] = [
  { id: 'cretaceous-chasm', name: 'Cretaceous Chasm (Blotted Science, excerpt)', create: cretaceousChasm },
  { id: 'circle-of-fifths', name: 'Circle of fifths shapes', create: circleOfFifthsShapes },
]
