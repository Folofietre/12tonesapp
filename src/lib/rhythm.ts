import { STEPS, groupPositions, shuffle, type Position, type SplitId } from './music'

export const OCTAVE_MIN = 1
export const OCTAVE_MAX = 7
export const DEFAULT_OCTAVE = 4

/** One note of a shape inside a bar: starts at `start` (0..15) and lasts `length` steps. */
export interface NoteEvent {
  start: number
  length: number
  octave: number
}

/** null = the note is silent in this bar */
export type Lane = NoteEvent | null

/**
 * A shape with its play order and rhythm.
 * `notes[i]` belongs to the position `order[i]`; both arrays always move together.
 */
export interface ShapeState {
  order: Position[]
  notes: Lane[]
}

export type RhythmPreset = 'sequence' | 'chord' | 'staircase' | 'random'
export type OrderPreset = 'clockwise' | 'counterclockwise' | 'shuffle'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/** Forces an event inside the bar and the octave range. */
export function clampEvent(e: { start?: unknown; length?: unknown; octave?: unknown }): NoteEvent {
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)
  const start = clamp(num(e.start, 0), 0, STEPS - 1)
  const length = clamp(num(e.length, 1), 1, STEPS - start)
  const octave = clamp(num(e.octave, DEFAULT_OCTAVE), OCTAVE_MIN, OCTAVE_MAX)
  return { start, length, octave }
}

export function presetRhythm(kind: RhythmPreset, count: number, rand: () => number = Math.random): Lane[] {
  const len = Math.max(1, Math.floor(STEPS / count))
  const make = (i: number): Lane => {
    switch (kind) {
      case 'chord':
        return { start: 0, length: STEPS, octave: DEFAULT_OCTAVE }
      case 'staircase': {
        const start = Math.min(STEPS - 1, i * len)
        return { start, length: STEPS - start, octave: DEFAULT_OCTAVE }
      }
      case 'random': {
        if (rand() < 0.15) return null
        const start = Math.floor(rand() * STEPS)
        return { start, length: 1 + Math.floor(rand() * Math.min(6, STEPS - start)), octave: 3 + Math.floor(rand() * 2) }
      }
      default:
        return { start: Math.min(STEPS - 1, i * len), length: len, octave: DEFAULT_OCTAVE }
    }
  }
  return Array.from({ length: count }, (_, i) => make(i))
}

export function defaultShape(split: SplitId, group: number): ShapeState {
  const order = groupPositions(split, group)
  return { order, notes: presetRhythm('sequence', order.length) }
}

/** Swaps lane i with its neighbour (dir = -1 earlier, +1 later). Returns a new shape. */
export function moveLane(shape: ShapeState, i: number, dir: -1 | 1): ShapeState {
  const j = i + dir
  if (i < 0 || j < 0 || i >= shape.order.length || j >= shape.order.length) return shape
  const order = [...shape.order]
  const notes = [...shape.notes]
  ;[order[i], order[j]] = [order[j]!, order[i]!]
  ;[notes[i], notes[j]] = [notes[j] ?? null, notes[i] ?? null]
  return { order, notes }
}

/** Reorders the notes of a shape; each note keeps its own rhythm. */
export function applyOrderPreset(
  shape: ShapeState,
  split: SplitId,
  group: number,
  kind: OrderPreset,
  rand: () => number = Math.random,
): ShapeState {
  const base = groupPositions(split, group)
  const byPos = new Map(shape.order.map((p, i) => [p, shape.notes[i] ?? null]))
  const order =
    kind === 'clockwise' ? base : kind === 'counterclockwise' ? [base[0]!, ...base.slice(1).reverse()] : shuffle(base, rand)
  return { order, notes: order.map((p) => byPos.get(p) ?? null) }
}

/** Indices of the lanes sounding at a given step. */
export function soundingAt(shape: ShapeState, step: number): number[] {
  const out: number[] = []
  shape.notes.forEach((n, i) => {
    if (n && step >= n.start && step < n.start + n.length) out.push(i)
  })
  return out
}

/** Steps covered by at least one note (for thumbnails). */
export function filledSteps(shape: ShapeState): boolean[] {
  const filled = Array.from({ length: STEPS }, () => false)
  for (const n of shape.notes) if (n) for (let s = n.start; s < n.start + n.length && s < STEPS; s++) filled[s] = true
  return filled
}
