import { groupPositions, isSplitId, noteName, parseNote, isValidRow, shapeKey, type SplitId } from './music'
import { BPM_MAX, BPM_MIN, INSTRUMENTS, type Instrument, type ProjectData, type ShapeRef } from './project'
import { clampEvent, type Lane, type ShapeState } from './rhythm'

export const CONFIG_FORMAT = 'twelve-tone-shapes'
export const CONFIG_VERSION = 1

/** On-disk format, version 1. See README.md for a description aimed at users. */
export interface ConfigV1 {
  format: typeof CONFIG_FORMAT
  version: 1
  bpm: number
  instrument: Instrument
  row: string[]
  shapes: {
    split: SplitId
    group: number
    order: number[]
    notes: ({ start: number; length: number; octave: number } | null)[]
  }[]
  arrangement: ShapeRef[]
}

export class ConfigError extends Error {
  override name = 'ConfigError'
}

export function toConfig(p: ProjectData): ConfigV1 {
  return {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    bpm: p.bpm,
    instrument: p.instrument,
    row: p.row.map(noteName),
    shapes: Object.entries(p.shapes).map(([key, s]) => {
      const [split, group] = key.split(':').map(Number) as [SplitId, number]
      return { split, group, order: [...s.order], notes: s.notes.map((n) => (n ? { ...n } : null)) }
    }),
    arrangement: p.arrangement.map(({ split, group }) => ({ split, group })),
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isShapeRef = (split: unknown, group: unknown): boolean =>
  isSplitId(split) && Number.isInteger(group) && (group as number) >= 0 && (group as number) < split

/**
 * Validates and converts a parsed config file. Throws ConfigError with a readable message.
 * Out-of-range note values are clamped rather than rejected.
 */
export function fromConfig(raw: unknown): ProjectData {
  if (!isObject(raw) || raw.format !== CONFIG_FORMAT) throw new ConfigError('This is not a Twelve Tone Shapes config file')
  if (raw.version !== CONFIG_VERSION) throw new ConfigError(`Unsupported config version: ${String(raw.version)}`)

  const rowIn = Array.isArray(raw.row) ? raw.row : []
  const row = rowIn.map((n) => parseNote(String(n)))
  if (row.some((p) => p === undefined) || !isValidRow(row as number[])) {
    throw new ConfigError('"row" must contain 12 distinct notes (for example "C", "F#", "Bb")')
  }

  const shapes: Record<string, ShapeState> = {}
  for (const s of Array.isArray(raw.shapes) ? raw.shapes : []) {
    if (!isObject(s) || !isShapeRef(s.split, s.group)) {
      throw new ConfigError(`Invalid shape: split ${String(isObject(s) ? s.split : s)}, group ${String(isObject(s) ? s.group : '')}`)
    }
    const split = s.split as SplitId
    const group = s.group as number
    const expected = groupPositions(split, group)
    const order = s.order
    if (
      !Array.isArray(order) ||
      order.length !== expected.length ||
      [...order].sort((a, b) => a - b).join() !== expected.join()
    ) {
      throw new ConfigError(`Shape ${split}:${group}: "order" must list the positions ${expected.join(', ')} in any order`)
    }
    const notesIn = Array.isArray(s.notes) ? s.notes : []
    const notes: Lane[] = order.map((_, i) => {
      const n = notesIn[i]
      return isObject(n) ? clampEvent(n) : null
    })
    shapes[shapeKey(split, group)] = { order: [...(order as number[])], notes }
  }

  const arrangement: ShapeRef[] = (Array.isArray(raw.arrangement) ? raw.arrangement : [])
    .filter((c): c is Record<string, unknown> => isObject(c) && isShapeRef(c.split, c.group))
    .map((c) => ({ split: c.split as SplitId, group: c.group as number }))

  const bpm = typeof raw.bpm === 'number' && Number.isFinite(raw.bpm) ? Math.round(raw.bpm) : 96
  const instrument = INSTRUMENTS.includes(raw.instrument as Instrument) ? (raw.instrument as Instrument) : 'synth'

  return {
    bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, bpm)),
    instrument,
    row: row as number[],
    shapes,
    arrangement,
  }
}

/** Parses the text of a config file. */
export function parseConfigText(text: string): ProjectData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new ConfigError('The file is not valid JSON')
  }
  return fromConfig(raw)
}
