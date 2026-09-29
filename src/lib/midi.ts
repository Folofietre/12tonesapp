import { STEPS, midiOf } from './music'
import type { Instrument, ProjectData, ShapeRef } from './project'
import type { ShapeState } from './rhythm'

/** General MIDI programs (0-based) used when exporting. */
export const GM_PROGRAM: Record<Instrument, number> = {
  'synth': 80, // Lead 1 (square)
  'piano': 0, // Acoustic Grand Piano
  'guitar-clean': 27, // Electric Guitar (clean)
  'guitar-dist': 30, // Distortion Guitar
}

export const TICKS_PER_QUARTER = 480
export const TICKS_PER_STEP = TICKS_PER_QUARTER / 4

export interface MidiNote {
  tick: number
  duration: number
  midi: number
}

/** Variable-length quantity, as used for delta times. */
export function vlq(n: number): number[] {
  const out = [n & 0x7f]
  n >>= 7
  while (n) {
    out.unshift((n & 0x7f) | 0x80)
    n >>= 7
  }
  return out
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]

/** Builds a Standard MIDI File, format 0, one track on channel 1. */
export function buildMidi(notes: MidiNote[], bpm: number, program: number, name: string): Uint8Array {
  const events: { t: number; on: boolean; midi: number }[] = []
  for (const n of notes) {
    events.push({ t: n.tick, on: true, midi: n.midi })
    events.push({ t: n.tick + n.duration, on: false, midi: n.midi })
  }
  // note-off before note-on at the same tick, so repeated notes are not cut
  events.sort((a, b) => a.t - b.t || Number(a.on) - Number(b.on))

  const usPerQuarter = Math.round(60e6 / bpm)
  const nameBytes = [...new TextEncoder().encode(name)]
  const track = [
    0, 0xff, 0x03, ...vlq(nameBytes.length), ...nameBytes,
    0, 0xff, 0x51, 3, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255,
    0, 0xff, 0x58, 4, 4, 2, 24, 8,
    0, 0xc0, program & 0x7f,
  ]
  let last = 0
  for (const e of events) {
    track.push(...vlq(e.t - last), e.on ? 0x90 : 0x80, e.midi & 0x7f, e.on ? 96 : 0)
    last = e.t
  }
  track.push(0, 0xff, 0x2f, 0)

  return new Uint8Array([
    0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, (TICKS_PER_QUARTER >> 8) & 255, TICKS_PER_QUARTER & 255,
    0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track,
  ])
}

/** Notes of a sequence of bars, one bar per shape reference. */
export function sequenceToNotes(
  project: Pick<ProjectData, 'row'>,
  sequence: ShapeRef[],
  getShape: (ref: ShapeRef) => ShapeState,
): MidiNote[] {
  const notes: MidiNote[] = []
  sequence.forEach((ref, bar) => {
    const shape = getShape(ref)
    shape.notes.forEach((n, i) => {
      const pos = shape.order[i]
      if (!n || pos === undefined) return
      notes.push({
        tick: (bar * STEPS + n.start) * TICKS_PER_STEP,
        duration: n.length * TICKS_PER_STEP,
        midi: midiOf(project.row[pos]!, n.octave),
      })
    })
  })
  return notes
}
