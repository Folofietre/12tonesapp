import { CIRCLE_OF_FIFTHS, type PitchClass, type ShapeRef } from './music'
import type { ShapeState } from './rhythm'

export const INSTRUMENTS = ['synth', 'piano', 'guitar-clean', 'guitar-dist'] as const
export type Instrument = (typeof INSTRUMENTS)[number]

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  'synth': 'Synth',
  'piano': 'Piano',
  'guitar-clean': 'Guitar clean',
  'guitar-dist': 'Guitar distortion',
}

export const BPM_MIN = 30
export const BPM_MAX = 300

/** Everything that is saved (autosave and config file). */
export interface ProjectData {
  /** optional name shown above the arrangement */
  title?: string
  /** optional credits (authors, rights, sources); URLs are shown as links */
  credits?: string
  bpm: number
  instrument: Instrument
  row: PitchClass[]
  /** keyed by shapeKey(ref); only shapes the user touched */
  shapes: Record<string, ShapeState>
  /** bars played one after the other */
  arrangement: ShapeRef[]
}

export function emptyProject(): ProjectData {
  return { bpm: 96, instrument: 'synth', row: [...CIRCLE_OF_FIFTHS], shapes: {}, arrangement: [] }
}
