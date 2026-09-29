/** Pitch class: 0 = C ... 11 = B */
export type PitchClass = number
/** Position on the circle: 0 = "12 o'clock", then clockwise */
export type Position = number

/** Number of groups the circle is split into; group size = 12 / split */
export const SPLITS = [1, 2, 3, 4, 6] as const
export type SplitId = (typeof SPLITS)[number]
export const GROUP_SIZES = [12, 6, 4, 3, 2] as const
export type GroupSize = (typeof GROUP_SIZES)[number]

/**
 * How the circle is cut into groups:
 * - "nth": every Nth note (the "Circle of 12 Tones" system)
 * - "run": runs of neighbouring notes, with a rotation (the "12-Tones In Fragmented Rows" system)
 */
export type GroupMode = 'nth' | 'run'

/** Identifies a shape independently of how the screen is laid out. */
export type ShapeRef =
  | { kind: 'nth'; split: SplitId; group: number }
  | { kind: 'run'; size: GroupSize; start: Position }

/** Steps per beat (sixteenth notes per quarter note) */
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
export function isGroupSize(n: unknown): n is GroupSize {
  return GROUP_SIZES.includes(n as GroupSize)
}

export function isValidRef(ref: ShapeRef): boolean {
  if (ref.kind === 'nth') return isSplitId(ref.split) && Number.isInteger(ref.group) && ref.group >= 0 && ref.group < ref.split
  return isGroupSize(ref.size) && Number.isInteger(ref.start) && ref.start >= 0 && ref.start < 12
}

export function sizeOf(ref: ShapeRef): GroupSize {
  return ref.kind === 'nth' ? ((12 / ref.split) as GroupSize) : ref.size
}

/** Positions of a shape, clockwise from its first note. */
export function groupPositions(ref: ShapeRef): Position[] {
  const out: Position[] = []
  if (ref.kind === 'nth') for (let p = ref.group; p < 12; p += ref.split) out.push(p)
  else for (let i = 0; i < ref.size; i++) out.push((ref.start + i) % 12)
  return out
}

/**
 * The shapes shown for a split. In "run" mode the offset rotates the cut:
 * with 2 groups of 6 and offset 4, the runs start at positions 4 and 10.
 */
export function layoutRefs(mode: GroupMode, split: SplitId, offset = 0): ShapeRef[] {
  const size = (12 / split) as GroupSize
  const o = ((offset % size) + size) % size
  return Array.from({ length: split }, (_, g) =>
    mode === 'nth' ? { kind: 'nth' as const, split, group: g } : { kind: 'run' as const, size, start: o + g * size },
  )
}

/** Where a shape sits in the layout of its own split: mode, split, offset and group index. */
export function layoutOf(ref: ShapeRef): { mode: GroupMode; split: SplitId; offset: number; group: number } {
  if (ref.kind === 'nth') return { mode: 'nth', split: ref.split, offset: 0, group: ref.group }
  return { mode: 'run', split: (12 / ref.size) as SplitId, offset: ref.start % ref.size, group: Math.floor(ref.start / ref.size) }
}

export function shapeKey(ref: ShapeRef): string {
  return ref.kind === 'nth' ? `${ref.split}:${ref.group}` : `run${ref.size}@${ref.start}`
}

export function parseShapeKey(key: string): ShapeRef | null {
  let m = /^(\d+):(\d+)$/.exec(key)
  if (m) {
    const ref: ShapeRef = { kind: 'nth', split: Number(m[1]) as SplitId, group: Number(m[2]) }
    return isValidRef(ref) ? ref : null
  }
  m = /^run(\d+)@(\d+)$/.exec(key)
  if (m) {
    const ref: ShapeRef = { kind: 'run', size: Number(m[1]) as GroupSize, start: Number(m[2]) }
    return isValidRef(ref) ? ref : null
  }
  return null
}

export function sameRef(a: ShapeRef | null | undefined, b: ShapeRef | null | undefined): boolean {
  return !!a && !!b && shapeKey(a) === shapeKey(b)
}

/**
 * "4-A" = every-Nth shape of 4 notes, first group; "Full" = the whole circle.
 * "R6@10" = run of 6 neighbouring notes starting at clock position 10.
 */
export function shapeLabel(ref: ShapeRef): string {
  if (ref.kind === 'nth') return ref.split === 1 ? 'Full' : `${12 / ref.split}-${String.fromCharCode(65 + ref.group)}`
  return `R${ref.size}@${positionLabel(ref.start)}`
}

export function shapeColor(ref: ShapeRef): string {
  const { split, group } = layoutOf(ref)
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
