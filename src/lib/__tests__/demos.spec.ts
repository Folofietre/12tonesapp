import { describe, expect, it } from 'vitest'
import { fromConfig, toConfig } from '../config'
import { cretaceousChasm, DEMOS } from '../demos'
import { groupPositions, isValidRow, midiOf, noteName, parseShapeKey, shapeKey } from '../music'

describe('demos', () => {
  it.each(DEMOS.map((d) => [d.id, d] as const))('%s is a valid project that survives export and import', (_id, demo) => {
    const p = demo.create()
    expect(isValidRow(p.row)).toBe(true)
    for (const [key, s] of Object.entries(p.shapes)) {
      const ref = parseShapeKey(key)!
      expect([...s.order].sort((a, b) => a - b)).toEqual([...groupPositions(ref)].sort((a, b) => a - b))
      expect(s.notes).toHaveLength(s.order.length)
      for (const n of s.notes) if (n) expect(n.start + n.length).toBeLessThanOrEqual(s.steps)
    }
    expect(fromConfig(JSON.parse(JSON.stringify(toConfig(p))))).toEqual(p)
  })
})

describe('Cretaceous Chasm excerpt', () => {
  const p = cretaceousChasm()
  const notes = (key: string) => p.shapes[key]!.order.map((pos) => noteName(p.row[pos]!))

  it('uses the clock of the song: minor seconds paired all around', () => {
    expect(p.row.map(noteName).join(' ')).toBe('E F A# B F# G D# D A G# C# C')
  })

  it('plays the note groups labelled in the transcription, in the tab order', () => {
    expect(notes('run6@2')).toEqual(['D', 'D#', 'A#', 'B', 'G', 'F#']) // worms
    expect(notes('run6@10')).toEqual(['A#', 'B', 'C', 'C#', 'E', 'F']) // cricket on back (A#)
    expect(notes('run6@4')).toEqual(['A', 'G#', 'G', 'F#', 'D#', 'D']) // cricket on back (A)
  })

  it('has the rhythms of the tab: 5/4 bars, each note once', () => {
    const cricket = p.shapes['run6@10']!
    expect(cricket.steps).toBe(20)
    expect(cricket.notes.map((n) => [n!.start, n!.length])).toEqual([[0, 3], [3, 3], [6, 4], [10, 2], [14, 4], [18, 2]])
    expect(p.shapes['run6@2']!.steps).toBe(40)
    // cricket (A#) pitches: A#1 B1 C2 C#2 E2 F2
    expect(cricket.order.map((pos, i) => midiOf(p.row[pos]!, cricket.notes[i]!.octave))).toEqual([34, 35, 36, 37, 40, 41])
  })

  it('credits the song and its owners', () => {
    expect(p.credits).toContain('Blotted Science')
    expect(p.credits).toContain('Jarzombek, Webster and Grossmann')
    expect(p.credits).toContain('Spastic Music (BMI)')
    expect(p.credits).toContain('https://www.ronjarzombek.com/CretaceousChasmTab1.html')
    expect(p.arrangement.map(shapeKey)).toEqual(['run6@2', 'run6@2', 'run6@10', 'run6@10', 'run6@4', 'run6@4'])
  })
})
