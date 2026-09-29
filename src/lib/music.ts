/** Pitch class: 0 = C ... 11 = B */
export type PitchClass = number
/** Position on the circle: 0 = "12 o'clock", then clockwise */
export type Position = number

/** Number of groups the circle is split into; group size = 12 / split */
export const SPLITS = [1, 2, 3, 4, 6] as const
export type SplitId = (typeof SPLITS)[number]

/** Steps per bar (sixteenth notes) and steps per beat */
export const STEPS = 16
export const BEAT = 4

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const NOTE_PARSE: Record<string, PitchClass> = {
  'C': 0, 'B#': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'FB': 4, 'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11, 'CB': 11,
}

export const CHROMATIC: PitchClass[] = Array.from({ length: 12 }, (_, i) => i)
export const CIRCLE_OF_FIFTHS: PitchClass[] = Array.from({ length: 12 }, (_, i) => (i * 7) % 12)

export const SHAPE_COLORS = ['#7FD7FF', '#72F1B8', '#B6A0FF', '#FFD25C', '#FF88C2', '#FF668A'] as const

export function noteName(pc: PitchClass): string {
  return NOTE_NAMES[((pc % 12) + 12) % 12]!
}

/** Parses "C#", "db", "Eb"... Returns undefined when unknown. */
export function parseNote(token: string): PitchClass | undefined {
  return NOTE_PARSE[token.trim().toUpperCase()]
}

export function isValidRow(row: readonly number[]): boolean {
  return row.length === 12 && row.every((p) => Number.isInteger(p) && p >= 0 && p < 12) && new Set(row).size === 12
}

/** Parses a tone row from "C G D ..." or an array of names. Returns null unless 12 distinct notes. */
export function parseRow(input: string | readonly string[]): PitchClass[] | null {
  const tokens = typeof input === 'string' ? input.split(/[\s,]+/).filter(Boolean) : input.map(String)
  const row = tokens.map(parseNote)
  if (row.some((p) => p === undefined)) return null
  return isValidRow(row as number[]) ? (row as number[]) : null
}

export function isSplitId(n: unknown): n is SplitId {
  return SPLITS.includes(n as SplitId)
}

/** Positions of a group: every Nth note of the circle, starting at `group`. */
export function groupPositions(split: SplitId, group: number): Position[] {
  const out: Position[] = []
  for (let p = group; p < 12; p += split) out.push(p)
  return out
}

export function shapeKey(split: SplitId, group: number): string {
  return `${split}:${group}`
}

/** "4-A" = shape of 4 notes, first group. The full circle is "Full". */
export function shapeLabel(split: SplitId, group: number): string {
  return split === 1 ? 'Full' : `${12 / split}-${String.fromCharCode(65 + group)}`
}

export function shapeColor(split: SplitId, group: number): string {
  return split === 1 ? SHAPE_COLORS[1] : SHAPE_COLORS[group % SHAPE_COLORS.length]!
}

/** Label shown on the circle for a position (the top is "12", like a clock). */
export function positionLabel(p: Position): string {
  return p === 0 ? '12' : String(p)
}

export function midiOf(pc: PitchClass, octave: number): number {
  return 12 * (octave + 1) + pc
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Returns a shuffled copy (Fisher-Yates). */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
